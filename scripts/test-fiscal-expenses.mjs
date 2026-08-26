import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  EXPENSE_MONTHS_2025_2026, FISCAL_EXPENSE_REPORTS, FISCAL_EXPENSE_SECTIONS,
  expenseRowTotalCents, expenseReportTotalCents, expenseRowSearchText,
  formatBillingMoney, matchesSearch, SECTION_SEARCH,
  DEBT_LOANS, DEBT_CREDIT_CARD, DEBT_TOTALS,
  TRUCK_REPAIRS_TOTAL_CENTS, TRUCK_REPAIRS_2025_2026_TOTAL_CENTS,
  UNIFORM_SHIRT_EXPENSE,
} from "../lib/financials-hub/transparency-content.ts";

function report(id) {
  const found = FISCAL_EXPENSE_REPORTS.find(value => value.id === id);
  assert.ok(found, `Missing fiscal expense report: ${id}`);
  return found;
}

function row(reportId, rowId) {
  const found = report(reportId).rows.find(value => value.id === rowId);
  assert.ok(found, `Missing expense row: ${reportId}/${rowId}`);
  return found;
}

const OPERATIONS_ID = "operations-expenses-2025-2026";
const BUILDING_ID = "building-expenses-2025-2026";
const PROFESSIONAL_ID = "professional-fees-2025-2026";

// Independent transcription of approved Operations rows. Values are
// integer cents, ordered May 2025 through April 2026; null is a blank source cell.
const OPERATIONS_SOURCE = [
  ["insurance", [241100,1190300,732300,47300,779600,0,0,2110000,0,1190100,0,0], 6290700],
  ["office-building-supplies", [3446,0,85474,0,0,0,0,0,24591,0,0,44544], 158055],
  ["stericycle", [8080,8080,8080,8042,8042,8042,8042,8042,8645,8693,16630,8645], 107063],
  ["stryker-1-payments", [44665,44665,44665,44665,44665,44665,44665,44665,44665,44665,44665,44665], 535980],
  ["stryker-2-payments", [0,230659,461318,230659,230659,230659,230659,230659,230659,230659,230659,230659], 2767900],
  ["wex", [132265,112027,214196,231608,310296,221946,130860,216058,272339,161371,30000,179806], 2212722],
  ["wireless-usa", [4500,4500,4500,4500,4500,4500,4500,4500,4500,4500,4500,4500], 54000],
  ["credit-card-payments", [499356,18110,54243,58700,59400,400000,63129,62400,68751,66500,493700,75300], 1919589],
  ["education", [5500,0,0,5500,null,null,null,null,2400,null,null,null], 13400],
  ["patient-refunds", [null,null,null,null,null,null,null,null,5000,44000,null,107754], 156754],
  ["oxygen", [0,0,179328,98732,4721,129090,129681,202424,202441,89482,0,142923], 1178822],
];

test("all four expense reports use exact cents and the May 2025–April 2026 fiscal year", () => {
  assert.deepEqual(EXPENSE_MONTHS_2025_2026.map(month => month.id), [
    "2025-05", "2025-06", "2025-07", "2025-08", "2025-09", "2025-10",
    "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04",
  ]);
  assert.deepEqual(EXPENSE_MONTHS_2025_2026.map(month => month.label), [
    "May 2025", "June 2025", "July 2025", "August 2025", "September 2025", "October 2025",
    "November 2025", "December 2025", "January 2026", "February 2026", "March 2026", "April 2026",
  ]);
  assert.equal(FISCAL_EXPENSE_REPORTS.length, 4);
  assert.equal(new Set(FISCAL_EXPENSE_REPORTS.map(value => value.id)).size, 4);
  for (const value of FISCAL_EXPENSE_REPORTS) {
    assert.match(value.period, /May 1, 2025 through April 30, 2026/);
    assert.equal(new Set(value.rows.map(entry => entry.id)).size, value.rows.length);
    for (const entry of value.rows) {
      assert.equal(entry.monthlyCents.length, 12, entry.id);
      assert.ok(entry.monthlyCents.every(amount => amount === null || (Number.isSafeInteger(amount) && amount >= 0)), entry.id);
    }
  }
});

test("Operations preserves the 11 approved monthly vectors and original annual figures", () => {
  assert.deepEqual(report(OPERATIONS_ID).rows.map(entry => [entry.id, entry.monthlyCents, entry.reportedYtdCents]), OPERATIONS_SOURCE);
  const values = report(OPERATIONS_ID).rows.flatMap(entry => entry.monthlyCents);
  assert.equal(values.length, 132);
  assert.equal(values.filter(amount => amount === null).length, 16);
  assert.equal(values.filter(amount => amount === 0).length, 19);
});

