/**
 * One-shot backfill: replace every legacy notice_acknowledgment attachment
 * (where file_url is still a data: URL) with a memorandum PDF stored on
 * Vercel Blob. Re-runnable.
 *
 *   node --env-file=.env.local scripts/backfill-ack-pdfs.mjs
 */
import { neon } from "@neondatabase/serverless";
import { put } from "@vercel/blob";
import { jsPDF } from "jspdf";

const sql = neon(process.env.DATABASE_URL);

function fmtDate(iso) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    weekday: "long", month: "long", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  });
}
function fmtDateShort(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    month: "long", day: "numeric", year: "numeric",
  });
}

function buildPdf(input) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margin = 64;
  let y = margin;

  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 30, 60);
  doc.text("MILLSTADT AMBULANCE SERVICE", W / 2, y, { align: "center" });
  y += 16;

  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text("Office of the Chief", W / 2, y, { align: "center" });
  y += 12;
  doc.text("203 W Laurel St · Millstadt, Illinois 62260", W / 2, y, { align: "center" });
  y += 18;

  doc.setDrawColor(20, 30, 60);
  doc.setLineWidth(1.2);
  doc.line(margin, y, W - margin, y);
  y += 28;

  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.setTextColor(20, 30, 60);
  doc.text("MEMORANDUM", W / 2, y, { align: "center" });
  y += 28;

  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20);

  const labelX = margin;
  const valueX = margin + 78;
  const rowGap = 18;
  function row(label, value) {
    doc.setFont("times", "bold");
    doc.text(label, labelX, y);
    doc.setFont("times", "normal");
    const lines = doc.splitTextToSize(value, W - valueX - margin);
    doc.text(lines, valueX, y);
    y += rowGap * Math.max(1, lines.length);
  }

  row("FROM:", input.fromOffice ?? "Office of the Chief, Millstadt Ambulance Service");
  row("TO:", `${input.employeeName}${input.employeeRank ? `, ${input.employeeRank}` : ""}`);
  row("DATE:", input.noticeCreatedAt ? fmtDateShort(input.noticeCreatedAt) : fmtDateShort(input.acknowledgedAt));
  row("SUBJECT:", input.noticeTitle);

  y += 6;
  doc.setDrawColor(150);
  doc.setLineWidth(0.6);
  doc.line(margin, y, W - margin, y);
  y += 24;

  doc.setFont("times", "normal");
  doc.setFontSize(12);
  doc.setTextColor(20);
  const bodyLines = doc.splitTextToSize((input.noticeBody || "").trim() || "(No body)", W - margin * 2);
  const lineHeight = 16;
  for (const line of bodyLines) {
    if (y > H - margin - 220) { doc.addPage(); y = margin; }
    doc.text(line, margin, y);
    y += lineHeight;
  }
  y += 18;

  if (y > H - margin - 220) { doc.addPage(); y = margin; }

  doc.setDrawColor(20, 30, 60);
  doc.setLineWidth(1);
  doc.line(margin, y, W - margin, y);
  y += 20;

  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20, 30, 60);
  doc.text("EMPLOYEE ACKNOWLEDGMENT", margin, y);
  y += 18;

  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.setTextColor(40);
  const ackParagraph =
    `I, ${input.employeeName}, acknowledge that I have read and understood the memorandum above ` +
    `titled "${input.noticeTitle}" issued by Millstadt Ambulance Service. My signature below ` +
    `confirms receipt and understanding of this notice.`;
  const ackLines = doc.splitTextToSize(ackParagraph, W - margin * 2);
  for (const line of ackLines) { doc.text(line, margin, y); y += 14; }
  y += 14;

  const sigBoxX = margin;
  const sigBoxW = (W - margin * 2) * 0.55;
  const sigBoxH = 70;

  if (input.signatureDataUrl && input.signatureDataUrl.startsWith("data:image/")) {
    try {
      const format = input.signatureDataUrl.includes("image/jpeg") ? "JPEG" : "PNG";
      doc.addImage(input.signatureDataUrl, format, sigBoxX, y, sigBoxW, sigBoxH, undefined, "FAST");
    } catch {
      doc.setFont("times", "italic");
      doc.text("(signature on file)", sigBoxX, y + sigBoxH / 2);
    }
  } else {
    doc.setFont("times", "italic");
    doc.setTextColor(120);
    doc.text("(no signature captured)", sigBoxX, y + sigBoxH / 2);
  }

  doc.setDrawColor(20);
  doc.setLineWidth(0.6);
  doc.line(sigBoxX, y + sigBoxH + 2, sigBoxX + sigBoxW, y + sigBoxH + 2);

  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text("Signature of Employee", sigBoxX, y + sigBoxH + 14);

  const rightX = sigBoxX + sigBoxW + 24;
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20);
  doc.text("Acknowledged", rightX, y + 14);
  doc.setFont("times", "normal");
  doc.setTextColor(40);
  const ackTimeLines = doc.splitTextToSize(fmtDate(input.acknowledgedAt), W - rightX - margin);
  let ry = y + 30;
  for (const line of ackTimeLines) { doc.text(line, rightX, ry); ry += 12; }
  if (input.signatureIp) {
    doc.setFontSize(8);
    doc.setTextColor(110);
    doc.text(`IP of record: ${input.signatureIp}`, rightX, ry + 6);
  }

  y += sigBoxH + 30;

  const footerY = H - 40;
  doc.setDrawColor(180);
  doc.setLineWidth(0.4);
  doc.line(margin, footerY - 12, W - margin, footerY - 12);
  doc.setFont("times", "italic");
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    "This memorandum was issued and acknowledged through the Millstadt EMS Employee Lounge. " +
    "An electronic copy is retained in the employee's personnel file.",
    W / 2,
    footerY,
    { align: "center", maxWidth: W - margin * 2 },
  );

  return Buffer.from(doc.output("arraybuffer"));
}

