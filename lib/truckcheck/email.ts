/**
 * Email a completed truck check (with the PDF attached) to leadership.
 * Reuses the same Gmail OAuth pattern as lib/inventory/email.ts.
 */

import { google } from "googleapis";
import { encodeMimeSubject } from "@/lib/reports/subject";

const RECIPIENTS = ["millstadtems@gmail.com"];

function getAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return auth;
}

function fmtTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function flagBadge(flag: string): { color: string; label: string } {
  if (flag === "possible_whip") return { color: "#dc2626", label: "Possible Pencil Whip" };
  if (flag === "review") return { color: "#d97706", label: "Needs Review" };
  return { color: "#16a34a", label: "Normal" };
}

export interface SendInput {
  truckCheckId: string;
  unit: string;
  submittedBy: string;
  partnerName: string | null;
  durationSeconds: number;
  pencilWhipFlag: string;
  pencilWhipReasons: { code: string; message: string; severity: string }[];
  abnormalCount: number;
  failCount: number;
  notes: string;
  pdfBytes: Buffer;
  photos: { url: string; caption: string | null }[];
}

export async function sendTruckCheckEmail(input: SendInput) {
  const from = process.env.GMAIL_USER ?? "millstadtcad@gmail.com";
  const subject = `Truck Check — ${input.unit} — ${input.submittedBy} (${flagBadge(input.pencilWhipFlag).label})`;
  const badge = flagBadge(input.pencilWhipFlag);

  const reasonsHtml = input.pencilWhipReasons.length
    ? `<ul style="margin:8px 0 0 18px;padding:0;color:#475569;font-size:13px;">${input.pencilWhipReasons.map((r) => `<li>${escapeHtml(r.message)}</li>`).join("")}</ul>`
    : "";

  const photosHtml = input.photos.length
    ? `<p style="margin:14px 0 6px;color:#94a3b8;font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;">Photos (${input.photos.length})</p>
       ${input.photos.map((p) => `<div style="margin:6px 0;"><a href="${p.url}" style="color:#1d4ed8;font-size:13px;">${escapeHtml(p.caption || "Photo")}</a></div>`).join("")}`
    : "";

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;background:#040d1a;color:#f1f5f9;padding:32px;border-radius:16px;">
      <div style="margin-bottom:8px;">
        <span style="color:#f0b429;font-size:11px;font-weight:900;letter-spacing:0.22em;text-transform:uppercase;">Truck Check</span>
      </div>
      <h1 style="color:#ffffff;font-size:22px;font-weight:900;margin:0 0 8px;">Unit ${escapeHtml(input.unit)} · ${escapeHtml(input.submittedBy)}</h1>
      <p style="color:#94a3b8;font-size:13px;margin:0 0 20px;">Duration ${fmtTime(input.durationSeconds)} · ${input.abnormalCount} abnormal · ${input.failCount} failed</p>

      <div style="display:inline-block;background:${badge.color};color:white;padding:6px 12px;border-radius:999px;font-size:11px;font-weight:900;letter-spacing:.15em;text-transform:uppercase;margin-bottom:18px;">${badge.label}</div>
      ${reasonsHtml ? `<div style="background:#071428;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px 16px;margin-bottom:18px;">
        <p style="color:#fbbf24;font-size:11px;margin:0 0 4px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;">Flag reasons</p>
        ${reasonsHtml}
      </div>` : ""}
      ${input.partnerName ? `<p style="color:#cbd5e1;font-size:13px;margin:0 0 6px;">Partner: <strong>${escapeHtml(input.partnerName)}</strong></p>` : ""}
      ${input.notes ? `<p style="color:#cbd5e1;font-size:13px;margin:14px 0 0;white-space:pre-wrap;"><strong style="color:#f0b429;">Notes:</strong><br>${escapeHtml(input.notes)}</p>` : ""}
      ${photosHtml}
      <p style="color:#475569;font-size:11px;margin-top:26px;">Full report PDF is attached. View the dashboard at <a href="https://millstadtems.org/admin/truckcheck-dashboard" style="color:#f0b429;">millstadtems.org/admin/truckcheck-dashboard</a></p>
    </div>
  `;

  const boundary = `mems_tc_${Date.now()}`;
  const pdfBase64 = input.pdfBytes.toString("base64");
  const pdfName = `TruckCheck_${input.unit}_${input.truckCheckId}.pdf`;

  const raw =
    `From: Millstadt EMS Truck Check <${from}>\r\n` +
    `To: ${RECIPIENTS.join(", ")}\r\n` +
    `Subject: ${encodeMimeSubject(subject)}\r\n` +
    `MIME-Version: 1.0\r\n` +
    `Content-Type: multipart/mixed; boundary="${boundary}"\r\n` +
    `\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: text/html; charset=UTF-8\r\n` +
    `Content-Transfer-Encoding: base64\r\n` +
    `\r\n` +
    `${Buffer.from(html, "utf8").toString("base64").replace(/(.{76})/g, "$1\r\n")}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/pdf; name="${pdfName}"\r\n` +
    `Content-Transfer-Encoding: base64\r\n` +
    `Content-Disposition: attachment; filename="${pdfName}"\r\n` +
    `\r\n` +
    `${pdfBase64}\r\n` +
    `--${boundary}--`;

  const gmail = google.gmail({ version: "v1", auth: getAuth() });
  await gmail.users.messages.send({
    userId: from,
    requestBody: { raw: Buffer.from(raw, "utf-8").toString("base64url") },
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" :
    c === "<" ? "&lt;"  :
    c === ">" ? "&gt;"  :
    c === '"' ? "&quot;" : "&#39;");
}
