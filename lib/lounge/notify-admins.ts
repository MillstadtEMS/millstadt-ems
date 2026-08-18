/**
 * Admin-broadcast helpers.
 *
 * Public-site submissions (testimonials, contact form) and lounge submissions
 * (maintenance, truck wash, hospital suggestions, incidents) all want the same
 * two things on intake:
 *
 *   1. A lounge_notifications row for every admin so the red badge lights up
 *      next to the bell.
 *   2. A summary email to millstadtems@gmail.com so it's also in the inbox.
 *
 * This module centralizes both. Email goes out through the same Gmail OAuth
 * credentials the testimonial + incident mailers already use, so no new env
 * vars or transports are introduced.
 */

import { sql } from "./db";
import { createNotifications, type NotificationKind } from "./notifications";
import { plainTextFromHtml, sendGmailMessage } from "@/lib/reports/gmail-message";

const ADMIN_INBOX = "millstadtems@gmail.com";

/** Lounge employee IDs of every active admin. Used to fan-out notifications. */
export async function getAdminIds(): Promise<string[]> {
  const db = sql();
  const rows = (await db`
    SELECT id FROM lounge_employees
    WHERE is_admin = TRUE AND is_active = TRUE
  `) as unknown as { id: string }[];
  return rows.map((r) => r.id);
}

interface NotifyOpts {
  kind: NotificationKind;
  title: string;
  bodyPreview?: string;
  linkUrl: string;
  sourceId?: string | null;
  actorId?: string | null;
  /** Skip these admin ids (e.g., the submitter, if they're an admin). */
  exceptIds?: string[];
}

/**
 * Fan-out createNotifications to every admin so the Notifications bell + red
 * unread badge light up for leadership. The shared dedupe inside
 * createNotifications still applies if you call this twice with the same
 * (recipient, sourceId, actorId, kind=message), so it won't flood.
 */
export async function notifyAdminsInLounge(opts: NotifyOpts): Promise<void> {
  let ids = await getAdminIds();
  if (opts.exceptIds && opts.exceptIds.length) {
    const skip = new Set(opts.exceptIds);
    ids = ids.filter((id) => !skip.has(id));
  }
  if (ids.length === 0) return;
  await createNotifications(ids.map((recipientId) => ({
    recipientId,
    kind: opts.kind,
    title: opts.title,
    bodyPreview: opts.bodyPreview ?? "",
    linkUrl: opts.linkUrl,
    sourceId: opts.sourceId ?? null,
    actorId: opts.actorId ?? null,
  })));
}

interface AdminEmailOpts {
  /** Section kicker — small gold uppercase line above the headline. */
  kicker: string;
  /** Big display headline. */
  headline: string;
  /** Meta line under the headline (date, submitter, unit, etc). */
  meta?: string;
  /** Main body — pre-formatted HTML or plain text safe for the body card. */
  bodyHtml?: string;
  /** Optional plain-text body (escapes itself); takes precedence over bodyHtml when both passed. */
  bodyText?: string;
  /** Optional anchor URL + label for a follow-up link. */
  link?: { url: string; label: string };
  /** Subject line. */
  subject: string;
}

/**
 * Send a branded summary email to millstadtems@gmail.com. Best-effort —
 * callers should wrap this in a try/catch so a failed mail send never breaks
 * the underlying submit.
 */
export async function emailAdmins(opts: AdminEmailOpts): Promise<void> {
  const bodyHtml = opts.bodyText
    ? `<p style="color:#cbd5e1;font-size:13.5px;line-height:1.6;margin:0;white-space:pre-wrap;">${escapeHtml(opts.bodyText)}</p>`
    : (opts.bodyHtml ?? "");

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:580px;margin:0 auto;background:#040d1a;color:#f1f5f9;padding:36px 32px;border-radius:16px;">
      <div style="margin-bottom:10px;">
        <span style="color:#f0b429;font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;">${escapeHtml(opts.kicker)}</span>
      </div>
      <h1 style="color:#ffffff;font-size:22px;font-weight:700;line-height:1.18;letter-spacing:-0.015em;margin:0 0 8px;">${escapeHtml(opts.headline)}</h1>
      ${opts.meta ? `<p style="color:#94a3b8;font-size:13px;margin:0 0 22px;">${escapeHtml(opts.meta)}</p>` : `<div style="height:14px;"></div>`}
      ${bodyHtml ? `<div style="background:#071428;border:1px solid rgba(248,250,252,0.07);border-radius:12px;padding:18px 20px;margin-bottom:24px;">${bodyHtml}</div>` : ""}
      ${opts.link
        ? `<a href="${encodeURI(opts.link.url)}" style="display:inline-block;background:#f0b429;color:#040d1a;font-weight:700;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;padding:12px 22px;border-radius:10px;text-decoration:none;">${escapeHtml(opts.link.label)}</a>`
        : ""}
      <p style="color:#475569;font-size:11px;margin-top:32px;letter-spacing:0.04em;">Millstadt EMS &middot; millstadtems.org</p>
    </div>
  `;

  const textBody = opts.bodyText?.trim() || plainTextFromHtml(opts.bodyHtml ?? "") || opts.headline;
  await sendGmailMessage({
    fromName: "Millstadt EMS Website",
    to: [ADMIN_INBOX],
    subject: opts.subject,
    text: [opts.kicker, opts.headline, opts.meta, textBody, opts.link?.url]
      .filter(Boolean)
      .join("\n\n"),
    html,
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" :
    c === "<" ? "&lt;"  :
    c === ">" ? "&gt;"  :
    c === '"' ? "&quot;" : "&#39;");
}
