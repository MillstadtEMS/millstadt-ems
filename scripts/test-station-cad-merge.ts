// Station TV CAD feed: folding, storage and geocoding.
// Run with  node --import tsx --test scripts/test-station-cad-merge.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCadMessage } from "../lib/station/cad/parse";
import { foldCalls, normalizeAddress, toRecord, type CadRecord } from "../lib/station/cad/merge";
import { memoryStore } from "../lib/station/cad/store";
import { geocodeAddress, geocodeQuery } from "../lib/station/cad/geocode";
import { feedHealth } from "../lib/station/cad/feed";
import { demoCalls } from "../lib/station/cad/demo";
import { chicagoToUtc } from "../lib/station/cad/time";

const ct = (h: number, mi: number, s = 0, d = 4) => chicagoToUtc(2026, 4, d, h, mi, s);
const CHIEF = "alert@cfmsg.co";
const CENCOM = "cencom@omnigo.com";

function rec(id: string, from: string, subject: string, body: string, receivedAt: number): CadRecord {
  const r = toRecord(id, parseCadMessage({ from, subject, body, receivedAt }));
  assert.ok(r, `${id} should be a call record`);
  return r;
}

const report = (status: string, extra = "") =>
  `Event Report\nCategory: MEDICAL-FIRST RESPONDER\nStatus: ${status}\nEvent No: 2026-40118\nLocation: 118 WILLOW CREEK DR, MILLSTADT\nCross Streets: BLUFF RD / OLD COLLINSVILLE RD\nUnits: M3925\n17:30 April 4,2026${extra}`;
const SUBJECT = "[39 EMS CAD] MEDICAL-FIRST RESPONDER -- 118 Willow Creek Dr...";

const dispatch = () => rec("m1", CHIEF, SUBJECT, report("Dispatched"), ct(17, 30, 40));
const enroute = () => rec("m2", CHIEF, SUBJECT, report("Enroute"), ct(17, 32, 5));
const onScene = () => rec("m3", CHIEF, SUBJECT, report("On Scene"), ct(17, 39, 30));
const closeout = () => rec("m4", CENCOM, "EVENT CLOSEOUT",
  "EVENT CLOSEOUT\nEvent No: 2026-40118\nDispatch: 04/04/2026 17:30:34\nEnroute: 04/04/2026 17:31:50\nOn Scene: 04/04/2026 17:39:02\nTransport: 04/04/2026 17:58:40\nAt Hospital: 04/04/2026 18:16:15\nAvailable: 04/04/2026 18:31:00\nClosed: 04/04/2026 18:37:35",
  ct(18, 38, 2));

test("a call builds up from its dispatch and status emails", () => {
  const [call] = foldCalls([dispatch(), enroute(), onScene()], { now: ct(17, 45) });
  assert.equal(call.id, "e40118");
  assert.equal(call.eventNumber, "2026-40118");
  assert.equal(call.nature, "Medical");
  assert.equal(call.address, "118 Willow Creek Dr");
  assert.equal(call.city, "Millstadt");
  assert.equal(call.crossStreets, "Bluff Rd / Old Collinsville Rd");
  assert.deepEqual(call.units, ["M3925"]);
  assert.equal(call.phase, "onscene");
  assert.equal(call.dispatchedAt, new Date(ct(17, 30)).toISOString());
  assert.equal(call.times.enroute, new Date(ct(17, 32, 5)).toISOString());
  assert.equal(call.times.onscene, new Date(ct(17, 39, 30)).toISOString());
  assert.equal(call.closedAt, null);
  assert.equal(call.addressKey, "118 WILLOW CREEK DR|MILLSTADT");
});

test("arrival order does not matter", () => {
  const a = foldCalls([dispatch(), enroute(), onScene()], { now: ct(17, 45) });
  const b = foldCalls([onScene(), dispatch(), enroute()], { now: ct(17, 45) });
  assert.deepEqual(a, b);
});

