import { jsPDF } from "jspdf";

import { ORGANIZATION_NAME } from "./types";

export type PublicForm990 = {
  id: string;
  taxYear: string;
  filingYear: string;
  title: string;
  filingDate: string;
  version: string;
  pageCount: number;
  accessibleAlternative: string;
  pages: string[];
};

export type PublicForm990CatalogItem = Omit<PublicForm990, "pages">;

export const PUBLIC_FORM_990_HEADING =
  "Public Form 990s — Inspection and Copying";

export const PUBLIC_FORM_990_INTRO = [
  "Published Form 990 filings are available for public inspection and copying. You may view, print, or download a listed filing. No account, identifying information, or administrator approval is required.",
  `This page lists only filings that ${ORGANIZATION_NAME} has published. It does not accept requests for additional documents.`,
];

export const PUBLIC_FORM_990_NOTICE = [
  "Published Form 990 filings are provided for public inspection and copying. They may be viewed, printed, downloaded, copied, quoted, analyzed, and discussed subject to applicable law.",
  `The published filing is the reference document for reviewing the filing in context. An altered, cropped, incomplete, edited, summarized, transcribed, or AI-generated version should not be represented as the complete, unaltered, official, filed, verified, approved, or issued Form 990 of ${ORGANIZATION_NAME}.`,
  "Nothing in this notice restricts lawful printing, downloading, copying, quotation, criticism, commentary, journalism, political speech, public discussion, good-faith disagreement, or other lawful use.",
];

export const PUBLIC_FORM_990_AI_NOTICE = [
  `To the extent ${ORGANIZATION_NAME} owns or controls applicable rights, ${ORGANIZATION_NAME} has not authorized or requested the use of this published Form 990 for AI or machine-learning training, automated alteration, reconstruction, or generation of a representation falsely attributed to ${ORGANIZATION_NAME}.`,
  `This notice states the authorization position of ${ORGANIZATION_NAME}. It does not restrict lawful public inspection, printing, downloading, copying, quotation, analysis, criticism, commentary, journalism, or discussion. It does not represent that every AI provider, automated system, downstream recipient, or other person is technically or legally bound by this notice.`,
];

export const PUBLIC_FORM_990_REVIEW_NOTICE = [
  "Public-Version Review Required",
  "Before a Form 990 is published, an authorized administrator must verify that the posted file is the lawful public version, including any required Schedule B or contributor-information treatment and any legally permissible redactions.",
  "Print-blocking, download restrictions, or a view-only interface must not be used as a substitute for legally required redaction.",
];

export const SYNTHETIC_FORM_990S: PublicForm990[] = [
  {
    id: "SYN-990-2024-001",
    taxYear: "2024",
    filingYear: "2025",
    title: "Synthetic Form 990 Public Inspection Copy",
    filingDate: "2025-05-15",
    version: "SYNTHETIC-1.0",
    pageCount: 3,
    accessibleAlternative: "Accessible HTML rendering included below.",
    pages: [
      "SYNTHETIC DEVELOPMENT DATA - NOT AN IRS FILING\n\nReturn of Organization Exempt From Income Tax\nTax Year: 2024\nFiling Year: 2025\nThis synthetic page exists only to test public Form 990 viewing, printing, and downloading.",
      `SYNTHETIC DEVELOPMENT DATA - NOT AN IRS FILING\n\nPart I Summary\nRevenue, expenses, governance, program service accomplishments, and compensation fields are placeholder values only. No actual financial data of ${ORGANIZATION_NAME} is included.`,
      "SYNTHETIC DEVELOPMENT DATA - NOT AN IRS FILING\n\nPublic Inspection Copy Notes\nThis synthetic filing is printable and downloadable without identity collection, clickwrap acceptance, or administrator approval.",
    ],
  },
  {
    id: "SYN-990-2023-001",
    taxYear: "2023",
    filingYear: "2024",
    title: "Synthetic Prior-Year Form 990 Public Inspection Copy",
    filingDate: "2024-05-14",
    version: "SYNTHETIC-1.0",
    pageCount: 2,
    accessibleAlternative: "Accessible HTML rendering included below.",
    pages: [
      "SYNTHETIC DEVELOPMENT DATA - NOT AN IRS FILING\n\nReturn of Organization Exempt From Income Tax\nTax Year: 2023\nFiling Year: 2024\nThis is not a real Form 990 and contains no real financial information.",
      "SYNTHETIC DEVELOPMENT DATA - NOT AN IRS FILING\n\nPrototype Public Copy\nThe controls for this document intentionally allow ordinary viewing, printing, downloading, text selection, and copying.",
    ],
  },
];

export function publicForm990Catalog(): PublicForm990CatalogItem[] {
  return SYNTHETIC_FORM_990S.map((doc) => ({
    id: doc.id,
    taxYear: doc.taxYear,
    filingYear: doc.filingYear,
    title: doc.title,
    filingDate: doc.filingDate,
    version: doc.version,
    pageCount: doc.pageCount,
    accessibleAlternative: doc.accessibleAlternative,
  }));
}

export function findPublicForm990(id: string) {
  return SYNTHETIC_FORM_990S.find((doc) => doc.id === id) ?? null;
}

export function publicForm990Provenance(doc: PublicForm990) {
  return `${ORGANIZATION_NAME.toUpperCase()} — PUBLIC FORM 990 — TAX YEAR ${doc.taxYear} — VERSION ${doc.version}`;
}

