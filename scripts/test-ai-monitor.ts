import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getAiMonitorConfig } from "../lib/ai-monitor/config";
import { dollarsToMicros, estimateAiMonitorCostMicros } from "../lib/ai-monitor/cost";
import { isSafePublicPath } from "../lib/ai-monitor/privacy";
import { duplicateAiMonitorRunResult } from "../lib/ai-monitor/runner";
import { AiMonitorReportSchema } from "../lib/ai-monitor/schemas";

test("the scheduled monitor fails when either required report is unsuccessful", () => {
  const workflow = readFileSync(new URL("../.github/workflows/ai-site-monitor.yml", import.meta.url), "utf8");
  const validator = workflow.match(/node -e '([\s\S]*?)' "\$body"/)?.[1];
  assert.ok(validator, "the actual workflow response validator must be tested");

  const completed = { status: "completed" };
  const duplicate = { status: "skipped", reason: "already_processed" };
  const notDue = { status: "skipped", reason: "not_weekly_window" };
  const run = (nightly: unknown, weekly: unknown, overrides = {}) => spawnSync(
    process.execPath,
    ["-e", validator, JSON.stringify({ ok: true, reportOnly: true, nightly, weekly, ...overrides })],
    { encoding: "utf8" },
  );

  for (const weekly of [completed, duplicate, notDue,
    { status: "skipped", reason: "weekly_analytics_disabled" }]) {
    const result = run(completed, weekly);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).weekly, weekly.status);
  }
  assert.equal(run(duplicate, duplicate).status, 0);

  for (const weekly of [undefined, { status: "running" },
    { status: "failed", reason: "openai_request_failed" },
    { status: "failed", reason: "existing_run_failed" },
    { status: "skipped", reason: "monthly_budget_guard" },
    { status: "skipped", reason: "unknown_reason" }]) {
    assert.equal(run(completed, weekly).status, 1, JSON.stringify(weekly));
  }
  assert.equal(run({ status: "failed" }, completed).status, 1);
  assert.equal(run({ status: "skipped", reason: "monitor_disabled" }, notDue).status, 1);
  assert.equal(run(completed, completed, { reportOnly: false }).status, 1);
  assert.equal(run(completed, completed, { ok: false }).status, 1);
});

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

test("only a completed duplicate scan is treated as successfully processed", () => {
  assert.deepEqual(
    duplicateAiMonitorRunResult("nightly_security:2026-09-07", "completed"),
    {
      status: "skipped",
      reason: "already_processed",
      runKey: "nightly_security:2026-09-07",
    },
  );

  for (const status of ["running", "failed", "budget_blocked"] as const) {
    assert.deepEqual(
      duplicateAiMonitorRunResult("nightly_security:2026-09-07", status),
      {
        status: "failed",
        reason: `existing_run_${status}`,
        runKey: "nightly_security:2026-09-07",
      },
    );
  }
});
