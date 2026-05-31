/**
 * GET   /api/lounge/forms/[id]   — fetch a pending or visible form for the caller
 * PATCH /api/lounge/forms/[id]   — employee fills + signs their own pending form
 *   Body: { data?, signatures?, refusedToSign? }
 *
 * Once the employee signs an assigned policy acknowledgment the row is
 * auto-finalized server-side (admin doesn't need to come back and click
 * Finalize for every crew member). The finalize step uses the same
 * spec-driven validation as the admin path so it's safe.
 */
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import { createAttachment, createRecord } from "@/lib/lounge/personnel";
import { sendEmployeeEmail } from "@/lib/lounge/employee-email";
import { emailAdmins } from "@/lib/lounge/notify-admins";
import {
  getForm,
  logFormAudit,
  setFinalizedState,
  updateForm,
  type FormSignature,
} from "@/lib/lounge/forms/db";
import {
  fileTabLabel,
  getFormSpec,
  type FormSpec,
} from "@/lib/lounge/forms/registry";
import { buildFormPdf, formFilename } from "@/lib/lounge/forms/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function specRequired(form: { data: Record<string, unknown>; signatures: FormSignature[]; refusedToSign: string[] }, spec: FormSpec): string[] {
  const missing: string[] = [];
  for (const section of spec.sections) {
    for (const field of section.fields) {
      if (!field.required) continue;
      const v = form.data[field.key];
      if (v === undefined || v === null || (typeof v === "string" && !v.trim())) missing.push(field.label);
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

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const form = await getForm(id);
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (form.employeeId !== me.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // Crew can only see forms that are either (a) still assigned-pending to
  // them or (b) finalized + visible-to-employee. Confidential records and
  // admin-only documents stay invisible.
  if (form.status === "finalized" && !form.share.visibleToEmployee) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const spec = getFormSpec(form.formType);
  if (!spec) return NextResponse.json({ error: "Form type missing" }, { status: 500 });
  return NextResponse.json({ form, spec });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const form = await getForm(id);
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (form.employeeId !== me.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (form.status !== "draft") return NextResponse.json({ error: "Form is locked." }, { status: 409 });

  const body = await req.json().catch(() => null) as null | {
    data?: Record<string, unknown>;
    signatures?: FormSignature[];
    refusedToSign?: string[];
  };
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const updated = await updateForm(id, {
    data: body.data,
    signatures: body.signatures,
    refusedToSign: body.refusedToSign,
  });
  if (!updated) return NextResponse.json({ error: "Update failed" }, { status: 500 });

  await logFormAudit({
    formId: id,
    actorId: me.id,
    actorName: `${me.firstName} ${me.lastName}`.trim(),
    action: "edited",
  });
  if (Array.isArray(body.signatures) && body.signatures.length) {
    await logFormAudit({ formId: id, actorId: me.id, actorName: `${me.firstName} ${me.lastName}`.trim(), action: "signed", details: `count=${body.signatures.length}` });
  }

  // Auto-finalize when all required signatures are in. Mostly used by
  // bulk-assigned policy acknowledgments where the admin already set
  // the sharing options up-front and the employee is the final signer.
  const spec = getFormSpec(updated.formType);
  if (spec) {
    const missing = specRequired(updated, spec);
    if (missing.length === 0) {
      await autoFinalize(updated, spec, me);
      const fresh = await getForm(id);
      return NextResponse.json({ form: fresh, finalized: true });
    }
  }

  return NextResponse.json({ form: updated, finalized: false });
}

async function autoFinalize(form: Awaited<ReturnType<typeof getForm>>, spec: FormSpec, me: { id: string; firstName: string; lastName: string }) {
  if (!form) return;
  const emp = await getEmployee(form.employeeId);
  if (!emp) return;
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
  const slug = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const blob = await put(
    `lounge/forms/${form.employeeId}/${slug}-${filename}`,
    pdf,
    { access: "public", contentType: "application/pdf" },
  );

  let personnelRecordId: string | null = null;
  if (form.share.saveToFile) {
    const record = await createRecord({
      employeeId: form.employeeId,
      category: personnelCategoryForFileTab(spec.defaultFileTab),
      recordType: spec.id,
      title: spec.label,
      summary: spec.blurb,
      severity: "informational",
      status: "active",
      createdBy: me.id,
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
    await logFormAudit({ formId: form.id, actorId: me.id, actorName: `${me.firstName} ${me.lastName}`.trim(), action: "saved_to_file", details: record.id });
  }

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
        meta: `Document ID ${form.id.slice(0,8)}`,
        bodyText: `A finalized copy of the ${spec.label} is available.\n\n${blob.url}\n\nThis message was generated by the Millstadt EMS Employee Lounge.`,
        link: { url: blob.url, label: "Open PDF" },
      });
      emailedEmployee = true;
    } catch (e) { console.error("[forms autofinalize] email employee failed:", e); }
  }
  if (form.share.emailAdminInbox) {
    try {
      await emailAdmins({
        kicker: spec.label,
        headline: `${spec.pdfTitle} — ${employeeName}`,
        meta: `Document ID ${form.id.slice(0,8)}`,
        bodyText: `A finalized copy of the ${spec.label} is available.\n\n${blob.url}`,
        link: { url: blob.url, label: "Open PDF" },
        subject: `Millstadt EMS - ${spec.label} - ${employeeName} - ${new Date().toISOString().slice(0,10)}`,
      });
      emailedAdmin = true;
    } catch (e) { console.error("[forms autofinalize] email admin failed:", e); }
  }

  await setFinalizedState({
    id: form.id,
    pdfUrl: blob.url,
    pdfFilename: filename,
    personnelRecordId,
    finalizedById: me.id,
    emailedToEmployee: emailedEmployee,
    emailedToAdminInbox: emailedAdmin,
  });
  await logFormAudit({ formId: form.id, actorId: me.id, actorName: `${me.firstName} ${me.lastName}`.trim(), action: "finalized" });
}
