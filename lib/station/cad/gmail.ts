// Read-only access to the CAD Gmail inbox for the station TV. Its own OAuth client from the same
// settings as the ticker's poller (lib/cad/gmail.ts, which this never touches), and only two calls:
// users.messages.list and users.messages.get. Nothing here marks, labels, moves, sends or deletes
// mail, so the ticker's unread-driven poller sees exactly what it saw before.

import { google, type gmail_v1 } from "googleapis";

/** The CAD senders, read or unread. STATION_CAD_QUERY overrides it. */
export const DEFAULT_STATION_CAD_QUERY = "(from:alert@cfmsg.co OR from:cencom@omnigo.com) newer_than:2d";
/** Only messages this recent are fetched: no call stays on the TV this long. */
export const FETCH_HORIZON_MS = 12 * 60 * 60_000;
const REQUEST_TIMEOUT_MS = 6000;

export interface StationEmail {
  id: string;
  from: string;
  subject: string;
  /** The text/plain body when it carries the labeled fields, else the raw HTML (the parser flattens it). */
  body: string;
  receivedAt: number;
}

export function stationGmailConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.GMAIL_CLIENT_ID && env.GMAIL_CLIENT_SECRET && env.GMAIL_REFRESH_TOKEN);
}

// One client per server instance, so its access token is reused until it expires instead of being
// refreshed on every sync.
let cached: { key: string; gmail: gmail_v1.Gmail } | null = null;
function client(): gmail_v1.Gmail {
  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN } = process.env;
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) throw new Error("CAD email is not configured");
  const key = `${GMAIL_CLIENT_ID}\n${GMAIL_CLIENT_SECRET}\n${GMAIL_REFRESH_TOKEN}`;
  if (cached?.key !== key) {
    const auth = new google.auth.OAuth2(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });
    cached = { key, gmail: google.gmail({ version: "v1", auth }) };
  }
  return cached.gmail;
}

function userId() {
  return process.env.GMAIL_USER || "me";
}

export function stationCadQuery(now = Date.now()): string {
  const base = process.env.STATION_CAD_QUERY?.trim() || DEFAULT_STATION_CAD_QUERY;
  return `${base} after:${Math.floor((now - FETCH_HORIZON_MS) / 1000)}`;
}

/** Recent CAD message ids, newest first. */
export async function listRecentMessageIds(max = 100): Promise<string[]> {
  const res = await client().users.messages.list(
    { userId: userId(), q: stationCadQuery(), maxResults: Math.min(max, 500), includeSpamTrash: false, fields: "messages/id" },
    { timeout: REQUEST_TIMEOUT_MS },
  );
  return (res.data.messages ?? []).map((m) => m.id).filter((id): id is string => Boolean(id));
}

function decode(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function findPart(part: gmail_v1.Schema$MessagePart | undefined, mime: string): string | null {
  if (!part) return null;
  if (part.mimeType?.toLowerCase() === mime && part.body?.data && !part.filename) return decode(part.body.data);
  for (const child of part.parts ?? []) {
    const found = findPart(child, mime);
    if (found) return found;
  }
  return null;
}

function labeledLines(text: string) {
  return (text.match(/^[ \t>]*[A-Za-z][A-Za-z #/.()-]{1,30}:[ \t]*\S/gm) ?? []).length;
}

export function emailBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  const plain = findPart(payload, "text/plain");
  const html = findPart(payload, "text/html");
  if (plain && (labeledLines(plain) >= 2 || !html)) return plain;
  return html ?? plain ?? "";
}

export async function getMessage(id: string): Promise<StationEmail> {
  const res = await client().users.messages.get({ userId: userId(), id, format: "full" }, { timeout: REQUEST_TIMEOUT_MS });
  const headers = res.data.payload?.headers ?? [];
  const header = (name: string) => headers.find((h) => h.name?.toLowerCase() === name)?.value ?? "";
  const internal = Number(res.data.internalDate);
  const dated = Date.parse(header("date"));
  return {
    id,
    from: header("from"),
    subject: header("subject"),
    body: emailBody(res.data.payload ?? undefined),
    receivedAt: Number.isFinite(internal) && internal > 0 ? internal : Number.isFinite(dated) ? dated : Date.now(),
  };
}

/** A short reason a Gmail request failed, safe to store and show an admin (never a message body). */
export function gmailErrorReason(error: unknown): string {
  const e = error as { code?: unknown; status?: unknown; response?: { status?: unknown; data?: { error?: unknown } }; message?: unknown };
  const status = Number(e?.response?.status ?? e?.status ?? e?.code);
  const raw = e?.response?.data?.error;
  const code = typeof raw === "string" ? raw : typeof (raw as { status?: unknown })?.status === "string" ? (raw as { status: string }).status : "";
  if (code === "invalid_grant") return "Gmail sign-in expired (invalid_grant)";
  if (Number.isFinite(status) && status >= 400) return `Gmail request failed (${status}${code ? ` ${String(code).slice(0, 40)}` : ""})`;
  const message = typeof e?.message === "string" ? e.message : "";
  if (/timeout|timed out|aborted/i.test(message)) return "Gmail request timed out";
  if (/not configured/i.test(message)) return "CAD email is not configured";
  return "Gmail request failed";
}
