// Station TV CAD parser: run with  node --import tsx --test scripts/test-station-cad-parse.ts
// There are no real CAD emails in the repo, so these fixtures imitate the shapes we expect (Chief 360
// "Event Report" dispatches and status updates from alert@cfmsg.co, CENCOM 911 notifications and
// EVENT CLOSEOUT reports from cencom@omnigo.com) in plain text, HTML tables, flattened tables and
// forwarded wrappers. Every address and name here is made up.

import assert from "node:assert/strict";
import { test } from "node:test";
import { stripHtml } from "../lib/cad/parser";
import { canonicalEventNumber, mapStatus, parseCadMessage, splitLocation, titleCaseAddress } from "../lib/station/cad/parse";
import { chicagoToUtc, parseCadDateTime } from "../lib/station/cad/time";

const ct = (y: number, mo: number, d: number, h: number, mi: number, s = 0) => chicagoToUtc(y, mo, d, h, mi, s);
const CHIEF = "Chief 360 Alerts <alert@cfmsg.co>";
const CENCOM = "CENCOM <cencom@omnigo.com>";

// ── Chief 360 dispatch and status updates ─────────────────────────────────────────────────────────

const chiefDispatch = `Event Report

Category: MEDICAL-FIRST RESPONDER
Status: Dispatched
Event No: 2026-40118
Location: 118 WILLOW CREEK DR, MILLSTADT
Cross Streets: OLD COLLINSVILLE RD / BLUFF RD
Units: M3925
Problem: FALL - POSSIBLE HIP INJURY
17:30 April 4,2026

Notes: 81 YOF FELL IN KITCHEN, CALLER IS DAUGHTER 618-555-0100
Caller: JANE EXAMPLE`;

test("Chief 360 dispatch: every field the TV needs, nothing it must not show", () => {
  const m = parseCadMessage({
    from: CHIEF,
    subject: "[39 EMS CAD] MEDICAL-FIRST RESPONDER -- 118 Willow Creek Dr...",
    body: chiefDispatch,
    receivedAt: ct(2026, 4, 4, 17, 30, 40),
  });
  assert.equal(m.kind, "dispatch");
  assert.equal(m.source, "chief360");
  assert.equal(m.eventNumber, "2026-40118");
  assert.equal(m.nature, "Medical");
  assert.equal(m.natureRaw, "MEDICAL-FIRST RESPONDER");
  assert.equal(m.detail, "Fall - Possible Hip Injury");
  assert.equal(m.address, "118 Willow Creek Dr");
  assert.equal(m.city, "Millstadt");
  assert.equal(m.crossStreets, "Old Collinsville Rd / Bluff Rd");
  assert.deepEqual(m.units, ["M3925"]);
  assert.equal(m.status, "dispatched");
  assert.equal(m.statusAt, ct(2026, 4, 4, 17, 30, 0));
  assert.equal(m.cancelled, false);
  assert.equal(m.location, null);
  const json = JSON.stringify(m);
  assert.doesNotMatch(json, /JANE|KITCHEN|555-0100|DAUGHTER/i, "callers, notes and phone numbers are never kept");
});

test("Chief 360 status update: a repeated creation time is not mistaken for the status time", () => {
  const body = chiefDispatch.replace("Status: Dispatched", "Status: Enroute");
  const m = parseCadMessage({ from: CHIEF, subject: "[39 EMS CAD] MEDICAL-FIRST RESPONDER -- 118 Willow Creek Dr...", body, receivedAt: ct(2026, 4, 4, 17, 32, 5) });
  assert.equal(m.kind, "status");
  assert.equal(m.status, "enroute");
  assert.equal(m.statusAt, ct(2026, 4, 4, 17, 32, 5), "falls back to the email's arrival");
  assert.equal(m.eventNumber, "2026-40118");
});

