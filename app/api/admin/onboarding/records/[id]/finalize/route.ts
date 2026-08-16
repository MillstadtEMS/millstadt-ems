/**
 * POST /api/admin/onboarding/records/[id]/finalize
 *   Builds the official onboarding PDF, uploads to Vercel Blob, creates
 *   a "personnel_records" entry + attachment so the document drops into
 *   the employee's filing-cabinet view, and locks the record to
 *   status='finalized'.
 *
 *   Body: { visibleToEmployee?: boolean } — controls whether the
 *   resulting attachment is employee-visible (default false: admin only).
 *
 *   Pre-conditions enforced:
 *     - All three signatures captured
 *     - finalOutcome chosen
 *     - All required items in a terminal status
 *       (completed | completed_with_followup | not_applicable | not_met)
 */
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAdmin } from "@/lib/admin/auth";
import { currentEmployee } from "@/lib/lounge/auth";
import { createAttachment, createRecord as createPersonnelRecord } from "@/lib/lounge/personnel";
import {
  getRecord,
  listProgress,
  listSignatures,
  listTemplate,
  logOnboardingAudit,
  setFinalizedState,
} from "@/lib/lounge/onboarding/db";
import { buildOnboardingPdf, onboardingFilename } from "@/lib/lounge/onboarding/pdf";
import { privateBlobReference, privateLoungeBlobUrl } from "@/lib/lounge/private-blobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const rec = await getRecord(id);
  if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (rec.status === "finalized") return NextResponse.json({ error: "Already finalized." }, { status: 409 });
  if (rec.status === "rescinded") return NextResponse.json({ error: "Cannot finalize a rescinded record." }, { status: 409 });

  const body = await req.json().catch(() => null) as null | Record<string, unknown>;
  const visibleToEmployee = body && typeof body.visibleToEmployee === "boolean" ? body.visibleToEmployee : false;

  const [template, progress, signatures] = await Promise.all([
    listTemplate(),
    listProgress(id),
    listSignatures(id),
  ]);

  // Pre-flight
  if (!rec.finalOutcome) {
    return NextResponse.json({ error: "Final outcome must be set before finalizing." }, { status: 400 });
  }
  const sigWho = new Set(signatures.map((s) => s.who));
  for (const required of ["employee", "preceptor", "witness"] as const) {
    if (!sigWho.has(required)) {
      return NextResponse.json({ error: `Missing ${required} signature.` }, { status: 400 });
    }
  }
  const progressByItem = new Map(progress.map((p) => [p.itemId, p]));
  const stillPending: string[] = [];
  for (const item of template.items) {
    if (!item.active || !item.required) continue;
    const p = progressByItem.get(item.id);
    if (!p || p.status === "pending") stillPending.push(item.label);
  }
  if (stillPending.length) {
    return NextResponse.json({
      error: "Required items still pending. Mark each as completed, completed with follow-up, not applicable, or requirement not met before finalizing.",
      pending: stillPending,
    }, { status: 400 });
  }

  // Build + upload PDF
  const pdf = await buildOnboardingPdf({
    record: rec,
    sections: template.sections,
    items: template.items,
    progress,
    signatures,
  });
  const filename = onboardingFilename(rec, new Date().toISOString());
  const slug = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const blob = await put(
    `lounge/onboarding/${rec.id}/${slug}-${filename}`,
    pdf,
    { access: "private", contentType: "application/pdf" },
  );
  const pdfReference = privateBlobReference(blob.pathname);

  // Bridge to personnel records so the document is browsable from
  // /admin/filing-cabinet/[id] alongside other personnel paperwork.
  const personnel = await createPersonnelRecord({
    employeeId: rec.employeeId,
    category: "attachments",
    recordType: "onboarding_checklist",
    title: "Pre-Employment / New Hire Onboarding Checklist",
    summary: "Completed onboarding checklist with three-signature attestation.",
    severity: "informational",
    status: "active",
    createdBy: me.id,
    supervisorId: rec.preceptorId,
    employeeVisible: visibleToEmployee,
    restrictedVisibility: false,
    acknowledgmentRequired: false,
    adminNotes: `Filed under: Personnel Records (Onboarding)`,
  });
  await createAttachment({
    recordId: personnel.id,
    employeeId: rec.employeeId,
    fileName: filename,
    fileUrl: pdfReference,
    fileMime: "application/pdf",
    fileSize: pdf.length,
    documentCategory: "Onboarding Checklist",
    visibilityLevel: visibleToEmployee ? "employee" : "admin",
    uploadedBy: me.id,
  });

  await setFinalizedState({
    id: rec.id,
    pdfUrl: pdfReference,
    pdfFilename: filename,
    personnelRecordId: personnel.id,
    finalizedById: me.id,
  });

  await logOnboardingAudit({
    recordId: rec.id,
    actorId: me.id,
    actorName: `${me.firstName} ${me.lastName}`.trim(),
    action: "finalized",
    details: visibleToEmployee ? "Employee-visible PDF on file" : "Admin-only PDF on file",
  });

  return NextResponse.json({
    pdfUrl: privateLoungeBlobUrl(pdfReference),
    pdfFilename: filename,
    personnelRecordId: personnel.id,
  });
}
