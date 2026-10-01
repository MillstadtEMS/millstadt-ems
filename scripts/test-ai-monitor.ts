import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getAiMonitorConfig } from "../lib/ai-monitor/config";
import { dollarsToMicros, estimateAiMonitorCostMicros } from "../lib/ai-monitor/cost";
import { isSafePublicPath } from "../lib/ai-monitor/privacy";
import { duplicateAiMonitorRunResult } from "../lib/ai-monitor/runner";
import { AiMonitorReportSchema } from "../lib/ai-monitor/schemas";
import { aiMonitorEmailConfiguration, composeAiMonitorEmail, deliverAiMonitorReports,
  type AiMonitorEmailDependencies, type AiMonitorEmailJob } from "../lib/ai-monitor/notifications";

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
  assert.equal(run(completed, completed, {
    ok: false, email: { status: "failed", reason: "email_delivery_failed" },
  }).status, 1);
});

const emailJob: AiMonitorEmailJob = {
  runId: "test-report", claimToken: "test-claim", recipient: "monitor@example.com",
  runKey: "nightly_security:2026-10-01", reportType: "nightly_security",
  report: {
    verdict: "needs_attention", summary: "The homepage returned an error.",
    findings: [{ severity: "high", title: "Homepage error", evidence: ["GET / returned 503"],
      recommendation: "Review the deployment logs.", confidence: 0.99 }], observations: [],
  },
};

test("monitor emails require explicit configuration and cannot send from previews", () => {
  const env = {
    AI_MONITOR_ENABLED: "true", AI_MONITOR_EMAIL_ENABLED: "true", AI_MONITOR_EMAIL_TO: "monitor@example.com",
    VERCEL_ENV: "production", GMAIL_CLIENT_ID: "test", GMAIL_CLIENT_SECRET: "test",
    GMAIL_REFRESH_TOKEN: "test",
  };
  assert.deepEqual(aiMonitorEmailConfiguration(env), { status: "ready", recipient: "monitor@example.com" });
  assert.deepEqual(aiMonitorEmailConfiguration({}), { status: "disabled" });
  assert.deepEqual(aiMonitorEmailConfiguration({ ...env, AI_MONITOR_ENABLED: "false" }), { status: "disabled" });
  for (const override of [
    { VERCEL_ENV: "preview" }, { VERCEL_ENV: "development" },
    { DISABLE_OUTBOUND_EMAIL: "true" }, { AI_MONITOR_EMAIL_TO: "" },
    { AI_MONITOR_EMAIL_TO: "one@example.com,two@example.com" },
    { AI_MONITOR_EMAIL_TO: "one@example.com\r\nBcc: other@example.com" },
    { GMAIL_REFRESH_TOKEN: "" },
  ]) assert.equal(aiMonitorEmailConfiguration({ ...env, ...override }).status, "failed");
});

test("email includes the findings and fixes, escapes HTML, and explains report coverage", () => {
  const email = composeAiMonitorEmail(emailJob);
  assert.deepEqual(email.to, ["monitor@example.com"]);
  assert.match(email.text, /GET \/ returned 503/);
  assert.match(email.text, /Suggested fix: Review the deployment logs/);
  assert.match(email.text, /not a complete vulnerability or malware scan/);
  assert.match(email.text, /https:\/\/www.millstadtems.org\/admin\/ai-monitor/);
  const hostile = composeAiMonitorEmail({ ...emailJob,
    report: { ...emailJob.report, summary: '<img src=x onerror="alert(1)">' } });
  assert.doesNotMatch(hostile.html, /<img/);
  assert.match(hostile.html, /&lt;img/);
  const weekly = composeAiMonitorEmail({ ...emailJob, reportType: "weekly_analytics",
    runKey: "weekly_analytics:2026-09-27" });
  assert.match(weekly.subject, /Weekly website summary/);
  assert.match(weekly.text, /not a weekly security scan/);
});

test("email delivery is durable across retries and does not resend a recorded success", async () => {
  let queued = false;
  let delivered = false;
  let claimed = false;
  let sends = 0;
  let providerFails = true;
  const dependencies: AiMonitorEmailDependencies = {
    enqueue: async () => { queued = true; },
    claim: async () => {
      if (!queued || delivered || claimed) return null;
      claimed = true;
      return emailJob;
    },
    sent: async () => { delivered = true; },
    failed: async () => {},
    pending: async () => delivered ? 0 : 1,
    send: async () => {
      sends += 1;
      if (providerFails) throw new Error("Simulated provider outage");
      return { sent: true };
    },
  };
  const configuration = { status: "ready" as const, recipient: "monitor@example.com" };
  assert.equal((await deliverAiMonitorReports([emailJob.runKey], configuration, dependencies)).status, "failed");
  assert.equal(delivered, false);
  providerFails = false;
  claimed = false; // The durable retry becomes eligible on the next invocation.
  assert.deepEqual(await deliverAiMonitorReports([emailJob.runKey], configuration, dependencies),
    { status: "completed", sent: 1 });
  assert.deepEqual(await deliverAiMonitorReports([emailJob.runKey], configuration, dependencies),
    { status: "completed", sent: 0 });
  assert.equal(sends, 2);
  assert.equal((await deliverAiMonitorReports([], { status: "disabled" }, dependencies)).status, "disabled");
  assert.equal(sends, 2);
});

test("a skipped provider send or an active delivery lease cannot be reported as sent", async () => {
  let claimed = false;
  let markedSent = false;
  const dependencies: AiMonitorEmailDependencies = {
    enqueue: async () => {},
    claim: async () => { if (claimed) return null; claimed = true; return emailJob; },
    sent: async () => { markedSent = true; },
    failed: async () => {}, pending: async () => 1,
    send: async () => ({ sent: false, skippedReason: "disabled" }),
  };
  const configuration = { status: "ready" as const, recipient: "monitor@example.com" };
  assert.equal((await deliverAiMonitorReports([], configuration, dependencies)).status, "failed");
  assert.equal(markedSent, false);
  const leased = await deliverAiMonitorReports([], configuration, dependencies);
  assert.equal(leased.status, "failed");
  assert.ok("reason" in leased && leased.reason === "email_delivery_pending");
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
