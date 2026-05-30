/**
 * Email a completed Incident Report to leadership at millstadtems@gmail.com.
 *
 * The presentation layer goes through the shared report system in
 * /lib/reports (subject encoder, email shell, sanitizers, filename
 * builder). The Gmail OAuth + multipart-MIME wiring stays put — only
 * the rendered HTML and the subject line move.
 */

import { google } from "googleapis";
import { renderEmailShell } from "@/lib/reports/email-shell";
import {
  asciiSafe,
  buildReportSubject,
  encodeMimeSubject,
  isoChicagoDate,
} from "@/lib/reports/subject";
import { buildReportFilename } from "@/lib/reports/filename";
import { fallbackText, normalizePunctuation } from "@/lib/reports/sanitize";

const RECIPIENTS = ["millstadtems@gmail.com"];
const ADMIN_URL_ROOT = "https://millstadtems.org/admin/incidents";

function getAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return auth;
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

function shortReportId(id: string): string {
  const seg = id.split("-")[0];
  return seg ? seg.toUpperCase() : id.toUpperCase();
}

export async function sendIncidentReportEmail(input: IncidentEmailInput) {
  const fromAddress = process.env.GMAIL_USER ?? "millstadtcad@gmail.com";
  const submittedDate = isoChicagoDate(new Date());
  const incidentDateIso = input.incidentDate ? isoChicagoDate(input.incidentDate) : "";
  const reportIdLabel = shortReportId(input.reportId);

  // ── Subject (ASCII pipes, sanitized, then MIME-encoded for safety) ───
  const subjectPlain = buildReportSubject({
    type: "Incident Report Submitted",
    unit: input.unit ? input.unit.trim() : null,
    location: input.city ? input.city.trim() : null,
    date: incidentDateIso || submittedDate,
    submitter: input.submittedBy.trim(),
  });
  const subjectHeader = encodeMimeSubject(subjectPlain);

  // ── PDF filename ─────────────────────────────────────────────────────
  const pdfName = buildReportFilename({
    type: "Incident Report",
    unit: input.unit,
    date: incidentDateIso || submittedDate,
    extra: reportIdLabel,
  });

  // ── HTML body via the shared shell ───────────────────────────────────
  const cleanSummary = normalizePunctuation(input.summary?.trim() || "");
  const summaryPreview = cleanSummary.length > 320
    ? cleanSummary.slice(0, 317).replace(/\s+\S*$/, "") + "..."
    : (cleanSummary || "No summary provided.");
  const employeeList = input.involvedEmployees.length > 0
    ? input.involvedEmployees.map((e) => e.name).join(", ")
    : fallbackText(null, "noneReported");

  const html = renderEmailShell({
    preheader: `Unit ${input.unit ?? "—"} · ${input.city ?? "Millstadt"} — submitted by ${input.submittedBy}`,
    kicker: "Incident Report",
    title: input.city ? `Unit ${input.unit ?? "—"} — ${input.city}` : "Incident Report",
    subtitle: `Submitted by ${asciiSafe(input.submittedBy)} on ${submittedDate}`,
    meta: [
      { label: "Report ID",      value: reportIdLabel, mono: true },
      { label: "Incident date",  value: input.incidentDate ?? fallbackText(null, "notProvided") },
      { label: "Incident time",  value: input.incidentTime ?? fallbackText(null, "notProvided") },
      { label: "Unit involved",  value: input.unit ?? fallbackText(null, "notProvided") },
      { label: "City",           value: input.city ?? fallbackText(null, "notProvided") },
      { label: "Crew involved",  value: employeeList },
      { label: "Attachments",    value: input.photoCount === 0 ? "None" : `${input.photoCount} file${input.photoCount === 1 ? "" : "s"} (included in attached PDF)` },
    ],
    callout: {
      label: "Summary preview",
      text: summaryPreview,
    },
    cta: {
      label: "Open report in admin",
      url: `${ADMIN_URL_ROOT}/${encodeURIComponent(input.reportId)}`,
    },
    pdfNote: `Full report attached: ${pdfName}`,
    footerNote: "Millstadt EMS · Official agency report · This message was sent automatically by the lounge incident-reporting system.",
  });

  // ── Multipart MIME (HTML + PDF) ──────────────────────────────────────
  const boundary = `mems_ir_${Date.now()}`;
  const pdfBase64 = input.pdfBytes.toString("base64").replace(/(.{76})/g, "$1\r\n");

  const raw =
    `From: Millstadt EMS Reports <${fromAddress}>\r\n` +
    `To: ${RECIPIENTS.join(", ")}\r\n` +
    `Subject: ${subjectHeader}\r\n` +
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
    userId: fromAddress,
    requestBody: { raw: Buffer.from(raw, "utf8").toString("base64url") },
  });
}
