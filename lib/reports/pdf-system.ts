/**
 * Reusable PDF building blocks for every Millstadt EMS report.
 *
 * Built on jsPDF (already a dependency). Layout rules every generator
 * follows:
 *
 *   - 612x792 pt Letter, single-column.
 *   - 54 pt margins (0.75"), so the content column is 504 pt wide.
 *   - Times serif for headings; Helvetica sans for body + metadata.
 *   - Navy = brand titles; Gold = accents; Red = critical flags; muted
 *     grey for labels.
 *   - Every section auto-wraps long text with `splitTextToSize` and
 *     auto-page-breaks BEFORE rendering so labels never end up at the
 *     bottom of a page with their body bumped to the next.
 *   - The page footer + page numbers are stamped at the very end so the
 *     totals (`N of N`) are accurate.
 */

import { jsPDF } from "jspdf";
import fs from "node:fs/promises";
import path from "node:path";

// ── Layout constants ───────────────────────────────────────────────────
export const PAGE_W = 612;
export const PAGE_H = 792;
export const M = 54;
export const CONTENT_W = PAGE_W - M * 2;

export const COLORS = {
  navy: [12, 35, 64] as [number, number, number],
  gold: [240, 180, 41] as [number, number, number],
  red:  [196, 32, 42] as [number, number, number],
  ink:  [26, 35, 48] as [number, number, number],
  inkMuted: [91, 102, 117] as [number, number, number],
  inkSoft:  [126, 135, 148] as [number, number, number],
  rule: [221, 226, 233] as [number, number, number],
  panelBg: [245, 248, 251] as [number, number, number],
  goldStripeBg: [253, 247, 224] as [number, number, number],
};

// ── Logo cache ─────────────────────────────────────────────────────────
let LOGO_CACHE: { dataUri: string; w: number; h: number } | null = null;

/**
 * Load the EMS crest from /public so we can embed it on every report.
 * Cached after the first call.
 */
export async function loadLogo(): Promise<{ dataUri: string; w: number; h: number } | null> {
  if (LOGO_CACHE) return LOGO_CACHE;
  try {
    const filePath = path.join(process.cwd(), "public", "images", "millstadt-ems", "logo.png");
    const buf = await fs.readFile(filePath);
    const dims = pngDims(buf);
    LOGO_CACHE = {
      dataUri: `data:image/png;base64,${buf.toString("base64")}`,
      w: dims.width,
      h: dims.height,
    };
    return LOGO_CACHE;
  } catch (err) {
    console.error("[pdf-system] failed to load logo:", err);
    return null;
  }
}

function pngDims(buf: Buffer): { width: number; height: number } {
  // PNG IHDR is at byte 16/20.
  if (buf.length < 24) return { width: 0, height: 0 };
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

// ── Cursor / page management ───────────────────────────────────────────
export interface Cursor {
  doc: jsPDF;
  y: number;
}

export function newDoc(): jsPDF {
  return new jsPDF({ unit: "pt", format: "letter" });
}

/**
 * Ensure there's at least `needed` vertical room left before the bottom
 * margin. If not, push a fresh page and reset the cursor.
 */
export function ensureSpace(c: Cursor, needed: number): void {
  if (c.y + needed > PAGE_H - M - 28) {  // 28 pt reserved for footer
    c.doc.addPage();
    c.y = M;
  }
}

// ── Header band ─────────────────────────────────────────────────────────
export interface ReportHeaderOpts {
  /** "Incident Report", "Memorandum", "Truck Check Report", etc. */
  reportType: string;
  /** Optional second eyebrow line (e.g. "Submitted via lounge"). */
  reportSubtitle?: string;
  /** Report ID for the corner stamp. */
  reportId?: string;
  /** ISO timestamp of report submission for the corner stamp. */
  submittedAt?: string;
}

export async function drawOfficialHeader(c: Cursor, opts: ReportHeaderOpts): Promise<void> {
  const doc = c.doc;
  const logo = await loadLogo();

  // Navy band, 64pt tall, full-bleed (drawn out to the page edge).
  doc.setFillColor(...COLORS.navy);
  doc.rect(0, 0, PAGE_W, 64, "F");

  // Gold accent stripe directly below the navy band.
  doc.setFillColor(...COLORS.gold);
  doc.rect(0, 64, PAGE_W, 3, "F");

  // Logo on the left.
  if (logo) {
    const targetH = 40;
    const scale = targetH / logo.h;
    const targetW = logo.w * scale;
    try {
      doc.addImage(logo.dataUri, "PNG", M, 12, targetW, targetH, undefined, "FAST");
    } catch {
      // Silently fall through. Wordmark below still identifies the agency.
    }
  }

  // Agency wordmark.
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("MILLSTADT EMS", M + 56, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.gold);
  doc.text("OFFICIAL AGENCY REPORT", M + 56, 44);

  // Right side: stacked report-type label + small id stamp.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(255, 255, 255);
  const typeText = opts.reportType.toUpperCase();
  const typeWidth = doc.getTextWidth(typeText);
  doc.text(typeText, PAGE_W - M - typeWidth, 30);
  if (opts.reportSubtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.gold);
    const sub = opts.reportSubtitle.toUpperCase();
    const subWidth = doc.getTextWidth(sub);
    doc.text(sub, PAGE_W - M - subWidth, 44);
  }

  // Reset cursor below the band.
  c.y = 64 + 24;  // band + gold stripe + a small breath
}