test("a closeout fills in every phase, closes the call, and it leaves the screen after 10 minutes", () => {
  const records = [dispatch(), enroute(), onScene(), closeout()];
  const [call] = foldCalls(records, { now: ct(18, 40) });
  assert.equal(call.phase, "clear");
  assert.equal(call.closedAt, new Date(ct(18, 37, 35)).toISOString());
  assert.equal(call.dispatchedAt, new Date(ct(17, 30)).toISOString(), "earliest dispatch time wins");
  assert.equal(call.times.enroute, new Date(ct(17, 31, 50)).toISOString(), "the closeout's exact times are earlier than the email arrivals");
  assert.equal(call.times.transport, new Date(ct(17, 58, 40)).toISOString());
  assert.equal(call.times.athospital, new Date(ct(18, 16, 15)).toISOString());
  assert.equal(call.times.clear, new Date(ct(18, 31)).toISOString());
  assert.equal(foldCalls(records, { now: ct(18, 47, 34) }).length, 1);
  assert.equal(foldCalls(records, { now: ct(18, 47, 36) }).length, 0);
});

test("a closeout without an event number joins its call by dispatch time", () => {
  const loose = rec("m5", CENCOM, "EVENT CLOSEOUT", "EVENT CLOSEOUT\nDispatch: 04/04/2026 17:30:34\nClosed: 04/04/2026 18:37:35", ct(18, 38));
  const calls = foldCalls([dispatch(), enroute(), loose], { now: ct(18, 40) });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].phase, "clear");
});

test("Cleared from Chief 360 ends the call even before the closeout", () => {
  const cleared = rec("m6", CHIEF, SUBJECT, report("Cleared"), ct(18, 31, 10));
  const [call] = foldCalls([dispatch(), enroute(), cleared], { now: ct(18, 32) });
  assert.equal(call.phase, "clear");
  assert.equal(call.closedAt, new Date(ct(18, 31, 10)).toISOString());
});

test("a cancelled call reads as clear and cancelled", () => {
  const cancelled = rec("m7", CHIEF, SUBJECT, report("Cancelled"), ct(17, 33));
  const [call] = foldCalls([dispatch(), cancelled], { now: ct(17, 34) });
  assert.equal(call.phase, "clear");
  assert.equal(call.cancelled, true);
});

test("a call with no news for three hours is assumed over (a missed closeout)", () => {
  assert.equal(foldCalls([dispatch(), enroute()], { now: ct(20, 32) }).length, 1);
  assert.equal(foldCalls([dispatch(), enroute()], { now: ct(20, 33) }).length, 0);
});

test("911 notifications never create a call, but add detail to one that exists", () => {
  const notice = rec("n1", CENCOM, "911 CALL", "Call Type: MEDICAL\nEvent No: 2026-40999\nLocation: 9 ELM ST", ct(17, 29));
  assert.equal(foldCalls([notice], { now: ct(17, 31) }).length, 0);
  const bare = rec("d2", CHIEF, "[39 EMS CAD] CHEST PAIN -- 9 Elm St", "Category: CHEST PAIN\nStatus: Dispatched\nEvent No: 2026-40999", ct(17, 30));
  const withCross = rec("n2", CENCOM, "911 CALL", "Call Type: MEDICAL\nEvent No: 2026-40999\nLocation: 9 ELM ST\nCross Street: MAIN ST", ct(17, 29));
  const [call] = foldCalls([bare, withCross], { now: ct(17, 31) });
  assert.equal(call.nature, "Chest Pain", "the CAD's own call type wins over the 911 notification's");
  assert.equal(call.crossStreets, "Main St");
});

test("paired dispatch emails make one call; separate events make separate calls, oldest first", () => {
  const first = rec("a1", CHIEF, SUBJECT, report("Dispatched"), ct(17, 30, 40));
  const twin = rec("a2", CHIEF, SUBJECT, report("Dispatched"), ct(17, 30, 42));
  const other = rec("b1", CHIEF, "[39 EMS CAD] STROKE -- 31 Pine Ct", "Category: STROKE\nStatus: Dispatched\nEvent No: 2026-40120\nLocation: 31 PINE CT", ct(17, 20));
  const calls = foldCalls([first, twin, other], { now: ct(17, 40) });
  assert.deepEqual(calls.map((c) => c.id), ["e40120", "e40118"]);
});

