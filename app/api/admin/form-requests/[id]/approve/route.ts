/**
 * POST /api/admin/form-requests/[id]/approve
 *   Approves an employee's form request: spawns the matching form
 *   assignment + draft instance for that one employee, links the
 *   assignment back to the request row, fires off the employee
 *   "form ready" notification (in-lounge + email).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import { approveRequest, getRequest } from "@/lib/lounge/form-requests";
import { createAssignment, createForm, logFormAudit } from "@/lib/lounge/forms/db";
import { getFormSpec } from "@/lib/lounge/forms/registry";
import { sendEmployeeEmail } from "@/lib/lounge/employee-email";
import { createNotifications } from "@/lib/lounge/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const r = await getRequest(id);
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (r.status !== "pending") return NextResponse.json({ error: "Already actioned" }, { status: 409 });

  const spec = getFormSpec(r.formType);
  if (!spec) return NextResponse.json({ error: "Unknown form type" }, { status: 500 });

  const emp = await getEmployee(r.employeeId);
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : spec.label;
  const summary = typeof body.summary === "string" ? body.summary.trim() || undefined : undefined;
  const dueAt = typeof body.dueAt === "string" && body.dueAt ? body.dueAt : null;

  const share = body.share ?? spec.defaults;

  const assignment = await createAssignment({
    formType: spec.id,
    title,
    summary,
    prefillData: {},
    share,
    dueAt,
    targetKind: "explicit",
    targetEmployeeIds: [r.employeeId],
    createdById: me.id,
    createdByName: `${me.firstName} ${me.lastName}`.trim(),
  });

  const form = await createForm({
    formType: spec.id,
    employeeId: r.employeeId,
    createdById: me.id,
    data: { employeeFullName: `${emp.firstName} ${emp.lastName}`.trim() },
    share,
    assignmentId: assignment.id,
  });
  await logFormAudit({
    formId: form.id,
    actorId: me.id,
    actorName: `${me.firstName} ${me.lastName}`.trim(),
    action: "assigned",
    details: `request=${r.id} assignment=${assignment.id}`,
  });

  await approveRequest({ id: r.id, approvedById: me.id, assignmentId: assignment.id });

  // Notify the employee in-lounge + by email.
  try {
    await createNotifications([{
      recipientId: r.employeeId,
      kind: "message",
      title: `Form ready to fill: ${spec.label}`,
      bodyPreview: title,
      linkUrl: `/lounge/forms/${form.id}`,
      sourceId: form.id,
      actorId: me.id,
    }]);
  } catch (e) { console.error("[form-requests approve] notify failed:", e); }
  if (emp.email) {
    try {
      await sendEmployeeEmail({
        to: emp.emailSecondary && emp.emailSecondaryAlerts ? [emp.email, emp.emailSecondary] : [emp.email],
        subject: `Millstadt EMS — ${spec.label} ready for you to fill out`,
        kicker: "HR Forms",
        headline: `${spec.label} is ready`,
        meta: `Document ID ${form.id.slice(0,8)} · Requested ${new Date(r.createdAt).toLocaleDateString()}`,
        bodyText: `Your request for "${spec.label}" was approved.\n\nSign in to the Employee Lounge to fill it out and sign.\n\nDirect link: ${process.env.NEXT_PUBLIC_SITE_URL || "https://millstadtems.org"}/lounge/forms/${form.id}`,
        link: { url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://millstadtems.org"}/lounge/forms/${form.id}`, label: "Open form" },
      });
    } catch (e) { console.error("[form-requests approve] email failed:", e); }
  }

  return NextResponse.json({ assignment, form });
}
