import assert from "node:assert/strict";
import { test } from "node:test";
import { publicFinancialDocumentLibrary } from "../lib/financials-hub/public-library";
import { PUBLIC_PAGE_URL, REPORT_EMAIL, reportDraft, reportHref } from "../lib/financials-hub/transparency-content";

test("every document has the same recipient and context in its email and copyable draft", () => {
  for (const document of publicFinancialDocumentLibrary()) {
    const draft = reportDraft(document, "The PDF will not open.");
    const link = new URL(draft.href);
    assert.equal(link.protocol, "mailto:");
    assert.equal(link.pathname, REPORT_EMAIL);
    assert.equal(link.searchParams.get("subject"), draft.subject);
    assert.equal(link.searchParams.get("body"), draft.body);
    assert.ok(draft.text.startsWith(`To: ${REPORT_EMAIL}\nSubject: ${draft.subject}\n\n`));
    assert.ok(draft.body.includes(PUBLIC_PAGE_URL));
    assert.ok(draft.body.includes(`Document: ${document.title}`));
    assert.ok(draft.body.includes(document.viewUrl));
    assert.ok(draft.body.endsWith("The PDF will not open."));
    assert.equal(reportHref(document), reportDraft(document).href);
  }
});

test("page-wide reports do not accidentally include a previously selected document", () => {
  const draft = reportDraft(undefined, "Search is not responding.");
  assert.equal(draft.subject, "Millstadt EMS technical problem");
  assert.ok(draft.body.includes(PUBLIC_PAGE_URL));
  assert.ok(!draft.body.includes("Document:"));
  assert.ok(draft.body.endsWith("Search is not responding."));
});

test("special characters and newlines stay in the body, not additional email parameters", () => {
  const description = "Test & cc=someone@example.com? #details\nSecond line — 2026";
  const link = new URL(reportDraft(undefined, description).href);
  assert.deepEqual([...link.searchParams.keys()], ["subject", "body"]);
  assert.ok(link.searchParams.get("body")?.endsWith(description));
});

test("empty optional description still provides a useful privacy-aware draft", () => {
  const draft = reportDraft(undefined, "  ");
  assert.ok(draft.body.endsWith("Please describe the problem (do not include private or medical information):"));
  assert.ok(!draft.text.includes("undefined"));
});
