/**
 * PDF generator for employee corrective-action / write-up documents.
 * Uses the shared report system in lib/reports/pdf-system for the
 * navy + gold header band so the form looks like other official EMS
 * paperwork (incident reports, etc.) rather than a one-off design.
 *
 * Conditional sections per spec:
 *  - Witness signature block: completely omitted when no witness signed.
 *  - Prior related discipline: replaced with "No prior related discipline
 *    documented" when blank.
 *  - Employee signature block: replaced with a refusal statement when
 *    the employee declined to sign.
 *  - Employee response block: shows the selected response-status
 *    message when no written response was provided.
 *  - Internal manager notes are intentionally NOT rendered to the
 *    employee-facing PDF (they live in the audit / admin view only).
 */
import {
  CONTENT_W,
  COLORS,
  M,
  PAGE_H,
  PAGE_W,
  drawBodyText,
  drawMetadataGrid,
  drawOfficialHeader,
  drawSectionHeading,
  drawTitleBlock,
  ensureSpace,
  newDoc,
  stampFooter,
  type Cursor,
} from "@/lib/reports/pdf-system";
import type { WriteUp, WriteUpSignature } from "./writeups";

const SIGNATURE_ACK_TEXT =
  "My signature acknowledges that I have received and had the opportunity to review this document. " +
  "My signature does not necessarily indicate agreement with the contents of this document. " +
  "I understand that I may provide a written response.";

const MANAGER_CERT_TEXT =
  "I certify that this document was reviewed with the employee and that the information " +
  "documented above is based on the information available at the time of review.";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[2]}/${m[3]}/${m[1]}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    timeZone: "America/Chicago",
    dateStyle: "long",
    timeStyle: "short",
  }) + " CT";
}

function responseStatusLine(w: WriteUp): string | null {
  switch (w.responseStatus) {
    case "provided": return null; // employeeResponseText is what's rendered
    case "declined":
      return "The employee declined to provide a response at this time.";
    case "submit_later":
      return "The employee requested to submit a written response at a later date.";
    case "refused_to_participate":
      return "The employee refused to participate in the corrective action review.";
    case "unavailable":
      return "The employee was unavailable at the time of documentation.";
    default:
      return null;
  }
}

function drawProse(c: Cursor, heading: string, text: string, opts?: { italic?: boolean; emptyText?: string }) {
  drawSectionHeading(c, heading);
  const t = text?.trim() ? text.trim() : (opts?.emptyText ?? "—");
  const doc = c.doc;
  doc.setFont("helvetica", opts?.italic ? "italic" : "normal");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.ink);
  const lines = doc.splitTextToSize(t, CONTENT_W);
  ensureSpace(c, lines.length * 14 + 4);
  doc.text(lines, M, c.y + 9);
  c.y += lines.length * 14 + 10;
}

function drawSignatureBlock(c: Cursor, label: string, sig: WriteUpSignature) {
  const doc = c.doc;
  const blockH = 96;
  ensureSpace(c, blockH + 14);

  // Frame
  doc.setDrawColor(...COLORS.rule);
  doc.setLineWidth(0.5);
  doc.roundedRect(M, c.y, CONTENT_W, blockH, 6, 6);

  // Role label (top-left)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.inkSoft);
  doc.text(label.toUpperCase(), M + 14, c.y + 16);

  // Signature image (left column, ~310pt wide, 52pt tall)
  const sigBoxX = M + 14;
  const sigBoxY = c.y + 24;
  const sigBoxW = CONTENT_W * 0.55;
  const sigBoxH = 48;
  try {
    doc.addImage(sig.signatureDataUrl, "PNG", sigBoxX, sigBoxY, sigBoxW, sigBoxH, undefined, "FAST");
  } catch {
    // Signature image failed to embed — fall back to typed name in italics so the line still reads as signed.
    doc.setFont("helvetica", "italic");
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.ink);
    doc.text(sig.printedName || "Signed", sigBoxX, sigBoxY + sigBoxH - 6);
  }
  // Baseline rule under the signature.
  doc.setDrawColor(...COLORS.rule);
  doc.line(sigBoxX, sigBoxY + sigBoxH + 2, sigBoxX + sigBoxW, sigBoxY + sigBoxH + 2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.inkSoft);
  doc.text("Signature", sigBoxX, sigBoxY + sigBoxH + 14);

  // Right column — printed name + role + signed-at
  const rcX = M + 14 + sigBoxW + 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...COLORS.ink);
  doc.text(sig.printedName || "—", rcX, sigBoxY + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...COLORS.inkSoft);
  doc.text(sig.role || "—", rcX, sigBoxY + 30);
  doc.text(fmtDateTime(sig.signedAt), rcX, sigBoxY + 46);

  c.y += blockH + 12;
}

