/**
 * Onboarding checklist PDF generator.
 *
 * Renders the same official header / footer band the rest of the
 * Millstadt EMS paperwork uses (drawOfficialHeader, stampFooter, etc.)
 * so an onboarding PDF sitting in a personnel file looks visually
 * consistent with write-ups, evaluations, and forms.
 *
 * Layout:
 *   - Identity block (employee, position, start date, employment type,
 *     credential level, unit, preceptor, witness)
 *   - Each active section as a "Section X" heading with a checklist
 *     table — status icon, label, completion stamp / notes / expiry
 *   - Final outcome block with notes
 *   - Three signature panels with acknowledgment text
 *   - Footer line and audit reference
 */
import {
  CONTENT_W,
  COLORS,
  M,
  PAGE_H,
  PAGE_W,
  drawMetadataGrid,
  drawOfficialHeader,
  drawSectionHeading,
  drawTitleBlock,
  ensureSpace,
  newDoc,
  stampFooter,
  type Cursor,
} from "@/lib/reports/pdf-system";
import {
  CREDENTIAL_LEVEL_LABELS,
  EMPLOYEE_ACKNOWLEDGMENT,
  EMPLOYMENT_TYPE_LABELS,
  FINAL_OUTCOME_LABELS,
  PRECEPTOR_ATTESTATION,
  WITNESS_ATTESTATION,
  type ItemRow,
  type ItemStatus,
  type OnboardingRecord,
  type ProgressRow,
  type SectionRow,
  type SignatureRow,
  type SignerWho,
} from "./types";

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
    timeZone: "America/Chicago", dateStyle: "long", timeStyle: "short",
  }) + " CT";
}

function statusGlyph(s: ItemStatus): string {
  switch (s) {
    case "completed":               return "[X]";
    case "completed_with_followup": return "[!]";
    case "pending":                 return "[ ]";
    case "not_applicable":          return "N/A";
    case "not_met":                 return "[X]";
  }
}
function statusColor(s: ItemStatus): [number, number, number] {
  switch (s) {
    case "completed":               return [16, 122, 86];   // green
    case "completed_with_followup": return [180, 130, 30];  // amber
    case "pending":                 return [110, 120, 140]; // slate
    case "not_applicable":          return [110, 120, 140]; // slate
    case "not_met":                 return [180, 50, 50];   // red
  }
}

function drawAck(c: Cursor, text: string) {
  const doc = c.doc;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9.5);
  doc.setTextColor(...COLORS.inkSoft);
  const lines = doc.splitTextToSize(text, CONTENT_W);
  ensureSpace(c, lines.length * 12 + 8);
  doc.text(lines, M, c.y + 8);
  c.y += lines.length * 12 + 10;
}

function drawChecklistRow(c: Cursor, item: ItemRow, prog: ProgressRow | undefined) {
  const doc = c.doc;
  const rowH = 16;
  ensureSpace(c, rowH + 14);
  const status = (prog?.status ?? "pending") as ItemStatus;
  const [r, g, b] = statusColor(status);

  // Status pill
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(r, g, b);
  doc.text(statusGlyph(status), M, c.y + 11);

  // Label
  doc.setFont("helvetica", item.required ? "bold" : "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.ink);
  const labelText = item.label + (item.required ? "  *" : "");
  const labelLines = doc.splitTextToSize(labelText, CONTENT_W - 34);
  doc.text(labelLines, M + 28, c.y + 11);
  let lineH = Math.max(rowH, labelLines.length * 12 + 4);

  // Detail line under the label: completion stamp, notes, file, expiry
  const detail: string[] = [];
  if (prog?.completedByName && (status === "completed" || status === "completed_with_followup")) {
    detail.push(`${prog.completedByName} · ${fmtDateTime(prog.completedAt)}`);
  }
  if (prog?.notes && prog.notes.trim()) {
    detail.push(`Notes: ${prog.notes.trim()}`);
  }
  if (item.hasUpload && prog?.fileName) {
    detail.push(`File: ${prog.fileName}`);
  }
  if (item.hasExpiration && prog?.expirationDate) {
    detail.push(`Expires: ${fmtDate(prog.expirationDate)}`);
  }
  if (detail.length) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.inkSoft);
    const detailLines = doc.splitTextToSize(detail.join("  ·  "), CONTENT_W - 34);
    doc.text(detailLines, M + 28, c.y + lineH);
    lineH += detailLines.length * 10 + 2;
  }

  c.y += lineH + 4;
}

function drawSignaturePanel(c: Cursor, label: string, ack: string, sig: SignatureRow | undefined) {
  drawAck(c, ack);
  const doc = c.doc;
  const blockH = 96;
  ensureSpace(c, blockH + 8);

  doc.setDrawColor(...COLORS.rule);
  doc.setLineWidth(0.4);
  doc.roundedRect(M, c.y, CONTENT_W, blockH, 4, 4, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.gold);
  doc.text(label.toUpperCase(), M + 10, c.y + 14);

  if (sig) {
    try {
      doc.addImage(sig.signatureDataUrl, "PNG", M + 10, c.y + 22, 180, 50);
    } catch { /* ignore bad image */ }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.ink);
    doc.text(`Signed: ${sig.printedName}`, M + 200, c.y + 30);
    doc.text(`Date / time: ${fmtDateTime(sig.signedAt)}`, M + 200, c.y + 46);
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.inkSoft);
    doc.text("(No signature on file.)", M + 10, c.y + 50);
  }

  c.y += blockH + 14;
}

export interface BuildOnboardingPdfInput {
  record: OnboardingRecord;
  sections: SectionRow[];
  items: ItemRow[];
  progress: ProgressRow[];
  signatures: SignatureRow[];
}

