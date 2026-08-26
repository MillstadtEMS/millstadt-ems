import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PAY_RATE_GROUPS, TRANSFER_CALL_STIPEND, NURSING_REGULAR_RATE, SECTION_SEARCH, matchesSearch } from "../lib/financials-hub/transparency-content.ts";

test("published pay rates match all seven supplied amounts exactly", () => {
  assert.deepEqual(PAY_RATE_GROUPS.flatMap(group => group.rates.map(rate => [group.position, rate.type, `${rate.amount}/hour`])), [
    ["EMT", "Regular", "$16.00/hour"],
    ["EMT", "Overtime", "$24.00/hour"],
    ["EMT", "Holiday", "$32.00/hour"],
    ["Paramedic", "Regular", "$20.00/hour"],
    ["Paramedic", "Overtime", "$30.00/hour"],
    ["Paramedic", "Holiday", "$40.00/hour"],
  ]);
  assert.equal(TRANSFER_CALL_STIPEND, "$10.00 per call");
  assert.equal(NURSING_REGULAR_RATE, "$20.00/hour");
});

test("page search includes every new position/pay type and the stipend", () => {
  const section = SECTION_SEARCH.find(section => section.id === "pay-transparency");
  for (const group of PAY_RATE_GROUPS) {
    for (const rate of group.rates) {
      assert.ok(matchesSearch(section.text, `${group.position} ${rate.type} ${rate.amount}/hour`));
    }
  }
  assert.ok(matchesSearch(section.text, `Transfer-call stipend ${TRANSFER_CALL_STIPEND}`));
  assert.ok(matchesSearch(section.text, `PHRN / APHRN regular ${NURSING_REGULAR_RATE}`));
});

test("responsive pay groups preserve the previously approved mobile personnel rules", () => {
  const css = readFileSync(new URL("../app/financials-information-hub/PublicDocumentLibrary.module.css", import.meta.url), "utf8");
  const mobile = css.split("@media(max-width:767px) {")[1].split("@media(prefers-reduced-motion")[0];
  assert.match(css, /\.payRateGroups \{ display:grid; grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(mobile, /\.payRateGroups \{ grid-template-columns:1fr;/);
  assert.match(mobile, /\.overviewHeading \{[^}]*flex-direction:column-reverse/);
  assert.match(mobile, /\.overviewHeading \.eyebrow \{ display:none;/);
});
