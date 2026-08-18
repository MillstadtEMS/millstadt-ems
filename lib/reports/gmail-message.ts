import { randomBytes } from "node:crypto";
import { google } from "googleapis";
import { safeHeaderValue } from "@/lib/security/http";
import { encodeMimeSubject } from "./subject";

export interface GmailAttachment {
  filename: string;
  contentType: string;
  content: Buffer;
}

export interface GmailMessageInput {
  fromName: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
  attachments?: GmailAttachment[];
}

export interface GmailSendResult {
  sent: boolean;
  skippedReason?: "disabled" | "no-recipients";
}

function base64Lines(value: string | Buffer) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8");
  return buffer.toString("base64").replace(/(.{76})/g, "$1\r\n");
}

function safeAddress(value: string) {
  const clean = safeHeaderValue(value, 254);
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(clean) ? clean : "";
}

function safeFilename(value: string) {
  return value.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120) || "attachment";
}

function safeContentType(value: string) {
  const clean = safeHeaderValue(value, 100).toLowerCase();
  return /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(clean)
    ? clean
    : "application/octet-stream";
}

export function outboundEmailAllowed() {
  if (process.env.DISABLE_OUTBOUND_EMAIL === "true") return false;
  if (process.env.VERCEL_ENV === "preview") return false;
  return (
    process.env.NODE_ENV === "production" ||
    process.env.ALLOW_DEVELOPMENT_OUTBOUND_EMAIL === "true"
  );
}

export function plainTextFromHtml(value: string) {
  return value
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&middot;/gi, " · ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function composeGmailMessage(input: GmailMessageInput, fromAddress: string) {
  const from = safeAddress(fromAddress);
  if (!from) throw new Error("Gmail sender address is invalid");

  const recipients = [...new Set(input.to.map(safeAddress).filter(Boolean))];
  if (recipients.length === 0) throw new Error("Gmail recipient list is empty");

  const alternativeBoundary = `mems-alt-${randomBytes(12).toString("hex")}`;
  const alternative = [
    `--${alternativeBoundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64Lines(input.text),
    `--${alternativeBoundary}`,
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64Lines(input.html),
    `--${alternativeBoundary}--`,
    "",
  ].join("\r\n");

  const headers = [
    `From: ${safeHeaderValue(input.fromName, 80)} <${from}>`,
    `To: ${recipients.join(", ")}`,
    `Subject: ${encodeMimeSubject(safeHeaderValue(input.subject, 180))}`,
    "MIME-Version: 1.0",
  ];

  const attachments = input.attachments ?? [];
  if (attachments.length === 0) {
    return Buffer.from(
      [
        ...headers,
        `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
        "",
        alternative,
      ].join("\r\n"),
      "utf8",
    ).toString("base64url");
  }

  const mixedBoundary = `mems-mixed-${randomBytes(12).toString("hex")}`;
  const attachmentParts = attachments.map((attachment) => {
    const filename = safeFilename(attachment.filename);
    const contentType = safeContentType(attachment.contentType);
    return [
      `--${mixedBoundary}`,
      `Content-Type: ${contentType}; name="${filename}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${filename}"`,
      "",
      base64Lines(attachment.content),
    ].join("\r\n");
  });

  return Buffer.from(
    [
      ...headers,
      `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
      "",
      `--${mixedBoundary}`,
      `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
      "",
      alternative,
      ...attachmentParts,
      `--${mixedBoundary}--`,
      "",
    ].join("\r\n"),
    "utf8",
  ).toString("base64url");
}

export async function sendGmailMessage(input: GmailMessageInput): Promise<GmailSendResult> {
  const recipients = [...new Set(input.to.map(safeAddress).filter(Boolean))];
  if (recipients.length === 0) return { sent: false, skippedReason: "no-recipients" };
  if (!outboundEmailAllowed()) return { sent: false, skippedReason: "disabled" };

  const from = safeAddress(process.env.GMAIL_USER ?? "millstadtcad@gmail.com");
  if (!from) throw new Error("Gmail sender address is invalid");
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

  const raw = composeGmailMessage({ ...input, to: recipients }, from);
  const gmail = google.gmail({ version: "v1", auth });
  await gmail.users.messages.send({ userId: from, requestBody: { raw } });
  return { sent: true };
}