export async function buildOnboardingPdf(input: BuildOnboardingPdfInput): Promise<Buffer> {
  const { record, sections, items, progress, signatures } = input;
  const doc = newDoc();
  const c: Cursor = { doc, y: M };
  const generatedAt = new Date().toISOString();

  await drawOfficialHeader(c, {
    reportType: "Onboarding Checklist",
    reportSubtitle:
      record.status === "rescinded" ? "RESCINDED"
      : record.status === "finalized" ? "Finalized"
      : "Draft preview",
    reportId: record.id.slice(0, 8),
    submittedAt: record.finalizedAt ?? generatedAt,
  });

  drawTitleBlock(c, {
    title: "Pre-Employment & New Hire Onboarding Checklist",
    subtitle: `${record.employeeName} · Millstadt Ambulance Service`,
  });

  drawSectionHeading(c, "Subject of record");
  const metaRows: { label: string; value: string }[] = [
    { label: "Employee", value: record.employeeName },
    ...(record.position ? [{ label: "Position", value: record.position }] : []),
    ...(record.startDate ? [{ label: "Start date", value: fmtDate(record.startDate) }] : []),
    ...(record.employmentType ? [{ label: "Employment type", value: EMPLOYMENT_TYPE_LABELS[record.employmentType] }] : []),
    ...(record.credentialLevel ? [{ label: "Credential level", value: CREDENTIAL_LEVEL_LABELS[record.credentialLevel] }] : []),
    ...(record.assignedUnit ? [{ label: "Assigned unit / shift", value: record.assignedUnit }] : []),
    ...(record.preceptorName ? [{ label: "Onboarding admin / preceptor", value: record.preceptorName }] : []),
    ...(record.witnessName ? [{ label: "Witness", value: record.witnessName }] : []),
    { label: "Document ID", value: record.id.slice(0, 8) },
    ...(record.finalizedAt ? [{ label: "Finalized", value: fmtDateTime(record.finalizedAt) }] : []),
  ];
  drawMetadataGrid(c, metaRows);

  // Checklist sections
  const progByItem = new Map(progress.map((p) => [p.itemId, p]));
  const itemsBySection = new Map<string, ItemRow[]>();
  for (const it of items) {
    if (!it.active) continue;
    if (!itemsBySection.has(it.sectionId)) itemsBySection.set(it.sectionId, []);
    itemsBySection.get(it.sectionId)!.push(it);
  }

  const orderedSections = [...sections].filter((s) => s.active).sort((a, b) => a.displayOrder - b.displayOrder);
  let sectionNumber = 1;
  for (const sec of orderedSections) {
    const its = (itemsBySection.get(sec.id) ?? []).sort((a, b) => a.displayOrder - b.displayOrder);
    if (its.length === 0) continue;
    drawSectionHeading(c, `Section ${sectionNumber}: ${sec.title}`);
    for (const it of its) {
      drawChecklistRow(c, it, progByItem.get(it.id));
    }
    sectionNumber++;
  }

  // Final outcome
  drawSectionHeading(c, "Final onboarding outcome");
  const outcomeText = record.finalOutcome ? FINAL_OUTCOME_LABELS[record.finalOutcome] : "—";
  drawMetadataGrid(c, [{ label: "Outcome", value: outcomeText }]);
  if (record.finalNotes && record.finalNotes.trim()) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...COLORS.ink);
    const notesLines = doc.splitTextToSize(record.finalNotes.trim(), CONTENT_W);
    ensureSpace(c, notesLines.length * 13 + 6);
    doc.text(notesLines, M, c.y + 9);
    c.y += notesLines.length * 13 + 8;
  }

  // Signatures
  drawSectionHeading(c, "Acknowledgment & signatures");
  const sigBy = new Map<SignerWho, SignatureRow>();
  for (const s of signatures) sigBy.set(s.who, s);

  drawSignaturePanel(c, "Employee acknowledgment & signature", EMPLOYEE_ACKNOWLEDGMENT, sigBy.get("employee"));
  drawSignaturePanel(c, "Admin / Preceptor attestation & signature", PRECEPTOR_ATTESTATION, sigBy.get("preceptor"));
  drawSignaturePanel(c, "Witness attestation & signature", WITNESS_ATTESTATION, sigBy.get("witness"));

  // Footer line
  ensureSpace(c, 26);
  c.y = PAGE_H - M - 14;
  c.doc.setFont("helvetica", "italic");
  c.doc.setFontSize(8.5);
  c.doc.setTextColor(...COLORS.inkSoft);
  const left = record.status === "finalized"
    ? `Finalized ${fmtDateTime(record.finalizedAt)} · Generated ${fmtDateTime(generatedAt)}`
    : record.status === "rescinded"
      ? `Rescinded ${fmtDateTime(record.rescindedAt)} — ${record.rescindedReason ?? ""}`
      : `Draft preview · Generated ${fmtDateTime(generatedAt)}`;
  c.doc.text(left, M, c.y);
  const right = `Doc ID: ${record.id.slice(0, 8)}`;
  const rw = c.doc.getTextWidth(right);
  c.doc.text(right, PAGE_W - M - rw, c.y);

  stampFooter(doc, { reportId: record.id.slice(0, 8), generatedAt });

  return Buffer.from(doc.output("arraybuffer"));
}

export function onboardingFilename(record: OnboardingRecord, refDate: string | null): string {
  const date = (refDate ? new Date(refDate) : new Date()).toISOString().slice(0, 10);
  const name = record.employeeName.replace(/[^A-Za-z0-9_-]+/g, "_");
  return `Onboarding_${name}_${date}.pdf`;
}
