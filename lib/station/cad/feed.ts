// The station TV's live CAD feed, with no cron of its own: whenever a signed-in TV asks for calls and
// the last sync is more than ~20 seconds old, one server (whichever wins the sync lease in the
// database) reads the new CAD emails first. Everyone then folds the stored records into calls and
// attaches map points from the geocode cache; addresses not looked up yet are returned as "pending"
// for the route to geocode after its response.

import { foldCalls, eventKeyOf, toRecord, type FoldedCall } from "./merge";
import { parseCadMessage } from "./parse";
import { geocodeAddress } from "./geocode";
import { FETCH_HORIZON_MS, getMessage, gmailErrorReason, listRecentMessageIds, stationGmailConfigured } from "./gmail";
import { cadStore, GEOCODE_MISS_RETRY_MS, type CadStore, type SeenRow, type SyncState } from "./store";
import type { StationCall, StationCallsResponse, StationFeedHealth } from "./types";

export const SYNC_INTERVAL_MS = 20_000;
/** A sync stops fetching new emails after this long; the rest wait for the next one. */
const SYNC_BUDGET_MS = 7000;
const MAX_FETCH_PER_SYNC = 40;
const FETCH_CONCURRENCY = 6;
/** The TV shows "CAD feed delayed" when the last good sync is older than this. */
const DELAYED_AFTER_MS = 2 * 60_000;
/** Each lookup can take ~9 s (Census, then Nominatim), and the route allows 30. */
const GEOCODES_PER_REQUEST = 2;

export interface PendingGeocode { key: string; address: string; city: string | null }

export interface FeedResult { response: StationCallsResponse; pending: PendingGeocode[] }

function errorName(error: unknown) {
  return error instanceof Error ? error.name : "UnknownError";
}

function httpStatus(error: unknown): number {
  const e = error as { code?: unknown; status?: unknown; response?: { status?: unknown } };
  return Number(e?.response?.status ?? e?.status ?? e?.code) || 0;
}

/** Read new CAD emails into the store. Gmail problems are recorded on the sync row, not thrown. */
export async function syncFeed(store: CadStore, now = Date.now()): Promise<void> {
  const started = Date.now();
  let ids: string[];
  try {
    ids = await listRecentMessageIds(100);
  } catch (error) {
    await store.recordSync({ ok: false, error: gmailErrorReason(error), durationMs: Date.now() - started, fetched: 0 });
    return;
  }
  const known = await store.seen(ids);
  const todo = ids.filter((id) => !known.has(id)).slice(0, MAX_FETCH_PER_SYNC);
  const rows: SeenRow[] = [];
  let failure: string | null = null;
  for (let i = 0; i < todo.length; i += FETCH_CONCURRENCY) {
    if (Date.now() - started > SYNC_BUDGET_MS) break;
    const batch = todo.slice(i, i + FETCH_CONCURRENCY);
    const results = await Promise.allSettled(batch.map((id) => getMessage(id)));
    results.forEach((result, index) => {
      const id = batch[index];
      if (result.status === "rejected") {
        // Gone (deleted) is final; anything else is tried again on the next sync.
        if (httpStatus(result.reason) === 404) rows.push({ messageId: id, kind: "error", receivedAt: null, record: null, eventKey: null });
        else failure ??= gmailErrorReason(result.reason);
        return;
      }
      const email = result.value;
      try {
        const record = toRecord(id, parseCadMessage(email));
        rows.push({ messageId: id, kind: record?.kind ?? "unknown", receivedAt: email.receivedAt, record, eventKey: record ? eventKeyOf(record.eventNumber) : null });
      } catch (error) {
        console.error("[station-cad] could not parse a CAD email", { name: errorName(error) });
        rows.push({ messageId: id, kind: "error", receivedAt: email.receivedAt, record: null, eventKey: null });
      }
    });
  }
  await store.save(rows);
  await store.purge(now);
  await store.recordSync({ ok: !failure, error: failure, durationMs: Date.now() - started, fetched: rows.length });
}