test("Chief 360 status update with its own time line uses that time", () => {
  const body = chiefDispatch.replace("Status: Dispatched", "Status: On Scene").replace("17:30 April 4,2026", "17:39 April 4,2026");
  const m = parseCadMessage({ from: CHIEF, subject: "[39 EMS CAD] MEDICAL-FIRST RESPONDER -- 118 Willow Creek Dr...", body, receivedAt: ct(2026, 4, 4, 17, 39, 31) });
  assert.equal(m.kind, "status");
  assert.equal(m.status, "onscene");
  assert.equal(m.statusAt, ct(2026, 4, 4, 17, 39, 0));
});

test("labeled status times win, in several spellings", () => {
  for (const [line, phase] of [
    ["Status: ON-SCENE\nStatus Time: 04/04/2026 17:41:12", "onscene"],
    ["Status: Transporting\nTimestamp: 04/04/2026 17:41:12", "transport"],
    ["Unit Status: AT HOSPITAL\nStatus Date/Time: 2026-04-04 17:41:12", "athospital"],
    ["Status: Available\nStatus Changed: 4/4/26 5:41:12 PM", "clear"],
    ["Status: Cleared\nTime Stamp: 17:41:12 04/04/2026", "clear"],
  ] as const) {
    const m = parseCadMessage({ from: CHIEF, subject: "[39 EMS CAD] CHEST PAIN -- 9 Elm St", body: `Event No: 2026-40118\n${line}`, receivedAt: ct(2026, 4, 4, 17, 42, 0) });
    assert.equal(m.kind, "status", line);
    assert.equal(m.status, phase, line);
    assert.equal(m.statusAt, ct(2026, 4, 4, 17, 41, 12), line);
  }
});

test("a cancelled call reads as clear and cancelled", () => {
  for (const status of ["Cancelled", "CANCELED", "Disregard", "Stand Down"]) {
    const m = parseCadMessage({ from: CHIEF, subject: "[39 EMS CAD] MEDICAL -- 9 Elm St", body: `Event No: 2026-40119\nStatus: ${status}`, receivedAt: ct(2026, 4, 4, 17, 45) });
    assert.equal(m.kind, "status", status);
    assert.equal(m.status, "clear", status);
    assert.equal(m.cancelled, true, status);
  }
});

test("subject-only dispatch still yields a call", () => {
  const m = parseCadMessage({ from: CHIEF, subject: "[39 EMS CAD] FALL -- 77 Main St", body: "", receivedAt: ct(2026, 4, 4, 9, 2, 11) });
  assert.equal(m.kind, "dispatch");
  assert.equal(m.nature, "Fall");
  assert.equal(m.address, "77 Main St");
  assert.equal(m.eventNumber, null);
  assert.equal(m.statusAt, ct(2026, 4, 4, 9, 2, 11));
});

test("truncated subject address is cleaned, and the body's address is preferred", () => {
  const subjectOnly = parseCadMessage({ from: CHIEF, subject: "[39 EMS CAD] SICK PERSON -- 2210 Old Mill Rd Mills...", body: "Event No: 2026-40500", receivedAt: ct(2026, 4, 4, 9, 2) });
  assert.equal(subjectOnly.address, "2210 Old Mill Rd Mills");
  const both = parseCadMessage({ from: CHIEF, subject: "[39 EMS CAD] SICK PERSON -- 2210 Old Mill Rd Mills...", body: "Event No: 2026-40500\nLocation: 2210 OLD MILL RD, MILLSTADT IL 62260", receivedAt: ct(2026, 4, 4, 9, 2) });
  assert.equal(both.address, "2210 Old Mill Rd");
  assert.equal(both.city, "Millstadt");
});

// ── HTML ──────────────────────────────────────────────────────────────────────────────────────────

const htmlDispatch = `<html><head><style>td{font:12px Arial}</style></head><body>
<p><b>EVENT REPORT</b></p>
<table border="1">
<tr><td><b>Category:</b></td><td>CHEST PAIN</td></tr>
<tr><td><b>Status:</b></td><td>Dispatched</td></tr>
<tr><td>Event No:</td><td>2026-40201</td></tr>
<tr><td>Location:</td><td>4521 BELLEVILLE ST, SMITHTON, IL 62285</td></tr>
<tr><td>Cross Street:</td><td>MAIN ST &amp; OAK ST</td></tr>
<tr><td>Units:</td><td>M3926, M3935</td></tr>
<tr><td>Date/Time:</td><td>04/05/2026 02:14:09</td></tr>
<tr><td>Comments:</td><td>PT IS 54 YOM, CALLER JOHN EXAMPLE</td></tr>
</table></body></html>`;