test("dispatches without event numbers: duplicates merge, a later call at the same address does not", () => {
  const mk = (id: string, at: number) => rec(id, CHIEF, "[39 EMS CAD] FALL -- 77 Main St", "", at);
  assert.equal(foldCalls([mk("x1", ct(9, 0)), mk("x2", ct(9, 2))], { now: ct(9, 5) }).length, 1);
  assert.equal(foldCalls([mk("x1", ct(9, 0)), mk("x3", ct(11, 0))], { now: ct(11, 5) }).length, 2);
});

test("normalizeAddress", () => {
  assert.equal(normalizeAddress("6000 Blk Floraville Rd.", "Millstadt"), "6000 FLORAVILLE RD|MILLSTADT");
  assert.equal(normalizeAddress(null), null);
});

// ── Storage ───────────────────────────────────────────────────────────────────────────────────────

function freshState() {
  return {
    seen: new Map(), events: new Map(), geocodes: new Map(),
    sync: { lastSyncAt: null, lastOkAt: null, lastError: null, lastErrorAt: null, lastDurationMs: null, lastFetched: 0 },
  };
}

test("memory store: one sync at a time, each message stored once, 48-hour purge", async () => {
  const store = memoryStore(freshState());
  assert.equal(await store.claimSync(20_000), true);
  assert.equal(await store.claimSync(20_000), false, "a second caller inside the interval waits");
  const record = dispatch();
  await store.save([
    { messageId: "m1", kind: "dispatch", receivedAt: record.receivedAt, record, eventKey: "e40118" },
    { messageId: "u1", kind: "unknown", receivedAt: record.receivedAt, record: null, eventKey: null },
  ]);
  await store.save([{ messageId: "m1", kind: "dispatch", receivedAt: record.receivedAt, record, eventKey: "e40118" }]);
  assert.deepEqual([...(await store.seen(["m1", "u1", "zz"]))].sort(), ["m1", "u1"]);
  assert.equal((await store.records(0)).length, 1);
  assert.deepEqual(await store.counts(), { events: 1, messages: 2, parseFailures: 1 });
  await store.purge(Date.now() + 49 * 60 * 60_000);
  assert.equal((await store.records(0)).length, 0);
  assert.equal((await store.seen(["m1"])).size, 0);
});

test("memory store: geocode claims, hits and misses", async () => {
  const store = memoryStore(freshState());
  assert.equal(await store.claimGeocode("K"), true);
  assert.equal(await store.claimGeocode("K"), false, "already being looked up");
  await store.saveGeocode("K", { lat: 38.46, lon: -90.09, source: "census", approximate: false });
  assert.equal((await store.geocodes(["K"])).get("K")?.status, "hit");
  assert.equal(await store.claimGeocode("K"), false, "found addresses are not looked up again");
  await store.saveGeocode("M", null);
  assert.equal((await store.geocodes(["M"])).get("M")?.status, "miss");
  assert.equal(await store.claimGeocode("M"), false, "a miss waits before it is retried");
});

test("feed health: delayed after two minutes without a good sync, errors only while unresolved", () => {
  const now = Date.now();
  const ok = { lastSyncAt: now, lastOkAt: now - 30_000, lastError: "old", lastErrorAt: now - 60_000, lastDurationMs: 400, lastFetched: 2 };
  assert.deepEqual({ ...feedHealth(ok, now), lastSyncAt: null, lastOkAt: null }, { lastSyncAt: null, lastOkAt: null, error: null, delayed: false });
  const failing = { ...ok, lastOkAt: now - 5 * 60_000, lastError: "Gmail request failed (401)", lastErrorAt: now - 10_000 };
  const health = feedHealth(failing, now);
  assert.equal(health.error, "Gmail request failed (401)");
  assert.equal(health.delayed, true);
});

// ── Geocoding (no network: a fake fetch) ──────────────────────────────────────────────────────────

type Route = (url: URL) => unknown;
function fakeFetch(route: Route) {
  const calls: string[] = [];
  const impl = (async (input: string | URL | Request) => {
    const url = new URL(String(input));
    calls.push(url.hostname);
    const body = route(url);
    if (body instanceof Error) throw body;
    return Response.json(body);
  }) as typeof fetch;
  return { impl, calls };
}

const census = (lat: number, lon: number) => ({ result: { addressMatches: [{ coordinates: { x: lon, y: lat } }] } });