export function feedHealth(state: SyncState, now = Date.now()): StationFeedHealth {
  const error = state.lastError && (state.lastErrorAt ?? 0) >= (state.lastOkAt ?? 0) ? state.lastError : null;
  const iso = (v: number | null) => (v === null ? null : new Date(v).toISOString());
  return {
    lastSyncAt: iso(state.lastSyncAt),
    lastOkAt: iso(state.lastOkAt),
    error,
    delayed: state.lastOkAt === null ? Boolean(error) : now - state.lastOkAt > DELAYED_AFTER_MS,
  };
}

/** Attach map points: from the email, else the geocode cache; anything not looked up yet is pending. */
async function locate(store: CadStore, folded: FoldedCall[], now: number): Promise<{ calls: StationCall[]; pending: PendingGeocode[] }> {
  const keys = [...new Set(folded.filter((c) => !c.emailLocation && c.addressKey).map((c) => c.addressKey!))];
  const cache = await store.geocodes(keys);
  const pending = new Map<string, PendingGeocode>();
  const calls = folded.map(({ emailLocation, addressKey, ...call }): StationCall => {
    if (emailLocation) return { ...call, location: { ...emailLocation, source: "email" }, locating: false };
    if (!addressKey || !call.address) return { ...call, location: null, locating: false };
    const cached = cache.get(addressKey);
    if (cached?.status === "hit") {
      return { ...call, location: { lat: cached.lat, lon: cached.lon, source: cached.source, ...(cached.approximate ? { approximate: true } : {}) }, locating: false };
    }
    if (cached?.status === "miss" && now - cached.updatedAt < GEOCODE_MISS_RETRY_MS) return { ...call, location: null, locating: false };
    if (call.closedAt === null || !cached) pending.set(addressKey, { key: addressKey, address: call.address, city: call.city });
    return { ...call, location: null, locating: true };
  });
  return { calls, pending: [...pending.values()] };
}

/** The calls for a signed-in TV, syncing first when the feed is due. Never throws. */
export async function getStationCalls(): Promise<FeedResult> {
  const serverTime = () => new Date().toISOString();
  if (!stationGmailConfigured()) {
    return { response: { available: false, serverTime: serverTime(), reason: "CAD email is not configured", calls: [] }, pending: [] };
  }
  const store = cadStore();
  try {
    if (await store.claimSync(SYNC_INTERVAL_MS)) {
      try {
        await syncFeed(store);
      } catch (error) {
        console.error("[station-cad] sync failed", { name: errorName(error) });
        await store.recordSync({ ok: false, error: "CAD feed sync failed", durationMs: 0, fetched: 0 }).catch(() => undefined);
      }
    }
    const now = Date.now();
    const records = await store.records(now - FETCH_HORIZON_MS);
    const { calls, pending } = await locate(store, foldCalls(records, { now }), now);
    const feed = feedHealth(await store.syncState(), now);
    return { response: { available: true, serverTime: serverTime(), calls, feed }, pending };
  } catch (error) {
    console.error("[station-cad] feed storage unavailable", { name: errorName(error) });
    return { response: { available: false, serverTime: serverTime(), reason: "CAD feed storage is unavailable", calls: [] }, pending: [] };
  }
}

/** Look up a few pending addresses (run after the response). Each is claimed first, so two servers
 *  never look up the same address at once; failures are cached as "not found" for a while. */
export async function resolvePendingGeocodes(pending: PendingGeocode[], store: CadStore = cadStore()): Promise<void> {
  for (const job of pending.slice(0, GEOCODES_PER_REQUEST)) {
    try {
      if (!(await store.claimGeocode(job.key))) continue;
      const hit = await geocodeAddress(job.address, job.city);
      await store.saveGeocode(job.key, hit);
    } catch (error) {
      console.error("[station-cad] geocode failed", { name: errorName(error) });
    }
  }
}

/** For admins: how the feed is doing, without a single call detail or email body. */
export async function feedDiagnostics() {
  const configured = stationGmailConfigured();
  const store = cadStore();
  try {
    const [state, counts] = await Promise.all([store.syncState(), store.counts()]);
    return {
      configured,
      store: store.kind,
      ...feedHealth(state),
      lastError: state.lastError,
      lastErrorAt: state.lastErrorAt === null ? null : new Date(state.lastErrorAt).toISOString(),
      lastDurationMs: state.lastDurationMs,
      lastFetched: state.lastFetched,
      ...counts,
    };
  } catch (error) {
    return { configured, store: store.kind, unavailable: true, errorName: errorName(error) };
  }
}
