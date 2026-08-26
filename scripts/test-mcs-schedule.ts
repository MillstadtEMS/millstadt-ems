import assert from "node:assert/strict";
import test from "node:test";
import { expandMcsScheduleEvents, parseMcsScheduleArticle } from "../lib/community/mcs-schedule-parser";

test("parses sports and band events, including inherited-date rows", () => {
  const events = parseMcsScheduleArticle({
    id: "3089999",
    title: "Student Announcements 8/24",
    publishedAt: "2026-08-24T10:05:24.000-05:00",
    content: `
      <table><tbody>
        <tr><td><p>8/24</p></td><td><p>Softball @ Dupo</p></td><td><p>4:15pm</p></td></tr>
        <tr><td><p></p></td><td><p>Baseball @ Home vs Whiteside</p></td><td><p>4:15pm</p></td></tr>
        <tr><td><p>8/25</p></td><td><p>Sr Band Uniform Fittings</p></td><td><p>5:30pm</p></td></tr>
      </tbody></table>
    `,
  });

  assert.equal(events.length, 3);
  assert.deepEqual(events.map((event) => event.label), [
    "Softball @ Dupo",
    "Baseball @ Home vs Whiteside",
    "Sr Band Uniform Fittings",
  ]);
  assert.ok(events.slice(0, 2).every((event) => event.dateKey === "2026-08-24"));
  assert.ok(events.slice(0, 2).every((event) => event.startsAt === "2026-08-24T21:15:00.000Z"));
  assert.equal(events[2].startsAt, "2026-08-25T22:30:00.000Z");
});

test("keeps time-TBA athletics and carries a fall announcement into the next calendar year", () => {
  const events = parseMcsScheduleArticle({
    id: "fall-schedule",
    title: "Student Announcements",
    publishedAt: "2026-12-18T09:00:00.000-06:00",
    content: `
      <table><tbody>
        <tr><td>1/7</td><td>Basketball @ Freeburg</td><td>TBA</td></tr>
      </tbody></table>
    `,
  });

  assert.equal(events.length, 1);
  assert.equal(events[0].dateKey, "2027-01-07");
  assert.equal(events[0].timeLabel, null);
});

function parseRows(rows: string) {
  return parseMcsScheduleArticle({
    id: "school-events-test",
    title: "Student Announcements 8/26",
    publishedAt: "2026-08-26T10:00:00.000-05:00",
    content: `<table><tbody>${rows}</tbody></table>`,
  });
}

test("splits today's official shared Waterloo listing into independent entries", () => {
  const events = parseRows("<tr><td>8/26</td><td>Baseball/Softball @ Home vs Waterloo</td><td>4:15pm</td></tr>");
  assert.deepEqual(events.map((event) => event.label), [
    "Baseball @ Home vs Waterloo", "Softball @ Home vs Waterloo",
  ]);
  assert.equal(new Set(events.map((event) => event.id)).size, 2);
  assert.ok(events.every((event) => event.startsAt === "2026-08-26T21:15:00.000Z"));
  assert.ok(events.every((event) => event.timeLabel === "4:15pm"));
});

test("keeps separately published opponents and times distinct", () => {
  const events = parseRows(`
    <tr><td>8/26</td><td>Baseball @ Home vs Whiteside</td><td>4:00pm</td></tr>
    <tr><td></td><td>Softball @ Dupo</td><td>4:15pm</td></tr>
    <tr><td></td><td>Band Concert @ MCS</td><td>7pm</td></tr>
  `);
  assert.deepEqual(events.map(({ label, startsAt }) => ({ label, startsAt })), [
    { label: "Baseball @ Home vs Whiteside", startsAt: "2026-08-26T21:00:00.000Z" },
    { label: "Softball @ Dupo", startsAt: "2026-08-26T21:15:00.000Z" },
    { label: "Band Concert @ MCS", startsAt: "2026-08-27T00:00:00.000Z" },
  ]);
});

test("supports the school's shared B-team and doubleheader headings", () => {
  for (const heading of ["Baseball/Softball", "Baseball &amp; Softball", "Baseball and Softball", "Baseball Softball", "Softball / Baseball"]) {
    const events = parseRows(`<tr><td>8/29</td><td>${heading} B Doubleheader @ Freeburg</td><td>10:00am</td></tr>`);
    assert.equal(events.length, 2, heading);
    assert.deepEqual(new Set(events.map((event) => event.label)), new Set([
      "Baseball B Doubleheader @ Freeburg", "Softball B Doubleheader @ Freeburg",
    ]));
  }
});

