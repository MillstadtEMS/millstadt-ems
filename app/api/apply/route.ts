import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { jsPDF } from "jspdf";
import { createFormSubmission } from "@/lib/db";
import { buildApplicationFlags } from "@/lib/application-flags";

export const runtime = "nodejs";
// Multipart uploads + Gmail API can exceed the 10s default timeout
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// ── PDF generation ─────────────────────────────────────────────────────────
function buildPdf(fields: Record<string, string>): Buffer {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const lineHeight = 14;
  let y = margin;

  function checkPageBreak(needed: number) {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  }

  function writeWrapped(text: string, x: number, maxWidth: number, fontSize: number, color: [number, number, number] = [30, 30, 30]) {
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(text || "—", maxWidth);
    for (const line of lines) {
      checkPageBreak(lineHeight);
      doc.text(String(line), x, y);
      y += lineHeight;
    }
  }

  function sectionHeader(title: string) {
    checkPageBreak(40);
    y += 6;
    doc.setFillColor(240, 180, 41);
    doc.rect(margin, y, 4, 14, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(title.toUpperCase(), margin + 12, y + 11);
    y += 24;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(margin, y - 8, pageWidth - margin, y - 8);
  }

  function row(label: string, value: string) {
    checkPageBreak(lineHeight + 4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(label.toUpperCase(), margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    const valueX = margin + 160;
    const lines = doc.splitTextToSize(value || "—", pageWidth - valueX - margin);
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) checkPageBreak(lineHeight);
      doc.text(String(lines[i]), valueX, y);
      if (i < lines.length - 1) y += lineHeight;
    }
    y += lineHeight + 2;
  }

  function blockText(label: string, value: string) {
    checkPageBreak(lineHeight + 4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(label.toUpperCase(), margin, y);
    y += lineHeight;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    writeWrapped(value || "—", margin, pageWidth - 2 * margin, 10);
    y += 4;
  }

  // Title
  doc.setFillColor(4, 13, 26);
  doc.rect(0, 0, pageWidth, 80, "F");
  doc.setTextColor(240, 180, 41);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("MILLSTADT AMBULANCE SERVICE", margin, 32);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text("Employment Application", margin, 56);
  doc.setFontSize(10);
  doc.setTextColor(180, 180, 180);
  const fullName = [fields.first_name, fields.middle_name, fields.last_name].filter(Boolean).join(" ") || "Applicant";
  doc.text(`${fullName}  ·  ${fields.position || "Position Not Specified"}`, margin, 72);
  y = 110;

  doc.setTextColor(120, 120, 120);
  doc.setFontSize(9);
  doc.text(`Submitted ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })} CDT`, margin, y);
  y += 24;

  sectionHeader("Position Applied For");
  row("Position", fields.position);
  row("Employment Type", fields.employment_type);
  row("Days Available", fields.days_available);
  row("Hours Available", fields.hours_available);
  row("Preferred Shift", fields.preferred_shift);

  sectionHeader("Personal Information");
  row("First Name", fields.first_name);
  row("Middle Name", fields.middle_name);
  row("Last Name", fields.last_name);
  row("Date of Birth", fields.dob);
  row("SSN", fields.ssn_last4);
  row("Phone", fields.phone);
  row("Email", fields.email);
  row("Address", [fields.address, fields.city_state_zip].filter(Boolean).join(", "));
  row("Driver's License", `${fields.dl_state ?? ""} #${fields.dl_number ?? ""} Exp: ${fields.dl_expiry ?? ""}`);

  sectionHeader("Eligibility & Background");
  row("Authorized to Work in U.S.", fields.authorized_us);
  row("Felony Conviction", fields.felony);
  row("Excluded from Medicare/Medicaid", fields.excluded_medicare);
  row("License Suspended/Revoked", fields.license_suspended);
  blockText("Background Explanation", fields.background_explain);
  row("Consents", fields.consents);

  sectionHeader("Education");
  row("High School", `${fields.hs_name ?? ""} — ${fields.hs_grad ?? ""}`);
  blockText("College / University", fields.college_education);

  sectionHeader("Licensure");
  row("Primary License", `${fields.primary_license_type ?? ""} — ${fields.primary_license_state ?? ""} #${fields.primary_license_number ?? ""} Exp: ${fields.primary_license_expiry ?? ""}`);
  row("Additional License", `${fields.add_license_type ?? ""} — ${fields.add_license_state ?? ""} #${fields.add_license_number ?? ""} Exp: ${fields.add_license_expiry ?? ""}`);
  row("NREMT", `${fields.nremt_level ?? ""} #${fields.nremt_number ?? ""} Exp: ${fields.nremt_expiry ?? ""}`);
  row("DEA", `#${fields.dea_number ?? ""} Exp: ${fields.dea_expiry ?? ""}`);

  sectionHeader("Certifications");
  blockText("Certifications", fields.additional_certs);

  sectionHeader("Work History");
  blockText("Employment History", fields.work_history);

  sectionHeader("EMS Experience");
  row("Years of EMS Experience", fields.years_ems);
  row("Years of ALS Experience", fields.years_als);
  row("Years of Critical Care", fields.years_cc);

  sectionHeader("Driving History");
  row("Valid Driver's License", fields.valid_dl);
  row("CDL", fields.cdl);
  row("Accidents (5 yrs)", fields.accidents);
  row("Traffic Violations (5 yrs)", fields.violations);
  row("License Suspension (5 yrs)", fields.dl_suspension);
  blockText("Driving Explanation", fields.driving_explain);

  sectionHeader("Availability");
  row("Willing to Work", fields.availability);

  sectionHeader("Professional References");
  blockText("References", fields.references);

  sectionHeader("Additional Information");
  blockText("Why Millstadt EMS?", fields.why_millstadt);
  blockText("5-Year Goals", fields.five_year_goals);

  if (fields.skipped_files_note) {
    sectionHeader("Note");
    blockText("Skipped Files", fields.skipped_files_note);
  }

  // ── Applicant signature ────────────────────────────────────────────
  // Drop the captured signature image directly onto the PDF so the
  // applicant's mark is preserved verbatim. Reserve enough space so
  // it never lands on top of the footer.
  const SIG_BLOCK_HEIGHT = 130;
  checkPageBreak(SIG_BLOCK_HEIGHT + 24);
  sectionHeader("Applicant Signature");

  const signatureDataUrl = fields.signature_data_url || "";
  const sigBoxX = margin;
  const sigBoxY = y;
  const sigBoxW = pageWidth - margin * 2;
  const sigBoxH = 80;

  // Light card behind the signature for definition on print.
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.roundedRect(sigBoxX, sigBoxY, sigBoxW, sigBoxH, 6, 6);

  if (signatureDataUrl.startsWith("data:image/")) {
    try {
      // jsPDF auto-detects PNG vs JPEG from the data URL.
      const format = signatureDataUrl.includes("image/jpeg") ? "JPEG" : "PNG";
      // Preserve aspect ratio: signature canvas is ~ rect.width × 180px,
      // we render it up to 360 × 64 inside the card centered vertically.
      const targetW = Math.min(sigBoxW - 32, 360);
      const targetH = 60;
      const x = sigBoxX + (sigBoxW - targetW) / 2;
      const yImg = sigBoxY + (sigBoxH - targetH) / 2;
      doc.addImage(signatureDataUrl, format, x, yImg, targetW, targetH, undefined, "FAST");
    } catch (err) {
      console.error("[apply pdf] failed to embed signature:", err);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(180, 60, 60);
      doc.text("Signature could not be rendered. See application metadata.", sigBoxX + 12, sigBoxY + sigBoxH / 2 + 3);
    }
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("No signature captured.", sigBoxX + 12, sigBoxY + sigBoxH / 2 + 3);
  }

  y = sigBoxY + sigBoxH + 12;

  // Signed-by + signed-at line under the box.
  const signedBy = [fields.first_name, fields.middle_name, fields.last_name].filter(Boolean).join(" ") || "Applicant";
  const signedAt = fields.applicant_signed_at || new Date().toLocaleString("en-US", { timeZone: "America/Chicago" }) + " CDT";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("SIGNED BY", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text(signedBy, margin + 90, y);
  y += lineHeight;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("SIGNED AT", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text(signedAt, margin + 90, y);
  y += lineHeight + 4;

  // Footer on last page
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Applicant certified all information is true and complete.", margin, pageHeight - 24);
  doc.text("Millstadt Ambulance Service — Employment Application", pageWidth - margin, pageHeight - 24, { align: "right" });

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}

// ── Gmail API client (same pattern as CAD system) ─────────────────────────
function getGmailClient() {
  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_USER } = process.env;
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
    throw new Error("Gmail OAuth credentials not set in environment.");
  }
  const auth = new google.auth.OAuth2(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });
  return { gmail: google.gmail({ version: "v1", auth }), sender: GMAIL_USER || "millstadtcad@gmail.com" };
}

// ── Build raw MIME message ─────────────────────────────────────────────────
function buildRawMime(opts: {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  html: string;
  attachments: { filename: string; content: Buffer; mimeType: string }[];
}): string {
  const b = `----=_Part_${Date.now()}`;
  const lines: string[] = [
    `MIME-Version: 1.0`,
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Reply-To: ${opts.replyTo}`,
    `Subject: =?UTF-8?B?${Buffer.from(opts.subject).toString("base64")}?=`,
    `Content-Type: multipart/mixed; boundary="${b}"`,
    ``,
    `--${b}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(opts.html, "utf-8").toString("base64"),
    ``,
  ];

  for (const att of opts.attachments) {
    lines.push(
      `--${b}`,
      `Content-Type: ${att.mimeType || "application/octet-stream"}`,
      `Content-Disposition: attachment; filename="${att.filename}"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      att.content.toString("base64"),
      ``,
    );
  }

  lines.push(`--${b}--`);
  // Gmail API needs base64url (no +, /, or =)
  return Buffer.from(lines.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ── HTML email template ───────────────────────────────────────────────────
function buildHtml(fields: Record<string, string>): string {
  const fullName = [fields.first_name, fields.middle_name, fields.last_name].filter(Boolean).join(" ");

  const section = (title: string, rows: [string, string][]) => `
    <tr><td colspan="2" style="padding:20px 30px 6px;background:#040d1a;">
      <span style="color:#f0b429;font-size:11px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">${title}</span>
      <div style="height:1px;background:#1e3a6e;margin-top:8px;"></div>
    </td></tr>
    ${rows.map(([label, value]) => `
    <tr>
      <td style="padding:8px 30px 8px 30px;color:#94a3b8;font-size:13px;width:200px;vertical-align:top;">${label}</td>
      <td style="padding:8px 30px 8px 0;color:#e2e8f0;font-size:13px;vertical-align:top;font-weight:600;">${value || "—"}</td>
    </tr>`).join("")}`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#020912;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#020912;padding:40px 0;">
<tr><td align="center">
<table width="700" cellpadding="0" cellspacing="0" style="background:#071428;border:1px solid #1e3a6e;border-radius:12px;overflow:hidden;max-width:700px;">
  <tr><td colspan="2" style="background:#040d1a;padding:32px 30px;border-bottom:2px solid #f0b429;">
    <div style="font-size:11px;color:#f0b429;font-weight:900;letter-spacing:4px;text-transform:uppercase;margin-bottom:8px;">Millstadt Ambulance Service</div>
    <div style="font-size:28px;color:#ffffff;font-weight:900;margin-bottom:4px;">Employment Application</div>
    <div style="font-size:16px;color:#94a3b8;">${fullName} — ${fields.position || "Position Not Specified"}</div>
    <div style="font-size:12px;color:#64748b;margin-top:6px;">Submitted: ${new Date().toLocaleString("en-US",{timeZone:"America/Chicago",dateStyle:"full",timeStyle:"short"})}</div>
  </td></tr>
  <table width="700" cellpadding="0" cellspacing="0">
  ${section("Position Applied For",[["Position",fields.position],["Employment Type",fields.employment_type],["Days Available",fields.days_available],["Hours Available",fields.hours_available],["Preferred Shift",fields.preferred_shift]])}
  ${section("Personal Information",[["First Name",fields.first_name],["Middle Name",fields.middle_name],["Last Name",fields.last_name],["Date of Birth",fields.dob],["SSN",fields.ssn_last4],["Phone",fields.phone],["Email",fields.email],["Address",[fields.address,fields.city_state_zip].filter(Boolean).join(", ")],["Driver's License",`${fields.dl_state||""} #${fields.dl_number||""} Exp: ${fields.dl_expiry||""}`]])}
  ${section("Eligibility & Background",[["Authorized to Work in U.S.",fields.authorized_us],["Felony Conviction",fields.felony],["Excluded from Medicare/Medicaid",fields.excluded_medicare],["License Suspended/Revoked",fields.license_suspended],["Explanation",fields.background_explain],["Consents",fields.consents]])}
  ${section("Education",[["High School",`${fields.hs_name||""} — ${fields.hs_grad||""}`],["College",`${fields.college_name||""} | ${fields.college_degree||""} in ${fields.college_field||""} | ${fields.college_grad||""}`],["EMS Program",`${fields.ems_program||""} | ${fields.ems_cert||""} | ${fields.ems_complete||""}`]])}
  ${section("Licensure",[["Primary License",`${fields.primary_license_type||""} — ${fields.primary_license_state||""} #${fields.primary_license_number||""} Exp: ${fields.primary_license_expiry||""}`],["Additional License",`${fields.add_license_type||""} — ${fields.add_license_state||""} #${fields.add_license_number||""} Exp: ${fields.add_license_expiry||""}`],["NREMT",`${fields.nremt_level||""} #${fields.nremt_number||""} Exp: ${fields.nremt_expiry||""}`],["DEA",`#${fields.dea_number||""} Exp: ${fields.dea_expiry||""}`]])}
  <tr><td colspan="2" style="padding:20px 30px 6px;background:#040d1a;"><span style="color:#f0b429;font-size:11px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">Certifications</span><div style="height:1px;background:#1e3a6e;margin-top:8px;"></div></td></tr>
  <tr><td colspan="2" style="padding:8px 30px 16px;color:#e2e8f0;font-size:13px;white-space:pre-line;">${fields.additional_certs||"—"}</td></tr>
  <tr><td colspan="2" style="padding:20px 30px 6px;background:#040d1a;"><span style="color:#f0b429;font-size:11px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">Work History</span><div style="height:1px;background:#1e3a6e;margin-top:8px;"></div></td></tr>
  <tr><td colspan="2" style="padding:8px 30px 16px;color:#e2e8f0;font-size:13px;white-space:pre-line;">${fields.work_history||"—"}</td></tr>
  ${section("EMS Experience & Skills",[["Years EMS",fields.years_ems],["Years ALS",fields.years_als],["Years Critical Care",fields.years_cc],["Skills",fields.skills]])}
  ${section("Driving History",[["Valid Driver's License",fields.valid_dl],["CDL",fields.cdl],["Accidents (5 yrs)",fields.accidents],["Traffic Violations (5 yrs)",fields.violations],["License Suspension (5 yrs)",fields.dl_suspension],["Explanation",fields.driving_explain]])}
  ${section("Availability",[["Willing to Work",fields.availability]])}
  <tr><td colspan="2" style="padding:20px 30px 6px;background:#040d1a;"><span style="color:#f0b429;font-size:11px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">Professional References</span><div style="height:1px;background:#1e3a6e;margin-top:8px;"></div></td></tr>
  <tr><td colspan="2" style="padding:8px 30px 16px;color:#e2e8f0;font-size:13px;white-space:pre-line;">${fields.references||"—"}</td></tr>
  ${section("Additional Information",[["Why Millstadt EMS?",fields.why_millstadt],["High-Acuity Call",fields.high_acuity],["Teamwork Example",fields.teamwork]])}
  <tr><td colspan="2" style="padding:24px 30px;background:#040d1a;border-top:1px solid #1e3a6e;">
    <div style="color:#64748b;font-size:12px;">Applicant certified all information is true and complete.</div>
    <div style="color:#64748b;font-size:11px;margin-top:4px;">Millstadt Ambulance Service — Employment Application System</div>
  </td></tr>
  </table>
</table>
</td></tr>
</table>
</body></html>`;
}

// Maximum total attachment size (Vercel body limit is ~4.5MB; leave buffer)
const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;

// Flag detection lives in lib/application-flags.ts so admin pages share it.

function buildFlagPdf(applicantName: string, position: string, flags: string[]): Buffer {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  // Red header
  doc.setFillColor(220, 38, 38);
  doc.rect(0, 0, pageWidth, 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("FLAG FOR REVIEW", margin, 32);
  doc.setFontSize(22);
  doc.text("Application Requires Attention", margin, 60);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`${applicantName}  ·  ${position}`, margin, 80);
  y = 120;

  doc.setTextColor(20, 20, 20);
  doc.setFontSize(11);
  doc.text("The following items were flagged on this employment application:", margin, y);
  y += 24;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  for (const flag of flags) {
    if (y > doc.internal.pageSize.getHeight() - margin - 30) {
      doc.addPage();
      y = margin;
    }
    // Red bullet
    doc.setFillColor(220, 38, 38);
    doc.circle(margin + 5, y - 4, 3, "F");
    doc.setTextColor(20, 20, 20);
    const lines = doc.splitTextToSize(flag, pageWidth - margin - 30);
    for (let i = 0; i < lines.length; i++) {
      doc.text(String(lines[i]), margin + 18, y);
      if (i < lines.length - 1) y += 14;
    }
    y += 22;
  }

  // Footer
  y += 20;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  const note = "These flags are auto-generated based on missing information or concerning answers in the application. Review before extending an offer or scheduling an interview.";
  const noteLines = doc.splitTextToSize(note, pageWidth - 2 * margin);
  for (const line of noteLines) {
    doc.text(String(line), margin, y);
    y += 12;
  }

  doc.setFontSize(8);
  doc.text(`Generated ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })} CDT`, margin, doc.internal.pageSize.getHeight() - 24);

  return Buffer.from(doc.output("arraybuffer"));
}

// ── Route handler ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const fields: Record<string, string> = {};
    const attachments: { filename: string; content: Buffer; mimeType: string }[] = [];
    const skippedFiles: string[] = [];
    let totalAttachmentBytes = 0;

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        if (value.size > 0) {
          if (totalAttachmentBytes + value.size > MAX_ATTACHMENT_BYTES) {
            skippedFiles.push(value.name);
            continue;
          }
          const bytes = await value.arrayBuffer();
          attachments.push({ filename: value.name, content: Buffer.from(bytes), mimeType: value.type || "application/octet-stream" });
          totalAttachmentBytes += value.size;
        }
      } else {
        fields[key] = fields[key] ? `${fields[key]}, ${value}` : value;
      }
    }

    if (skippedFiles.length > 0) {
      fields.skipped_files_note = `NOTE: Some files were too large and skipped: ${skippedFiles.join(", ")}. Applicant should email them separately.`;
    }

    // Save to DB FIRST so admin can see it even if email fails
    const dbFields: Record<string, string> = { ...fields };
    if (attachments.length > 0) {
      dbFields.attached_files = attachments.map(a => `${a.filename} (${(a.content.length / 1024).toFixed(0)}KB)`).join(", ");
    }
    try {
      await createFormSubmission("Employment Application", dbFields);
    } catch (e) {
      console.error("[apply] DB save failed (continuing with email):", e);
    }

    const { gmail, sender } = getGmailClient();
    const fullName = [fields.first_name, fields.middle_name, fields.last_name].filter(Boolean).join(" ") || "Applicant";

    // Generate the application PDF and prepend it to attachments so it's the
    // first thing the reviewer sees.
    let pdfAttachments = attachments;
    try {
      const pdfBuffer = buildPdf(fields);
      const pdfFilename = `Application — ${fullName.replace(/[^\w\s-]/g, "").trim() || "Applicant"}.pdf`;
      pdfAttachments = [
        { filename: pdfFilename, content: pdfBuffer, mimeType: "application/pdf" },
        ...attachments,
      ];
    } catch (pdfErr) {
      console.error("[apply] PDF generation failed (continuing without PDF):", pdfErr);
    }

    // Flag for review: missing consents, missing license info, missing certs,
    // or concerning driving history → generate a red "FLAG FOR REVIEW" PDF.
    let flagCount = 0;
    try {
      const flags = buildApplicationFlags(fields);
      flagCount = flags.length;
      if (flags.length > 0) {
        const flagPdfBuffer = buildFlagPdf(fullName, fields.position || "Position Not Specified", flags);
        const flagPdfFilename = `FLAG FOR REVIEW — ${fullName.replace(/[^\w\s-]/g, "").trim() || "Applicant"}.pdf`;
        pdfAttachments = [
          ...pdfAttachments.slice(0, 1),
          { filename: flagPdfFilename, content: flagPdfBuffer, mimeType: "application/pdf" },
          ...pdfAttachments.slice(1),
        ];
        // Also note the flag count in DB so admin can see at a glance
        fields.review_flags = `${flags.length} flag(s): ${flags.join("; ")}`;
      }
    } catch (flagErr) {
      console.error("[apply] Flag PDF generation failed:", flagErr);
    }

    const raw = buildRawMime({
      from: `"Millstadt EMS Careers" <${sender}>`,
      to: "millstadtems@gmail.com",
      replyTo: fields.email || sender,
      subject: `Employment Application — ${fullName} — ${fields.position || "Position Not Specified"}`,
      html: buildHtml(fields),
      attachments: pdfAttachments,
    });

    await gmail.users.messages.send({ userId: "me", requestBody: { raw } });

    // Send SMS notification via Verizon's email-to-SMS gateway (free — uses Gmail).
    // Best-effort — never block the response on this.
    try {
      const flagText = flagCount === 1 ? "1 item" : `${flagCount} items`;
      const smsBody = `A new employment application has been received at Millstadtems@gmail.com. There are ${flagText} flagged for review in this application.`;
      const smsRaw = Buffer.from(
        `From: Millstadt EMS <${sender}>\r\n` +
        `To: 6188064539@vtext.com\r\n` +
        `Subject: New Application\r\n` +
        `Content-Type: text/plain; charset=utf-8\r\n` +
        `\r\n` +
        smsBody
      ).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      await gmail.users.messages.send({ userId: "me", requestBody: { raw: smsRaw } });
    } catch (smsErr) {
      console.error("[apply] SMS notification (Verizon email-to-SMS) failed:", smsErr);
    }

    return NextResponse.json({
      success: true,
      ...(skippedFiles.length > 0
        ? { warning: `Application sent, but these files were too large and were not attached: ${skippedFiles.join(", ")}. Please email them separately to millstadtems@gmail.com.` }
        : {}),
    });
  } catch (err) {
    console.error("Application submit error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    let friendly = "Failed to send your application. Please try again or email millstadtems@gmail.com directly.";
    if (msg.includes("invalid_grant") || msg.includes("Token has been expired") || msg.includes("revoked")) {
      friendly = "Email service is temporarily unavailable. Please email your application directly to millstadtems@gmail.com.";
    } else if (msg.includes("credentials") || msg.includes("OAuth") || msg.includes("not set")) {
      friendly = "Email system is not configured. Please email your application directly to millstadtems@gmail.com.";
    } else if (msg.includes("insufficientPermissions") || msg.includes("scope")) {
      friendly = "Email permission error. Please email millstadtems@gmail.com directly.";
    } else if (msg.includes("too large") || msg.includes("PayloadTooLarge") || msg.includes("413")) {
      friendly = "Your attachments are too large. Please reduce file sizes (under 4MB total) or email them separately.";
    }
    return NextResponse.json({ success: false, error: friendly }, { status: 500 });
  }
}