test("raw HTML table dispatch", () => {
  const m = parseCadMessage({ from: CHIEF, subject: "[39 EMS CAD] CHEST PAIN -- 4521 Belleville St", body: htmlDispatch, receivedAt: ct(2026, 4, 5, 2, 14, 30) });
  assert.equal(m.kind, "dispatch");
  assert.equal(m.eventNumber, "2026-40201");
  assert.equal(m.nature, "Chest Pain");
  assert.equal(m.address, "4521 Belleville St");
  assert.equal(m.city, "Smithton");
  assert.equal(m.crossStreets, "Main St / Oak St");
  assert.deepEqual(m.units, ["M3926", "M3935"]);
  assert.equal(m.statusAt, ct(2026, 4, 5, 2, 14, 9));
  assert.doesNotMatch(JSON.stringify(m), /JOHN|54 YOM/);
});

test("HTML table flattened by the ticker's stripHtml (labels without colons)", () => {
  const flattened = stripHtml(htmlDispatch.replace(/:<\/b>|:<\/td>/g, (s) => s.replace(":", "")));
  const m = parseCadMessage({ from: CHIEF, subject: "[39 EMS CAD] CHEST PAIN -- 4521 Belleville St", body: flattened, receivedAt: ct(2026, 4, 5, 2, 14, 30) });
  assert.equal(m.kind, "dispatch");
  assert.equal(m.eventNumber, "2026-40201");
  assert.equal(m.address, "4521 Belleville St");
  assert.equal(m.city, "Smithton");
  assert.equal(m.crossStreets, "Main St / Oak St");
  assert.deepEqual(m.units, ["M3926", "M3935"]);
});

test("HTML with label and value in separate rows", () => {
  const body = `<table><tr><td>Location:</td></tr><tr><td>16 N JEFFERSON ST</td></tr><tr><td>Nature:</td></tr><tr><td>UNCONSCIOUS / FAINTING</td></tr><tr><td>Incident #:</td></tr><tr><td>2026-40777</td></tr></table>`;
  const m = parseCadMessage({ from: CHIEF, subject: "[39 EMS CAD] UNCONSCIOUS", body, receivedAt: ct(2026, 4, 5, 6, 0) });
  assert.equal(m.address, "16 N Jefferson St");
  assert.equal(m.nature, "Unconscious / Fainting");
  assert.equal(m.eventNumber, "2026-40777");
});

// ── CENCOM ────────────────────────────────────────────────────────────────────────────────────────

const closeout = `EVENT CLOSEOUT

Event No: 2026-40118
Nature: MEDICAL-FIRST RESPONDER
Location: 118 WILLOW CREEK DR MILLSTADT
Dispatch:    04/04/2026 17:30:34
Enroute:     04/04/2026 17:31:50
On Scene:    04/04/2026 17:39:02
Transport:   04/04/2026 17:58:40
At Hospital: 04/04/2026 18:16:15
Available:   04/04/2026 18:31:00
Closed:      04/04/2026 18:37:35
Disposition: TRANSPORTED`;

test("CENCOM closeout: every phase time", () => {
  const m = parseCadMessage({ from: CENCOM, subject: "EVENT CLOSEOUT", body: closeout, receivedAt: ct(2026, 4, 4, 18, 38, 2) });
  assert.equal(m.kind, "closeout");
  assert.equal(m.source, "cencom");
  assert.equal(m.eventNumber, "2026-40118");
  assert.equal(m.address, "118 Willow Creek Dr");
  assert.equal(m.city, "Millstadt");
  assert.deepEqual(m.times, {
    dispatched: ct(2026, 4, 4, 17, 30, 34),
    enroute: ct(2026, 4, 4, 17, 31, 50),
    onscene: ct(2026, 4, 4, 17, 39, 2),
    transport: ct(2026, 4, 4, 17, 58, 40),
    athospital: ct(2026, 4, 4, 18, 16, 15),
    clear: ct(2026, 4, 4, 18, 31, 0),
    closed: ct(2026, 4, 4, 18, 37, 35),
  });
});