// ── Title block ────────────────────────────────────────────────────────
export interface TitleBlockOpts {
  /** Big serif title. */
  title: string;
  /** Optional second line — usually "Submitted by … on …". */
  subtitle?: string;
}

export function drawTitleBlock(c: Cursor, opts: TitleBlockOpts): void {
  const doc = c.doc;
  ensureSpace(c, 60);
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...COLORS.navy);
  const titleLines = doc.splitTextToSize(opts.title, CONTENT_W);
  doc.text(titleLines, M, c.y + 18);
  c.y += 18 + (titleLines.length - 1) * 22;

  if (opts.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.inkMuted);
    c.y += 8;
    doc.text(opts.subtitle, M, c.y);
  }
  c.y += 16;
}

// ── Metadata grid ──────────────────────────────────────────────────────
export interface MetaRow {
  label: string;
  value: string;
}

export function drawMetadataGrid(c: Cursor, rows: MetaRow[]): void {
  const doc = c.doc;
  if (rows.length === 0) return;

  const padY = 9;
  const labelX = M;
  const valueX = M + 142;
  const valueWidth = CONTENT_W - 142;

  // Pre-measure each row so we can ensureSpace for the WHOLE grid run.
  const heights = rows.map((r) => {
    const lines = doc.splitTextToSize(r.value, valueWidth);
    return Math.max(padY * 2 + 12, padY * 2 + lines.length * 12.5);
  });
  const totalH = heights.reduce((a, b) => a + b, 0) + 8;
  ensureSpace(c, totalH);

  // Top rule.
  doc.setDrawColor(...COLORS.rule);
  doc.setLineWidth(0.5);
  doc.line(M, c.y, M + CONTENT_W, c.y);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const h = heights[i];
    const rowY = c.y + padY;

    // Label.
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.inkSoft);
    doc.text(row.label.toUpperCase(), labelX, rowY + 4);

    // Value (auto-wrap).
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...COLORS.ink);
    const lines = doc.splitTextToSize(row.value, valueWidth);
    doc.text(lines, valueX, rowY + 4);

    c.y += h;
    doc.setDrawColor(...COLORS.rule);
    doc.line(M, c.y, M + CONTENT_W, c.y);
  }
  c.y += 8;
}

// ── Section heading ────────────────────────────────────────────────────
export function drawSectionHeading(c: Cursor, label: string): void {
  const doc = c.doc;
  ensureSpace(c, 30);
  c.y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.navy);
  doc.text(label.toUpperCase(), M, c.y);
  c.y += 6;
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(1.5);
  doc.line(M, c.y, M + 40, c.y);
  c.y += 14;
}

// ── Callout block (summary card) ───────────────────────────────────────
export function drawCallout(c: Cursor, text: string): void {
  const doc = c.doc;
  const padX = 14;
  const padY = 12;
  const innerWidth = CONTENT_W - padX * 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(text, innerWidth);
  const bodyH = lines.length * 14;
  const blockH = bodyH + padY * 2;

  ensureSpace(c, blockH + 8);

  // Soft panel background with gold left edge.
  doc.setFillColor(...COLORS.panelBg);
  doc.roundedRect(M, c.y, CONTENT_W, blockH, 8, 8, "F");
  doc.setFillColor(...COLORS.gold);
  doc.rect(M, c.y, 3, blockH, "F");

  doc.setTextColor(...COLORS.ink);
  doc.text(lines, M + padX, c.y + padY + 9);
  c.y += blockH + 10;
}

// ── Plain body text block ──────────────────────────────────────────────
export function drawBodyText(c: Cursor, text: string): void {
  const doc = c.doc;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.ink);
  const lines = doc.splitTextToSize(text, CONTENT_W);
  ensureSpace(c, lines.length * 14 + 4);
  doc.text(lines, M, c.y + 9);
  c.y += lines.length * 14 + 8;
}

