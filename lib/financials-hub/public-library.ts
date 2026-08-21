import "server-only";

import { jsPDF } from "jspdf";

import { catalog, findDocument } from "./dev-store";
import {
  findManagedDocument,
  readManagedDocumentPdf,
} from "./document-library";
import { publicForm990Catalog } from "./form990";
import { ORGANIZATION_NAME, type SyntheticDocument } from "./types";

export type PublicLibraryDocument = {
  id: string;
  kind: "form_990" | "financial_document";
  title: string;
  category: string;
  periodLabel: string;
  dateLabel: string;
  version: string;
  pageCount: number;
  statusLabel: "Filed" | "Published";
  searchText: string;
  viewUrl: string;
  downloadUrl: string;
  printUrl: string;
};

export function publicFinancialDocumentLibrary(): PublicLibraryDocument[] {
  const form990s = publicForm990Catalog().map((document) => ({
    id: document.id,
    kind: "form_990" as const,
    title: document.title,
    category: "Form 990",
    periodLabel: `Tax year ${document.taxYear}`,
    dateLabel: `Filed ${formatPublicDate(document.filingDate)}`,
    version: document.version,
    pageCount: document.pageCount,
    statusLabel: "Filed" as const,
    searchText: [
      document.title,
      "Form 990",
      document.taxYear,
      document.filingYear,
      document.filingDate,
    ]
      .join(" ")
      .toLowerCase(),
    viewUrl: `/api/financials/form-990/${document.id}/pdf`,
    downloadUrl: `/api/financials/form-990/${document.id}/pdf?download=1`,
    printUrl: `/api/financials/form-990/${document.id}/html?print=1`,
  }));

  const financialDocuments = catalog()
    .sort((left, right) => right.publicationDate.localeCompare(left.publicationDate))
    .map((document) => ({
      id: document.id,
      kind: "financial_document" as const,
      title: document.title,
      category: document.category,
      periodLabel: document.publicationDate.slice(0, 4),
      dateLabel: `Published ${formatPublicDate(document.publicationDate)}`,
      version: document.version,
      pageCount: document.pageCount,
      statusLabel: "Published" as const,
      searchText: [
        document.title,
        document.category,
        document.publicationDate,
        document.version,
      ]
        .join(" ")
        .toLowerCase(),
      viewUrl: `/api/financials/documents/${document.id}/pdf`,
      downloadUrl: `/api/financials/documents/${document.id}/pdf?download=1`,
      printUrl: `/api/financials/documents/${document.id}/pdf?print=1`,
    }));

  return [...form990s, ...financialDocuments];
}

export function publicFinancialDocumentPdf(documentId: string) {
  const document = findDocument(documentId);
  if (!document) return null;

  const managed = findManagedDocument(documentId);
  const original = managed ? readManagedDocumentPdf(documentId) : null;
  return {
    document,
    pdf: original ?? generatedPublicDocumentPdf(document),
    filename: publicDocumentFilename(document),
  };
}

function generatedPublicDocumentPdf(document: SyntheticDocument) {
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 54;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  document.pages.forEach((pageText, pageIndex) => {
    if (pageIndex > 0) pdf.addPage();

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text(asciiPdfText(document.title), margin, 52, {
      maxWidth: pageWidth - margin * 2,
    });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(71, 85, 105);
    pdf.text(
      asciiPdfText(
        `${document.category} | Version ${document.version} | Published ${document.publicationDate}`,
      ),
      margin,
      72,
      { maxWidth: pageWidth - margin * 2 },
    );

    pdf.setTextColor(15, 23, 42);
    pdf.setFontSize(10.5);
    const lines = pdf.splitTextToSize(
      asciiPdfText(pageText),
      pageWidth - margin * 2,
    );
    pdf.text(lines, margin, 104, {
      lineHeightFactor: 1.55,
      maxWidth: pageWidth - margin * 2,
    });

    pdf.setDrawColor(203, 213, 225);
    pdf.line(margin, pageHeight - 42, pageWidth - margin, pageHeight - 42);
    pdf.setFontSize(8.5);
    pdf.setTextColor(71, 85, 105);
    pdf.text(
      asciiPdfText(`${ORGANIZATION_NAME} | Page ${pageIndex + 1} of ${document.pages.length}`),
      margin,
      pageHeight - 25,
    );
  });

  return Buffer.from(pdf.output("arraybuffer"));
}

function publicDocumentFilename(document: SyntheticDocument) {
  const slug = document.title
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return `${slug || document.id}.pdf`;
}

function asciiPdfText(value: string) {
  return value
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, "");
}

function formatPublicDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