test("closeout with only Dispatch and Closed (the minimum CENCOM sends)", () => {
  const m = parseCadMessage({ from: CENCOM, subject: "EVENT CLOSEOUT", body: "EVENT CLOSEOUT\nEvent No: 2026-40120\nDispatch: 04/04/2026 17:30:34\nClosed: 04/04/2026 18:37:35", receivedAt: ct(2026, 4, 4, 18, 38) });
  assert.equal(m.kind, "closeout");
  assert.equal(m.times.dispatched, ct(2026, 4, 4, 17, 30, 34));
  assert.equal(m.times.closed, ct(2026, 4, 4, 18, 37, 35));
  assert.equal(m.times.enroute, undefined);
});

test("closeout on one line, with labels run together", () => {
  const body = "EVENT CLOSEOUT Event #: 2026-40121 Dispatched: 04/04/2026 17:30:34 Enroute: 17:31:50 On Scene: 17:39:02 Closed: 18:37:35";
  const m = parseCadMessage({ from: CENCOM, subject: "EVENT CLOSEOUT", body, receivedAt: ct(2026, 4, 4, 18, 38) });
  assert.equal(m.kind, "closeout");
  assert.equal(m.eventNumber, "2026-40121");
  assert.equal(m.times.dispatched, ct(2026, 4, 4, 17, 30, 34));
  assert.equal(m.times.enroute, ct(2026, 4, 4, 17, 31, 50));
  assert.equal(m.times.onscene, ct(2026, 4, 4, 17, 39, 2));
  assert.equal(m.times.closed, ct(2026, 4, 4, 18, 37, 35));
});

test("closeout bare times run forward across midnight", () => {
  const body = "EVENT CLOSEOUT\nEvent No: 2026-40130\nDispatch: 23:52:10\nEnroute: 23:53:30\nOn Scene: 00:04:12\nTransport: 00:21:00\nAt Hospital: 00:40:45\nAvailable: 01:02:00\nClosed: 01:10:00";
  const m = parseCadMessage({ from: CENCOM, subject: "EVENT CLOSEOUT", body, receivedAt: ct(2026, 4, 5, 1, 10, 40) });
  assert.equal(m.times.dispatched, ct(2026, 4, 4, 23, 52, 10));
  assert.equal(m.times.enroute, ct(2026, 4, 4, 23, 53, 30));
  assert.equal(m.times.onscene, ct(2026, 4, 5, 0, 4, 12));
  assert.equal(m.times.athospital, ct(2026, 4, 5, 0, 40, 45));
  assert.equal(m.times.closed, ct(2026, 4, 5, 1, 10, 0));
});

test("closeout with a per-unit time table", () => {
  const body = [
    "EVENT CLOSEOUT",
    "Event No: 2026-40140",
    "Unit\tDispatched\tEnroute\tOn Scene\tTransport\tAt Hosp\tAvailable",
    "M3925\t17:30:34\t17:31:50\t17:39:02\t17:58:40\t18:16:15\t18:31:00",
    "M3926\t17:33:00\t17:34:10\t17:44:00\t\t\t18:05:00",
    "Closed: 04/04/2026 18:37:35",
  ].join("\n");
  const m = parseCadMessage({ from: CENCOM, subject: "EVENT CLOSEOUT", body, receivedAt: ct(2026, 4, 4, 18, 38) });
  assert.equal(m.kind, "closeout");
  assert.deepEqual(m.units, ["M3925", "M3926"]);
  assert.equal(m.unitTimes.M3925?.onscene, ct(2026, 4, 4, 17, 39, 2));
  assert.equal(m.unitTimes.M3926?.clear, ct(2026, 4, 4, 18, 5, 0));
  assert.equal(m.times.dispatched, ct(2026, 4, 4, 17, 30, 34), "earliest unit time per phase");
  assert.equal(m.times.transport, ct(2026, 4, 4, 17, 58, 40));
});

