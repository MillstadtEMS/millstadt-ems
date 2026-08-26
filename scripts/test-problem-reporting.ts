import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { publicFinancialDocumentLibrary } from "../lib/financials-hub/public-library";
import { parseProblemReport, deliverProblemReport } from "../lib/financials-hub/problem-reporting";
import { POST } from "../app/api/financials/report-problem/route";
import type { GmailMessageInput } from "../lib/reports/gmail-message";

test("only technical descriptions and known document IDs are accepted, without identity fields", () => {
  assert.deepEqual(parseProblemReport({ description: " Broken link. ", website: "" }), { description: "Broken link." });
  for (const invalid of [{ description: "" }, { description: " " }, { description: "a".repeat(2001) }, { description: "Bug", to: "other@example.com" }, { description: "Bug", email: "visitor@example.com" }, { description: "Bug", documentId: "unknown" }, { description: "Bug", website: "spam" }]) {
    assert.equal(parseProblemReport(invalid), null);
  }
});

test("every report sends only to webdev with canonical context and escaped description", async () => {
  const captured: GmailMessageInput[] = [];
  for (const document of [...publicFinancialDocumentLibrary(), undefined]) {
    const input = parseProblemReport({ description: '<script>alert("bug")</script> & broken link', ...(document ? { documentId: document.id } : {}) });
    assert.ok(input);
    const result = await deliverProblemReport(input, async message => { captured.push(message); return { sent: true }; });
    assert.equal(result.status, "sent");
    const message = captured.at(-1)!;
    assert.deepEqual(message.to, ["webdev@millstadtems.org"]);
    assert.ok(message.text.includes("Requests are not accepted."));
    assert.ok(message.text.includes("https://www.millstadtems.org/financials-information-hub"));
    assert.ok(!message.html.includes("<script>"));
    assert.ok(message.html.includes("&lt;script&gt;"));
    if (document) assert.ok(message.text.includes(document.title));
  }
  assert.equal(captured.length, 51);
});

test("delivery is never marked sent when the mail transport is disabled or fails", async () => {
  const input = { description: "Test technical issue." };
  assert.equal((await deliverProblemReport(input, async () => ({ sent: false, skippedReason: "disabled" }))).status, "unavailable");
  assert.equal((await deliverProblemReport(input, async () => { throw new Error("transport failure"); })).status, "unavailable");
});

test("public route rejects cross-origin and invalid requests; preview never pretends it sent mail", async () => {
  process.env.DISABLE_OUTBOUND_EMAIL = "true";
  const makeRequest = (origin: string, body: unknown) => new NextRequest("http://127.0.0.1:3000/api/financials/report-problem", { method: "POST", headers: { origin, host: "127.0.0.1:3000", "Content-Type": "application/json" }, body: JSON.stringify(body) });
  assert.equal((await POST(makeRequest("https://unrelated.example", { description: "Bug" }))).status, 403);
  assert.equal((await POST(makeRequest("http://127.0.0.1:3000", { description: "Bug", to: "other@example.com" }))).status, 400);
  const result = await POST(makeRequest("http://127.0.0.1:3000", { description: "Test only" }));
  assert.equal(result.status, 503);
  assert.notEqual((await result.json()).status, "sent");
});
