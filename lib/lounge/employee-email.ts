/**
 * Branded email helper for messages we send TO an employee (as opposed to
 * the admin-broadcast helper in `notify-admins.ts`, which sends to
 * millstadtems@gmail.com). Uses the same Gmail OAuth credentials so no
 * additional env vars are needed.
 *
 * Used for: profile change request confirmations, password change
 * confirmations, anything else where the employee is the recipient.
 */
import { google } from "googleapis";
import { encodeMimeSubject } from "@/lib/reports/subject";

interface EmployeeEmailOpts {
  /** One recipient or many — many sends a single message with multiple addresses on the To line. */
  to: string | string[];
  subject: string;
  kicker: string;
  headline: string;
  meta?: string;
  bodyHtml?: string;
  bodyText?: string;
  link?: { url: string; label: string };
  attachments?: Array<{
    filename: string;
    contentType: string;
    content: Buffer;
  }>;
}

export async function sendEmployeeEmail(opts: EmployeeEmailOpts): Promise<void> {
  const from = process.env.GMAIL_USER ?? "millstadtcad@gmail.com";
  const recipients = Array.isArray(opts.to) ? opts.to.filter(Boolean) : [opts.to];
  if (recipients.length === 0) return;

  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

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

  const headers =
    `From: Millstadt EMS Lounge <${from}>\r\n` +
    `To: ${recipients.join(", ")}\r\n` +
    `Subject: ${encodeMimeSubject(opts.subject)}\r\n` +
    `MIME-Version: 1.0\r\n`;
  const attachments = opts.attachments ?? [];
  const message = attachments.length
    ? multipartMessage(headers, html, attachments)
    :
      headers +
      `Content-Type: text/html; charset=utf-8\r\n` +
      `Content-Transfer-Encoding: base64\r\n` +
      `\r\n` +
      wrapBase64(Buffer.from(html, "utf8"));
  const raw = Buffer.from(message, "utf8").toString("base64url");

  const gmail = google.gmail({ version: "v1", auth });
  await gmail.users.messages.send({ userId: from, requestBody: { raw } });
}

function multipartMessage(
  headers: string,
  html: string,
  attachments: NonNullable<EmployeeEmailOpts["attachments"]>,
) {
  const boundary = `millstadt-ems-${Date.now().toString(36)}`;
  const parts = [
    `--${boundary}\r\n` +
      `Content-Type: text/html; charset=utf-8\r\n` +
      `Content-Transfer-Encoding: base64\r\n\r\n` +
      wrapBase64(Buffer.from(html, "utf8")),
    ...attachments.map((attachment) => {
      const filename = safeAttachmentFilename(attachment.filename);
      return (
        `--${boundary}\r\n` +
        `Content-Type: ${attachment.contentType}\r\n` +
        `Content-Transfer-Encoding: base64\r\n` +
        `Content-Disposition: attachment; filename="${filename}"\r\n\r\n` +
        wrapBase64(attachment.content)
      );
    }),
    `--${boundary}--\r\n`,
  ];
  return (
    headers +
    `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n` +
    parts.join("\r\n")
  );
}

function wrapBase64(value: Buffer) {
  return value.toString("base64").replace(/(.{76})/g, "$1\r\n");
}

function safeAttachmentFilename(value: string) {
  return value.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120) || "attachment";
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" :
    c === "<" ? "&lt;"  :
    c === ">" ? "&gt;"  :
    c === '"' ? "&quot;" : "&#39;");
}