test("unit-prefixed status lines", () => {
  const body = "EVENT CLOSEOUT\nEvent No: 2026-40141\nM3925 Enroute 17:31:10\nM3925 - On Scene: 04/04/2026 17:38:22\nClosed: 04/04/2026 18:00:00";
  const m = parseCadMessage({ from: CENCOM, subject: "EVENT CLOSEOUT", body, receivedAt: ct(2026, 4, 4, 18, 1) });
  assert.equal(m.times.enroute, ct(2026, 4, 4, 17, 31, 10));
  assert.equal(m.times.onscene, ct(2026, 4, 4, 17, 38, 22));
  assert.deepEqual(m.units, ["M3925"]);
});

test("forwarded closeout keeps the original sender and subject", () => {
  const body = `---------- Forwarded message ---------
From: CENCOM <cencom@omnigo.com>
Date: Sat, Apr 4, 2026 at 6:38 PM
Subject: EVENT CLOSEOUT
To: <cad@example.org>

EVENT CLOSEOUT
Event #: 26-40118
Dispatch: 17:30:34
On Scene: 17:39:02
Closed: 18:37:35`;
  const m = parseCadMessage({ from: "Someone <someone@example.org>", subject: "Fwd: EVENT CLOSEOUT", body, receivedAt: ct(2026, 4, 4, 18, 41) });
  assert.equal(m.kind, "closeout");
  assert.equal(m.source, "cencom");
  assert.equal(m.eventNumber, "2026-40118");
  assert.equal(m.times.dispatched, ct(2026, 4, 4, 17, 30, 34));
  assert.equal(m.times.closed, ct(2026, 4, 4, 18, 37, 35));
});

test("forwarded Chief 360 dispatch quoted with > markers", () => {
  const body = `Begin forwarded message:\n\n> From: alert@cfmsg.co\n> Subject: [39 EMS CAD] STROKE -- 31 Pine Ct\n> Date: April 4, 2026 at 3:02:11 PM CDT\n> To: crew@example.org\n>\n> Category: STROKE\n> Status: Dispatched\n> Event No: 2026-40150\n> Location: 31 PINE CT, MILLSTADT\n> Units: MEDIC 3925`;
  const m = parseCadMessage({ from: "crew@example.org", subject: "Fwd: [39 EMS CAD] STROKE -- 31 Pine Ct", body, receivedAt: ct(2026, 4, 4, 15, 5) });
  assert.equal(m.kind, "dispatch");
  assert.equal(m.source, "chief360");
  assert.equal(m.nature, "Stroke");
  assert.equal(m.address, "31 Pine Ct");
  assert.deepEqual(m.units, ["M3925"]);
});

test("CENCOM 911 notification is classified and never treated as a dispatch", () => {
  const body = "ST CLAIR COUNTY 911\nCall Type: MEDICAL\nEvent No: 2026-40118\nLocation: 118 WILLOW CREEK DR\nCaller Phone: 618-555-0100";
  const m = parseCadMessage({ from: CENCOM, subject: "911 CALL", body, receivedAt: ct(2026, 4, 4, 17, 29, 50) });
  assert.equal(m.kind, "notification");
  assert.equal(m.eventNumber, "2026-40118");
  assert.doesNotMatch(JSON.stringify(m), /555-0100/);
});

test("an unrelated email is unknown", () => {
  const m = parseCadMessage({ from: "news@example.org", subject: "Your weekly digest", body: "Hello! Here is what happened this week.", receivedAt: ct(2026, 4, 4, 8, 0) });
  assert.equal(m.kind, "unknown");
});

// ── Label variants, coordinates and locations ─────────────────────────────────────────────────────