function drawRefusalBlock(c: Cursor, managerName: string, signedAt: string | null) {
  const doc = c.doc;
  const blockH = 76;
  ensureSpace(c, blockH + 14);
  doc.setDrawColor(...COLORS.rule);
  doc.setLineWidth(0.5);
  doc.roundedRect(M, c.y, CONTENT_W, blockH, 6, 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.inkSoft);
  doc.text("EMPLOYEE SIGNATURE", M + 14, c.y + 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.ink);
  const text =
    `Employee refused to sign. This document was reviewed with the employee on ` +
    `${fmtDateTime(signedAt)} by ${managerName || "the supervisor named above"}.`;
  const lines = doc.splitTextToSize(text, CONTENT_W - 28);
  doc.text(lines, M + 14, c.y + 36);
  c.y += blockH + 12;
}

function drawAcknowledgmentNote(c: Cursor, text: string) {
  const doc = c.doc;
  const lines = doc.splitTextToSize(text, CONTENT_W);
  ensureSpace(c, lines.length * 12 + 8);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9.5);
  doc.setTextColor(...COLORS.inkMuted);
  doc.text(lines, M, c.y + 8);
  c.y += lines.length * 12 + 12;
}

function drawDocumentFooter(c: Cursor, w: WriteUp, generatedAt: string) {
  // Reserve room before the page footer is stamped on every page.
  ensureSpace(c, 26);
  c.y = PAGE_H - M - 14;
  c.doc.setFont("helvetica", "italic");
  c.doc.setFontSize(8.5);
  c.doc.setTextColor(...COLORS.inkSoft);
  const left = w.status === "finalized"
    ? `Finalized ${fmtDateTime(w.finalizedAt)} · Generated ${fmtDateTime(generatedAt)}`
    : `Draft preview · Generated ${fmtDateTime(generatedAt)}`;
  c.doc.text(left, M, c.y);
  const right = `Doc ID: ${w.id.slice(0, 8)}`;
  const w2 = c.doc.getTextWidth(right);
  c.doc.text(right, PAGE_W - M - w2, c.y);
}

// ── Main entry ──────────────────────────────────────────────────────────

export interface BuildWriteUpPdfInput {
  writeUp: WriteUp;
  /** If true, watermark the pages with a "DRAFT" stamp. */
  draft?: boolean;
}

