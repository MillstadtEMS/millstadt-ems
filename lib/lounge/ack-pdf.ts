/**
 * Build a classic memorandum PDF for an acknowledged notice. The output
 * looks like a standard MEMORANDUM block (FROM/TO/DATE/SUBJECT), prints
 * the notice body, then renders the employee's signature image with the
 * acknowledged date/time and IP underneath.
 */

import { jsPDF } from "jspdf";
import { drawContainedImage, loadLogo } from "@/lib/reports/pdf-system";

export interface AckPdfInput {
  noticeId?: string;
  noticeTitle: string;
  noticeBody: string;
  noticeCreatedAt: string | null;
  employeeName: string;
  employeeRank: string | null;
  acknowledgedAt: string;
  signatureDataUrl: string | null;
  signatureIp: string | null;
  fromOffice?: string;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export async function buildAckMemorandumPdf(input: AckPdfInput): Promise<Buffer> {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margin = 64;
  let y = margin;

  // ── Letterhead ─────────────────────────────────────────────────────
  const logo = await loadLogo();
  if (logo) {
    drawContainedImage(doc, logo.dataUri, "PNG", margin, y - 22, 42, 42);
  }
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
  doc.text("100 E Laurel St · Millstadt, Illinois 62260", W / 2, y, { align: "center" });
  y += 18;

  doc.setDrawColor(20, 30, 60);
  doc.setLineWidth(1.2);
  doc.line(margin, y, W - margin, y);
  y += 28;

  // ── MEMORANDUM heading ─────────────────────────────────────────────
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.setTextColor(20, 30, 60);
  doc.text("MEMORANDUM", W / 2, y, { align: "center" });
  y += 28;

  // ── Header block (FROM / TO / DATE / SUBJECT) ──────────────────────
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20);

  const labelX = margin;
  const valueX = margin + 78;
  const rowGap = 18;

  function row(label: string, value: string) {
    doc.setFont("times", "bold");
    doc.text(label, labelX, y);
    doc.setFont("times", "normal");
    const lines = doc.splitTextToSize(value, W - valueX - margin) as string[];
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

  // ── Notice body ─────────────────────────────────────────────────────
  doc.setFont("times", "normal");
  doc.setFontSize(12);
  doc.setTextColor(20);
  const bodyLines = doc.splitTextToSize(input.noticeBody.trim() || "(No body)", W - margin * 2) as string[];

  const lineHeight = 16;
  for (const line of bodyLines) {
    if (y > H - margin - 36) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += lineHeight;
  }
  y += 18;

  // ── Acknowledgment block ────────────────────────────────────────────
  if (y > H - margin - 200) {
    doc.addPage();
    y = margin;
  }

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
  const ackLines = doc.splitTextToSize(ackParagraph, W - margin * 2) as string[];
  for (const line of ackLines) {
    doc.text(line, margin, y);
    y += 14;
  }
  y += 14;

  // ── Signature image ────────────────────────────────────────────────
  const sigBoxX = margin;
  const sigBoxW = (W - margin * 2) * 0.55;
  const sigBoxH = 70;

  if (input.signatureDataUrl && input.signatureDataUrl.startsWith("data:image/")) {
    const format = input.signatureDataUrl.includes("image/jpeg") ? "JPEG" : "PNG";
    if (!drawContainedImage(doc, input.signatureDataUrl, format, sigBoxX, y, sigBoxW, sigBoxH)) {
      doc.setFont("times", "italic");
      doc.text("(signature on file)", sigBoxX, y + sigBoxH / 2);
    }
  } else {
    doc.setFont("times", "italic");
    doc.setTextColor(120);
    doc.text("(no signature captured)", sigBoxX, y + sigBoxH / 2);
  }

  // Signature underline
  doc.setDrawColor(20);
  doc.setLineWidth(0.6);
  doc.line(sigBoxX, y + sigBoxH + 2, sigBoxX + sigBoxW, y + sigBoxH + 2);

  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text("Signature of Employee", sigBoxX, y + sigBoxH + 14);

  // Date/time column on the right
  const rightX = sigBoxX + sigBoxW + 24;
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20);
  doc.text("Acknowledged", rightX, y + 14);
  doc.setFont("times", "normal");
  doc.setTextColor(40);
  const ackTimeLines = doc.splitTextToSize(fmtDate(input.acknowledgedAt), W - rightX - margin) as string[];
  let ry = y + 30;
  for (const line of ackTimeLines) {
    doc.text(line, rightX, ry);
    ry += 12;
  }
  if (input.signatureIp) {
    doc.setFontSize(8);
    doc.setTextColor(110);
    doc.text(`IP of record: ${input.signatureIp}`, rightX, ry + 6);
  }

  y += sigBoxH + 30;

  // ── Footer ─────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  const footerY = H - 40;
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    if (page > 1) {
      if (logo) drawContainedImage(doc, logo.dataUri, "PNG", margin, 12, 30, 30);
      doc.setFont("times", "bold");
      doc.setFontSize(9);
      doc.setTextColor(20, 30, 60);
      doc.text("MILLSTADT AMBULANCE SERVICE - MEMORANDUM", margin + 42, 31);
    }
    doc.setDrawColor(180);
    doc.setLineWidth(0.4);
    doc.line(margin, footerY - 12, W - margin, footerY - 12);
    doc.setFont("times", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(120);
    doc.text("Electronic acknowledgment retained in the employee personnel file.", margin, footerY);
    const pageLabel = `${input.noticeId ? `Notice ${input.noticeId.slice(0, 8)} | ` : ""}Page ${page} of ${pageCount}`;
    doc.text(pageLabel, W - margin, footerY, { align: "right" });
  }

  const bytes = doc.output("arraybuffer");
  return Buffer.from(bytes);
}