test("label variants: Incident #, Nature of Call, X-St, Apparatus, Disp Time, City", () => {
  const body = "Incident #: 2026-40333\nNature of Call: ALLERGIC REACTION\nAddress: 9 ELM ST\nCity: COLUMBIA\nX-St: MAIN ST/RT 3\nApparatus: MED3925 E3911\nDisp Time: 1405";
  const m = parseCadMessage({ from: CHIEF, subject: "[39 EMS CAD] ALLERGIC REACTION -- 9 Elm St", body, receivedAt: ct(2026, 4, 6, 14, 5, 40) });
  assert.equal(m.eventNumber, "2026-40333");
  assert.equal(m.nature, "Allergic Reaction");
  assert.equal(m.address, "9 Elm St");
  assert.equal(m.city, "Columbia");
  assert.equal(m.crossStreets, "Main St / Rt 3");
  assert.deepEqual(m.units, ["M3925", "E3911"]);
  assert.equal(m.statusAt, ct(2026, 4, 6, 14, 5, 0));
});

test("coordinates from labeled lines and map links", () => {
  const cases = [
    "Lat: 38.44002\nLon: -90.08227",
    "Latitude: 38.44002 Longitude: -90.08227",
    "GPS: 38.44002, -90.08227",
    "Map: https://maps.google.com/?q=38.44002,-90.08227",
    "https://www.google.com/maps/@38.44002,-90.08227,17z",
    "X: -90.08227\nY: 38.44002",
    "Lat/Lon: 38440020, -90082270",
  ];
  for (const extra of cases) {
    const m = parseCadMessage({ from: CHIEF, subject: "[39 EMS CAD] MEDICAL -- 6000 Floraville Rd", body: `Event No: 2026-40400\nLocation: 6000 FLORAVILLE RD\n${extra}`, receivedAt: ct(2026, 4, 4, 12, 0) });
    assert.deepEqual(m.location, { lat: 38.44002, lon: -90.08227 }, extra);
  }
  const html = `<p>Event No: 2026-40401</p><p><a href="https://www.google.com/maps/search/?api=1&amp;query=38.44002%2C-90.08227">Open map</a></p>`;
  assert.deepEqual(parseCadMessage({ from: CHIEF, subject: "[39 EMS CAD] MEDICAL", body: html, receivedAt: ct(2026, 4, 4, 12, 0) }).location, { lat: 38.44002, lon: -90.08227 });
});

test("coordinates far from Millstadt are ignored", () => {
  const m = parseCadMessage({ from: CHIEF, subject: "[39 EMS CAD] MEDICAL", body: "Event No: 2026-40402\nLat: 41.8781\nLon: -87.6298", receivedAt: ct(2026, 4, 4, 12, 0) });
  assert.equal(m.location, null);
});

test("splitLocation handles places, intersections, cross-street tails and units", () => {
  assert.deepEqual(splitLocation("MILLSTADT VILLAGE PARK @ 101 W MILL ST"), { address: "101 W MILL ST", city: null, place: "MILLSTADT VILLAGE PARK", cross: null });
  assert.deepEqual(splitLocation("118 WILLOW CREEK DR, MILLSTADT, IL 62260"), { address: "118 WILLOW CREEK DR", city: "MILLSTADT", place: null, cross: null });
  assert.deepEqual(splitLocation("118 WILLOW CREEK DR MILLSTADT"), { address: "118 WILLOW CREEK DR", city: "MILLSTADT", place: null, cross: null });
  assert.deepEqual(splitLocation("RT 158 / RT 163"), { address: "RT 158 / RT 163", city: null, place: null, cross: null });
  assert.equal(splitLocation("22 OAK ST BTWN MAIN ST AND ELM ST").cross, "MAIN ST AND ELM ST");
  assert.equal(splitLocation("22 SAXSTON RD").address, "22 SAXSTON RD", "x-st inside a street name is not a cross-street tail");
  assert.equal(splitLocation("40 ELM ST, APT 3, MILLSTADT").address, "40 ELM ST APT 3");
  assert.equal(splitLocation("38.44002, -90.08227").address, null);
  assert.equal(splitLocation("N/A").address, null);
});

