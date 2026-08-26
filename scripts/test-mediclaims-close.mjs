import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { BILLING_ROWS, MEDICLAIMS_CLOSE, MEDICLAIMS_CLOSE_SECTION, SECTION_SEARCH, matchesSearch } from "../lib/financials-hub/transparency-content.ts";

test("Mediclaims close contains exactly the supplied period and eleven figures", () => {
  assert.equal(MEDICLAIMS_CLOSE.title, "Mediclaims Close — FY 2024–2025");
  assert.equal(MEDICLAIMS_CLOSE.period, "May 1, 2024 through April 30, 2025");
  assert.deepEqual(MEDICLAIMS_CLOSE.rows.map(row => [row.item, row.amount]), [
    ["Charges", "$1,717,157.16"],
    ["Receipts", "$605,031.67"],
    ["Adjustments", "$1,003,290.49"],
    ["Net accounts receivable", "$108,835.00"],
    ["Total accounts receivable", "$440,106.33"],
    ["Medicare adjustments", "$814,149.35"],
    ["Medicaid write-offs", "$72,974.64"],
    ["Uncollectible accounts", "$10,945.76"],
    ["Write-offs due to death", "$3,372.85"],
    ["VA adjustments", "$5,450.66"],
    ["Hardship/bankruptcy", "$0.00"],
  ]);
});

test("all Mediclaims labels and amounts are searchable in their own page section", () => {
  assert.ok(SECTION_SEARCH.includes(MEDICLAIMS_CLOSE_SECTION));
  const text = `${MEDICLAIMS_CLOSE_SECTION.title} ${MEDICLAIMS_CLOSE_SECTION.text}`;
  for (const query of ["Mediclaims", "FY 2024-2025", MEDICLAIMS_CLOSE.period, ...MEDICLAIMS_CLOSE.rows.flatMap(row => [row.item, row.amount])]) {
    assert.ok(matchesSearch(text, query), query);
  }
});

test("existing billing revenue remains separate from Mediclaims receipts", () => {
  assert.equal(BILLING_ROWS.find(row => row.year === "2024–2025").revenue, "$598,688.61");
  assert.equal(MEDICLAIMS_CLOSE.rows.find(row => row.item === "Receipts").amount, "$605,031.67");
});

test("summary uses the existing disclosure, closed by default and opened by matching search", () => {
  const overview = readFileSync(new URL("../app/financials-information-hub/FinancialOverview.tsx", import.meta.url), "utf8");
  const library = readFileSync(new URL("../app/financials-information-hub/PublicDocumentLibrary.tsx", import.meta.url), "utf8");
  assert.match(overview, /const closeMatches = Boolean\(needle\) && matchesSearch/);
  assert.match(overview, /<Disclosure key=\{`mediclaims-\$\{needle\}`\}[^\n]*initiallyOpen=\{closeMatches\}/);
  assert.match(overview, /<th scope="row"><Highlight text=\{row.item\}/);
  assert.match(library, /<BillingActivity query=\{query\}\/>/);
});
