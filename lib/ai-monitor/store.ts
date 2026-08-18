import { randomUUID } from "node:crypto";
import { sql } from "@/lib/neon";
import { AiMonitorReportSchema, type AiMonitorReport, type AiMonitorReportType } from "./schemas";

declare global {
  var __millstadtAiMonitorSchemaPromise: Promise<void> | undefined;
}

export type StoredAiMonitorRun = {
  id: string;
  runKey: string;
  reportType: AiMonitorReportType;
  status: "running" | "completed" | "failed" | "budget_blocked";
  startedAt: string;
  completedAt: string | null;
  report: AiMonitorReport | null;
  inputTokens: number;
  outputTokens: number;
  estimatedCostMicros: number;
  errorCode: string | null;
};

export async function ensureAiMonitorSchema() {
  globalThis.__millstadtAiMonitorSchemaPromise ??= createAiMonitorSchema().catch((error) => {
    globalThis.__millstadtAiMonitorSchemaPromise = undefined;
    throw error;
  });
  return globalThis.__millstadtAiMonitorSchemaPromise;
}

async function createAiMonitorSchema() {
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS ai_monitor_runs (
      id TEXT PRIMARY KEY,
      run_key TEXT NOT NULL UNIQUE,
      report_type TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TIMESTAMPTZ NOT NULL,
      completed_at TIMESTAMPTZ,
      report JSONB,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      estimated_cost_micros INTEGER NOT NULL DEFAULT 0,
      error_code TEXT
    )
  `;
  await db`
    CREATE INDEX IF NOT EXISTS ai_monitor_runs_started_idx
    ON ai_monitor_runs (started_at DESC)
  `;
}

export async function reserveAiMonitorRun(
  runKey: string,
  reportType: AiMonitorReportType,
  reservedCostMicros: number,
) {
  await ensureAiMonitorSchema();
  const id = randomUUID();
  const rows = (await sql()`
    INSERT INTO ai_monitor_runs
      (id, run_key, report_type, status, started_at, estimated_cost_micros)
    VALUES (${id}, ${runKey}, ${reportType}, 'running', NOW(), ${reservedCostMicros})
    ON CONFLICT (run_key) DO NOTHING
    RETURNING id
  `) as unknown as Array<{ id: string }>;
  return rows[0]?.id ?? null;
}

export async function completeAiMonitorRun(input: {
  id: string;
  report: AiMonitorReport;
  inputTokens: number;
  outputTokens: number;
  estimatedCostMicros: number;
}) {
  await sql()`
    UPDATE ai_monitor_runs
    SET status = 'completed', completed_at = NOW(), report = ${JSON.stringify(input.report)}::jsonb,
        input_tokens = ${input.inputTokens}, output_tokens = ${input.outputTokens},
        estimated_cost_micros = ${input.estimatedCostMicros}, error_code = NULL
    WHERE id = ${input.id}
  `;
}

export async function failAiMonitorRun(
  id: string,
  status: "failed" | "budget_blocked",
  errorCode: string,
) {
  await sql()`
    UPDATE ai_monitor_runs
    SET status = ${status}, completed_at = NOW(), error_code = ${errorCode.slice(0, 80)}
    WHERE id = ${id}
  `;
}

export async function currentMonthAiMonitorSpendMicros(now = new Date()) {
  await ensureAiMonitorSchema();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const rows = (await sql()`
    SELECT COALESCE(SUM(estimated_cost_micros), 0)::int AS cost
    FROM ai_monitor_runs
    WHERE started_at >= ${monthStart.toISOString()} AND status <> 'budget_blocked'
  `) as unknown as Array<{ cost: number }>;
  return Number(rows[0]?.cost ?? 0);
}

export async function pruneAiMonitorRuns(retentionDays: number) {
  await ensureAiMonitorSchema();
  await sql()`
    DELETE FROM ai_monitor_runs
    WHERE started_at < NOW() - (${retentionDays} * INTERVAL '1 day')
  `;
}

function parseReport(value: unknown) {
  const parsedValue = typeof value === "string" ? JSON.parse(value) : value;
  const result = AiMonitorReportSchema.safeParse(parsedValue);
  return result.success ? result.data : null;
}

function mapRun(row: Record<string, unknown>): StoredAiMonitorRun {
  return {
    id: String(row.id),
    runKey: String(row.run_key),
    reportType: row.report_type as AiMonitorReportType,
    status: row.status as StoredAiMonitorRun["status"],
    startedAt: new Date(String(row.started_at)).toISOString(),
    completedAt: row.completed_at ? new Date(String(row.completed_at)).toISOString() : null,
    report: row.report ? parseReport(row.report) : null,
    inputTokens: Number(row.input_tokens ?? 0),
    outputTokens: Number(row.output_tokens ?? 0),
    estimatedCostMicros: Number(row.estimated_cost_micros ?? 0),
    errorCode: row.error_code ? String(row.error_code) : null,
  };
}

export async function listAiMonitorRuns(limit = 30) {
  if (!process.env.DATABASE_URL) return [];
  await ensureAiMonitorSchema();
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const rows = (await sql()`
    SELECT id, run_key, report_type, status, started_at, completed_at, report,
           input_tokens, output_tokens, estimated_cost_micros, error_code
    FROM ai_monitor_runs
    ORDER BY started_at DESC
    LIMIT ${safeLimit}
  `) as unknown as Array<Record<string, unknown>>;
  return rows.map(mapRun);
}