test("titleCaseAddress keeps directionals, routes and ordinals readable", () => {
  assert.equal(titleCaseAddress("353 N MAIN ST"), "353 N Main St");
  assert.equal(titleCaseAddress("I-255 SB AT MM 9"), "I-255 SB at MM 9");
  assert.equal(titleCaseAddress("1ST ST & MCKINLEY AVE"), "1st St & McKinley Ave");
  assert.equal(titleCaseAddress("6000 BLK FLORAVILLE RD"), "6000 Blk Floraville Rd");
});

// ── Small helpers ─────────────────────────────────────────────────────────────────────────────────

test("mapStatus", () => {
  assert.equal(mapStatus("Dispatched"), "dispatched");
  assert.equal(mapStatus("EN ROUTE"), "enroute");
  assert.equal(mapStatus("Enroute"), "enroute");
  assert.equal(mapStatus("On Scene"), "onscene");
  assert.equal(mapStatus("Arrived"), "onscene");
  assert.equal(mapStatus("Transporting"), "transport");
  assert.equal(mapStatus("Enroute to Hospital"), "transport");
  assert.equal(mapStatus("At Hospital"), "athospital");
  assert.equal(mapStatus("Arrived at Destination"), "athospital");
  assert.equal(mapStatus("Cleared"), "clear");
  assert.equal(mapStatus("Available"), "clear");
  assert.equal(mapStatus("In Quarters"), "clear");
  assert.equal(mapStatus("Gibberish"), null);
  assert.equal(mapStatus(""), null);
});

test("canonicalEventNumber", () => {
  assert.equal(canonicalEventNumber("2026-40118"), "2026-40118");
  assert.equal(canonicalEventNumber("26-40118"), "2026-40118");
  assert.equal(canonicalEventNumber("#2026-0040118"), "2026-40118");
  assert.equal(canonicalEventNumber("E2026-40118"), "2026-40118");
  assert.equal(canonicalEventNumber("202640118"), "2026-40118");
  assert.equal(canonicalEventNumber("40118"), "40118");
  assert.equal(canonicalEventNumber("ABC"), null);
  assert.equal(canonicalEventNumber(""), null);
});

test("Chicago times are right across daylight saving changes", () => {
  assert.equal(new Date(ct(2026, 1, 15, 12, 0)).toISOString(), "2026-01-15T18:00:00.000Z");
  assert.equal(new Date(ct(2026, 7, 4, 12, 0)).toISOString(), "2026-07-04T17:00:00.000Z");
  assert.equal(new Date(ct(2026, 3, 8, 3, 30)).toISOString(), "2026-03-08T08:30:00.000Z");
  assert.equal(new Date(ct(2026, 11, 1, 0, 30)).toISOString(), "2026-11-01T05:30:00.000Z");
  assert.equal(new Date(ct(2026, 11, 1, 3, 30)).toISOString(), "2026-11-01T09:30:00.000Z");
});

test("parseCadDateTime shapes", () => {
  const ref = ct(2026, 4, 4, 17, 35);
  const want = ct(2026, 4, 4, 17, 30, 34);
  for (const text of ["04/04/2026 17:30:34", "4/4/26 5:30:34 PM", "2026-04-04T17:30:34", "17:30:34 04/04/2026", "Sat, 04 Apr 2026 17:30:34", "April 4, 2026 17:30:34", "17:30:34"]) {
    assert.equal(parseCadDateTime(text, { referenceMs: ref }), want, text);
  }
  assert.equal(parseCadDateTime("2026-04-04 22:30:34 UTC", { referenceMs: ref }), want);
  assert.equal(parseCadDateTime("1730", { referenceMs: ref, allowMilitary: true }), ct(2026, 4, 4, 17, 30));
  assert.equal(parseCadDateTime("1730", { referenceMs: ref }), null);
  assert.equal(parseCadDateTime("no time here", { referenceMs: ref }), null);
});