export async function buildWriteUpPdf({ writeUp, draft }: BuildWriteUpPdfInput): Promise<Buffer> {
  const doc = newDoc();
  const c: Cursor = { doc, y: M };
  const generatedAt = new Date().toISOString();

  await drawOfficialHeader(c, {
    reportType: "Corrective Action",
    reportSubtitle: draft ? "Draft preview" : "Finalized",
    reportId: writeUp.id.slice(0, 8),
    submittedAt: writeUp.finalizedAt ?? generatedAt,
  });

  drawTitleBlock(c, {
    title: "Employee Corrective Action / Write-Up Form",
    subtitle: `${writeUp.employeeFullName || "Unnamed employee"} · Issued ${fmtDate(writeUp.dateIssued)}`,
  });

  // ── Employee + incident metadata ──────────────────────────────────────
  drawSectionHeading(c, "Employee information");
  drawMetadataGrid(c, [
    { label: "Employee name", value: writeUp.employeeFullName || "—" },
    { label: "Position / title", value: writeUp.employeePosition || "—" },
    { label: "Department / shift / station", value: writeUp.employeeDepartment || "—" },
    { label: "Supervisor issuing", value: writeUp.supervisorName || "—" },
  ]);

  drawSectionHeading(c, "Incident information");
  drawMetadataGrid(c, [
    { label: "Date issued", value: fmtDate(writeUp.dateIssued) },
    { label: "Date / time of incident", value: fmtDateTime(writeUp.incidentDate) },
    { label: "Location of incident", value: writeUp.incidentLocation || "—" },
    { label: "Corrective action type", value: writeUp.correctiveActionType || "—" },
    { label: "Category of issue", value: writeUp.issueCategory || "—" },
  ]);

  // ── Substance ──────────────────────────────────────────────────────────
  drawProse(c, "Factual summary of incident", writeUp.factualDescription, {
    emptyText: "No factual description provided.",
  });
  drawProse(c, "Policy, SOP, or expectation violated", writeUp.policyViolated, {
    emptyText: "No policy reference provided.",
  });
  if (writeUp.evidenceReviewed?.trim()) {
    drawProse(c, "Evidence or sources reviewed", writeUp.evidenceReviewed);
  }
  if (writeUp.priorNoticeOfExpectation?.trim()) {
    drawProse(c, "Prior notice of expectation", writeUp.priorNoticeOfExpectation);
  }
  drawProse(c, "Prior related discipline", writeUp.priorRelatedDiscipline, {
    emptyText: "No prior related discipline documented.",
    italic: !writeUp.priorRelatedDiscipline?.trim(),
  });
  if (writeUp.operationalImpact?.trim()) {
    drawProse(c, "Operational, safety, or workplace impact", writeUp.operationalImpact);
  }
  drawProse(c, "Corrective expectations going forward", writeUp.correctiveExpectations, {
    emptyText: "No corrective expectations provided.",
  });
  if (writeUp.actionPlan?.trim()) {
    drawProse(c, "Action plan / remediation steps", writeUp.actionPlan);
  }
  drawProse(c, "Timeline for improvement", writeUp.improvementTimeline, {
    emptyText: "No timeline provided.",
  });
  drawProse(c, "Consequences if not corrected", writeUp.consequencesStatement, {
    emptyText:
      "Failure to meet these expectations, or further violations of agency policy, may result in additional corrective action, up to and including suspension or termination.",
  });

  // ── Employee response ──────────────────────────────────────────────────
  drawSectionHeading(c, "Employee response / statement");
  drawAcknowledgmentNote(
    c,
    "The following reflects the employee's statement and does not necessarily indicate agreement by management.",
  );
  if (writeUp.responseStatus === "provided" && writeUp.employeeResponseText?.trim()) {
    drawBodyText(c, writeUp.employeeResponseText.trim());
  } else {
    const line = responseStatusLine(writeUp) ?? "No response was recorded.";
    drawBodyText(c, line);
  }

  // ── Acknowledgment block + signatures ─────────────────────────────────
  drawSectionHeading(c, "Acknowledgment & signatures");
  drawAcknowledgmentNote(c, MANAGER_CERT_TEXT);

  if (writeUp.managerSignature) {
    drawSignatureBlock(c, "Manager / Supervisor", writeUp.managerSignature);
  }

  drawAcknowledgmentNote(c, SIGNATURE_ACK_TEXT);
  if (writeUp.employeeSignature) {
    drawSignatureBlock(c, "Employee", writeUp.employeeSignature);
  } else if (writeUp.employeeRefusedToSign) {
    drawRefusalBlock(
      c,
      writeUp.supervisorName ?? "",
      writeUp.managerSignature?.signedAt ?? writeUp.finalizedAt ?? null,
    );
  }

  // Conditional witness block — only when a signature is actually present.
  if (writeUp.witnessSignature) {
    drawSignatureBlock(c, "Witness", writeUp.witnessSignature);
  }

  // ── Footer ─────────────────────────────────────────────────────────────
  drawDocumentFooter(c, writeUp, generatedAt);

  // Page footer stamps (page number etc.) on every page.
  stampFooter(doc, { reportId: writeUp.id.slice(0, 8), generatedAt });

  // Draft watermark
  if (draft) {
    const total = doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      doc.setTextColor(220, 38, 38);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(60);
      const text = "DRAFT";
      const tw = doc.getTextWidth(text);
      const x = (PAGE_W - tw) / 2;
      const y = PAGE_H / 2;
      // jsPDF rotation around the text anchor
      doc.text(text, x, y, { angle: -22 });
    }
  }

  const out = doc.output("arraybuffer");
  return Buffer.from(out);
}

export function writeUpFilename(employeeLastName: string, employeeFirstName: string, dateIssued: string | null): string {
  const today = dateIssued?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? new Date().toISOString().slice(0, 10);
  const safe = (s: string) => (s || "").replace(/[^\w-]+/g, "");
  return `EmployeeWriteUp_${safe(employeeLastName)}_${safe(employeeFirstName)}_${today}.pdf`;
}
