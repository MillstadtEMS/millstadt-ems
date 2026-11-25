// Storage for the station TV's CAD feed. In production it is four small Neon tables, created on first
// use (CREATE TABLE IF NOT EXISTS) and kept to the last 48 hours:
//   station_cad_seen       every Gmail message id already read (so each email is fetched once)
//   station_cad_events     one record per call-related email: what the parser found, never the body
//   station_geocode_cache  address → map point (or "not found"), shared by every server instance
//   station_cad_sync       one row: when the feed last synced, the last error, and a sync lease
// Without DATABASE_URL (local development) the same interface runs in memory.

import { sql } from "@/lib/neon";
import type { CadRecord } from "./merge";
import type { GeocodeHit } from "./geocode";

export const RETENTION_MS = 48 * 60 * 60_000;
const GEOCODE_RETENTION_MS = 30 * 24 * 60 * 60_000;
/** A geocode lookup another instance started this recently is left to finish. */
const GEOCODE_LEASE_MS = 45_000;
/** "Not found" is remembered this long before the address is tried again. */
export const GEOCODE_MISS_RETRY_MS = 2 * 60 * 60_000;

export type SeenKind = CadRecord["kind"] | "unknown" | "error";

export interface SeenRow {
  messageId: string;
  kind: SeenKind;
  receivedAt: number | null;
  /** Present for call-related emails. */
  record: CadRecord | null;
  eventKey: string | null;
}

export type CachedGeocode =
  | ({ status: "hit"; updatedAt: number } & GeocodeHit)
  | { status: "miss"; updatedAt: number }
  | { status: "pending"; updatedAt: number };

export interface SyncState {
  lastSyncAt: number | null;
  lastOkAt: number | null;
  lastError: string | null;
  lastErrorAt: number | null;
  lastDurationMs: number | null;
  lastFetched: number;
}

export interface FeedCounts {
  events: number;
  messages: number;
  parseFailures: number;
}

export interface CadStore {
  kind: "neon" | "memory";
  /** Take the sync lease when the last sync is older than minIntervalMs. True for the one caller that won. */
  claimSync(minIntervalMs: number): Promise<boolean>;
  seen(ids: string[]): Promise<Set<string>>;
  save(rows: SeenRow[]): Promise<void>;
  records(sinceMs: number): Promise<CadRecord[]>;
  purge(now?: number): Promise<void>;
  recordSync(result: { ok: boolean; error: string | null; durationMs: number; fetched: number }): Promise<void>;
  syncState(): Promise<SyncState>;
  counts(): Promise<FeedCounts>;
  geocodes(keys: string[]): Promise<Map<string, CachedGeocode>>;
  /** Claim an address for lookup (nobody has it, or a "miss" is due a retry). */
  claimGeocode(key: string): Promise<boolean>;
  saveGeocode(key: string, hit: GeocodeHit | null): Promise<void>;
}

// ── Neon ──────────────────────────────────────────────────────────────────────────────────────────

let schemaReady: Promise<void> | null = null;

