/**
 * Build the printable PDF for an Incident Report.
 *
 * Layout follows the agency report template defined in /lib/reports:
 *   - Navy + gold official header with the EMS crest.
 *   - Title block: "Incident Report — {Unit}".
 *   - Metadata grid (Report ID, dates, submitter, location).
 *   - Crew involved bullet list.
 *   - Summary in a gold-edged callout.
 *   - Patient / Witnesses / Actions sections with "None reported" fallbacks.
 *   - Attachment manifest at the end of the main report.
 *   - Each image attachment on its own page, scaled proportionally.
 *   - Footer with generated timestamp, report id, "Page N of N".
 */

import {
  newDoc,
  drawOfficialHeader,
  drawTitleBlock,
  drawMetadataGrid,
  drawSectionHeading,
  drawBulletList,
  drawCallout,
  drawBodyText,
  drawAttachmentSummary,
  drawImagePage,
  stampFooter,
  type Cursor,
  type AttachmentImage,
  type AttachmentSummary,
} from "@/lib/reports/pdf-system";
import { fallbackText, normalizePunctuation } from "@/lib/reports/sanitize";

export interface IncidentPdfInput {
  id: string;
  createdBy: { name: string };
  incidentDate: string | null;
  incidentTime: string | null;
  city: string | null;
  specificLocation: string | null;
  unitInvolved: string | null;
  summary: string;
  patientInvolved: string | null;
  witnesses: string | null;
  actionsTaken: string | null;
  involvedEmployees: { id: string; name: string }[];
  photos: { url: string; name?: string | null }[];
  submittedAt: string;
}

const TZ = "America/Chicago";

function formatSubmittedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: TZ,
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function formatGeneratedAt(): string {
  return new Date().toLocaleString("en-US", {
    timeZone: TZ,
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function shortReportId(id: string): string {
  // First chunk of a UUID is plenty for readability without dominating the page.
  const seg = id.split("-")[0];
  return seg ? seg.toUpperCase() : id.toUpperCase();
}

export async function buildIncidentPdf(input: IncidentPdfInput): Promise<Buffer> {
  const doc = newDoc();
  const c: Cursor = { doc, y: 0 };

  const unitLabel = input.unitInvolved ? input.unitInvolved.trim() : "";
  const reportIdLabel = shortReportId(input.id);

  // ── Official header band ──────────────────────────────────────────────
  await drawOfficialHeader(c, {
    reportType: "Incident Report",
    reportSubtitle: `ID ${reportIdLabel}`,
  });

  // ── Title block ───────────────────────────────────────────────────────
  const titleUnit = unitLabel ? `Unit ${unitLabel}` : "Incident";
  const titleLoc = input.city ? ` — ${input.city.trim()}` : "";
  drawTitleBlock(c, {
    title: `${titleUnit}${titleLoc}`,
    subtitle: `Submitted by ${input.createdBy.name} on ${formatSubmittedAt(input.submittedAt)}`,
  });

  // ── Metadata grid ─────────────────────────────────────────────────────
  drawMetadataGrid(c, [
    { label: "Report ID",         value: reportIdLabel },
    { label: "Submitted",         value: formatSubmittedAt(input.submittedAt) },
    { label: "Incident date",     value: fallbackText(input.incidentDate, "notProvided") },
    { label: "Incident time",     value: fallbackText(input.incidentTime, "notProvided") },
    { label: "City",              value: fallbackText(input.city, "notProvided") },
    { label: "Specific location", value: fallbackText(input.specificLocation, "notProvided") },
    { label: "Unit involved",     value: fallbackText(unitLabel, "notProvided") },
    { label: "Submitted by",      value: input.createdBy.name },
  ]);

  // ── Crew involved ─────────────────────────────────────────────────────
  if (input.involvedEmployees.length > 0) {
    drawSectionHeading(c, "Crew involved");
    drawBulletList(c, input.involvedEmployees.map((e) => e.name));
  }

  // ── Summary (callout) ─────────────────────────────────────────────────
  drawSectionHeading(c, "Summary");
  drawCallout(c, normalizePunctuation(input.summary?.trim() || "No summary provided."));

  // ── Patient / Witnesses / Actions ────────────────────────────────────
  drawSectionHeading(c, "Patient involved");
  drawBodyText(c, fallbackText(input.patientInvolved, "noneReported"));

  drawSectionHeading(c, "Witnesses");
  drawBodyText(c, fallbackText(input.witnesses, "noWitnesses"));

  drawSectionHeading(c, "Actions taken");
  drawBodyText(c, fallbackText(input.actionsTaken, "noActions"));

  // ── Resolve attachments (fetch bytes, identify format) ───────────────
  const resolved = await Promise.all(input.photos.map(async (att, idx) => {
    try {
      const bytes = await fetchBytes(att.url);
      const kind = sniffKind(bytes);
      return { idx: idx + 1, name: att.name ?? `Attachment ${idx + 1}`, url: att.url, bytes, kind };
    } catch (err) {
      console.error("[incident-pdf] attachment fetch failed:", err);
      return { idx: idx + 1, name: att.name ?? `Attachment ${idx + 1}`, url: att.url, bytes: null, kind: "unknown" as const };
    }
  }));

  // ── Attachment manifest ───────────────────────────────────────────────
  if (resolved.length > 0) {
    drawSectionHeading(c, "Attachments");
    const summary: AttachmentSummary[] = resolved.map((r) => ({
      index: r.idx,
      name: r.name,
      meta: attachmentMeta(r),
    }));
    drawAttachmentSummary(c, summary);
  } else {
    drawSectionHeading(c, "Attachments");
    drawBodyText(c, fallbackText(null, "noAttachments"));
  }

  // ── Image attachment pages ────────────────────────────────────────────
  const imageAtts = resolved.filter((r) => r.bytes !== null && (r.kind === "jpeg" || r.kind === "png"));
  for (let i = 0; i < imageAtts.length; i++) {
    const r = imageAtts[i];
    const bytes = r.bytes!;
    const format = r.kind === "png" ? "PNG" : "JPEG";
    const dims = r.kind === "png" ? pngDims(bytes) : jpegDims(bytes);
    if (!dims) continue;
    const page: AttachmentImage = {
      index: i + 1,
      total: imageAtts.length,
      name: r.name,
      caption: `Source: ${r.url}`,
      dataUri: `data:image/${r.kind};base64,${Buffer.from(bytes).toString("base64")}`,
      format,
      pxW: dims.width,
      pxH: dims.height,
    };
    drawImagePage(c, page);
  }

  // ── Footer (generated stamp + page number) ────────────────────────────
  stampFooter(doc, {
    reportId: reportIdLabel,
    generatedAt: formatGeneratedAt(),
  });

  return Buffer.from(doc.output("arraybuffer"));
}

// ── Helpers ─────────────────────────────────────────────────────────────

function attachmentMeta(r: { kind: string; bytes: Uint8Array | null; url: string }): string | undefined {
  const kindLabel =
    r.kind === "jpeg" ? "Image (JPEG)" :
    r.kind === "png"  ? "Image (PNG)" :
    r.kind === "pdf"  ? "PDF document" :
    r.kind === "unknown" ? "File" : `File (${r.kind})`;
  const size = r.bytes ? formatBytes(r.bytes.byteLength) : null;
  return [kindLabel, size, r.url].filter(Boolean).join(" · ");
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
}

/** Identify the file type by reading the magic bytes. */
function sniffKind(bytes: Uint8Array): "jpeg" | "png" | "pdf" | "unknown" {
  if (bytes.length < 4) return "unknown";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "pdf";
  return "unknown";
}

function pngDims(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24) return null;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: dv.getUint32(16), height: dv.getUint32(20) };
}

function jpegDims(bytes: Uint8Array): { width: number; height: number } | null {
  let i = 2;
  while (i < bytes.length) {
    if (bytes[i] !== 0xff) { i++; continue; }
    const marker = bytes[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const h = (bytes[i + 5] << 8) | bytes[i + 6];
      const w = (bytes[i + 7] << 8) | bytes[i + 8];
      return { width: w, height: h };
    }
    const segLen = (bytes[i + 2] << 8) | bytes[i + 3];
    i += 2 + segLen;
  }
  return null;
}
