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
const CONTENT_BOTTOM = PAGE_H - M - 28;

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
  if (c.y + needed > CONTENT_BOTTOM) {
    c.doc.addPage();
    c.y = M;
  }
}

export interface WrappedTextOpts {
  x?: number;
  width?: number;
  lineHeight?: number;
  topOffset?: number;
  bottomGap?: number;
}

/** Draw arbitrarily long text without allowing a single prose block to clip. */
export function drawWrappedText(c: Cursor, text: string, opts: WrappedTextOpts = {}): void {
  const doc = c.doc;
  const x = opts.x ?? M;
  const width = opts.width ?? CONTENT_W;
  const lineHeight = opts.lineHeight ?? 14;
  const topOffset = opts.topOffset ?? 9;
  const bottomGap = opts.bottomGap ?? 8;
  const split = doc.splitTextToSize(text, width);
  const lines = (Array.isArray(split) ? split : [split]).map(String);
  let index = 0;

  while (index < lines.length) {
    if (c.y + topOffset > CONTENT_BOTTOM) {
      doc.addPage();
      c.y = M;
    }
    const available = CONTENT_BOTTOM - (c.y + topOffset);
    const count = Math.max(1, Math.floor(available / lineHeight) + 1);
    const chunk = lines.slice(index, index + count);
    doc.text(chunk, x, c.y + topOffset);
    c.y += chunk.length * lineHeight + bottomGap;
    index += chunk.length;
    if (index < lines.length) {
      doc.addPage();
      c.y = M;
    }
  }
}

/** Add a raster image centered inside a box while preserving its aspect ratio. */
export function drawContainedImage(
  doc: jsPDF,
  dataUri: string,
  format: "JPEG" | "PNG",
  x: number,
  y: number,
  maxW: number,
  maxH: number,
): boolean {
  try {
    const props = doc.getImageProperties(dataUri);
    const width = Number(props.width);
    const height = Number(props.height);
    if (!(width > 0) || !(height > 0)) return false;
    const scale = Math.min(maxW / width, maxH / height);
    const drawW = width * scale;
    const drawH = height * scale;
    doc.addImage(
      dataUri,
      format,
      x + (maxW - drawW) / 2,
      y + (maxH - drawH) / 2,
      drawW,
      drawH,
      undefined,
      "FAST",
    );
    return true;
  } catch {
    return false;
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
  ensureSpace(c, 80);
  // Title baseline at +22 (matches 22pt font), per-line stride 28pt so
  // multi-line titles don't crash into each other.
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...COLORS.navy);
  const titleLines = doc.splitTextToSize(opts.title, CONTENT_W);
  doc.text(titleLines, M, c.y + 22);
  c.y += 22 + (titleLines.length - 1) * 28;

  if (opts.subtitle) {
    // 14pt gap clears the title's descenders (lowercase "g", "y") so
    // the subtitle never rides on top of them.
    c.y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.inkMuted);
    const subLines = doc.splitTextToSize(opts.subtitle, CONTENT_W);
    doc.text(subLines, M, c.y);
    c.y += (subLines.length - 1) * 14;
  }
  c.y += 18;
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

  const heights = rows.map((r) => {
    const lines = doc.splitTextToSize(r.value, valueWidth);
    return Math.max(padY * 2 + 12, padY * 2 + lines.length * 12.5);
  });
  ensureSpace(c, Math.min(heights[0] + 8, 120));

  // Top rule.
  doc.setDrawColor(...COLORS.rule);
  doc.setLineWidth(0.5);
  doc.line(M, c.y, M + CONTENT_W, c.y);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const h = heights[i];
    if (c.y + h > CONTENT_BOTTOM) {
      c.doc.addPage();
      c.y = M;
      doc.setDrawColor(...COLORS.rule);
      doc.line(M, c.y, M + CONTENT_W, c.y);
    }
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
export function drawSectionHeading(c: Cursor, label: string, minimumFollowing = 28): void {
  const doc = c.doc;
  ensureSpace(c, 30 + minimumFollowing);
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
  const split = doc.splitTextToSize(text, innerWidth);
  const lines = (Array.isArray(split) ? split : [split]).map(String);
  let index = 0;
  while (index < lines.length) {
    if (c.y + padY * 2 + 14 > CONTENT_BOTTOM) {
      doc.addPage();
      c.y = M;
    }
    const available = CONTENT_BOTTOM - c.y - padY * 2 - 9;
    const count = Math.max(1, Math.floor(available / 14));
    const chunk = lines.slice(index, index + count);
    const blockH = chunk.length * 14 + padY * 2;

    doc.setFillColor(...COLORS.panelBg);
    doc.roundedRect(M, c.y, CONTENT_W, blockH, 8, 8, "F");
    doc.setFillColor(...COLORS.gold);
    doc.rect(M, c.y, 3, blockH, "F");
    doc.setTextColor(...COLORS.ink);
    doc.text(chunk, M + padX, c.y + padY + 9);
    c.y += blockH + 10;
    index += chunk.length;
    if (index < lines.length) {
      doc.addPage();
      c.y = M;
    }
  }
}

// ── Plain body text block ──────────────────────────────────────────────
export function drawBodyText(c: Cursor, text: string): void {
  const doc = c.doc;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.ink);
  drawWrappedText(c, text);
}

// ── Bulleted list ──────────────────────────────────────────────────────
export function drawBulletList(c: Cursor, items: string[]): void {
  const doc = c.doc;
  if (items.length === 0) return;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.ink);
  for (const item of items) {
    const split = doc.splitTextToSize(item, CONTENT_W - 16);
    const lines = (Array.isArray(split) ? split : [split]).map(String);
    ensureSpace(c, Math.min(lines.length * 14 + 2, 44));
    doc.text("•", M, c.y + 9);
    drawWrappedText(c, lines.join("\n"), {
      x: M + 12,
      width: CONTENT_W - 16,
      lineHeight: 14,
      topOffset: 9,
      bottomGap: 2,
    });
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
  if (!drawContainedImage(doc, img.dataUri, img.format, drawX, drawY, drawW, drawH)) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.inkSoft);
    doc.text("Unable to render this attachment in the PDF.", M, drawY + 12);
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
