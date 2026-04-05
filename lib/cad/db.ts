/**
 * CAD Call database — Neon Postgres (serverless).
 * Tables are created on first use via ensureSchema().
 */

import { neon } from "@neondatabase/serverless";

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  return neon(url);
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface Call {
  id: string;
  gmailMessageId: string;
  dispatchDatetime: string;
  dispatchDate: string;
  dispatchTime: string;
  dispatchNature: string;
  sourceYear: number;
  parseStatus: "ok" | "partial";
  createdAt: string;
}

export interface FailedParse {
  id: string;
  gmailMessageId: string;
  subject: string;
  receivedAt: string;
  errorMessage: string;
  rawSnippet: string;
}

// ── Schema ─────────────────────────────────────────────────────────────────

async function ensureSchema() {
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS cad_calls (
      id               TEXT PRIMARY KEY,
      gmail_message_id TEXT UNIQUE NOT NULL,
      dispatch_datetime TIMESTAMPTZ NOT NULL,
      dispatch_date    TEXT NOT NULL,
      dispatch_time    TEXT NOT NULL,
      dispatch_nature  TEXT NOT NULL,
      source_year      INTEGER NOT NULL,
      parse_status     TEXT NOT NULL,
      created_at       TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS cad_failed (
      id               TEXT PRIMARY KEY,
      gmail_message_id TEXT UNIQUE NOT NULL,
      subject          TEXT,
      received_at      TIMESTAMPTZ,
      error_message    TEXT,
      raw_snippet      TEXT,
      created_at       TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function nowChicago(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Chicago" }));
}

export function currentChicagoYear(): number {
  return nowChicago().getFullYear();
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function rowToCall(row: Record<string, unknown>): Call {
  return {
    id:               String(row.id),
    gmailMessageId:   String(row.gmail_message_id),
    dispatchDatetime: row.dispatch_datetime instanceof Date
      ? row.dispatch_datetime.toISOString()
      : String(row.dispatch_datetime),
    dispatchDate:     String(row.dispatch_date),
    dispatchTime:     String(row.dispatch_time),
    dispatchNature:   String(row.dispatch_nature),
    sourceYear:       Number(row.source_year),
    parseStatus:      String(row.parse_status) as "ok" | "partial",
    createdAt:        row.created_at instanceof Date
      ? row.created_at.toISOString()
      : String(row.created_at),
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function isDuplicate(gmailMessageId: string): Promise<boolean> {
  await ensureSchema();
  const db = sql();
  const [calls, failed] = await Promise.all([
    db`SELECT 1 FROM cad_calls  WHERE gmail_message_id = ${gmailMessageId} LIMIT 1`,
    db`SELECT 1 FROM cad_failed WHERE gmail_message_id = ${gmailMessageId} LIMIT 1`,
  ]);
  return calls.length > 0 || failed.length > 0;
}

export async function saveCall(data: Omit<Call, "id" | "createdAt">): Promise<Call> {
  await ensureSchema();
  const db = sql();
  const id = uid();
  await db`
    INSERT INTO cad_calls
      (id, gmail_message_id, dispatch_datetime, dispatch_date, dispatch_time, dispatch_nature, source_year, parse_status)
    VALUES
      (${id}, ${data.gmailMessageId}, ${data.dispatchDatetime}, ${data.dispatchDate},
       ${data.dispatchTime}, ${data.dispatchNature}, ${data.sourceYear}, ${data.parseStatus})
    ON CONFLICT (gmail_message_id) DO NOTHING
  `;
  const rows = await db`SELECT * FROM cad_calls WHERE id = ${id}`;
  return rowToCall(rows[0] as Record<string, unknown>);
}

export async function saveFailedParse(data: Omit<FailedParse, "id">): Promise<void> {
  await ensureSchema();
  const db = sql();
  const id = uid();
  await db`
    INSERT INTO cad_failed
      (id, gmail_message_id, subject, received_at, error_message, raw_snippet)
    VALUES
      (${id}, ${data.gmailMessageId}, ${data.subject}, ${data.receivedAt},
       ${data.errorMessage}, ${data.rawSnippet})
    ON CONFLICT (gmail_message_id) DO NOTHING
  `;
}

export async function getLatestCalls(limit = 3): Promise<Call[]> {
  await ensureSchema();
  const db = sql();
  const rows = await db`
    SELECT * FROM cad_calls
    ORDER BY dispatch_datetime DESC
    LIMIT ${limit}
  `;
  return (rows as Record<string, unknown>[]).map(rowToCall);
}

export async function getCallsForCurrentYear(): Promise<Call[]> {
  await ensureSchema();
  const db = sql();
  const year = currentChicagoYear();
  const rows = await db`
    SELECT * FROM cad_calls
    WHERE source_year = ${year}
    ORDER BY dispatch_datetime DESC
  `;
  return (rows as Record<string, unknown>[]).map(rowToCall);
}

export async function getFailedParses(): Promise<FailedParse[]> {
  await ensureSchema();
  const db = sql();
  const rows = await db`
    SELECT * FROM cad_failed ORDER BY created_at DESC LIMIT 500
  `;
  return (rows as Record<string, unknown>[]).map(row => ({
    id:             String(row.id),
    gmailMessageId: String(row.gmail_message_id),
    subject:        String(row.subject ?? ""),
    receivedAt:     row.received_at instanceof Date
      ? row.received_at.toISOString()
      : String(row.received_at ?? ""),
    errorMessage:   String(row.error_message ?? ""),
    rawSnippet:     String(row.raw_snippet ?? ""),
  }));
}