test("Operations monthly subtotals and row totals are calculated from entered amounts", () => {
  const operations = report(OPERATIONS_ID);
  assert.deepEqual(operations.rows.map(expenseRowTotalCents), [
    6290700, 158055, 107063, 535980, 2767908, 2212772, 54000,
    1919589, 13400, 156754, 1178822,
  ]);
  const monthlyTotals = EXPENSE_MONTHS_2025_2026.map((_, index) => operations.rows.reduce((sum, entry) => sum + (entry.monthlyCents[index] ?? 0), 0));
  assert.deepEqual(monthlyTotals, [
    938912,1608341,1784104,729706,1441883,1038902,
    611536,2878748,863991,1839970,820154,838796,
  ]);
  assert.equal(monthlyTotals.reduce((sum, amount) => sum + amount, 0), expenseReportTotalCents(operations));
});

test("each report has its own correct actual-entry total without combining reporting categories", () => {
  const expected = {
    "adp-payroll-2025-2026": 61279779,
    "operations-expenses-2025-2026": 15395043,
    "building-expenses-2025-2026": 7546728,
    "professional-fees-2025-2026": 6847246,
  };
  assert.deepEqual(Object.fromEntries(FISCAL_EXPENSE_REPORTS.map(value => [value.id, expenseReportTotalCents(value)])), expected);
  for (const value of FISCAL_EXPENSE_REPORTS) {
    assert.equal(expenseReportTotalCents(value), value.rows.reduce((sum, entry) => sum + (expenseRowTotalCents(entry) ?? 0), 0));
  }
});

test("blank source cells stay distinct from explicit zero entries and absent annual summaries", () => {
  const inspection = row(PROFESSIONAL_ID, "fire-inspection");
  assert.equal(inspection.label, "Fire inspection");
  assert.deepEqual(inspection.monthlyCents, [...Array(11).fill(null), 40900]);
  assert.equal(inspection.reportedYtdCents, null);
  assert.equal(expenseRowTotalCents(inspection), 40900);
  for (const month of EXPENSE_MONTHS_2025_2026.slice(0, 11)) {
    assert.ok(!expenseRowSearchText(inspection).includes(month.id));
  }
  const education = expenseRowSearchText(row(OPERATIONS_ID, "education"));
  assert.ok(education.includes("2025-06"));
  assert.ok(education.includes("$0.00"));
  assert.ok(!education.includes("2025-09"));
});

test("internal source differences cannot replace totals calculated from actual entries", () => {
  const stryker = row(OPERATIONS_ID, "stryker-2-payments");
  const wex = row(OPERATIONS_ID, "wex");
  const ameren = row(BUILDING_ID, "ameren");
  assert.equal(expenseRowTotalCents(stryker) - stryker.reportedYtdCents, 8);
  assert.equal(expenseRowTotalCents(wex) - wex.reportedYtdCents, 50);
  assert.equal(expenseRowTotalCents(ameren), 568766);
  assert.equal(ameren.reportedYtdCents, 542737);
  assert.equal(expenseRowTotalCents(ameren) - ameren.reportedYtdCents, 26029);
  assert.equal(report(OPERATIONS_ID).reportedYtdTotalCents, undefined);
  assert.equal(expenseReportTotalCents(report(BUILDING_ID)) - report(BUILDING_ID).reportedYtdTotalCents, 26029);
});

test("public search exposes corrected actual totals without reconciliation notes or incorrect annual figures", () => {
  const publicText = FISCAL_EXPENSE_SECTIONS.map(section => `${section.title} ${section.text}`).join(" ");
  for (const value of FISCAL_EXPENSE_REPORTS) {
    const sections = FISCAL_EXPENSE_SECTIONS.filter(section => section.id === value.id);
    assert.equal(sections.length, 1);
    assert.ok(matchesSearch(sections[0].text, formatBillingMoney(expenseReportTotalCents(value) / 100)));
    assert.equal(SECTION_SEARCH.filter(section => section.id === value.id).length, 1);
  }
  for (const amount of ["$27,679.08", "$22,127.72", "$153,950.43", "$5,687.66", "$75,467.28"]) {
    assert.ok(publicText.includes(amount), amount);
  }
  for (const amount of ["$27,679.00", "$22,127.22", "$155,438.30", "$155,438.88", "$5,427.37", "$75,206.99"]) {
    assert.ok(!publicText.includes(amount), `Incorrect reported total must not be public: ${amount}`);
  }
  assert.doesNotMatch(publicText, /reconcil|\bdifference\b|reported worksheet annual total|worksheet annual summary lists/i);
});

