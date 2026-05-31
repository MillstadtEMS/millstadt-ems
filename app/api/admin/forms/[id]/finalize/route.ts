/**
 * POST /api/admin/forms/[id]/finalize
 *   Renders the final PDF, uploads to Vercel Blob, optionally creates a
 *   personnel record + attachment, optionally emails the employee +
 *   admin inbox, locks the form to status = 'finalized'.
 */
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAdmin } from "@/lib/admin/auth";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import { createAttachment, createRecord } from "@/lib/lounge/personnel";
import { emailAdmins } from "@/lib/lounge/notify-admins";
import { sendEmployeeEmail } from "@/lib/lounge/employee-email";
import {
  getForm,
  logFormAudit,
  setFinalizedState,
} from "@/lib/lounge/forms/db";
import {
  fileTabLabel,
  getFormSpec,
  severityForFormType,
} from "@/lib/lounge/forms/registry";
import { buildFormPdf, formFilename } from "@/lib/lounge/forms/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validateRequired(form: { data: Record<string, unknown>; signatures: { who: string }[]; refusedToSign: string[] }, spec: ReturnType<typeof getFormSpec>): string[] {
  const missing: string[] = [];
  if (!spec) return ["Unknown form type"];
  for (const section of spec.sections) {
    for (const field of section.fields) {
      if (!field.required) continue;
      const v = form.data[field.key];
      if (v === undefined || v === null || (typeof v === "string" && !v.trim())) {
        missing.push(field.label);
      }
    }
  }
  for (const sig of spec.signatures) {
    if (!sig.required) continue;
    const signed = form.signatures.some((s) => s.who === sig.who);
    const refused = sig.allowRefusal && form.refusedToSign.includes(sig.who);
    if (!signed && !refused) missing.push(`${sig.label} signature`);
  }
  return missing;
}

function personnelCategoryForFileTab(tab: string): "conduct" | "performance" | "attendance" | "accommodations" | "clinical" | "positive" | "attachments" {
  switch (tab) {
    case "corrective_actions":     return "conduct";
    case "commendations":          return "positive";
    case "confidential_medical":   return "accommodations";
    case "credentials_training":   return "clinical";
    case "personnel_records":      return "performance";
    case "policy_acknowledgments": return "attachments";
    default:                       return "attachments";
  }
}

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const form = await getForm(id);
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (form.status !== "draft") return NextResponse.json({ error: "Form is already locked." }, { status: 409 });

  const spec = getFormSpec(form.formType);
  if (!spec) return NextResponse.json({ error: "Unknown form type" }, { status: 500 });

  const missing = validateRequired(form, spec);
  if (missing.length) return NextResponse.json({ error: "Missing required fields", missing }, { status: 400 });

  const emp = await getEmployee(form.employeeId);
  if (!emp) return NextResponse.json({ error: "Employee missing" }, { status: 404 });

  // Render the PDF.
  const pdf = await buildFormPdf({
    spec,
    form,
    employee: {
      firstName: emp.firstName,
      lastName: emp.lastName,
      fullName: `${emp.firstName} ${emp.lastName}`.trim(),
      position: emp.position,
      employeeId: null,
    },
  });
  const filename = formFilename(spec, emp.lastName, emp.firstName, new Date().toISOString());

  // Upload.
  const slug = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const blob = await put(
    `lounge/forms/${form.employeeId}/${slug}-${filename}`,
    pdf,
    { access: "public", contentType: "application/pdf" },
  );

  // Optional save-to-file.
  let personnelRecordId: string | null = null;
  if (form.share.saveToFile) {
    const record = await createRecord({
      employeeId: form.employeeId,
      category: personnelCategoryForFileTab(spec.defaultFileTab),
      recordType: spec.id,
      title: spec.label,
      summary: spec.blurb,
      severity: severityForFormType(spec.id),
      status: "active",
      createdBy: me.id,
      supervisorId: me.id,
      employeeVisible: form.share.visibleToEmployee,
      restrictedVisibility: spec.confidentiality !== "open",
      acknowledgmentRequired: false,
      adminNotes: `Filed under: ${fileTabLabel(spec.defaultFileTab)}`,
    });
    personnelRecordId = record.id;
    await createAttachment({
      recordId: record.id,
      employeeId: form.employeeId,
      fileName: filename,
      fileUrl: blob.url,
      fileMime: "application/pdf",
      fileSize: pdf.length,
      documentCategory: spec.label,
      visibilityLevel: form.share.visibleToEmployee ? "employee" : "admin",
      uploadedBy: me.id,
    });
    await logFormAudit({ formId: id, actorId: me.id, actorName: `${me.firstName} ${me.lastName}`.trim(), action: "saved_to_file", details: record.id });
  }

  // Email distribution. Best-effort, never blocks finalization.
  const employeeName = `${emp.firstName} ${emp.lastName}`.trim();
  let emailedEmployee = false;
  let emailedAdmin = false;
  if (form.share.emailEmployee && emp.email) {
    try {
      await sendEmployeeEmail({
        to: emp.emailSecondary && emp.emailSecondaryAlerts ? [emp.email, emp.emailSecondary] : [emp.email],
        subject: `Millstadt EMS — ${spec.label} — ${employeeName} — ${new Date().toISOString().slice(0,10)}`,
        kicker: spec.label,
        headline: spec.pdfTitle,
        meta: `Document ID ${form.id.slice(0,8)} · Finalized just now`,
        bodyText: `Attached / linked is a finalized copy of the ${spec.label} for ${employeeName}.\n\nDocument link: ${blob.url}\n\nThis message was generated by the Millstadt EMS Employee Lounge.`,
        link: { url: blob.url, label: "Open PDF" },
      });
      emailedEmployee = true;
      await logFormAudit({ formId: id, actorId: me.id, actorName: `${me.firstName} ${me.lastName}`.trim(), action: "emailed_employee", details: emp.email });
    } catch (e) { console.error("[forms finalize] email employee failed:", e); }
  }
  if (form.share.emailAdminInbox) {
    try {
      await emailAdmins({
        kicker: spec.label,
        headline: `${spec.pdfTitle} — ${employeeName}`,
        meta: `Document ID ${form.id.slice(0,8)} · Finalized ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })} CT`,
        bodyText: `Attached / linked is a finalized copy of the ${spec.label} for ${employeeName}.\n\nDocument link: ${blob.url}`,
        link: { url: blob.url, label: "Open PDF" },
        subject: `Millstadt EMS - ${spec.label} - ${employeeName} - ${new Date().toISOString().slice(0,10)}`,
      });
      emailedAdmin = true;
      await logFormAudit({ formId: id, actorId: me.id, actorName: `${me.firstName} ${me.lastName}`.trim(), action: "emailed_admin", details: "millstadtems@gmail.com" });
    } catch (e) { console.error("[forms finalize] email admin failed:", e); }
  }

  const finalized = await setFinalizedState({
    id,
    pdfUrl: blob.url,
    pdfFilename: filename,
    personnelRecordId,
    finalizedById: me.id,
    emailedToEmployee: emailedEmployee,
    emailedToAdminInbox: emailedAdmin,
  });
  await logFormAudit({ formId: id, actorId: me.id, actorName: `${me.firstName} ${me.lastName}`.trim(), action: "finalized" });

  return NextResponse.json({
    form: finalized,
    pdfUrl: blob.url,
    pdfFilename: filename,
    personnelRecordId,
    emailedEmployee,
    emailedAdmin,
  });
}
