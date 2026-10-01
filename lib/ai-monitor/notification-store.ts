import { randomUUID } from "node:crypto";
import { sql } from "@/lib/neon";
import { ensureAiMonitorSchema } from "./store";
import type { AiMonitorEmailDependencies, AiMonitorEmailJob } from "./notifications";

declare global {
  var __millstadtAiMonitorEmailSchema: Promise<void> | undefined;
}

async function ensureSchema() {
  globalThis.__millstadtAiMonitorEmailSchema ??= (async () => {
    await ensureAiMonitorSchema();
    await sql()`
      CREATE TABLE IF NOT EXISTS ai_monitor_email_outbox (
        run_id TEXT PRIMARY KEY REFERENCES ai_monitor_runs(id) ON DELETE CASCADE,
        recipient TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        claim_token TEXT,
        claimed_at TIMESTAMPTZ,
        sent_at TIMESTAMPTZ,
        retry_after TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
  })().catch((error) => {
    globalThis.__millstadtAiMonitorEmailSchema = undefined;
    throw error;
  });
  return globalThis.__millstadtAiMonitorEmailSchema;
}

export const aiMonitorEmailStore: Omit<AiMonitorEmailDependencies, "send"> = {
  async enqueue(runKeys, recipient) {
    await ensureSchema();
    for (const runKey of runKeys) {
      await sql()`
        INSERT INTO ai_monitor_email_outbox (run_id, recipient)
        SELECT id, ${recipient} FROM ai_monitor_runs
        WHERE run_key = ${runKey} AND status = 'completed' AND report IS NOT NULL
        ON CONFLICT (run_id) DO NOTHING
      `;
    }
  },
  async claim(recipient) {
    const claimToken = randomUUID();
    const rows = await sql()`
      WITH candidate AS (
        SELECT run_id FROM ai_monitor_email_outbox
        WHERE recipient = ${recipient} AND status <> 'sent' AND retry_after <= NOW()
          AND (status <> 'sending' OR claimed_at < NOW() - INTERVAL '15 minutes')
        ORDER BY created_at ASC
        LIMIT 1 FOR UPDATE SKIP LOCKED
      ), claimed AS (
        UPDATE ai_monitor_email_outbox AS outbox
        SET status = 'sending', claim_token = ${claimToken}, claimed_at = NOW()
        FROM candidate WHERE outbox.run_id = candidate.run_id
        RETURNING outbox.run_id, outbox.recipient, outbox.claim_token
      )
      SELECT claimed.run_id, claimed.recipient, claimed.claim_token,
             runs.run_key, runs.report_type, runs.report
      FROM claimed JOIN ai_monitor_runs AS runs ON runs.id = claimed.run_id
    `;
    const row = rows[0];
    return row ? {
      runId: String(row.run_id),
      claimToken: String(row.claim_token),
      recipient: String(row.recipient),
      runKey: String(row.run_key),
      reportType: row.report_type as AiMonitorEmailJob["reportType"],
      report: row.report as AiMonitorEmailJob["report"],
    } : null;
  },
  async sent(job) {
    await sql()`
      UPDATE ai_monitor_email_outbox SET status = 'sent', sent_at = NOW()
      WHERE run_id = ${job.runId} AND claim_token = ${job.claimToken} AND status = 'sending'
    `;
  },
  async failed(job) {
    await sql()`
      UPDATE ai_monitor_email_outbox
      SET status = 'pending', retry_after = NOW() + INTERVAL '5 minutes'
      WHERE run_id = ${job.runId} AND claim_token = ${job.claimToken} AND status = 'sending'
    `;
  },
  async pending(recipient) {
    const rows = await sql()`
      SELECT COUNT(*)::int AS count FROM ai_monitor_email_outbox
      WHERE recipient = ${recipient} AND status <> 'sent'
    `;
    return Number(rows[0]?.count ?? 0);
  },
};