async function ensureSchema() {
  schemaReady ??= (async () => {
    const db = sql();
    await db`
      CREATE TABLE IF NOT EXISTS station_cad_seen (
        message_id  TEXT PRIMARY KEY,
        kind        TEXT NOT NULL,
        received_at TIMESTAMPTZ,
        seen_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
    await db`CREATE INDEX IF NOT EXISTS station_cad_seen_seen_at_idx ON station_cad_seen (seen_at)`;
    await db`
      CREATE TABLE IF NOT EXISTS station_cad_events (
        message_id  TEXT PRIMARY KEY,
        event_key   TEXT,
        kind        TEXT NOT NULL,
        received_at TIMESTAMPTZ NOT NULL,
        data        JSONB NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
    await db`CREATE INDEX IF NOT EXISTS station_cad_events_received_at_idx ON station_cad_events (received_at)`;
    await db`
      CREATE TABLE IF NOT EXISTS station_geocode_cache (
        address_key TEXT PRIMARY KEY,
        status      TEXT NOT NULL,
        lat         DOUBLE PRECISION,
        lon         DOUBLE PRECISION,
        source      TEXT,
        approximate BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
    await db`
      CREATE TABLE IF NOT EXISTS station_cad_sync (
        id               INTEGER PRIMARY KEY,
        last_sync_at     TIMESTAMPTZ,
        last_ok_at       TIMESTAMPTZ,
        last_error       TEXT,
        last_error_at    TIMESTAMPTZ,
        last_duration_ms INTEGER,
        last_fetched     INTEGER NOT NULL DEFAULT 0,
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
    await db`INSERT INTO station_cad_sync (id) VALUES (1) ON CONFLICT (id) DO NOTHING`;
  })().catch((error) => { schemaReady = null; throw error; });
  return schemaReady;
}

const ms = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const t = value instanceof Date ? value.getTime() : Date.parse(String(value));
  return Number.isFinite(t) ? t : null;
};
const iso = (value: number | null) => (value === null ? null : new Date(value).toISOString());

function neonStore(): CadStore {
  return {
    kind: "neon",
    async claimSync(minIntervalMs) {
      await ensureSchema();
      const seconds = Math.max(1, Math.round(minIntervalMs / 1000));
      const rows = await sql()`
        UPDATE station_cad_sync SET last_sync_at = NOW(), updated_at = NOW()
        WHERE id = 1 AND (last_sync_at IS NULL OR last_sync_at < NOW() - make_interval(secs => ${seconds}))
        RETURNING id`;
      return rows.length > 0;
    },
    async seen(ids) {
      if (!ids.length) return new Set();
      await ensureSchema();
      const rows = (await sql()`SELECT message_id FROM station_cad_seen WHERE message_id = ANY(${ids})`) as Array<{ message_id: string }>;
      return new Set(rows.map((r) => r.message_id));
    },
    async save(rows) {
      if (!rows.length) return;
      await ensureSchema();
      const db = sql();
      // One statement per table (arrays unnested), records first: an id is only marked seen once its
      // record is safely stored. Empty strings stand in for NULLs inside the arrays.
      const events = rows.filter((row) => row.record);
      if (events.length) {
        await db`
          INSERT INTO station_cad_events (message_id, event_key, kind, received_at, data)
          SELECT m, NULLIF(k, ''), t, r::timestamptz, d::jsonb
          FROM UNNEST(${events.map((r) => r.messageId)}::text[], ${events.map((r) => r.eventKey ?? "")}::text[],
                      ${events.map((r) => r.kind)}::text[], ${events.map((r) => iso(r.record!.receivedAt) ?? "")}::text[],
                      ${events.map((r) => JSON.stringify(r.record))}::text[]) AS x(m, k, t, r, d)
          ON CONFLICT (message_id) DO NOTHING`;
      }
      await db`
        INSERT INTO station_cad_seen (message_id, kind, received_at)
        SELECT m, t, NULLIF(r, '')::timestamptz
        FROM UNNEST(${rows.map((r) => r.messageId)}::text[], ${rows.map((r) => r.kind)}::text[],
                    ${rows.map((r) => iso(r.receivedAt) ?? "")}::text[]) AS x(m, t, r)
        ON CONFLICT (message_id) DO NOTHING`;
    },
    async records(sinceMs) {
      await ensureSchema();
      const rows = (await sql()`
        SELECT data FROM station_cad_events WHERE received_at >= ${iso(sinceMs)} ORDER BY received_at ASC LIMIT 2000`) as Array<{ data: CadRecord | string }>;
      return rows.map((r) => (typeof r.data === "string" ? (JSON.parse(r.data) as CadRecord) : r.data));
    },
    async purge(now = Date.now()) {
      await ensureSchema();
      const db = sql();
      const cutoff = iso(now - RETENTION_MS);
      await db`DELETE FROM station_cad_events WHERE received_at < ${cutoff}`;
      await db`DELETE FROM station_cad_seen WHERE seen_at < ${cutoff}`;
      await db`DELETE FROM station_geocode_cache WHERE updated_at < ${iso(now - GEOCODE_RETENTION_MS)}`;
    },
    async recordSync({ ok, error, durationMs, fetched }) {
      await ensureSchema();
      await sql()`
        UPDATE station_cad_sync SET
          last_ok_at = CASE WHEN ${ok} THEN NOW() ELSE last_ok_at END,
          last_error = CASE WHEN ${error}::text IS NULL THEN last_error ELSE ${error}::text END,
          last_error_at = CASE WHEN ${error}::text IS NULL THEN last_error_at ELSE NOW() END,
          last_duration_ms = ${Math.round(durationMs)},
          last_fetched = ${fetched},
          updated_at = NOW()
        WHERE id = 1`;
    },
    async syncState() {
      await ensureSchema();
      const rows = (await sql()`SELECT * FROM station_cad_sync WHERE id = 1`) as Array<Record<string, unknown>>;
      const r = rows[0] ?? {};
      return {
        lastSyncAt: ms(r.last_sync_at),
        lastOkAt: ms(r.last_ok_at),
        lastError: typeof r.last_error === "string" ? r.last_error : null,
        lastErrorAt: ms(r.last_error_at),
        lastDurationMs: typeof r.last_duration_ms === "number" ? r.last_duration_ms : null,
        lastFetched: Number(r.last_fetched ?? 0) || 0,
      };
    },
    async counts() {
      await ensureSchema();
      const db = sql();
      const [events] = (await db`SELECT COUNT(DISTINCT COALESCE(event_key, message_id))::int AS n FROM station_cad_events`) as Array<{ n: number }>;
      const [seen] = (await db`
        SELECT COUNT(*)::int AS n, COUNT(*) FILTER (WHERE kind IN ('unknown', 'error'))::int AS failures FROM station_cad_seen`) as Array<{ n: number; failures: number }>;
      return { events: events?.n ?? 0, messages: seen?.n ?? 0, parseFailures: seen?.failures ?? 0 };
    },
    async geocodes(keys) {
      const out = new Map<string, CachedGeocode>();
      if (!keys.length) return out;
      await ensureSchema();
      const rows = (await sql()`
        SELECT address_key, status, lat, lon, source, approximate, updated_at FROM station_geocode_cache WHERE address_key = ANY(${keys})`) as Array<Record<string, unknown>>;
      for (const r of rows) {
        const updatedAt = ms(r.updated_at) ?? 0;
        const key = String(r.address_key);
        if (r.status === "hit" && typeof r.lat === "number" && typeof r.lon === "number") {
          out.set(key, { status: "hit", lat: r.lat, lon: r.lon, source: r.source === "nominatim" ? "nominatim" : "census", approximate: Boolean(r.approximate), updatedAt });
        } else if (r.status === "miss") out.set(key, { status: "miss", updatedAt });
        else out.set(key, { status: "pending", updatedAt });
      }
      return out;
    },
    async claimGeocode(key) {
      await ensureSchema();
      const lease = Math.round(GEOCODE_LEASE_MS / 1000);
      const retry = Math.round(GEOCODE_MISS_RETRY_MS / 1000);
      const rows = await sql()`
        INSERT INTO station_geocode_cache (address_key, status, updated_at) VALUES (${key}, 'pending', NOW())
        ON CONFLICT (address_key) DO UPDATE SET status = 'pending', updated_at = NOW()
        WHERE (station_geocode_cache.status = 'pending' AND station_geocode_cache.updated_at < NOW() - make_interval(secs => ${lease}))
           OR (station_geocode_cache.status = 'miss' AND station_geocode_cache.updated_at < NOW() - make_interval(secs => ${retry}))
        RETURNING address_key`;
      return rows.length > 0;
    },
    async saveGeocode(key, hit) {
      await ensureSchema();
      if (hit) {
        await sql()`
          INSERT INTO station_geocode_cache (address_key, status, lat, lon, source, approximate, updated_at)
          VALUES (${key}, 'hit', ${hit.lat}, ${hit.lon}, ${hit.source}, ${hit.approximate}, NOW())
          ON CONFLICT (address_key) DO UPDATE SET status = 'hit', lat = EXCLUDED.lat, lon = EXCLUDED.lon,
            source = EXCLUDED.source, approximate = EXCLUDED.approximate, updated_at = NOW()`;
      } else {
        await sql()`
          INSERT INTO station_geocode_cache (address_key, status, updated_at) VALUES (${key}, 'miss', NOW())
          ON CONFLICT (address_key) DO UPDATE SET status = 'miss', lat = NULL, lon = NULL, source = NULL, approximate = FALSE, updated_at = NOW()`;
      }
    },
  };
}

// ── Memory (local development) ────────────────────────────────────────────────────────────────────

interface MemoryState {
  seen: Map<string, { kind: SeenKind; seenAt: number; receivedAt: number | null }>;
  events: Map<string, { record: CadRecord; eventKey: string | null }>;
  geocodes: Map<string, CachedGeocode>;
  sync: SyncState;
}

function memoryState(): MemoryState {
  const g = globalThis as typeof globalThis & { __stationCadMemory?: MemoryState };
  g.__stationCadMemory ??= {
    seen: new Map(),
    events: new Map(),
    geocodes: new Map(),
    sync: { lastSyncAt: null, lastOkAt: null, lastError: null, lastErrorAt: null, lastDurationMs: null, lastFetched: 0 },
  };
  return g.__stationCadMemory;
}

export function memoryStore(state: MemoryState = memoryState()): CadStore {
  return {
    kind: "memory",
    async claimSync(minIntervalMs) {
      const now = Date.now();
      if (state.sync.lastSyncAt !== null && now - state.sync.lastSyncAt < minIntervalMs) return false;
      state.sync.lastSyncAt = now;
      return true;
    },
    async seen(ids) {
      return new Set(ids.filter((id) => state.seen.has(id)));
    },
    async save(rows) {
      const now = Date.now();
      for (const row of rows) {
        if (row.record && !state.events.has(row.messageId)) state.events.set(row.messageId, { record: row.record, eventKey: row.eventKey });
        if (!state.seen.has(row.messageId)) state.seen.set(row.messageId, { kind: row.kind, seenAt: now, receivedAt: row.receivedAt });
      }
    },
    async records(sinceMs) {
      return [...state.events.values()].map((e) => e.record).filter((r) => r.receivedAt >= sinceMs).sort((a, b) => a.receivedAt - b.receivedAt);
    },
    async purge(now = Date.now()) {
      for (const [id, e] of state.events) if (e.record.receivedAt < now - RETENTION_MS) state.events.delete(id);
      for (const [id, s] of state.seen) if (s.seenAt < now - RETENTION_MS) state.seen.delete(id);
      for (const [key, g] of state.geocodes) if (g.updatedAt < now - GEOCODE_RETENTION_MS) state.geocodes.delete(key);
    },
    async recordSync({ ok, error, durationMs, fetched }) {
      const now = Date.now();
      if (ok) state.sync.lastOkAt = now;
      if (error) { state.sync.lastError = error; state.sync.lastErrorAt = now; }
      state.sync.lastDurationMs = Math.round(durationMs);
      state.sync.lastFetched = fetched;
    },
    async syncState() {
      return { ...state.sync };
    },
    async counts() {
      const keys = new Set([...state.events.entries()].map(([id, e]) => e.eventKey ?? id));
      const failures = [...state.seen.values()].filter((s) => s.kind === "unknown" || s.kind === "error").length;
      return { events: keys.size, messages: state.seen.size, parseFailures: failures };
    },
    async geocodes(keys) {
      const out = new Map<string, CachedGeocode>();
      for (const key of keys) {
        const hit = state.geocodes.get(key);
        if (hit) out.set(key, hit);
      }
      return out;
    },
    async claimGeocode(key) {
      const now = Date.now();
      const current = state.geocodes.get(key);
      const free = !current ||
        (current.status === "pending" && now - current.updatedAt > GEOCODE_LEASE_MS) ||
        (current.status === "miss" && now - current.updatedAt > GEOCODE_MISS_RETRY_MS);
      if (!free) return false;
      state.geocodes.set(key, { status: "pending", updatedAt: now });
      return true;
    },
    async saveGeocode(key, hit) {
      state.geocodes.set(key, hit ? { status: "hit", ...hit, updatedAt: Date.now() } : { status: "miss", updatedAt: Date.now() });
    },
  };
}

/** Neon when DATABASE_URL is set, otherwise the in-memory store (local development). */
export function cadStore(): CadStore {
  return process.env.DATABASE_URL ? neonStore() : memoryStore();
}
