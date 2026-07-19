import { jsPDF } from "jspdf";
import type { Meeting } from "./governance";

export interface OfficialMinutesPdfInput {
  meeting: Meeting;
  minutesText: string;
  secretaryName: string;
  secretaryTitle: string;
  signedAt: string;
  signatureDataUrl: string;
}

function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function fmtSignedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export async function buildOfficialMeetingMinutesPdf(input: OfficialMinutesPdfInput): Promise<Buffer> {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 58;
  const footerY = pageHeight - 34;
  const usable = pageWidth - margin * 2;
  let y = margin;

  function addPageIfNeeded(needed = 42) {
    if (y + needed <= pageHeight - margin - 12) return;
    doc.addPage();
    y = margin;
  }

  function textBlock(text: string, size = 11.5, gap = 15) {
    doc.setFont("times", "normal");
    doc.setFontSize(size);
    doc.setTextColor(24, 32, 40);
    const lines = doc.splitTextToSize(text, usable) as string[];
    for (const line of lines) {
      addPageIfNeeded(gap);
      doc.text(line, margin, y);
      y += gap;
    }
  }

  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(16, 28, 42);
  doc.text("MILLSTADT EMS BOARD OF DIRECTORS", pageWidth / 2, y, { align: "center" });
  y += 17;
  doc.setFontSize(12);
  doc.text("OFFICIAL MEETING MINUTES", pageWidth / 2, y, { align: "center" });
  y += 18;
  doc.setDrawColor(16, 28, 42);
  doc.setLineWidth(1.1);
  doc.line(margin, y, pageWidth - margin, y);
  y += 24;

  const meta: Array<[string, string]> = [
    ["Meeting Date", fmtDate(input.meeting.date)],
    ["Meeting Time", `${input.meeting.startTime ?? "Time not confirmed"}${input.meeting.endTime ? ` - ${input.meeting.endTime}` : ""}`],
    ["Location", input.meeting.location ?? "Location not confirmed"],
    ["Board", "Millstadt EMS Board"],
    ["Status", "Secretary Approved"],
  ];

  doc.setFontSize(10.5);
  for (const [label, value] of meta) {
    doc.setFont("times", "bold");
    doc.setTextColor(16, 28, 42);
    doc.text(`${label}:`, margin, y);
    doc.setFont("times", "normal");
    doc.setTextColor(24, 32, 40);
    const lines = doc.splitTextToSize(value, usable - 108) as string[];
    doc.text(lines, margin + 108, y);
    y += Math.max(15, lines.length * 14);
  }
  y += 10;
  doc.setDrawColor(170);
  doc.setLineWidth(.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 22;

  doc.setFont("times", "bold");
  doc.setFontSize(13);
  doc.setTextColor(16, 28, 42);
  doc.text("Minutes", margin, y);
  y += 20;

  for (const paragraph of input.minutesText.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)) {
    addPageIfNeeded(40);
    if (/^\d+\.\s+/.test(paragraph) || /^[A-Z][A-Z\s-]{8,}$/.test(paragraph)) {
      doc.setFont("times", "bold");
      doc.setFontSize(12.5);
      doc.setTextColor(16, 28, 42);
      const heading = doc.splitTextToSize(paragraph, usable) as string[];
      doc.text(heading, margin, y);
      y += heading.length * 15 + 4;
    } else {
      textBlock(paragraph, 11.5, 15);
      y += 7;
    }
  }

  const certificationHeight = 178;
  if (y + certificationHeight > pageHeight - margin - 12) {
    doc.addPage();
    y = margin;
  }
  y = Math.max(y + 8, pageHeight - margin - certificationHeight);
  doc.setDrawColor(16, 28, 42);
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);
  y += 22;

  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.setTextColor(16, 28, 42);
  doc.text("SECRETARY CERTIFICATION", margin, y);
  y += 18;
  textBlock("I certify that these meeting minutes are accurate and complete to the best of my knowledge and have been reviewed for official board recordkeeping.", 11, 14);
  y += 8;

  const sigBoxX = margin;
  const sigBoxY = y;
  const sigBoxW = 250;
  const sigBoxH = 70;
  doc.setDrawColor(190);
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(sigBoxX, sigBoxY, sigBoxW, sigBoxH, 4, 4, "FD");
  try {
    const format = input.signatureDataUrl.includes("image/jpeg") ? "JPEG" : "PNG";
    doc.addImage(input.signatureDataUrl, format, sigBoxX + 8, sigBoxY + 8, sigBoxW - 16, sigBoxH - 16, undefined, "FAST");
  } catch {
    doc.setFont("times", "italic");
    doc.setFontSize(10);
    doc.text("(signature on file)", sigBoxX + 12, sigBoxY + 38);
  }

  const detailX = sigBoxX + sigBoxW + 24;
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(16, 28, 42);
  doc.text(input.secretaryName, detailX, sigBoxY + 18);
  doc.setFont("times", "normal");
  doc.text(input.secretaryTitle, detailX, sigBoxY + 34);
  doc.text(`Signed: ${fmtSignedAt(input.signedAt)}`, detailX, sigBoxY + 50);
  doc.text("Official minutes PDF generated by the board portal.", detailX, sigBoxY + 66);

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(205);
    doc.setLineWidth(.5);
    doc.line(margin, footerY - 14, pageWidth - margin, footerY - 14);
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.setTextColor(95, 105, 118);
    doc.text(`Official EMS Board Minutes | Page ${page} of ${pages}`, margin, footerY);
    doc.text("Millstadt EMS Board of Directors", pageWidth - margin, footerY, { align: "right" });
  }

  const bytes = doc.output("arraybuffer");
  return Buffer.from(bytes);
}
