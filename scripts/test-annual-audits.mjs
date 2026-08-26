import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { extname } from "node:path";
import { test } from "node:test";

// The application uses bundler-resolved extensionless TS imports. Resolve those
// read-only for Node 24's native type stripping, without installing dependencies
// or changing the production import paths.
const hook = registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(specifier.startsWith(".") && !extname(specifier)
      ? `${specifier}.ts`
      : specifier, context);
  },
});
let library, audits, fiscal, transparency;
try {
  [library, audits, fiscal, transparency] = await Promise.all([
    import("../lib/financials-hub/public-library.ts"),
    import("../lib/financials-hub/annual-audits.ts"),
    import("../lib/financials-hub/fiscal-year-documents.ts"),
    import("../lib/financials-hub/transparency-content.ts"),
  ]);
} finally {
  hook.deregister();
}

const documents = library.publicFinancialDocumentLibrary();
const posted = documents.filter(document => document.kind === "annual_audit");
const pending = audits.PENDING_ANNUAL_AUDITS;
const verifiedSources = {
  "annual-audit-fy-2022-2023": { pages: 20, reportDate: "March 31, 2026", sha256: "6cc5a9be8033bf6b0978a389934a99e1c6e2071f5b05c6c2d05abdabacd2cba3" },
  "annual-audit-fy-2023-2024": { pages: 21, reportDate: "April 4, 2026", sha256: "74914f3fcecdf23d15342d0082ecbbb4943efe78d454d9c9c4081de085b161ed" },
};

test("two posted annual audits have canonical public PDF actions and correct fiscal years", () => {
  assert.equal(posted.length, 2);
  assert.deepEqual(posted.map(document => [document.id, document.filingYear]).sort((a, b) => a[1] - b[1]), [
    ["annual-audit-fy-2022-2023", 2023],
    ["annual-audit-fy-2023-2024", 2024],
  ]);
  for (const document of posted) {
    const url = `/financial-transparency/audits/${document.id}.pdf`;
    assert.equal(document.category, "Operational");
    assert.equal(document.viewUrl, url);
    assert.equal(document.downloadUrl, url);
    assert.equal(document.printUrl, url);
    assert.match(document.title, /Annual Audit/i);
    assert.ok(document.periodLabel.includes(String(document.filingYear - 1)));
    assert.ok(document.periodLabel.includes(String(document.filingYear)));
    assert.equal(document.pageCount, verifiedSources[document.id].pages);
    assert.ok(document.dateLabel.includes(verifiedSources[document.id].reportDate));
    assert.match(document.sourceLabel, /Scheffel Boyle/);
  }
});

test("every published annual-audit entry has a complete local PDF for deployment", () => {
  for (const document of posted) {
    const file = readFileSync(new URL(`../public${document.downloadUrl}`, import.meta.url));
    assert.equal(file.subarray(0, 5).toString("ascii"), "%PDF-", document.id);
    assert.ok(file.length > 1024, `${document.id} must contain the actual report`);
    assert.match(file.subarray(-2048).toString("ascii"), /%%EOF/, `${document.id} must not be a partial download`);
    assert.equal(createHash("sha256").update(file).digest("hex"), verifiedSources[document.id].sha256, `${document.id} must match the complete, unchanged source report`);
  }
});

