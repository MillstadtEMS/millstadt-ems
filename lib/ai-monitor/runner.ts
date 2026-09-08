import { dollarsToMicros, estimateAiMonitorCostMicros, MAX_RESERVED_RUN_COST_MICROS } from "./cost";
import { getAiMonitorConfig } from "./config";
import { buildNightlySecurityEvidence, buildWeeklyAnalyticsEvidence } from "./evidence";
import { AiMonitorRequestError, requestAiMonitorReport } from "./openai";
import type { AiMonitorReportType } from "./schemas";
import {
  completeAiMonitorRun,
  currentMonthAiMonitorSpendMicros,
  failAiMonitorRun,
  pruneAiMonitorRuns,
  reserveAiMonitorRun,
  type AiMonitorRunStatus,
} from "./store";

export type AiMonitorRunResult =
  | { status: "completed"; runKey: string; verdict: string; estimatedCostMicros: number }
  | { status: "skipped"; reason: string; runKey?: string }
  | { status: "failed"; reason: string; runKey: string };

export function duplicateAiMonitorRunResult(
  runKey: string,
  existingStatus: AiMonitorRunStatus,
): AiMonitorRunResult {
  if (existingStatus === "completed") {
    return { status: "skipped", reason: "already_processed", runKey };
  }
  return { status: "failed", reason: `existing_run_${existingStatus}`, runKey };
}

export async function runAiMonitor(
  reportType: AiMonitorReportType,
  localDate: string,
  now = new Date(),
): Promise<AiMonitorRunResult> {
  const config = getAiMonitorConfig();
  const runKey = reportType + ":" + localDate;
  if (!config.enabled) return { status: "skipped", reason: "monitor_disabled", runKey };
  if (!config.ready) return { status: "skipped", reason: "monitor_not_configured", runKey };
  if (reportType === "weekly_analytics" && !config.weeklyAnalyticsEnabled) {
    return { status: "skipped", reason: "weekly_analytics_disabled", runKey };
  }

  await pruneAiMonitorRuns(config.reportRetentionDays);
  const reservation = await reserveAiMonitorRun(runKey, reportType, MAX_RESERVED_RUN_COST_MICROS);
  if (!reservation) return { status: "failed", reason: "reservation_status_unavailable", runKey };
  if (!reservation.reserved) return duplicateAiMonitorRunResult(runKey, reservation.status);
  const id = reservation.id;

  const budgetMicros = dollarsToMicros(config.monthlyBudgetUsd);
  const spentMicros = await currentMonthAiMonitorSpendMicros(now);
  if (spentMicros > budgetMicros) {
    await failAiMonitorRun(id, "budget_blocked", "monthly_budget_guard");
    return { status: "skipped", reason: "monthly_budget_guard", runKey };
  }

  try {
    const evidence = reportType === "nightly_security"
      ? await buildNightlySecurityEvidence(config.siteUrl, now)
      : await buildWeeklyAnalyticsEvidence(now);
    const result = await requestAiMonitorReport({
      apiKey: process.env.OPENAI_API_KEY!,
      model: config.model,
      reportType,
      evidence,
      maxOutputTokens: config.maxOutputTokens,
    });
    const estimatedCostMicros = estimateAiMonitorCostMicros(
      result.inputTokens,
      result.outputTokens,
    );
    await completeAiMonitorRun({
      id,
      report: result.report,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      estimatedCostMicros,
    });
    return {
      status: "completed",
      runKey,
      verdict: result.report.verdict,
      estimatedCostMicros,
    };
  } catch (error) {
    const reason = error instanceof AiMonitorRequestError ? error.code : "monitor_run_failed";
    await failAiMonitorRun(id, "failed", reason);
    return { status: "failed", reason, runKey };
  }
}