// ── Bulleted list ──────────────────────────────────────────────────────
export function drawBulletList(c: Cursor, items: string[]): void {
  const doc = c.doc;
  if (items.length === 0) return;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.ink);
  for (const item of items) {
    const lines = doc.splitTextToSize(item, CONTENT_W - 16);
    ensureSpace(c, lines.length * 14 + 2);
    doc.text("•", M, c.y + 9);
    doc.text(lines, M + 12, c.y + 9);
    c.y += lines.length * 14 + 2;
  }
  c.y += 4;
}

// ── Attachment summary card ────────────────────────────────────────────
export interface AttachmentSummary {
  index: number;
  name: string;
  meta?: string;
}

export function drawAttachmentSummary(c: Cursor, items: AttachmentSummary[]): void {
  if (items.length === 0) return;
  const doc = c.doc;
  ensureSpace(c, 30 + items.length * 24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  for (const it of items) {
    ensureSpace(c, 26);
    doc.setTextColor(...COLORS.inkSoft);
    doc.text(String(it.index).padStart(2, "0"), M, c.y + 9);
    doc.setTextColor(...COLORS.ink);
    const nameLines = doc.splitTextToSize(it.name, CONTENT_W - 36);
    doc.text(nameLines, M + 28, c.y + 9);
    let lineH = nameLines.length * 13;
    if (it.meta) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...COLORS.inkSoft);
      const metaLines = doc.splitTextToSize(it.meta, CONTENT_W - 36);
      doc.text(metaLines, M + 28, c.y + 9 + lineH + 2);
      lineH += metaLines.length * 12 + 4;
      doc.setFontSize(10.5);
    }
    c.y += Math.max(20, lineH + 4);
    doc.setDrawColor(...COLORS.rule);
    doc.line(M, c.y, M + CONTENT_W, c.y);
    c.y += 6;
  }
  c.y += 4;
}

// ── Attachment image page ──────────────────────────────────────────────
export interface AttachmentImage {
  index: number;
  total: number;
  name: string;
  caption?: string;
  dataUri: string;
  format: "JPEG" | "PNG";
  pxW: number;
  pxH: number;
}

export function drawImagePage(c: Cursor, img: AttachmentImage): void {
  const doc = c.doc;
  doc.addPage();

  // Top eyebrow.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.inkSoft);
  doc.text(`ATTACHMENT ${img.index} OF ${img.total}`, M, M);

  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.navy);
  const nameLines = doc.splitTextToSize(img.name, CONTENT_W);
  doc.text(nameLines, M, M + 18);
  let cursorY = M + 18 + (nameLines.length - 1) * 16 + 10;

  if (img.caption) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.inkMuted);
    const captionLines = doc.splitTextToSize(img.caption, CONTENT_W);
    doc.text(captionLines, M, cursorY);
    cursorY += captionLines.length * 12 + 6;
  }

  const maxW = CONTENT_W;
  const reservedFooter = 40;
  const maxH = PAGE_H - cursorY - reservedFooter - 12;
  const scale = Math.min(maxW / img.pxW, maxH / img.pxH);
  const drawW = img.pxW * scale;
  const drawH = img.pxH * scale;
  const drawX = M + (maxW - drawW) / 2;
  const drawY = cursorY;
  try {
    doc.addImage(img.dataUri, img.format, drawX, drawY, drawW, drawH, undefined, "FAST");
  } catch (err) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.inkSoft);
    doc.text("Unable to render this attachment in the PDF.", M, drawY + 12);
    void err;
  }

  c.y = drawY + drawH + 12;
}

// ── Footer (page number + report id) ───────────────────────────────────
export function stampFooter(doc: jsPDF, opts: { reportId?: string; generatedAt: string }): void {
  const pageCount = doc.getNumberOfPages();
  const generated = `Generated ${opts.generatedAt}`;
  const idLabel = opts.reportId ? `Report ID ${opts.reportId}` : "";
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...COLORS.rule);
    doc.setLineWidth(0.5);
    doc.line(M, PAGE_H - 36, PAGE_W - M, PAGE_H - 36);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.inkSoft);
    doc.text(generated, M, PAGE_H - 22);

    if (idLabel) {
      const w = doc.getTextWidth(idLabel);
      doc.text(idLabel, (PAGE_W - w) / 2, PAGE_H - 22);
    }

    const pageStr = `Page ${i} of ${pageCount}`;
    const pageW = doc.getTextWidth(pageStr);
    doc.text(pageStr, PAGE_W - M - pageW, PAGE_H - 22);
  }
}
