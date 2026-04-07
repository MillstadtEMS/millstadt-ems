/**
 * Gmail API client for reading Chief 360 dispatch emails.
 *
 * Auth: OAuth2 with a stored refresh token for millstadtcad@gmail.com.
 * The refresh token is obtained once (see setup instructions in .env.example)
 * and stored as an environment variable. The client auto-refreshes the access
 * token on every poll so no manual intervention is needed.
 *
 * Required env vars:
 *   GMAIL_CLIENT_ID
 *   GMAIL_CLIENT_SECRET
 *   GMAIL_REFRESH_TOKEN
 *   GMAIL_USER          (millstadtcad@gmail.com)
 */

import { google } from "googleapis";

// ── OAuth2 client ──────────────────────────────────────────────────────────

function getOAuthClient() {
  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN } = process.env;

  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
    throw new Error(
      "Missing Gmail OAuth2 credentials. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN in .env"
    );
  }

  const auth = new google.auth.OAuth2(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });
  return auth;
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface RawEmail {
  id: string;        // Gmail message ID (deduplication key)
  from: string;      // Sender email address (lowercase)
  subject: string;
  body: string;      // Plain text (HTML stripped)
  received: Date;    // Date the email was delivered
  audioAttachment?: { data: Buffer; mimeType: string; filename: string } | null;
}

// ── Fetch unread dispatch emails ───────────────────────────────────────────

/**
 * Search Gmail for unread Chief 360 dispatch emails.
 * Returns raw email data — parsing happens separately in parser.ts.
 *
 * The search query can be customized once real email formats are known.
 * Default: any unread email in the inbox (the account only receives CAD alerts).
 */
export async function fetchUnreadDispatchEmails(): Promise<RawEmail[]> {
  const auth   = getOAuthClient();
  const gmail  = google.gmail({ version: "v1", auth });
  const userId = process.env.GMAIL_USER ?? "millstadtcad@gmail.com";

  // Search for unread messages — refine this query once email format is known.
  // Examples:
  //   'from:noreply@chief360.com is:unread'
  //   'subject:"CAD Alert" is:unread'
  //   'is:unread in:inbox'
  const searchQuery = process.env.GMAIL_SEARCH_QUERY ?? "(from:alert@cfmsg.co OR from:cencom@omnigo.com) is:unread";

  const listRes = await gmail.users.messages.list({
    userId,
    q: searchQuery,
    maxResults: 50,
  });

  const messages = listRes.data.messages ?? [];
  if (messages.length === 0) return [];

  const emails: RawEmail[] = [];

  for (const msg of messages) {
    if (!msg.id) continue;

    const full = await gmail.users.messages.get({
      userId,
      id: msg.id,
      format: "full",
    });

    const payload  = full.data.payload;
    const headers  = payload?.headers ?? [];
    const subject  = headers.find(h => h.name === "Subject")?.value ?? "(no subject)";
    const dateHdr  = headers.find(h => h.name === "Date")?.value;
    const received = dateHdr ? new Date(dateHdr) : new Date();
    const fromHdr  = headers.find(h => h.name === "From")?.value ?? "";
    // Extract bare email address from "Display Name <email@domain.com>"
    const fromMatch = fromHdr.match(/<([^>]+)>/) ?? fromHdr.match(/(\S+@\S+)/);
    const from = (fromMatch?.[1] ?? fromHdr).toLowerCase().trim();

    // Extract plain text body
    const body = extractPlainText(payload);

    // Extract audio attachment if present (pager tone)
    const audioAttachment = extractAudioAttachment(payload);

    emails.push({ id: msg.id, from, subject, body, received, audioAttachment });
  }

  return emails;
}

/**
 * Mark a Gmail message as read so it won't be returned on the next poll.
 * Called after successful (or failed) processing.
 */
export async function markAsRead(messageId: string): Promise<void> {
  const auth   = getOAuthClient();
  const gmail  = google.gmail({ version: "v1", auth });
  const userId = process.env.GMAIL_USER ?? "millstadtcad@gmail.com";

  await gmail.users.messages.modify({
    userId,
    id: messageId,
    requestBody: { removeLabelIds: ["UNREAD"] },
  });
}

// ── Body extraction helpers ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPlainText(payload: any): string {
  if (!payload) return "";

  // Direct text/plain part
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64(payload.body.data);
  }

  // HTML fallback
  if (payload.mimeType === "text/html" && payload.body?.data) {
    const { stripHtml } = require("../cad/parser");
    return stripHtml(decodeBase64(payload.body.data));
  }

  // Multipart — search parts recursively
  if (payload.parts && Array.isArray(payload.parts)) {
    // Prefer text/plain
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64(part.body.data);
      }
    }
    // Fall back to HTML
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        const { stripHtml } = require("../cad/parser");
        return stripHtml(decodeBase64(part.body.data));
      }
      // Recurse into nested multipart
      if (part.mimeType?.startsWith("multipart/")) {
        const nested = extractPlainText(part);
        if (nested) return nested;
      }
    }
  }

  return "";
}

function decodeBase64(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractAudioAttachment(payload: any): { data: Buffer; mimeType: string; filename: string } | null {
  if (!payload) return null;
  const AUDIO_TYPES = ["audio/", "application/octet-stream"];

  function searchParts(p: any): { data: Buffer; mimeType: string; filename: string } | null {
    if (!p) return null;
    const mime = (p.mimeType ?? "").toLowerCase();
    const filename = p.filename ?? "";
    const isAudio = AUDIO_TYPES.some(t => mime.startsWith(t)) ||
      /\.(mp3|wav|ogg|m4a|aac|amr|flac|opus)$/i.test(filename);

    if (isAudio && p.body?.data) {
      const raw = p.body.data.replace(/-/g, "+").replace(/_/g, "/");
      return { data: Buffer.from(raw, "base64"), mimeType: p.mimeType ?? "audio/mpeg", filename: filename || "audio.mp3" };
    }
    if (p.parts && Array.isArray(p.parts)) {
      for (const part of p.parts) {
        const found = searchParts(part);
        if (found) return found;
      }
    }
    return null;
  }

  return searchParts(payload);
}