// First pass: attachments where lounge_ack_states still has the linkage —
// those get full notice + signature + IP data straight from the source.
// Second pass: orphans (older rows where personnel_record_id was never
// stamped). We rebuild them from the personnel_record alone since the
// signature data lives in the attachment file_url as a data: URL.
const linkedRows = await sql`
  SELECT
    att.id              AS attachment_id,
    att.record_id       AS record_id,
    att.employee_id     AS employee_id,
    n.id                AS ack_id,
    n.title             AS notice_title,
    n.body              AS notice_body,
    n.created_at        AS notice_created_at,
    s.acknowledged_at   AS acknowledged_at,
    s.signature_data_url AS signature_data_url,
    s.signature_ip      AS signature_ip,
    emp.first_name      AS employee_first_name,
    emp.last_name       AS employee_last_name,
    emp.position        AS employee_position,
    emp.certification   AS employee_certification,
    att.file_url        AS legacy_signature
  FROM lounge_personnel_attachments att
  JOIN lounge_ack_states s
    ON s.personnel_record_id = att.record_id
   AND s.user_id = att.employee_id
  JOIN lounge_acks n ON n.id = s.ack_id
  JOIN lounge_employees emp ON emp.id = att.employee_id
  WHERE att.document_category = 'notice_acknowledgment'
    AND att.file_url LIKE 'data:%'
`;

const orphanRows = await sql`
  SELECT
    att.id              AS attachment_id,
    att.record_id       AS record_id,
    att.employee_id     AS employee_id,
    r.title             AS record_title,
    r.summary           AS record_summary,
    r.incident_date     AS record_date,
    r.created_at        AS record_created_at,
    emp.first_name      AS employee_first_name,
    emp.last_name       AS employee_last_name,
    emp.position        AS employee_position,
    emp.certification   AS employee_certification,
    att.file_url        AS legacy_signature
  FROM lounge_personnel_attachments att
  JOIN lounge_personnel_records r ON r.id = att.record_id
  JOIN lounge_employees emp ON emp.id = att.employee_id
  WHERE att.document_category = 'notice_acknowledgment'
    AND att.file_url LIKE 'data:%'
    AND NOT EXISTS (
      SELECT 1 FROM lounge_ack_states s
      WHERE s.personnel_record_id = att.record_id
        AND s.user_id = att.employee_id
    )
`;

const rows = [
  ...linkedRows,
  ...orphanRows.map((r) => ({
    attachment_id: r.attachment_id,
    record_id: r.record_id,
    employee_id: r.employee_id,
    ack_id: r.record_id, // no source notice — use record id for blob path
    notice_title: (r.record_title ?? "Notice").replace(/^Acknowledged:\s*/i, ""),
    notice_body: r.record_summary ?? "(Original notice body not available.)",
    notice_created_at: r.record_created_at,
    acknowledged_at: r.record_created_at,
    signature_data_url: r.legacy_signature,
    signature_ip: null,
    employee_first_name: r.employee_first_name,
    employee_last_name: r.employee_last_name,
    employee_position: r.employee_position,
    employee_certification: r.employee_certification,
    legacy_signature: r.legacy_signature,
  })),
];

console.log(`Found ${rows.length} legacy ack attachments to upgrade.`);

let ok = 0, fail = 0;
for (const row of rows) {
  try {
    const pdf = buildPdf({
      noticeTitle: row.notice_title,
      noticeBody: row.notice_body ?? "",
      noticeCreatedAt: row.notice_created_at,
      employeeName: `${row.employee_first_name} ${row.employee_last_name}`,
      employeeRank: row.employee_position ?? row.employee_certification ?? null,
      acknowledgedAt: row.acknowledged_at ?? new Date().toISOString(),
      signatureDataUrl: row.signature_data_url ?? row.legacy_signature ?? null,
      signatureIp: row.signature_ip,
    });
    const safeTitle = (row.notice_title || "notice").replace(/[^a-z0-9]+/gi, "-").slice(0, 60).replace(/^-|-$/g, "") || "notice";
    const blob = await put(
      `lounge/ack-memorandums/${row.ack_id}-${row.employee_id}-${safeTitle}-backfill-${Date.now()}.pdf`,
      pdf,
      { access: "public", addRandomSuffix: false, contentType: "application/pdf" },
    );
    const newName = `Memorandum-${row.notice_title || "notice"}.pdf`;
    const newNotes = `Signed memorandum for "${row.notice_title || "notice"}"`;
    await sql`
      UPDATE lounge_personnel_attachments
      SET file_url = ${blob.url},
          file_name = ${newName},
          file_mime = 'application/pdf',
          employee_notes = ${newNotes}
      WHERE id = ${row.attachment_id}
    `;
    console.log(`OK  ${row.attachment_id}  ${blob.url}`);
    ok++;
  } catch (e) {
    console.error(`FAIL ${row.attachment_id}`, e?.message ?? e);
    fail++;
  }
}

console.log(`\nDone. ok=${ok} fail=${fail}`);