test("removed expense categories are absent from expense data and public search", () => {
  assert.doesNotMatch(JSON.stringify(FISCAL_EXPENSE_REPORTS), /community.outreach|Community support|148845|128845|medical.supplies|Belleville Memorial|\baccounting\b|\bdues\b|subscriptions|frawley/i);
  assert.doesNotMatch(JSON.stringify(FISCAL_EXPENSE_SECTIONS), /\baccounting\b|\bdues\b|subscriptions|frawley/i);
  assert.doesNotMatch(JSON.stringify(SECTION_SEARCH), /community.outreach|Community support|1,488\.45|1,288\.45|medical.supplies|Belleville Memorial/i);
  assert.equal(expenseReportTotalCents(report(OPERATIONS_ID)), 15395043);
});

test("only approved professional-fee categories are included, without budgets or screenshot assets", () => {
  assert.deepEqual(report(PROFESSIONAL_ID).rows.map(entry => entry.id), [
    "mediclaims", "emsmc", "cencom", "fire-inspection", "paya",
  ]);
  const publicData = JSON.stringify(FISCAL_EXPENSE_REPORTS);
  assert.doesNotMatch(publicData, /\blegal\b|non[ -]?profit|\bbudget(?:ed)?\b|remaining[ -]?budget|codex-clipboard|\/var\/folders|\.png|\.jpe?g/i);
  for (const value of FISCAL_EXPENSE_REPORTS) {
    for (const entry of value.rows) {
      assert.ok(!Object.keys(entry).some(key => /budget|remaining/i.test(key)));
    }
  }
});

test("historical expenses do not alter current debt, corrected interest rates, repairs, or uniforms", () => {
  assert.deepEqual(DEBT_CREDIT_CARD, { obligation: "Credit card", balance: 0, status: "Paid off" });
  assert.equal(DEBT_TOTALS.loans, 485581);
  assert.equal(DEBT_TOTALS.pastDue, 66331);
  assert.equal(DEBT_TOTALS.combined, 551912);
  assert.equal(DEBT_TOTALS.annualizedLoanPaymentCents, 10611211);
  for (const id of ["stryker-1", "stryker-2", "zoll-monitor"]) {
    assert.equal(DEBT_LOANS.find(loan => loan.id === id)?.interestRate, 7.99, id);
  }
  assert.equal(expenseRowTotalCents(row(OPERATIONS_ID, "credit-card-payments")), 1919589);
  assert.equal(TRUCK_REPAIRS_TOTAL_CENTS, 1472467);
  assert.equal(TRUCK_REPAIRS_2025_2026_TOTAL_CENTS, 5275433);
  assert.equal(UNIFORM_SHIRT_EXPENSE.amountCents, 399552);
  assert.equal(UNIFORM_SHIRT_EXPENSE.periodLabel, "Prior-year purchase (as reported)");
});

test("all top-level disclosure groups are inside Document Library in alphabetical order", () => {
  const page = readFileSync(new URL("../app/financials-information-hub/PublicDocumentLibrary.tsx", import.meta.url), "utf8");
  const libraryStart = page.indexOf('<section id="document-library"');
  const groupStart = page.indexOf('<div className={styles.libraryGroups}>');
  const groupEnd = page.indexOf('<DocumentUseNotice/>');
  assert.ok(libraryStart >= 0 && groupStart > libraryStart && groupEnd > groupStart);
  const group = page.slice(groupStart, groupEnd);
  const markers = ['<BillingActivity', '<DebtLiabilities', '<ExpenseRecords', 'title="IRS Form 990 Filings"', '{irs.map(', 'title="Management Pay Transparency"', 'title="Other official records"', 'title="St. Clair County Tax Computation Reports"'];
  const positions = markers.map(marker => group.indexOf(marker));
  assert.ok(positions.every(position => position >= 0));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  assert.doesNotMatch(page.slice(0, libraryStart), /<BillingActivity|<DebtLiabilities|<ExpenseRecords/);
});

test("expense disclosures retain supplied descriptions, sorted groups, and no reconciliation notes", () => {
  const expenses = readFileSync(new URL("../app/financials-information-hub/ExpenseRecords.tsx", import.meta.url), "utf8");
  const detail = readFileSync(new URL("../app/financials-information-hub/FiscalExpenseCosts.tsx", import.meta.url), "utf8");
  assert.match(expenses, /return <div id="expenses" className=\{styles.billingReport\}>/);
  assert.match(expenses, /a\.title\.localeCompare\(b\.title, "en"\)/);
  assert.match(detail, /a\.label\.localeCompare\(b\.label, "en"\)/);
  assert.match(detail, /Highlight text=\{row.description\}/);
  assert.match(detail, /amount === null \? null : <tr/);
  assert.doesNotMatch(detail, /expenseRowDifference|expenseReconciliation|Worksheet reconciliation|reportedYtdTotalCents|source differences|<img|<Image|codex-clipboard/);
});
