/**
 * CAD Call database — JSON file storage (same pattern as testimonials).
 * For production on a writable server (Railway, Fly.io, VPS).
 * Swap readCalls/writeCalls for PostgreSQL if needed later.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

const DATA_DIR   = join(process.cwd(), "data");
const CALLS_FILE = join(DATA_DIR, "cad-calls.json");
const FAILED_FILE = join(DATA_DIR, "cad-failed.json"); // admin-only, never public

// ── Types ──────────────────────────────────────────────────────────────────

export interface Call {
  id: string;                         // cuid-style unique id
  gmailMessageId: string;             // deduplication key
  dispatchDatetime: string;           // ISO-8601 in UTC (display in Chicago TZ)
  dispatchDate: string;               // "04/04/2026" — display-ready
  dispatchTime: string;               // "17:29"       — display-ready
  dispatchNature: string;             // "ACCIDENT W/ INJURIES"
  sourceYear: number;                 // calendar year in America/Chicago
  parseStatus: "ok" | "partial";
  createdAt: string;
}

export interface FailedParse {
  id: string;
  gmailMessageId: string;
  subject: string;
  receivedAt: string;
  errorMessage: string;
  rawSnippet: string; // first 300 chars max, for admin debug only — never public
}

// ── Helpers ────────────────────────────────────────────────────────────────

function nowChicago(): Date {
  // Create a Date whose local representation matches America/Chicago
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Chicago" }));
}

export function currentChicagoYear(): number {
  return nowChicago().getFullYear();
}

/** Simple unique id — no external dep needed */
function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ── Read / Write ───────────────────────────────────────────────────────────

async function readCalls(): Promise<Call[]> {
  try {
    const raw = await readFile(CALLS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeCalls(calls: Call[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(CALLS_FILE, JSON.stringify(calls, null, 2));
}

async function readFailed(): Promise<FailedParse[]> {
  try {
    const raw = await readFile(FAILED_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeFailed(items: FailedParse[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FAILED_FILE, JSON.stringify(items, null, 2));
}

// ── Public API ─────────────────────────────────────────────────────────────

/** Check if a Gmail message ID has already been processed */
export async function isDuplicate(gmailMessageId: string): Promise<boolean> {
  const calls  = await readCalls();
  const failed = await readFailed();
  return (
    calls.some(c  => c.gmailMessageId  === gmailMessageId) ||
    failed.some(f => f.gmailMessageId === gmailMessageId)
  );
}

/** Persist a successfully parsed call */
export async function saveCall(data: Omit<Call, "id" | "createdAt">): Promise<Call> {
  const calls = await readCalls();
  const call: Call = {
    ...data,
    id: uid(),
    createdAt: new Date().toISOString(),
  };
  calls.push(call);
  // Keep the file sorted newest-first for easier reading
  calls.sort((a, b) => b.dispatchDatetime.localeCompare(a.dispatchDatetime));
  await writeCalls(calls);
  return call;
}

/** Persist a failed / unparseable email for admin review */
export async function saveFailedParse(data: Omit<FailedParse, "id">): Promise<void> {
  const items = await readFailed();
  items.unshift({ ...data, id: uid() });
  // Keep at most 500 failed records
  await writeFailed(items.slice(0, 500));
}

/** Return the 3 most recent calls across all years */
export async function getLatestCalls(limit = 3): Promise<Call[]> {
  const calls = await readCalls();
  return calls
    .sort((a, b) => b.dispatchDatetime.localeCompare(a.dispatchDatetime))
    .slice(0, limit);
}

/** Return all calls for the current Chicago calendar year, newest first */
export async function getCallsForCurrentYear(): Promise<Call[]> {
  const year  = currentChicagoYear();
  const calls = await readCalls();
  return calls
    .filter(c => c.sourceYear === year)
    .sort((a, b) => b.dispatchDatetime.localeCompare(a.dispatchDatetime));
}

/** Admin: return failed parse log (never expose via public API) */
export async function getFailedParses(): Promise<FailedParse[]> {
  return readFailed();
}
