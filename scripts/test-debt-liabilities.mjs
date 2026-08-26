import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  DEBT_LOANS, DEBT_CREDIT_CARD, DEBT_TOTALS, PAST_DUE_BILLS,
  PAST_DUE_EXPLANATION, PAST_DUE_PLANNING_NOTE, DEBT_LIABILITIES_SECTION,
  annualizedLoanPaymentCents, debtLoanSearchText, formatDebtRate,
  SECTION_SEARCH, matchesSearch, formatBillingMoney,
} from "../lib/financials-hub/transparency-content.ts";

test("all five visible loan rows are preserved, with Zoll corrected to 7.99%", () => {
  assert.deepEqual(DEBT_LOANS.map(loan => [loan.obligation, loan.balance, loan.interestRate, loan.frequency, loan.scheduledPayment, loan.paymentsPerYear]), [
    ["First National Bank — mortgage", 143348, 6, "Monthly", 2141.30, 12],
    ["Ambulance loan — Unit 3935", 175842, 6, "Monthly", 3000, 12],
    ["Stryker Loan 1", 8486, 0, "Monthly", 446.65, 12],
    ["Stryker Loan 2", 122347, 0, "Monthly", 1773.14, 12],
    ["Zoll monitor loan", 35558, 7.99, "Annual", 17779.03, 1],
  ]);
  assert.equal(formatDebtRate(DEBT_LOANS.at(-1).interestRate), "7.99%");
});

test("credit card is paid off without inventing an interest rate or repayment terms", () => {
  assert.deepEqual(DEBT_CREDIT_CARD, { obligation: "Credit card", balance: 0, status: "Paid off" });
});

test("annualized payment calculations use exact cents and include the listed Zoll schedule", () => {
  assert.deepEqual(DEBT_LOANS.map(annualizedLoanPaymentCents), [2569560, 3600000, 535980, 2127768, 1777903]);
  assert.equal(DEBT_TOTALS.annualizedLoanPaymentCents, 10611211);
});

test("three past-due balances reconcile separately and combine with loans only once", () => {
  assert.deepEqual(PAST_DUE_BILLS, [
    { obligation: "Accounting arrears", balance: 28000, planningYears: 2 },
    { obligation: "EMSMC account catch-up", balance: 28331, planningYears: 2 },
    { obligation: "Mediclaims unpaid invoice", balance: 10000, planningYears: 2 },
  ]);
  assert.equal(DEBT_TOTALS.loans, 485581);
  assert.equal(DEBT_TOTALS.pastDue, 66331);
  assert.equal(DEBT_TOTALS.creditCard, 0);
  assert.equal(DEBT_TOTALS.combined, 551912);
  assert.equal(DEBT_TOTALS.combined, DEBT_TOTALS.loans + DEBT_TOTALS.pastDue + DEBT_TOTALS.creditCard);
  assert.match(PAST_DUE_EXPLANATION, /To meet payroll obligations.*prioritized payroll payments.*past-due balances/);
  assert.match(PAST_DUE_PLANNING_NOTE, /two-year.*planning assumption, not an approved payment schedule/);
  assert.ok(PAST_DUE_BILLS.every(bill => !("annualPayment" in bill)));
});

test("new obligations, balances and corrected interest rate are included in page search", () => {
  const section = DEBT_LIABILITIES_SECTION;
  assert.ok(SECTION_SEARCH.includes(section));
  for (const loan of DEBT_LOANS) {
    assert.ok(matchesSearch(section.text, loan.obligation));
    assert.ok(matchesSearch(debtLoanSearchText(loan), formatBillingMoney(loan.balance, false)));
    assert.ok(matchesSearch(debtLoanSearchText(loan), formatDebtRate(loan.interestRate)));
  }
  for (const phrase of ["7.99%", "$551,912", "$66,331", "Credit card Paid off $0", "Accounting arrears", "Mediclaims unpaid invoice", "payroll"]) {
    assert.ok(matchesSearch(section.text, phrase), phrase);
  }
});

test("debts are typed, accessible disclosures separate from billing reports and public files", () => {
  const page = readFileSync(new URL("../app/financials-information-hub/PublicDocumentLibrary.tsx", import.meta.url), "utf8");
  const debt = readFileSync(new URL("../app/financials-information-hub/DebtLiabilities.tsx", import.meta.url), "utf8");
  assert.match(page, /<BillingActivity query=\{query\}\/>\s*<DebtLiabilities query=\{query\}\/>/);
  assert.match(debt, /<Disclosure[^>]+title=\{section.title\}/);
  assert.match(debt, /<Disclosure title="Past-due bills"/);
  assert.match(debt, /aria-labelledby="debt-title"/);
  assert.match(debt, /useSyncExternalStore\(subscribeToAnchor, readAnchor, serverAnchor\)/);
  assert.match(debt, /<caption className=\{styles.srOnly\}>/);
  assert.match(debt, /<th scope="row">/);
  assert.match(debt, /This is not a payoff forecast/);
  assert.doesNotMatch(debt, /<img|<Image|codex-clipboard|\.png|\.jpg/);
});
