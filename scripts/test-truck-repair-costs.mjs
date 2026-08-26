import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  TRUCK_REPAIRS, TRUCK_REPAIRS_TOTAL_CENTS, TRUCK_REPAIRS_SECTION,
  TRUCK_REPAIRS_2025_2026, TRUCK_REPAIRS_2025_2026_TOTAL_CENTS,
  TRUCK_REPAIRS_2025_2026_SECTION, TRUCK_REPAIR_REPORTS,
  UNIFORM_SHIRT_EXPENSE, SECTION_SEARCH,
  truckRepairTotalCents, truckRepairSearchText, matchesSearch,
} from "../lib/financials-hub/transparency-content.ts";

test("FY 2025–2026 preserves all 36 actual monthly entries in fiscal-year order", () => {
  const monthIds = ["2025-05", "2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04"];
  const labels = ["May 2025", "June 2025", "July 2025", "August 2025", "September 2025", "October 2025", "November 2025", "December 2025", "January 2026", "February 2026", "March 2026", "April 2026"];
  assert.deepEqual(TRUCK_REPAIRS_2025_2026.map(truck => truck.unit), ["3925", "3926", "3935"]);
  assert.deepEqual(TRUCK_REPAIRS_2025_2026.map(truck => truck.months.map(month => month.amountCents)), [
    [0, 0, 0, 73422, 0, 0, 12855, 0, 0, 4100, 0, 140421],
    [110980, 110980, 0, 665071, 6387, 0, 0, 0, 1374114, 143043, 0, 0],
    [703125, 644625, 0, 0, 829502, 432653, 20055, 0, 4100, 0, 0, 0],
  ]);
  for (const truck of TRUCK_REPAIRS_2025_2026) {
    assert.deepEqual(truck.months.map(month => month.month), monthIds);
    assert.deepEqual(truck.months.map(month => month.label), labels);
    assert.ok(truck.months.every(month => Number.isSafeInteger(month.amountCents) && month.amountCents >= 0));
  }
  assert.equal(TRUCK_REPAIRS_2025_2026.flatMap(truck => truck.months).filter(month => month.amountCents === 0).length, 20);
});

test("FY 2025–2026 totals match the reported YTD figures using exact cents", () => {
  assert.deepEqual(TRUCK_REPAIRS_2025_2026.map(truckRepairTotalCents), [230798, 2410575, 2634060]);
  assert.equal(TRUCK_REPAIRS_2025_2026_TOTAL_CENTS, 5275433);
  for (const report of TRUCK_REPAIR_REPORTS) {
    assert.equal(report.totalCents, report.trucks.reduce((sum, truck) => sum + truckRepairTotalCents(truck), 0));
  }
});

test("current-year entries remain unchanged and missing August for Unit 3935 is not invented", () => {
  assert.deepEqual(TRUCK_REPAIRS.map(truck => [truck.unit, truck.months.map(month => month.amountCents)]), [
    ["3925", [153888, 405690, 0, 434799]],
    ["3926", [0, 134476, 0, 4100]],
    ["3935", [0, 171807, 167707]],
  ]);
  assert.deepEqual(TRUCK_REPAIRS.map(truckRepairTotalCents), [994377, 138576, 339514]);
  assert.equal(TRUCK_REPAIRS_TOTAL_CENTS, 1472467);
  assert.deepEqual(TRUCK_REPAIRS[2].months.map(month => month.month), ["2026-05", "2026-06", "2026-07"]);
});

test("fiscal years and uniforms remain separate, with warranty context only in the current year", () => {
  assert.equal(TRUCK_REPAIR_REPORTS.length, 2);
  const [current, previous] = TRUCK_REPAIR_REPORTS;
  assert.equal(current.section, TRUCK_REPAIRS_SECTION);
  assert.equal(previous.section, TRUCK_REPAIRS_2025_2026_SECTION);
  assert.match(current.context, /covered under warranty/);
  assert.equal(previous.context, undefined);
  assert.match(previous.period, /May 1, 2025 through April 30, 2026/);
  assert.doesNotMatch(previous.note, /warranty|transmission|partial/i);
  assert.equal(UNIFORM_SHIRT_EXPENSE.amountCents, 399552);
  assert.equal(UNIFORM_SHIRT_EXPENSE.vendor, "Custom Screenprinting");
  assert.equal(UNIFORM_SHIRT_EXPENSE.periodLabel, "Prior-year purchase (as reported)");
});

test("prior-year totals, units and monthly values are searchable without budget data", () => {
  for (const report of TRUCK_REPAIR_REPORTS) {
    assert.ok(SECTION_SEARCH.includes(report.section));
    assert.equal(SECTION_SEARCH.filter(section => section.id === report.section.id).length, 1);
    assert.doesNotMatch(JSON.stringify(report), /budget|remaining|3,333|9,999|31,486|codex-clipboard|\.png|3535/i);
  }
  const text = TRUCK_REPAIRS_2025_2026_SECTION.text;
  for (const query of ["FY 2025-2026", "$52,754.33", "$24,105.75", "January 2026", "$13,741.14", "Expenses"]) {
    assert.ok(matchesSearch(text, query), query);
  }
  for (const truck of TRUCK_REPAIRS_2025_2026) {
    assert.ok(matchesSearch(truckRepairSearchText(truck), `Unit ${truck.unit}`));
  }
});

test("reports use typed, accessible collapsibles under Expenses and share search/hash expansion", () => {
  const expenses = readFileSync(new URL("../app/financials-information-hub/ExpenseRecords.tsx", import.meta.url), "utf8");
  const repair = readFileSync(new URL("../app/financials-information-hub/TruckRepairCosts.tsx", import.meta.url), "utf8");
  assert.match(expenses, /TRUCK_REPAIR_REPORTS\.map\(report => report\.section\)/);
  assert.match(expenses, /expenseSections\.some\(isOpen\)/);
  assert.match(expenses, /TRUCK_REPAIR_REPORTS\.map\(report => <TruckRepairCosts/);
  assert.match(expenses, /report=\{report\} query=\{query\} anchor=\{anchor\}/);
  assert.match(repair, /report: TruckRepairReport/);
  assert.match(repair, /anchor === section\.id \|\| queryMatches/);
  assert.match(repair, /<Disclosure[^>]+level=\{4\}/);
  assert.match(repair, /<Disclosure[^>]+level=\{5\}/);
  assert.match(repair, /<th scope="row">/);
  assert.match(repair, /\$\{section\.title\} — Unit \$\{truck\.unit\} — entered monthly repair costs/);
  assert.doesNotMatch(repair, /<img|<Image|codex-clipboard|\.png|\.jpg|budget/i);
});
