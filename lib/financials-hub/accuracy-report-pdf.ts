import { jsPDF } from "jspdf";
import type { AgreementSignature } from "./agreement-pdf";
import {
  ACCURACY_CERTIFICATION,
  ACCURACY_CONTACT_ACKNOWLEDGMENT,
  ACCURACY_IDENTITY_HELP,
  ACCURACY_PRIVACY_NOTICE,
  ACCURACY_REPORT_INTRO,
  ACCURACY_UPLOAD_NOTICE,
  type AccuracyReportRecord,
} from "./accuracy-types";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

export function signedAccuracyReportPdf(
  report: AccuracyReportRecord,
  signature: AgreementSignature,
) {
  const doc = new jsPDF({ unit: "pt", format: "letter", compress: true });
  doc.setProperties({
    title: `Signed accuracy report ${report.id}`,
    subject: `Millstadt EMS accuracy or document-integrity report ${report.acknowledgmentVersion}`,
    author: "Millstadt Ambulance Service",
    creator: "Millstadt EMS Financial Information Hub",
  });
  let y = 0;

  function drawFrame() {
    doc.setFillColor(15, 39, 72);
    doc.rect(0, 0, PAGE_WIDTH, 54, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("MILLSTADT EMS", MARGIN, 32);
    doc.setFont("helvetica", "normal");
    doc.text("Accuracy and document-integrity report", PAGE_WIDTH - MARGIN, 32, {
      align: "right",
    });
    y = 82;
  }

  function addPage() {
    doc.addPage("letter", "portrait");
    drawFrame();
  }

  function ensureSpace(height: number) {
    if (y + height > PAGE_HEIGHT - 86) addPage();
  }

  function heading(text: string, size = 15) {
    ensureSpace(size + 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    doc.setTextColor(15, 39, 72);
    doc.text(pdfText(text), MARGIN, y);
    y += size + 10;
  }

  function paragraph(text: string, bold = false) {
    const lines = doc.splitTextToSize(pdfText(text), CONTENT_WIDTH);
    const height = lines.length * 14 + 8;
    ensureSpace(height);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(31, 41, 55);
    doc.text(lines, MARGIN, y, { lineHeightFactor: 1.25 });
    y += height;
  }

  function summaryLine(label: string, value: string) {
    const lines = doc.splitTextToSize(pdfText(value || "Not provided"), CONTENT_WIDTH - 125);
    const height = Math.max(18, lines.length * 13 + 4);
    ensureSpace(height);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(label, MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(17, 24, 39);
    doc.text(lines, MARGIN + 125, y);
    y += height;
  }

  drawFrame();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(23);
  doc.setTextColor(15, 39, 72);
  doc.text("Signed accuracy report", MARGIN, y);
  y += 36;

  summaryLine("Report reference", report.id);
  summaryLine("Submitted", formatUtc(report.submittedAtUtc));
  summaryLine("Reporter", report.reporterName);
  summaryLine("Email", report.reporterEmail);
  summaryLine("Telephone", report.reporterTelephone);
  summaryLine("Document", `${report.documentTitle} (${report.documentId})`);
  summaryLine("Version", report.documentVersion);
  summaryLine("Source URL", report.sourceUrl);
  summaryLine("Location", report.pageOrSection);
  summaryLine("Category", report.category);

  heading("Specific concern");
  paragraph(report.description);
  heading("Supporting source or citation");
  paragraph(report.supportingSource || "No supporting source or citation was provided.");
  if (report.upload) {
    heading("Supporting upload");
    paragraph(
      `${report.upload.originalFilename} | ${report.upload.contentType} | ${report.upload.size} bytes | ${report.upload.sha256} | ${report.upload.scanResult}`,
    );
  }

  addPage();
  heading("Purpose and identity notice");
  for (const text of ACCURACY_REPORT_INTRO) paragraph(text);
  paragraph(ACCURACY_IDENTITY_HELP);
  heading("Upload notice");
  for (const text of ACCURACY_UPLOAD_NOTICE) paragraph(text);
  heading("Good-faith certification");
  for (const text of ACCURACY_CERTIFICATION) paragraph(text);
  paragraph(ACCURACY_CONTACT_ACKNOWLEDGMENT);
  addPage();
  heading("Privacy notice");
  for (const text of ACCURACY_PRIVACY_NOTICE) paragraph(text);

  addPage();
  heading("Electronic signature");
  paragraph(
    `The reporter electronically signed this report at ${formatUtc(report.signatureCapturedAtUtc)} using a ${signature.method} signature. The acknowledgment version was ${report.acknowledgmentVersion}.`,
  );
  ensureSpace(112);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 96, 5, 5);
  if (signature.method === "drawn") {
    try {
      doc.addImage(signature.dataUrl, "PNG", MARGIN + 14, y + 10, 220, 54);
    } catch {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(127, 29, 29);
      doc.text("Drawn signature image could not be rendered.", MARGIN + 14, y + 34);
    }
  } else {
    doc.setFont("times", "italic");
    doc.setFontSize(22);
    doc.setTextColor(17, 24, 39);
    doc.text(pdfText(signature.name), MARGIN + 14, y + 44);
  }
  doc.setDrawColor(100, 116, 139);
  doc.line(MARGIN + 14, y + 68, MARGIN + 246, y + 68);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`${pdfText(signature.name)} | ${signature.method} signature`, MARGIN + 14, y + 82);

  const totalPages = doc.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    doc.setPage(pageNumber);
    doc.setDrawColor(203, 213, 225);
    doc.line(MARGIN, PAGE_HEIGHT - 40, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Signed report | ${report.id}`, MARGIN, PAGE_HEIGHT - 24);
    doc.text(`Page ${pageNumber} of ${totalPages}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 24, {
      align: "right",
    });
  }

  return Buffer.from(doc.output("arraybuffer"));
}

function formatUtc(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : `${date.toISOString()} UTC`;
}

function pdfText(value: string) {
  return value
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^\x20-\x7e]/g, " ");
}
