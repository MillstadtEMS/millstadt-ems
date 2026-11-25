// Turns the stored CAD messages into the calls the station TV shows. Each email is kept as one small
// record (what the parser found, never the body); a call is folded from all of its records every time
// it is read, so the result doesn't depend on the order emails arrived in, a status update that beat
// its dispatch, or two servers syncing at once. Pure: no I/O, safe to unit test.

import type { MessageSource, ParsedCadMessage, PhaseOrClosed } from "./parse";
import { eventSuffix } from "./parse";
import { CALL_PHASES, phaseRank, type CallPhase, type StationCall } from "./types";

export type RecordKind = "dispatch" | "status" | "closeout" | "notification";

/** One email's worth of call facts, as stored (no body, no callers, no notes). */
export interface CadRecord {
  id: string;
  kind: RecordKind;
  source: MessageSource;
  receivedAt: number;
  eventNumber: string | null;
  nature: string | null;
  detail: string | null;
  address: string | null;
  city: string | null;
  place: string | null;
  crossStreets: string | null;
  units: string[];
  status: CallPhase | null;
  cancelled: boolean;
  statusAt: number | null;
  times: Partial<Record<PhaseOrClosed, number>>;
  location: { lat: number; lon: number } | null;
}

/** The record to keep for a parsed email, or null when the email is not about a call. */
export function toRecord(id: string, parsed: ParsedCadMessage): CadRecord | null {
  if (parsed.kind === "unknown") return null;
  return {
    id,
    kind: parsed.kind,
    source: parsed.source,
    receivedAt: parsed.receivedAt,
    eventNumber: parsed.eventNumber,
    nature: parsed.nature,
    detail: parsed.detail,
    address: parsed.address,
    city: parsed.city,
    place: parsed.place,
    crossStreets: parsed.crossStreets,
    units: parsed.units,
    status: parsed.status,
    cancelled: parsed.cancelled,
    statusAt: parsed.statusAt,
    times: parsed.times,
    location: parsed.location,
  };
}

/** The key records of one call share: the event number's trailing digits (CENCOM and Chief 360 may
 *  print the year differently), or null. */
export function eventKeyOf(eventNumber: string | null): string | null {
  const suffix = eventSuffix(eventNumber);
  return suffix ? `e${suffix}` : null;
}