test("includes every dated school activity, including days with no sports", () => {
  const labels = [
    "Band Concert", "Chorus Concert", "Junior High Play", "PTA Meeting-MPC Library",
    "Board Meeting", "3rd Grade House Sorting Assembly @ MCS", "Homecoming Parade-Sr Band to March",
    "MPC Grandparents Day", "Picture Day", "LABOR DAY - NO SCHOOL",
  ];
  const events = parseRows(labels.map((label, index) =>
    `<tr><td>${index === 0 ? "9/5" : ""}</td><td>${label}</td><td>${index === 9 ? "" : "5:00pm"}</td></tr>`,
  ).join(""));
  assert.equal(events.length, labels.length);
  assert.deepEqual(new Set(events.map((event) => event.label)), new Set(labels));
  assert.ok(events.every((event) => event.dateKey === "2026-09-05"));
});

test("preserves performance times, time ranges, and source instructions", () => {
  const events = parseRows(`
    <tr><td>9/5</td><td>Band Uniform Fittings</td><td>5:30–8:00pm</td></tr>
    <tr><td></td><td>School Play</td><td>1:00 p.m.</td></tr>
    <tr><td></td><td>School Play</td><td>6:00pm</td></tr>
    <tr><td></td><td>Grandparents Day</td><td>See Flyer</td></tr>
    <tr><td></td><td>Picture Day</td><td>All day</td></tr>
  `);
  assert.equal(events.length, 5);
  const fittings = events.find((event) => event.label === "Band Uniform Fittings")!;
  assert.equal(fittings.timeLabel, "5:30–8:00pm");
  assert.equal(fittings.startsAt, "2026-09-05T22:30:00.000Z");
  assert.deepEqual(events.filter((event) => event.label === "School Play").map((event) => event.startsAt), [
    "2026-09-05T18:00:00.000Z", "2026-09-05T23:00:00.000Z",
  ]);
  assert.equal(events.find((event) => event.label === "Grandparents Day")?.timeLabel, "See Flyer");
  assert.equal(events.find((event) => event.label === "Picture Day")?.timeLabel, "All day");
});

test("removes duplicate rows without collapsing separate games or performances", () => {
  const events = parseRows(`
    <tr><td>8/26</td><td>Baseball/Softball @ Home vs Waterloo</td><td>4:15pm</td></tr>
    <tr><td></td><td>Baseball @ Home vs Waterloo</td><td>4:15 PM</td></tr>
    <tr><td></td><td>Softball @ Home vs Waterloo</td><td>4:15pm</td></tr>
    <tr><td></td><td>Band Concert</td><td>6pm</td></tr>
    <tr><td></td><td>Band Concert</td><td>7pm</td></tr>
  `);
  assert.equal(events.length, 4);
  assert.equal(new Set(events.map((event) => event.id)).size, 4);
});

test("expands legacy cached games idempotently during refresh failures", () => {
  const legacy = [{
    id: "old-combined-id", dateKey: "2026-08-26", label: "Baseball/Softball @ Home vs Waterloo",
    startsAt: "2026-08-26T21:15:00.000Z", timeLabel: "4:15pm",
  }];
  const expanded = expandMcsScheduleEvents(legacy);
  assert.equal(expanded.length, 2);
  assert.notEqual(expanded[0].id, expanded[1].id);
  assert.deepEqual(expandMcsScheduleEvents(expanded), expanded);
});

test("does not turn narrative text, table headers, or invalid dates into events", () => {
  const events = parseRows(`
    <tr><td></td><td>26/27 School Year</td><td></td></tr>
    <tr><td>2/30</td><td>Band Concert</td><td>7pm</td></tr>
    <tr><td></td><td>PTA Meeting</td><td>7pm</td></tr>
    <tr><td>9/5</td><td></td><td></td></tr>
  `);
  assert.equal(events.length, 0);
  assert.equal(parseMcsScheduleArticle({
    id: "narrative", title: "Student Announcements", publishedAt: "2026-08-26T15:00:00Z",
    content: "<p>Congratulations to our baseball and softball teams yesterday!</p>",
  }).length, 0);
});

test("does not split non-game mentions of baseball and softball", () => {
  const events = parseRows("<tr><td>9/5</td><td>Athletic fundraiser for baseball/softball</td><td>6pm</td></tr>");
  assert.equal(events.length, 1);
  assert.equal(events[0].label, "Athletic fundraiser for baseball/softball");
});