test("pending audits preserve distinct annual statuses without inventing downloadable files", () => {
  assert.equal(pending.length, 2);
  assert.deepEqual(pending.map(row => [row.id, row.year, row.statusLabel]).sort((a, b) => a[1] - b[1]), [
    ["annual-audit-fy-2024-2025", 2025, "Awaiting finalization and delivery"],
    ["annual-audit-fy-2025-2026", 2026, "Awaiting audit completion"],
  ]);
  for (const row of pending) {
    assert.match(row.title, /Annual Audit/i);
    assert.ok(row.title.includes(String(row.year - 1)) && row.title.includes(String(row.year)));
    assert.ok(row.periodLabel.includes(String(row.year - 1)) && row.periodLabel.includes(String(row.year)));
    assert.ok(typeof row.message === "string" && row.message.trim().length > 0);
    assert.ok(typeof row.searchText === "string" && row.searchText.trim().length > 0);
    assert.ok(!documents.some(document => document.id === row.id));
    for (const field of ["viewUrl", "downloadUrl", "printUrl", "url", "href", "pageCount"]) {
      assert.ok(!(field in row), `${row.id} must not expose unavailable ${field}`);
    }
    assert.doesNotMatch(JSON.stringify(row), /\.pdf(?:["?#]|$)/i);
  }
});

test("only real files contribute to the public-document count", () => {
  assert.equal(documents.length, 52);
  assert.equal(new Set(documents.map(document => document.id)).size, 52);
  assert.equal(new Set(documents.map(document => document.downloadUrl)).size, 52);
  assert.equal(documents.filter(document => document.kind !== "annual_audit").length, 50);
});

test("annual audits are searchable operational records and do not enter the 990 filter", () => {
  for (const document of posted) {
    assert.equal(fiscal.matchesLibraryCategory(document, "All documents"), true);
    assert.equal(fiscal.matchesLibraryCategory(document, "Operational"), true);
    assert.equal(fiscal.matchesLibraryCategory(document, "990"), false);
    assert.ok(transparency.matchesSearch(transparency.documentSearchText(document), "annual audit"));
    assert.ok(transparency.matchesSearch(transparency.documentSearchText(document), `${document.filingYear - 1}-${document.filingYear}`));
  }
  for (const row of pending) {
    assert.ok(transparency.matchesSearch(row.searchText, "annual audit"));
    assert.ok(transparency.matchesSearch(row.searchText, `${row.year - 1}-${row.year}`));
    assert.ok(transparency.matchesSearch(row.searchText, row.statusLabel));
  }
});

test("adding audits does not change the verified 990 archive or compensation attachments", () => {
  const filings = documents.filter(document => document.kind === "form_990");
  assert.deepEqual(filings.map(document => document.filingYear).sort((a, b) => b - a), [
    2025, 2024, 2023, 2022, 2021, 2020, 2019, 2017, 2016, 2015, 2014,
    2013, 2012, 2011, 2010, 2009, 2008, 2007, 2006, 2005, 2004, 2003, 2002,
  ]);
  const groups = fiscal.filingYearGroups(documents, documents, "All documents", 2026);
  assert.equal(groups[0].year, 2025);
  assert.equal(groups[0].filings.length, 1);
  assert.equal(groups[0].filings[0].pageCount, 30);
  assert.equal(groups[0].fileCount, 3);
  assert.equal(documents.filter(document => document.kind === "management_pay").length, 4);
  for (const group of groups) {
    assert.ok(group.filings.every(document => document.kind === "form_990"));
  }
});

test("annual audits reuse compact disclosures and public document rows without direct pending actions", () => {
  const component = readFileSync(new URL("../app/financials-information-hub/AnnualAudits.tsx", import.meta.url), "utf8");
  const page = readFileSync(new URL("../app/financials-information-hub/PublicDocumentLibrary.tsx", import.meta.url), "utf8");
  assert.match(component, /<Disclosure\b/);
  assert.match(component, /<DocumentRow\b/);
  assert.match(component, /statusLabel/);
  assert.match(component, /message/);
  assert.doesNotMatch(component, /\bhref\s*=|\.pdf["'`]|<img\b|<Image\b|codex-clipboard/);
  assert.equal((page.match(/<AnnualAudits\b/g) ?? []).length, 1);
  assert.deepEqual([...page.matchAll(/<option(?:\s[^>]*)?>([^<]+)<\/option>/g)].map(match => match[1]), ["All documents", "990", "Operational"]);
  assert.match(page, /documents\.length\} public documents/);
});