/** A street address reduced for matching and geocode caching: "118 Willow Creek Dr." → "118 WILLOW CREEK DR". */
export function normalizeAddress(address: string | null, city?: string | null): string | null {
  if (!address) return null;
  const street = address
    .toUpperCase()
    .replace(/[.,#]/g, " ")
    .replace(/\b(?:BLK|BLOCK)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!street) return null;
  const town = city ? city.toUpperCase().replace(/[.,]/g, " ").replace(/\s+/g, " ").trim() : "";
  return town ? `${street}|${town}` : street;
}

export interface FoldOptions {
  now: number;
  /** How long a cleared or closed call stays on the screen. */
  recentClosedMs?: number;
  /** A call with no news for this long is assumed over (a missed closeout). */
  staleMs?: number;
  /** And no call stays up longer than this after its dispatch. */
  maxAgeMs?: number;
}

export const RECENT_CLOSED_MS = 10 * 60_000;
export const STALE_MS = 3 * 60 * 60_000;
export const MAX_AGE_MS = 8 * 60 * 60_000;

/** A call as folded from its records: a StationCall minus the map location, plus what the feed needs
 *  to find one. */
export interface FoldedCall extends Omit<StationCall, "location" | "locating"> {
  emailLocation: { lat: number; lon: number } | null;
  /** The geocode cache key for this call's address, when it has one. */
  addressKey: string | null;
}

const MATCH_DISPATCH_MS = 3 * 60_000;
const MATCH_DUPLICATE_MS = 15 * 60_000;
const MATCH_ADDRESS_MS = 6 * 60 * 60_000;

function byTime(a: CadRecord, b: CadRecord) {
  return a.receivedAt - b.receivedAt || a.id.localeCompare(b.id);
}

/** Group records into calls: by event number, else by the dispatch time a closeout prints, else by
 *  address. 911 notifications only ever add detail to a call that exists. */
export function groupRecords(records: CadRecord[]): Map<string, CadRecord[]> {
  const sorted = [...records].sort(byTime);
  const groups = new Map<string, CadRecord[]>();
  const add = (key: string, record: CadRecord) => {
    const list = groups.get(key);
    if (list) list.push(record);
    else groups.set(key, [record]);
  };
  const loose: CadRecord[] = [];
  for (const record of sorted) {
    const key = eventKeyOf(record.eventNumber);
    if (key) add(key, record);
    else loose.push(record);
  }

  const firstTime = (list: CadRecord[]) => {
    let best = Infinity;
    for (const r of list) best = Math.min(best, r.times.dispatched ?? (r.kind === "dispatch" ? r.statusAt ?? r.receivedAt : Infinity));
    return Number.isFinite(best) ? best : list[0].receivedAt;
  };
  const lastTime = (list: CadRecord[]) => Math.max(...list.map((r) => r.receivedAt));
  const addressOf = (list: CadRecord[]) => {
    for (let i = list.length - 1; i >= 0; i--) {
      const key = normalizeAddress(list[i].address);
      if (key) return key;
    }
    return null;
  };

  for (const record of loose) {
    const address = normalizeAddress(record.address);
    let target: string | null = null;
    if (record.kind === "closeout" && record.times.dispatched !== undefined) {
      for (const [key, list] of groups) {
        if (Math.abs(firstTime(list) - record.times.dispatched) <= MATCH_DISPATCH_MS) { target = key; break; }
      }
    }
    if (!target && address) {
      for (const [key, list] of groups) {
        if (addressOf(list) !== address) continue;
        // A second dispatch to the same address hours later is a new call; a status update or a
        // closeout belongs to the call that is still open there.
        const near = record.kind === "dispatch"
          ? Math.abs((record.statusAt ?? record.receivedAt) - firstTime(list)) <= MATCH_DUPLICATE_MS
          : Math.abs(record.receivedAt - lastTime(list)) <= MATCH_ADDRESS_MS;
        if (near) { target = key; break; }
      }
    }
    if (target) add(target, record);
    else if (record.kind === "dispatch" || record.kind === "closeout") add(`m${record.id}`, record);
    // A loose status update or notification that matches nothing has nothing to show.
  }

  for (const [key, list] of groups) {
    if (!list.some((r) => r.kind !== "notification")) groups.delete(key);
  }
  return groups;
}

/** The latest non-empty value, preferring the CAD's own dispatch and status emails, then closeouts,
 *  then 911 notifications. */
function pick<T>(list: CadRecord[], read: (r: CadRecord) => T | null | undefined): T | null {
  for (const kinds of [["dispatch", "status"], ["closeout"], ["notification"]] as const) {
    for (let i = list.length - 1; i >= 0; i--) {
      const r = list[i];
      if (!(kinds as readonly string[]).includes(r.kind)) continue;
      const v = read(r);
      if (v !== null && v !== undefined && v !== "") return v;
    }
  }
  return null;
}

function minTime(current: number | undefined, value: number | null | undefined): number | undefined {
  if (value === null || value === undefined || !Number.isFinite(value)) return current;
  return current === undefined || value < current ? value : current;
}

export function foldGroup(key: string, list: CadRecord[]): FoldedCall {
  const records = [...list].sort(byTime);
  const times: Partial<Record<PhaseOrClosed, number>> = {};
  let cancelled = false;
  for (const r of records) {
    for (const [phase, ms] of Object.entries(r.times) as Array<[PhaseOrClosed, number]>) times[phase] = minTime(times[phase], ms);
    if (r.kind === "dispatch") times.dispatched = minTime(times.dispatched, r.statusAt ?? r.receivedAt);
    if (r.kind === "status" && r.status) times[r.status] = minTime(times[r.status], r.statusAt ?? r.receivedAt);
    if (r.cancelled) cancelled = true;
  }
  const closeouts = records.filter((r) => r.kind === "closeout");
  if (closeouts.length && times.closed === undefined) times.closed = Math.min(...closeouts.map((r) => r.receivedAt));

  const dispatchedAt = times.dispatched ?? Math.min(...records.map((r) => r.statusAt ?? r.receivedAt));
  times.dispatched = dispatchedAt;

  let phase: CallPhase = "dispatched";
  for (const p of CALL_PHASES) if (times[p] !== undefined && phaseRank(p) > phaseRank(phase)) phase = p;
  if (cancelled) phase = "clear";
  const closedAt = times.closed ?? (phase === "clear" ? times.clear ?? null : null);
  if (closedAt !== null && phase !== "clear") phase = "clear";
  if (phase === "clear") times.clear = minTime(times.clear, closedAt) ?? times.clear;

  const phaseTimes: Partial<Record<CallPhase, string>> = {};
  for (const p of CALL_PHASES) {
    const ms = times[p];
    if (ms !== undefined) phaseTimes[p] = new Date(ms).toISOString();
  }

  const units: string[] = [];
  for (const r of records) for (const u of r.units) if (!units.includes(u)) units.push(u);

  const eventNumber = pick(records, (r) => r.eventNumber);
  const address = pick(records, (r) => r.address);
  const city = pick(records, (r) => r.city);
  const latest = Math.max(...records.map((r) => r.receivedAt), ...Object.values(times).filter((v): v is number => v !== undefined));
  const phaseAt = times[phase] ?? dispatchedAt;

  return {
    id: key,
    eventNumber,
    nature: pick(records, (r) => r.nature) ?? pick(records, (r) => r.detail) ?? "CAD Call",
    detail: pick(records, (r) => r.detail),
    address,
    city,
    place: pick(records, (r) => r.place),
    crossStreets: pick(records, (r) => r.crossStreets),
    units,
    phase,
    phaseAt: new Date(phaseAt).toISOString(),
    times: phaseTimes,
    dispatchedAt: new Date(dispatchedAt).toISOString(),
    closedAt: closedAt === null ? null : new Date(closedAt).toISOString(),
    cancelled,
    changedAt: new Date(latest).toISOString(),
    emailLocation: pick(records, (r) => r.location),
    addressKey: normalizeAddress(address, city),
  };
}

/** The calls the TV shows now: every active call, plus calls that closed in the last few minutes,
 *  oldest dispatch first. */
export function foldCalls(records: CadRecord[], options: FoldOptions): FoldedCall[] {
  const now = options.now;
  const recent = options.recentClosedMs ?? RECENT_CLOSED_MS;
  const stale = options.staleMs ?? STALE_MS;
  const maxAge = options.maxAgeMs ?? MAX_AGE_MS;
  const out: FoldedCall[] = [];
  for (const [key, list] of groupRecords(records)) {
    const call = foldGroup(key, list);
    const dispatched = Date.parse(call.dispatchedAt);
    if (call.closedAt) {
      if (now - Date.parse(call.closedAt) <= recent) out.push(call);
      continue;
    }
    const lastNews = Date.parse(call.changedAt);
    if (now - lastNews > stale || now - dispatched > maxAge) continue;
    out.push(call);
  }
  return out.sort((a, b) => Date.parse(a.dispatchedAt) - Date.parse(b.dispatchedAt) || a.id.localeCompare(b.id));
}
