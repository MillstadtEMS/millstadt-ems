import assert from "node:assert/strict";
import test from "node:test";
import { parseMcsScheduleArticle } from "../lib/community/mcs-schedule-parser";

test("parses dated and inherited-date sports rows from MCS announcements", () => {
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

  assert.equal(events.length, 2);
  assert.deepEqual(events.map((event) => event.label), [
    "Softball @ Dupo",
    "Baseball @ Home vs Whiteside",
  ]);
  assert.ok(events.every((event) => event.dateKey === "2026-08-24"));
  assert.ok(events.every((event) => event.startsAt === "2026-08-24T21:15:00.000Z"));
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