test("geocodeQuery cleans blocks, apartments and intersections", () => {
  assert.deepEqual(geocodeQuery("6000 Blk Floraville Rd", null), { street: "6000 Floraville Rd", intersection: null, city: "Millstadt", hasNumber: true });
  assert.equal(geocodeQuery("40 Elm St Apt 3", "Columbia")?.street, "40 Elm St");
  assert.deepEqual(geocodeQuery("Rt 158 / Rt 163", "Millstadt")?.intersection, ["Rt 158", "Rt 163"]);
  assert.equal(geocodeQuery("100 Main St & Elm St", null)?.street, "100 Main St");
  assert.equal(geocodeQuery("I-255 SB MM 9", null), null);
});

test("Census first, biased to the call's town", async () => {
  const fake = fakeFetch((url) => {
    assert.equal(url.hostname, "geocoding.geo.census.gov");
    assert.match(url.searchParams.get("address") ?? "", /^6000 Floraville Rd, Millstadt, IL$/);
    return census(38.440022, -90.08227);
  });
  assert.deepEqual(await geocodeAddress("6000 Blk Floraville Rd", null, { fetchImpl: fake.impl }), { lat: 38.440022, lon: -90.08227, source: "census", approximate: false });
});

test("Nominatim when the Census has no match; far-away answers are rejected", async () => {
  const fake = fakeFetch((url) => (url.hostname.startsWith("geocoding") ? { result: { addressMatches: [] } } : [
    { lat: "41.8781", lon: "-87.6298", place_rank: 30 },
    { lat: "38.4466", lon: "-90.2031", place_rank: 30 },
  ]));
  const hit = await geocodeAddress("512 N Main St", "Columbia", { fetchImpl: fake.impl });
  assert.deepEqual(hit, { lat: 38.4466, lon: -90.2031, source: "nominatim", approximate: false });
  assert.deepEqual(fake.calls, ["geocoding.geo.census.gov", "nominatim.openstreetmap.org"]);
});

test("a geocoder that fails or times out means not found, never an error", async () => {
  const fake = fakeFetch(() => new Error("The operation was aborted due to timeout"));
  assert.equal(await geocodeAddress("6000 Floraville Rd", "Millstadt", { fetchImpl: fake.impl }), null);
});

test("intersections are where the two streets share an OpenStreetMap point", async () => {
  const fake = fakeFetch((url) => {
    const q = url.searchParams.get("q") ?? "";
    if (q.startsWith("Route 158")) return [{ geojson: { type: "LineString", coordinates: [[-90.10, 38.4613], [-90.0918, 38.4613], [-90.08, 38.4612]] } }];
    return [{ geojson: { type: "LineString", coordinates: [[-90.0918, 38.47], [-90.0918, 38.4613], [-90.0918, 38.45]] } }];
  });
  const hit = await geocodeAddress("Rt 158 / Rt 163", "Millstadt", { fetchImpl: fake.impl });
  assert.deepEqual(hit, { lat: 38.4613, lon: -90.0918, source: "nominatim", approximate: false });
});

// ── Demo ──────────────────────────────────────────────────────────────────────────────────────────

test("demo calls: a call comes in, is located, goes enroute after ~30 s, clears, then a new one", () => {
  const t0 = Date.parse("2026-11-25T12:00:00Z");
  assert.equal(demoCalls("demo", t0, t0 + 1000).length, 0, "quiet at first, so the arrival shows");
  const [start] = demoCalls("demo", t0, t0 + 5000);
  assert.equal(start.phase, "dispatched");
  assert.equal(start.locating, true);
  assert.equal(start.location, null);
  const [later] = demoCalls("demo", t0, t0 + 31_000);
  assert.equal(later.phase, "enroute");
  assert.ok(later.location);
  assert.equal(demoCalls("demo", t0, t0 + 300_000)[0].phase, "clear");
  const [next] = demoCalls("demo", t0, t0 + 365_000);
  assert.notEqual(next.id, start.id);
  assert.deepEqual(demoCalls("demo3", t0, t0 + 1000).map((c) => c.phase), ["onscene", "enroute"]);
  assert.deepEqual(demoCalls("demo3", t0, t0 + 7000).map((c) => c.phase), ["onscene", "enroute", "dispatched"]);
});
