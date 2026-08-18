/**
 * Generic PDF builder for any form in the registry. Walks the form spec
 * to render employee + form metadata, then each section's fields, then
 * the signature blocks. Same navy/gold header band as our other
 * official reports so all paperwork in the agency looks consistent.
 */
import {
  CONTENT_W,
  COLORS,
  M,
  PAGE_H,
  PAGE_W,
  drawMetadataGrid,
  drawOfficialHeader,
  drawContainedImage,
  drawSectionHeading,
  drawTitleBlock,
  drawWrappedText,
  ensureSpace,
  newDoc,
  stampFooter,
  type Cursor,
} from "@/lib/reports/pdf-system";
import type { FormSpec, FormFieldSpec, SignerRole } from "./registry";
import type { FormInstance, FormSignature } from "./db";

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[2]}/${m[3]}/${m[1]}`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleString("en-US", {
    timeZone: "America/Chicago",
    dateStyle: "long",
    timeStyle: "short",
  }) + " CT";
}

function renderFieldValue(field: FormFieldSpec, raw: unknown): string {
  if (raw === null || raw === undefined || raw === "") return "—";
  switch (field.type) {
    case "date":     return fmtDate(String(raw));
    case "datetime": return fmtDateTime(String(raw));
    case "checkbox": return raw ? "Yes" : "No";
    case "number":   return String(raw);
    case "longtext":
    case "text":
    case "select":
    default:         return String(raw);
  }
}

function drawProse(c: Cursor, label: string, value: string) {
  drawSectionHeading(c, label);
  const doc = c.doc;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.ink);
  drawWrappedText(c, value || "—", { bottomGap: 10 });
}

function drawSignatureBlock(c: Cursor, label: string, sig: FormSignature) {
  const doc = c.doc;
  const blockH = 96;
  ensureSpace(c, blockH + 14);
  doc.setDrawColor(...COLORS.rule);
  doc.setLineWidth(0.5);
  doc.roundedRect(M, c.y, CONTENT_W, blockH, 6, 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.inkSoft);
  doc.text(label.toUpperCase(), M + 14, c.y + 16);
  const sigBoxX = M + 14;
  const sigBoxY = c.y + 24;
  const sigBoxW = CONTENT_W * 0.55;
  const sigBoxH = 48;
  if (!drawContainedImage(doc, sig.signatureDataUrl, "PNG", sigBoxX, sigBoxY, sigBoxW, sigBoxH)) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.ink);
    doc.text(sig.printedName || "Signed", sigBoxX, sigBoxY + sigBoxH - 6);
  }
  doc.setDrawColor(...COLORS.rule);
  doc.line(sigBoxX, sigBoxY + sigBoxH + 2, sigBoxX + sigBoxW, sigBoxY + sigBoxH + 2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.inkSoft);
  doc.text("Signature", sigBoxX, sigBoxY + sigBoxH + 14);
  const rcX = M + 14 + sigBoxW + 22;
  const rcW = PAGE_W - M - rcX;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...COLORS.ink);
  doc.text(doc.splitTextToSize(sig.printedName || "—", rcW), rcX, sigBoxY + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.inkSoft);
  doc.text(doc.splitTextToSize(sig.role || "—", rcW), rcX, sigBoxY + 42);
  doc.text(doc.splitTextToSize(fmtDateTime(sig.signedAt), rcW), rcX, sigBoxY + 58);
  c.y += blockH + 12;
}

function drawEmptySignatureBlock(c: Cursor, label: string) {
  // Used for drafts and blank-print PDFs — renders the same outer
  // panel as a filled signature block but with handwritten-style lines
  // for signature / printed name / date / role so admins printing the
  // blank PDF have proper write-on areas.
  const doc = c.doc;
  const blockH = 96;
  ensureSpace(c, blockH + 14);
  doc.setDrawColor(...COLORS.rule);
  doc.setLineWidth(0.5);
  doc.roundedRect(M, c.y, CONTENT_W, blockH, 6, 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.inkSoft);
  doc.text(label.toUpperCase(), M + 14, c.y + 16);

  const sigBoxX = M + 14;
  const sigBoxY = c.y + 24;
  const sigBoxW = CONTENT_W * 0.55;
  const sigBoxH = 48;

  // Signature line
  doc.setDrawColor(...COLORS.rule);
  doc.setLineWidth(0.6);
  doc.line(sigBoxX, sigBoxY + sigBoxH + 2, sigBoxX + sigBoxW, sigBoxY + sigBoxH + 2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.inkSoft);
  doc.text("Signature", sigBoxX, sigBoxY + sigBoxH + 14);

  // Printed name, role, date columns on the right
  const rcX = M + 14 + sigBoxW + 22;
  const colW = CONTENT_W - (sigBoxW + 36 + 14);
  doc.line(rcX, sigBoxY + 14, rcX + colW, sigBoxY + 14);
  doc.text("Printed name", rcX, sigBoxY + 26);
  doc.line(rcX, sigBoxY + 38, rcX + colW, sigBoxY + 38);
  doc.text("Role / title", rcX, sigBoxY + 50);
  doc.line(rcX, sigBoxY + 62, rcX + colW, sigBoxY + 62);
  doc.text("Date", rcX, sigBoxY + 74);

  c.y += blockH + 12;
}

function drawRefusalBlock(c: Cursor, who: SignerRole, label: string) {
  const doc = c.doc;
  const blockH = 64;
  ensureSpace(c, blockH + 14);
  doc.setDrawColor(...COLORS.rule);
  doc.setLineWidth(0.5);
  doc.roundedRect(M, c.y, CONTENT_W, blockH, 6, 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.inkSoft);
  doc.text(label.toUpperCase(), M + 14, c.y + 16);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10.5);
  doc.setTextColor(...COLORS.ink);
  const text = who === "employee"
    ? "Employee declined to sign. This document was reviewed with them at the time of issuance."
    : "Signer declined to sign at the time of issuance.";
  const lines = doc.splitTextToSize(text, CONTENT_W - 28);
  doc.text(lines, M + 14, c.y + 34);
  c.y += blockH + 12;
}

function drawAcknowledgmentNote(c: Cursor, text: string) {
  const doc = c.doc;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9.5);
  doc.setTextColor(...COLORS.inkMuted);
  drawWrappedText(c, text, { lineHeight: 12, topOffset: 8, bottomGap: 10 });
}

function drawRescindedStamp(doc: ReturnType<typeof newDoc>) {
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setTextColor(220, 38, 38);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(64);
    const text = "RESCINDED";
    const tw = doc.getTextWidth(text);
    doc.text(text, (PAGE_W - tw) / 2, PAGE_H / 2, { angle: -22 });
  }
}

function drawDraftStamp(doc: ReturnType<typeof newDoc>) {
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setTextColor(220, 38, 38);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(60);
    const text = "DRAFT";
    const tw = doc.getTextWidth(text);
    doc.text(text, (PAGE_W - tw) / 2, PAGE_H / 2, { angle: -22 });
  }
}

// ── Main entry ──────────────────────────────────────────────────────────

export interface BuildFormPdfInput {
  spec: FormSpec;
  form: FormInstance;
  /** Display values for the employee — pulled at PDF time, not stored in `data`. */
  employee: {
    firstName: string;
    lastName: string;
    fullName: string;
    position: string | null;
    employeeId?: string | null;
  };
}

export async function buildFormPdf({ spec, form, employee }: BuildFormPdfInput): Promise<Buffer> {
  const doc = newDoc();
  const c: Cursor = { doc, y: M };
  const generatedAt = new Date().toISOString();

  await drawOfficialHeader(c, {
    reportType: spec.label,
    reportSubtitle: form.status === "rescinded" ? "RESCINDED" : form.status === "draft" ? "Draft preview" : "Finalized",
    reportId: form.id.slice(0, 8),
    submittedAt: form.finalizedAt ?? generatedAt,
  });

  drawTitleBlock(c, {
    title: spec.pdfTitle,
    subtitle: `${employee.fullName || "Unnamed employee"} · ${spec.label}`,
  });

  // Identity card — always rendered at the top so every PDF in the
  // personnel file is self-identifying.
  drawSectionHeading(c, "Subject of record");
  drawMetadataGrid(c, [
    { label: "Employee", value: employee.fullName || "—" },
    ...(employee.position ? [{ label: "Position", value: employee.position }] : []),
    ...(employee.employeeId ? [{ label: "Employee ID", value: employee.employeeId }] : []),
    { label: "Document ID", value: form.id.slice(0, 8) },
    { label: "Form type", value: spec.label },
    ...(form.finalizedAt ? [{ label: "Finalized", value: fmtDateTime(form.finalizedAt) }] : []),
  ]);

  // Body — walk each section, render its fields. Multi-line text fields
  // get their own heading + paragraph; scalar fields collect into a
  // metadata grid for compactness.
  for (const section of spec.sections) {
    const scalarRows: { label: string; value: string }[] = [];
    const proseFields: { label: string; value: string }[] = [];

    for (const field of section.fields) {
      const raw = (form.data as Record<string, unknown>)[field.key];
      const value = renderFieldValue(field, raw);
      if (field.type === "longtext") {
        if (raw && String(raw).trim()) proseFields.push({ label: field.label, value });
      } else {
        if (value !== "—" || field.required) scalarRows.push({ label: field.label, value });
      }
    }

    if (scalarRows.length === 0 && proseFields.length === 0) continue;
    drawSectionHeading(c, section.title);
    if (section.intro) drawAcknowledgmentNote(c, section.intro);
    if (scalarRows.length) drawMetadataGrid(c, scalarRows);
    for (const p of proseFields) drawProse(c, p.label, p.value);
  }

  // Signatures
  drawSectionHeading(c, "Acknowledgment & signatures");
  for (const sigSpec of spec.signatures) {
    drawAcknowledgmentNote(c, sigSpec.certificationText);
    const signed = form.signatures.find((s) => s.who === sigSpec.who);
    if (signed) {
      drawSignatureBlock(c, sigSpec.label, signed);
    } else if (form.refusedToSign.includes(sigSpec.who)) {
      drawRefusalBlock(c, sigSpec.who, sigSpec.label);
    } else {
      // Draft / blank-print: render an empty signature panel with
      // fillable lines so the page is useful when printed on paper.
      drawEmptySignatureBlock(c, sigSpec.label);
    }
  }

  // Footer line
  ensureSpace(c, 26);
  c.y = PAGE_H - M - 14;
  c.doc.setFont("helvetica", "italic");
  c.doc.setFontSize(8.5);
  c.doc.setTextColor(...COLORS.inkSoft);
  const left = form.status === "finalized"
    ? `Finalized ${fmtDateTime(form.finalizedAt)} · Generated ${fmtDateTime(generatedAt)}`
    : form.status === "rescinded"
      ? `Rescinded ${fmtDateTime(form.rescindedAt)}`
      : `Draft preview · Generated ${fmtDateTime(generatedAt)}`;
  c.doc.text(left, M, c.y);
  const right = `Doc ID: ${form.id.slice(0, 8)}`;
  const rw = c.doc.getTextWidth(right);
  c.doc.text(right, PAGE_W - M - rw, c.y);

  stampFooter(doc, { reportId: form.id.slice(0, 8), generatedAt });

  if (form.status === "draft") drawDraftStamp(doc);
  if (form.status === "rescinded") drawRescindedStamp(doc);

  return Buffer.from(doc.output("arraybuffer"));
}

export function formFilename(spec: FormSpec, employeeLast: string, employeeFirst: string, refDate: string | null): string {
  const day = refDate?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? new Date().toISOString().slice(0, 10);
  const safe = (s: string) => (s || "").replace(/[^\w-]+/g, "");
  return `${spec.filenamePrefix}_${safe(employeeLast)}_${safe(employeeFirst)}_${day}.pdf`;
}
