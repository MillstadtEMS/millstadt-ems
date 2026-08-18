import assert from "node:assert/strict";
import test from "node:test";
import { getAiMonitorConfig } from "../lib/ai-monitor/config";
import { dollarsToMicros, estimateAiMonitorCostMicros } from "../lib/ai-monitor/cost";
import { isSafePublicPath } from "../lib/ai-monitor/privacy";
import { AiMonitorReportSchema } from "../lib/ai-monitor/schemas";

test("AI monitor rejects private and parameterized analytics paths", () => {
  assert.equal(isSafePublicPath("/about"), true);
  assert.equal(isSafePublicPath("/kids-club"), true);
  assert.equal(isSafePublicPath("/admin"), false);
  assert.equal(isSafePublicPath("/lounge/employees"), false);
  assert.equal(isSafePublicPath("/api/cad/log"), false);
  assert.equal(isSafePublicPath("/about?employee=1"), false);
});

test("AI monitor cost estimate uses the fixed low-cost model rates", () => {
  assert.equal(estimateAiMonitorCostMicros(1_000_000, 1_000_000), 1_400_000);
  assert.equal(dollarsToMicros(18), 18_000_000);
});

test("AI monitor budget cannot exceed ten dollars", () => {
  const previous = process.env.AI_MONITOR_MONTHLY_BUDGET_USD;
  process.env.AI_MONITOR_MONTHLY_BUDGET_USD = "999";
  try {
    assert.equal(getAiMonitorConfig().monthlyBudgetUsd, 10);
  } finally {
    if (previous === undefined) delete process.env.AI_MONITOR_MONTHLY_BUDGET_USD;
    else process.env.AI_MONITOR_MONTHLY_BUDGET_USD = previous;
  }
});

test("AI monitor report schema rejects extra executable fields", () => {
  const valid = AiMonitorReportSchema.safeParse({
    verdict: "needs_attention",
    summary: "The public homepage check failed.",
    findings: [{
      severity: "high",
      title: "Homepage unavailable",
      evidence: ["GET / returned 503"],
      recommendation: "Review deployment logs and correct the confirmed failure in a tested branch.",
      confidence: 0.98,
    }],
    observations: [],
  });
  assert.equal(valid.success, true);

  const invalid = AiMonitorReportSchema.safeParse({
    verdict: "healthy",
    summary: "ok",
    findings: [],
    observations: [],
    shellCommand: "deploy now",
  });
  assert.equal(invalid.success, false);
});
