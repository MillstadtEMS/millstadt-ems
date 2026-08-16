import { jsPDF } from "jspdf";
import {
  ACCEPTED_CHECKBOX_TEXT,
  ACCURATE_IDENTIFICATION_NOTICE,
  AI_PROCESSING_NOTICE,
  PRIVACY_NOTICE,
  RELEASE_TERMS,
  RUN_COUNT_METHODOLOGY_NOTICE,
  type AccessRequestRecord,
  type SyntheticDocument,
} from "./types";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const CALL_VOLUME_DOCUMENT_ID = "CALL-VOLUME-REQUESTS-2022-2026";

export type AgreementSignature =
  | { method: "drawn"; dataUrl: string; name: string }
  | { method: "typed"; name: string };

export function signedAgreementPdf(
  request: AccessRequestRecord,
  documents: SyntheticDocument[],
  signature: AgreementSignature,
) {
  const doc = new jsPDF({ unit: "pt", format: "letter", compress: true });
  doc.setProperties({
    title: `Signed access request ${request.id}`,
    subject: `Millstadt EMS restricted document access agreement ${request.termsVersion}`,
    author: "Millstadt Ambulance Service",
    creator: "Millstadt EMS Financial Information Hub",
  });
  let y = 0;

  const drawPageFrame = () => {
    doc.setFillColor(15, 39, 72);
    doc.rect(0, 0, PAGE_WIDTH, 54, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("MILLSTADT EMS", MARGIN, 32);
    doc.setFont("helvetica", "normal");
    doc.text("Restricted document access agreement", PAGE_WIDTH - MARGIN, 32, {
      align: "right",
    });
    y = 82;
  };

  const addPage = () => {
    doc.addPage("letter", "portrait");
    drawPageFrame();
  };

  const ensureSpace = (height: number) => {
    if (y + height > PAGE_HEIGHT - 86) addPage();
  };

  const addHeading = (text: string, size = 15) => {
    ensureSpace(size + 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    doc.setTextColor(15, 39, 72);
    doc.text(pdfText(text), MARGIN, y);
    y += size + 10;
  };

  const addParagraph = (text: string, options?: { bold?: boolean; indent?: number }) => {
    const indent = options?.indent ?? 0;
    const remaining = [...doc.splitTextToSize(pdfText(text), CONTENT_WIDTH - indent)];
    const lineHeight = 13.25;
    const bottom = PAGE_HEIGHT - 86;

    while (remaining.length > 0) {
      if (y > bottom - lineHeight) addPage();
      const availableLines = Math.max(1, Math.floor((bottom - y) / lineHeight) + 1);
      let lineCount = Math.min(remaining.length, availableLines);
      if (remaining.length > lineCount && remaining.length - lineCount === 1 && lineCount > 1) {
        lineCount -= 1;
      }
      const pageLines = remaining.splice(0, lineCount);
      doc.setFont("helvetica", options?.bold ? "bold" : "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(31, 41, 55);
      doc.text(pageLines, MARGIN + indent, y, { lineHeightFactor: 1.25 });
      y += pageLines.length * lineHeight;
      if (remaining.length > 0) addPage();
    }
    y += 8;
  };

  const addSection = (title: string, paragraphs: string[]) => {
    const firstParagraph = paragraphs[0] ?? "";
    const firstLines = doc.splitTextToSize(pdfText(firstParagraph), CONTENT_WIDTH);
    ensureSpace(15 + 10 + Math.min(2, firstLines.length) * 13.25 + 8);
    addHeading(title);
    for (const paragraph of paragraphs) addParagraph(paragraph);
  };

  drawPageFrame();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(15, 39, 72);
  doc.text("Signed access request", MARGIN, y);
  y += 34;

  const summaryRows = [
    ["Request ID", request.id],
    ["Request version", request.requestVersion],
    ["Submitted", formatUtc(request.submittedAtUtc)],
    ["Applicant", request.fullLegalName],
    ["Email", request.verifiedEmail],
    [
      "Mailing address",
      `${request.mailingAddress}${request.addressLine2 ? `, ${request.addressLine2}` : ""}, ${request.city}, ${request.state} ${request.postalCode}`,
    ],
  ] as const;
  const summaryHeight =
    34 +
    summaryRows.reduce((height, [, value]) => {
      const lines = doc.splitTextToSize(pdfText(value), CONTENT_WIDTH - 132);
      return height + Math.max(20, lines.length * 12 + 6);
    }, 0);
  const summaryTop = y;
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(MARGIN, summaryTop, CONTENT_WIDTH, summaryHeight, 5, 5, "FD");
  y += 22;
  for (const [label, value] of summaryRows) addSummaryLine(label, value);
  y = summaryTop + summaryHeight + 18;

  addHeading("Documents requested");
  for (const document of documents) {
    addParagraph(
      `${document.title} | ${document.id} | Version ${document.version} | ${document.pages.length} pages`,
      { indent: 12 },
    );
  }

  addHeading("Electronic acknowledgment");
  addParagraph(ACCEPTED_CHECKBOX_TEXT);
  addParagraph(
    `The applicant electronically signed this request at ${formatUtc(request.acceptedAtUtc)} using a ${signature.method} signature. Submission records acceptance of Terms Version ${request.termsVersion}, AI Notice Version ${request.aiNoticeVersion}, and Privacy Notice Version ${request.privacyVersion}.`,
  );

  ensureSpace(112);
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 96, 5, 5, "FD");
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
  y += 116;

  addPage();
  addSection("Accurate information requirement", ACCURATE_IDENTIFICATION_NOTICE);
  addSection("Release and provenance terms", RELEASE_TERMS);
  if (documents.some((item) => item.id === CALL_VOLUME_DOCUMENT_ID)) {
    addSection("Call-volume methodology notice", RUN_COUNT_METHODOLOGY_NOTICE);
  }
  addSection("AI-processing notice", AI_PROCESSING_NOTICE);
  addSection("Privacy notice", PRIVACY_NOTICE);

  const totalPages = doc.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    doc.setPage(pageNumber);
    doc.setDrawColor(203, 213, 225);
    doc.line(MARGIN, PAGE_HEIGHT - 40, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Signed agreement | ${request.id}`, MARGIN, PAGE_HEIGHT - 24);
    doc.text(`Page ${pageNumber} of ${totalPages}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 24, {
      align: "right",
    });
  }

  return Buffer.from(doc.output("arraybuffer"));

  function addSummaryLine(label: string, value: string) {
    const lines = doc.splitTextToSize(pdfText(value), CONTENT_WIDTH - 132);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(pdfText(label), MARGIN + 16, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(17, 24, 39);
    doc.text(lines, MARGIN + 116, y, { lineHeightFactor: 1.2 });
    y += Math.max(20, lines.length * 12 + 6);
  }
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
