import assert from "node:assert/strict";
import { test } from "node:test";
import { publicFinancialDocumentLibrary } from "../lib/financials-hub/public-library";
import { filingYearGroups, matchesLibraryCategory, payReportsForYear } from "../lib/financials-hub/fiscal-year-documents";
import { documentSearchText, matchesSearch } from "../lib/financials-hub/transparency-content";

const documents=publicFinancialDocumentLibrary();
test("FY 2024–2025 has its verified Form 990 followed by the two canonical pay reports",()=>{
  const groups=filingYearGroups(documents,documents,"All documents",2026);
  assert.equal(groups[0].year,2025);
  assert.equal(groups[0].filings.length,1);
  assert.equal(groups[0].filings[0].pageCount,30);
  assert.equal(groups[0].fileCount,3);
  assert.deepEqual(groups[0].reports.map(d=>d.employee),["Kenneth James","Jennifer Goetz"]);
  assert.equal(groups[1].year,2024);
  assert.ok(!groups.some(group=>group.year===2026));
});
test("pending FY 2025–2026 reuses the same report objects as Management Pay Transparency",()=>{
  const reports=payReportsForYear(documents,2026);
  assert.equal(reports.length,2);
  for(const report of reports)assert.equal(report,documents.find(d=>d.id===report.id));
  assert.equal(documents.filter(d=>d.kind==="management_pay").length,4);
  assert.equal(new Set(documents.map(d=>d.downloadUrl)).size,88);
});
test("990 search reveals related pay reports under their correct fiscal year",()=>{
  const matches=documents.filter(d=>matchesLibraryCategory(d,"990")&&matchesSearch(documentSearchText(d),"2024-2025"));
  const groups=filingYearGroups(documents,matches,"990",2026);
  assert.equal(matches.length,3);
  assert.deepEqual(groups.map(group=>group.year),[2025]);
  assert.equal(filingYearGroups(documents,documents,"Operational",2026).length,0);
});
