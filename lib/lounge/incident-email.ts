/**
 * Email a completed incident report PDF to leadership. Uses the same
 * Gmail OAuth pattern as the truck check + inventory mailers.
 */

import { google } from "googleapis";

const RECIPIENTS = ["millstadtems@gmail.com"];

function getAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return auth;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" :
    c === "<" ? "&lt;"  :
    c === ">" ? "&gt;"  :
    c === '"' ? "&quot;" : "&#39;");
}

export interface IncidentEmailInput {
  reportId: string;
  unit: string | null;
  city: string | null;
  submittedBy: string;
  incidentDate: string | null;
  incidentTime: string | null;
  summary: string;
  involvedEmployees: { name: string }[];
  photoCount: number;
  pdfBytes: Buffer;
}

export async function sendIncidentReportEmail(input: IncidentEmailInput) {
  const from = process.env.GMAIL_USER ?? "millstadtcad@gmail.com";
  const subject = `Incident Report — ${input.unit ?? "—"} · ${input.city ?? "Millstadt"} · ${input.submittedBy}`;

  const involvedHtml = input.involvedEmployees.length
    ? `<p style="color:#cbd5e1;font-size:13px;margin:14px 0 0;"><strong style="color:#f0b429;">Employees involved:</strong> ${input.involvedEmployees.map((e) => escapeHtml(e.name)).join(", ")}</p>`
    : "";

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;background:#040d1a;color:#f1f5f9;padding:32px;border-radius:16px;">
      <div style="margin-bottom:8px;">
        <span style="color:#fca5a5;font-size:11px;font-weight:900;letter-spacing:0.22em;text-transform:uppercase;">Incident Report</span>
      </div>
      <h1 style="color:#ffffff;font-size:22px;font-weight:900;margin:0 0 6px;">${escapeHtml(input.unit ?? "—")} · ${escapeHtml(input.city ?? "Millstadt")}</h1>
      <p style="color:#94a3b8;font-size:13px;margin:0 0 18px;">${escapeHtml(input.incidentDate ?? "—")} ${escapeHtml(input.incidentTime ?? "")} · Submitted by ${escapeHtml(input.submittedBy)}</p>
      <div style="background:#071428;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px 18px;">
        <p style="color:#cbd5e1;font-size:13.5px;line-height:1.55;margin:0;white-space:pre-wrap;">${escapeHtml(input.summary)}</p>
      </div>
      ${involvedHtml}
      <p style="color:#94a3b8;font-size:12px;margin-top:14px;">${input.photoCount} photo${input.photoCount === 1 ? "" : "s"} attached in the PDF.</p>
      <p style="color:#475569;font-size:11px;margin-top:24px;">Full PDF is attached. View / manage the report at <a href="https://millstadtems.org/admin/incidents/${encodeURIComponent(input.reportId)}" style="color:#f0b429;">admin/incidents/${input.reportId}</a></p>
    </div>
  `;

  const boundary = `mems_ir_${Date.now()}`;
  const pdfBase64 = input.pdfBytes.toString("base64");
  const pdfName = `IncidentReport_${input.reportId}.pdf`;

  const raw =
    `From: Millstadt EMS Incident <${from}>\r\n` +
    `To: ${RECIPIENTS.join(", ")}\r\n` +
    `Subject: ${subject}\r\n` +
    `MIME-Version: 1.0\r\n` +
    `Content-Type: multipart/mixed; boundary="${boundary}"\r\n` +
    `\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: text/html; charset=utf-8\r\n` +
    `Content-Transfer-Encoding: 7bit\r\n` +
    `\r\n` +
    `${html}\r\n` +
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
