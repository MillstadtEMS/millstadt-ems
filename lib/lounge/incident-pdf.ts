/**
 * Build a printable PDF of an incident report. Each photo is downloaded
 * from its Blob URL and embedded full-width on its own page.
 */

import { jsPDF } from "jspdf";

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

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

export async function buildIncidentPdf(input: IncidentPdfInput): Promise<Buffer> {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  let y = 48;

  // ── Header ──────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(220, 38, 38);
  doc.text("MILLSTADT EMS · INCIDENT REPORT", 48, y);
  y += 6;
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(1.5);
  doc.line(48, y, W - 48, y);
  y += 14;

  doc.setFontSize(20);
  doc.setTextColor(20, 30, 60);
  const title = `${input.unitInvolved ? `Unit ${input.unitInvolved} — ` : ""}${input.city ?? "Incident"}`;
  doc.text(title, 48, y); y += 24;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  const meta = [
    ["Report ID", input.id],
    ["Submitted by", input.createdBy.name],
    ["Submitted at", fmt(input.submittedAt)],
    ["Incident date", input.incidentDate ?? "—"],
    ["Incident time", input.incidentTime ?? "—"],
    ["City", input.city ?? "—"],
    ["Specific location", input.specificLocation ?? "—"],
    ["Unit involved", input.unitInvolved ?? "—"],
  ];
  for (const [k, v] of meta) {
    doc.setFont("helvetica", "bold");
    doc.text(`${k}:`, 48, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(v, W - 200);
    doc.text(lines, 160, y);
    y += 12 * lines.length;
  }
  y += 6;

  // ── Involved employees ──────────────────────────────────────────────
  if (input.involvedEmployees.length > 0) {
    if (y > H - 120) { doc.addPage(); y = 48; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 30, 60);
    doc.text("Employees involved", 48, y); y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(40);
    for (const e of input.involvedEmployees) {
      doc.text(`• ${e.name}`, 56, y);
      y += 13;
    }
    y += 6;
  }

  // ── Narrative blocks ────────────────────────────────────────────────
  y = block(doc, "Summary", input.summary || "—", 48, y, W);
  if (input.patientInvolved) y = block(doc, "Patient involved", input.patientInvolved, 48, y, W);
  if (input.witnesses)        y = block(doc, "Witnesses", input.witnesses, 48, y, W);
  if (input.actionsTaken)     y = block(doc, "Actions taken at scene / immediately after", input.actionsTaken, 48, y, W);

  // ── Photos: each gets its own page, full width ──────────────────────
  for (const photo of input.photos) {
    try {
      const bytes = await fetchAsArrayBuffer(photo.url);
      const format = detectFormat(photo.url);
      const dims = await imageDims(bytes, format);

      doc.addPage();
      const padding = 36;
      const captionH = 30;
      const maxW = W - padding * 2;
      const maxH = H - padding * 2 - captionH - 18;
      const scale = Math.min(maxW / dims.width, maxH / dims.height);
      const w = dims.width * scale;
      const h = dims.height * scale;
      const x = (W - w) / 2;
      const py = padding;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(20, 30, 60);
      doc.text(photo.name || "Photo", padding, py - 8);

      try {
        const dataUri = bufferToDataUri(bytes, format);
        doc.addImage(dataUri, format.toUpperCase(), x, py, w, h, undefined, "FAST");
      } catch {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(120);
        doc.text("(unable to render photo — view it at the URL below)", padding, py + 20);
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(photo.url, padding, H - padding - 10);
    } catch (e) {
      console.error("[incident-pdf] photo embed failed:", e);
    }
  }

  const out = doc.output("arraybuffer");
  return Buffer.from(out);
}

function block(doc: jsPDF, label: string, value: string, x: number, yIn: number, W: number): number {
  let y = yIn;
  if (y > 700) { doc.addPage(); y = 48; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 30, 60);
  doc.text(label, x, y); y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40);
  const lines = doc.splitTextToSize(value, W - 96);
  doc.text(lines, x, y);
  y += 12 * lines.length + 10;
  return y;
}

async function fetchAsArrayBuffer(url: string): Promise<Uint8Array> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
}

function detectFormat(url: string): "jpeg" | "png" {
  const u = url.toLowerCase();
  if (u.includes(".png")) return "png";
  return "jpeg";
}

function bufferToDataUri(bytes: Uint8Array, format: "jpeg" | "png"): string {
  const b64 = Buffer.from(bytes).toString("base64");
  return `data:image/${format};base64,${b64}`;
}

async function imageDims(bytes: Uint8Array, format: "jpeg" | "png"): Promise<{ width: number; height: number }> {
  // PNG: 16-byte signature, then IHDR (4 byte length, "IHDR", width, height)
  if (format === "png") {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: dv.getUint32(16), height: dv.getUint32(20) };
  }
  // JPEG: scan for SOF (0xFFC0..0xFFCF, excluding 0xC4, 0xC8, 0xCC)
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
  return { width: 1600, height: 1200 }; // fallback
}
