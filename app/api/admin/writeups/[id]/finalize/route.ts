/**
 * POST /api/admin/writeups/[id]/finalize
 *
 * Validates required fields, renders the PDF, uploads it to Vercel Blob,
 * and (if saveToFile is set) creates a personnel record + attachment so
 * the write-up shows up in the employee's file. The write-up row itself
 * transitions to status="finalized" and becomes immutable.
 */
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAdmin } from "@/lib/admin/auth";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import {
  finalizeWriteUp,
  getWriteUp,
  logWriteUpAudit,
  missingRequiredFields,
} from "@/lib/lounge/writeups";
import { buildWriteUpPdf, writeUpFilename } from "@/lib/lounge/writeup-pdf";
import { createRecord, createAttachment } from "@/lib/lounge/personnel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const wu = await getWriteUp(id);
  if (!wu) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (wu.status === "finalized") {
    return NextResponse.json({ error: "Write-up is already finalized." }, { status: 409 });
  }

  const missing = missingRequiredFields(wu);
  if (missing.length > 0) {
    return NextResponse.json({ error: "Missing required fields", missing }, { status: 400 });
  }

  const emp = await getEmployee(wu.employeeId);
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  const last = emp.lastName;
  const first = emp.firstName;
  const filename = writeUpFilename(last, first, wu.dateIssued);

  // Render final (no draft watermark)
  const pdf = await buildWriteUpPdf({ writeUp: wu, draft: false });

  // Store in Vercel Blob. Path is per-employee so it's at least filed by
  // person; visibility is controlled by the personnel record's
  // employee_visible flag when (and only when) we save to file.
  const slug = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const blob = await put(
    `lounge/writeups/${wu.employeeId}/${slug}-${filename}`,
    pdf,
    { access: "public", contentType: "application/pdf" },
  );

  // Optionally create the personnel record + attachment.
  let personnelRecordId: string | null = null;
  if (wu.saveToFile) {
    const record = await createRecord({
      employeeId: wu.employeeId,
      category: "conduct",
      recordType: "corrective_action",
      title: `${wu.correctiveActionType}: ${wu.issueCategory}`.slice(0, 200),
      summary: wu.factualDescription.slice(0, 2000),
      actionTaken: wu.correctiveExpectations.slice(0, 2000),
      severity: severityForActionType(wu.correctiveActionType),
      status: "active",
      incidentDate: wu.incidentDate,
      createdBy: me.id,
      supervisorId: wu.supervisorId,
      witnesses: wu.witnessSignature?.printedName ?? null,
      relatedPolicy: wu.policyViolated.slice(0, 500),
      employeeVisible: true,
      restrictedVisibility: false,
      acknowledgmentRequired: false,
      adminNotes: wu.managerInternalNotes ?? null,
    });
    personnelRecordId = record.id;

    await createAttachment({
      recordId: record.id,
      employeeId: wu.employeeId,
      fileName: filename,
      fileUrl: blob.url,
      fileMime: "application/pdf",
      fileSize: pdf.length,
      documentCategory: "Corrective action",
      visibilityLevel: "employee",
      uploadedBy: me.id,
    });

    await logWriteUpAudit({
      writeupId: id,
      actorId: me.id,
      actorName: `${me.firstName} ${me.lastName}`.trim(),
      action: "saved_to_file",
      details: `personnel record ${record.id}`,
    });
  }

  const finalized = await finalizeWriteUp({
    id,
    pdfUrl: blob.url,
    pdfFilename: filename,
    personnelRecordId,
    finalizedById: me.id,
  });

  await logWriteUpAudit({
    writeupId: id,
    actorId: me.id,
    actorName: `${me.firstName} ${me.lastName}`.trim(),
    action: "finalized",
  });

  return NextResponse.json({
    writeup: finalized,
    pdfUrl: blob.url,
    pdfFilename: filename,
    personnelRecordId,
  });
}

function severityForActionType(t: string | null): "informational" | "coaching" | "minor" | "moderate" | "serious" | "critical" {
  switch (t) {
    case "Documented verbal counseling": return "coaching";
    case "Written warning": return "minor";
    case "Final written warning": return "moderate";
    case "Performance improvement plan": return "moderate";
    case "Suspension recommendation": return "serious";
    case "Termination recommendation": return "critical";
    default: return "informational";
  }
}
