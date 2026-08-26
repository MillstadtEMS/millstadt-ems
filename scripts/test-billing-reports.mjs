import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  BILLING_REPORTS, BILLING_HISTORY_SECTION, BILLING_ROWS, MEDICLAIMS_CLOSE,
  TRIP_CATEGORIES, COLLECTIONS_SNAPSHOT, COLLECTIONS_ABOVE_TARGET,
  BILLING_REPORT_SECTIONS, COLLECTIONS_SNAPSHOT_SECTION, SECTION_SEARCH,
  billingMonthSearchText, matchesSearch, formatBillingMoney,
} from "../lib/financials-hub/transparency-content.ts";

const sum = values => values.reduce((a, b) => a + b, 0);
const cents = value => Math.round(value * 100);

test("repeat screenshots produce only two unique trip-report periods", () => {
  assert.equal(BILLING_REPORTS.length, 2);
  assert.equal(new Set(BILLING_REPORTS.map(report => report.id)).size, 2);
  assert.deepEqual(BILLING_REPORTS.map(report => [report.totalTrips, report.totalRevenue, report.nonBillable, report.months.length, report.partial]), [
    [1414, 658021.25, 66, 12, false], [341, 95196.78, 30, 3, true],
  ]);
  assert.deepEqual(BILLING_REPORTS.flatMap(report => TRIP_CATEGORIES.map(category => report.categories[category.key])), [
    { trips: 577, revenue: 349125.65 }, { trips: 812, revenue: 304416.76 }, { trips: 25, revenue: 4478.84 },
    { trips: 130, revenue: 50088.08 }, { trips: 190, revenue: 44868.64 }, { trips: 21, revenue: 240.06 },
  ]);
});

test("every monthly and category total reconciles to the reported period, exactly to cents", () => {
  for (const report of BILLING_REPORTS) {
    assert.equal(sum(report.months.map(row => row.totalTrips)), report.totalTrips);
    assert.equal(sum(report.months.map(row => cents(row.totalRevenue))), cents(report.totalRevenue));
    assert.equal(sum(report.months.filter(row => row.nonBillable !== null).map(row => row.nonBillable)), report.nonBillable);
    for (const category of TRIP_CATEGORIES) {
      const listed = report.months.map(month => month[category.key]).filter(row => row.trips !== null);
      assert.equal(sum(listed.map(row => row.trips)), report.categories[category.key].trips);
      assert.equal(sum(listed.map(row => cents(row.revenue))), cents(report.categories[category.key].revenue));
    }
    for (const month of report.months) {
      const listed = TRIP_CATEGORIES.map(category => month[category.key]).filter(row => row.trips !== null);
      assert.equal(sum(listed.map(row => row.trips)), month.totalTrips, month.month);
      assert.equal(sum(listed.map(row => cents(row.revenue))), cents(month.totalRevenue), month.month);
    }
  }
});

test("missing source cells remain distinct from actual reported zeros", () => {
  const months = BILLING_REPORTS[0].months;
  assert.deepEqual(months.filter(month => month.treatment.trips === null).map(month => month.month), ["2025-08", "2025-12"]);
  assert.deepEqual(months.filter(month => month.nonBillable === null).map(month => month.month), ["2025-05", "2026-02"]);
  assert.equal(months.find(month => month.month === "2025-06").treatment.revenue, 0);
  assert.match(billingMonthSearchText(months[0]), /Non-billable trips by import month Not listed/);
});

test("collections preserve reported totals and expose, rather than fix, source discrepancies", () => {
  const { reportedTotals: totals, months, period, note } = COLLECTIONS_SNAPSHOT;
  assert.deepEqual(totals, { actual: 441847, target: 295230, variance: 146617 });
  assert.equal(totals.actual - totals.target, totals.variance);
  assert.equal(COLLECTIONS_ABOVE_TARGET, "49.7%");
  assert.equal(sum(months.map(month => month.actual)) - totals.actual, 1);
  assert.equal(sum(months.map(month => month.variance)) - totals.variance, 2);
  assert.equal(sum(months.map(month => month.target)), totals.target);
  const august = months.at(-1);
  assert.equal(august.variance - (august.actual - august.target), 1);
  assert.match(period, /Report dated August 13, 2026/);
  assert.match(note, /August is partial/);
  assert.match(note, /\$1 more/);
  assert.match(note, /\$2 more/);
  assert.doesNotMatch(COLLECTIONS_SNAPSHOT_SECTION.text, /64\.1/);
});

test("new summaries and figures are searchable without adding document duplicates", () => {
  for (const section of [...BILLING_REPORT_SECTIONS, BILLING_HISTORY_SECTION, COLLECTIONS_SNAPSHOT_SECTION]) {
    assert.ok(SECTION_SEARCH.includes(section));
  }
  for (const [index, report] of BILLING_REPORTS.entries()) {
    const section = BILLING_REPORT_SECTIONS[index];
    for (const month of report.months) {
      assert.ok(matchesSearch(section.text, month.label));
      assert.ok(matchesSearch(section.text, formatBillingMoney(month.totalRevenue)));
    }
  }
  assert.ok(matchesSearch(COLLECTIONS_SNAPSHOT_SECTION.text, "49.7%"));
  assert.ok(matchesSearch(COLLECTIONS_SNAPSHOT_SECTION.text, "August 2026 (partial)"));
  assert.deepEqual(BILLING_ROWS.map(row => row.revenue), ["$296,850.31", "$356,491.15", "$598,688.61"]);
  assert.equal(MEDICLAIMS_CLOSE.rows.length, 11);
});

test("historical billing, new reports, and Mediclaims all sit within the collapsible group", () => {
  const overview = readFileSync(new URL("../app/financials-information-hub/FinancialOverview.tsx", import.meta.url), "utf8");
  const reports = readFileSync(new URL("../app/financials-information-hub/BillingReports.tsx", import.meta.url), "utf8");
  assert.match(overview, /return <BillingReports query=\{query\}\/>/);
  assert.doesNotMatch(overview, /<table/);
  assert.match(reports, /return <div id="billing-activity" className=\{styles\.billingReport\}>/);
  assert.doesNotMatch(reports, /<section|<h2|styles\.billingSection|styles\.shell|styles\.eyebrow|styles\.sectionExplanation/);
  assert.match(reports, /title="Billing & Mediclaims reports"/);
  assert.match(reports, /title="Billing & Mediclaims reports"[^>]*level=\{3\}/);
  assert.match(reports, /initiallyOpen=\{isOpen\(BILLING_HISTORY_SECTION\)\}/);
  assert.match(reports, /initiallyOpen=\{isOpen\(MEDICLAIMS_CLOSE_SECTION\)\}/);
  assert.match(reports, /useSyncExternalStore\(subscribeToAnchor, readAnchor, serverAnchor\)/);
  assert.match(reports, /not relabeled as interfacility transfers/);
  assert.match(reports, /Non-billable trips — import month/);
  assert.ok(reports.includes('matchesSearch(`${month.label} ${month.month} ${rows.map'));
  assert.doesNotMatch(reports, /<img|<Image|mail\.google|Margaret|Schultz/);
});