export function publicForm990Footer(doc: PublicForm990) {
  return `Published by ${ORGANIZATION_NAME} | Form 990 Tax Year ${doc.taxYear} | Original retained by ${ORGANIZATION_NAME}`;
}

export function form990HtmlDocument(doc: PublicForm990) {
  const body = [
    `<!doctype html>`,
    `<html lang="en">`,
    `<head>`,
    `<meta charset="utf-8" />`,
    `<meta name="viewport" content="width=device-width, initial-scale=1" />`,
    `<title>${escapeHtml(doc.title)}</title>`,
    `<style>
      body { margin: 0; padding: 32px; font-family: system-ui, -apple-system, Segoe UI, sans-serif; color: #111827; background: #ffffff; }
      main { max-width: 860px; margin: 0 auto; }
      h1 { font-size: 30px; margin: 0 0 8px; }
      h2 { font-size: 20px; margin: 28px 0 10px; }
      p, li { line-height: 1.6; }
      .meta { color: #475569; margin-bottom: 24px; }
      .page { position: relative; min-height: 520px; border: 1px solid #cbd5e1; padding: 28px; margin: 24px 0; page-break-after: always; }
      .watermark { position: absolute; inset: 40% 0 auto; text-align: center; color: rgba(15, 23, 42, 0.14); font-weight: 900; transform: rotate(-16deg); pointer-events: none; }
      pre { position: relative; z-index: 1; white-space: pre-wrap; font: 15px/1.65 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
      footer { border-top: 1px solid #cbd5e1; padding-top: 12px; color: #475569; font-size: 13px; }
      @media print { body { padding: 0; } button { display: none; } .page { border: 0; } }
    </style>`,
    `</head>`,
    `<body>`,
    `<main>`,
    `<h1>${escapeHtml(doc.title)}</h1>`,
    `<p class="meta">Tax Year ${escapeHtml(doc.taxYear)} | Filing Year ${escapeHtml(doc.filingYear)} | Version ${escapeHtml(doc.version)}</p>`,
    `<button type="button" onclick="window.print()">Print</button>`,
    ...doc.pages.map(
      (page, index) => `
        <section class="page" aria-label="Synthetic Form 990 page ${index + 1}">
          <div class="watermark">${escapeHtml(publicForm990Provenance(doc))}</div>
          <pre>${escapeHtml(page)}</pre>
          <footer>${escapeHtml(publicForm990Footer(doc))} | Page ${index + 1} of ${doc.pages.length}</footer>
        </section>
      `,
    ),
    `</main>`,
    `</body>`,
    `</html>`,
  ].join("\n");
  return body;
}

export function form990PdfBuffer(doc: PublicForm990) {
  const pdf = new jsPDF({ unit: "pt", format: "letter", compress: true });
  pdf.setProperties({
    title: doc.title,
    subject: `Public Form 990 inspection copy for tax year ${doc.taxYear}`,
    author: ORGANIZATION_NAME,
    creator: `${ORGANIZATION_NAME} Financial Information Hub`,
  });

  doc.pages.forEach((page, index) => {
    if (index > 0) pdf.addPage("letter", "portrait");

    pdf.setFillColor(8, 31, 58);
    pdf.rect(0, 0, 612, 58, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(255, 255, 255);
    pdf.text(ORGANIZATION_NAME.toUpperCase(), 52, 34);
    pdf.setFont("helvetica", "normal");
    pdf.text("PUBLIC FORM 990", 560, 34, { align: "right" });

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.setTextColor(15, 39, 72);
    pdf.text(asciiPdfText(doc.title), 52, 100);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10.5);
    pdf.setTextColor(71, 85, 105);
    pdf.text(
      `Tax Year ${doc.taxYear} | Filing Year ${doc.filingYear} | Version ${doc.version}`,
      52,
      122,
    );

    pdf.setDrawColor(203, 213, 225);
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(52, 150, 508, 430, 5, 5, "FD");
    pdf.setFont("courier", "normal");
    pdf.setFontSize(11);
    pdf.setTextColor(31, 41, 55);
    const content = pdf.splitTextToSize(asciiPdfText(page), 452);
    pdf.text(content, 80, 192, { lineHeightFactor: 1.55 });

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.setTextColor(222, 226, 232);
    pdf.text(asciiPdfText(publicForm990Provenance(doc)), 306, 510, {
      align: "center",
      angle: -16,
    });

    pdf.setDrawColor(203, 213, 225);
    pdf.line(52, 716, 560, 716);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(71, 85, 105);
    const footer = pdf.splitTextToSize(asciiPdfText(publicForm990Footer(doc)), 430);
    pdf.text(footer, 52, 736, { lineHeightFactor: 1.2 });
    pdf.setFont("helvetica", "bold");
    pdf.text(`Page ${index + 1} of ${doc.pages.length}`, 560, 736, { align: "right" });
  });

  return Buffer.from(new Uint8Array(pdf.output("arraybuffer")));
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) =>
    char === "&"
      ? "&amp;"
      : char === "<"
        ? "&lt;"
        : char === ">"
          ? "&gt;"
          : char === '"'
            ? "&quot;"
            : "&#39;",
  );
}

function asciiPdfText(value: string) {
  return value
    .replace(/[—–]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E]/g, " ");
}
