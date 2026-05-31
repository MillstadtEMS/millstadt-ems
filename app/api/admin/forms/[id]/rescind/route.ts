/**
 * POST /api/admin/forms/[id]/rescind
 *   body: { reason: string, emailRescindNotice?: boolean }
 *
 *   Marks the form as rescinded, drops employee visibility, audits the
 *   action, and (optionally) sends rescind notices to the same
 *   recipients the original was sent to.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import { emailAdmins } from "@/lib/lounge/notify-admins";
import { sendEmployeeEmail } from "@/lib/lounge/employee-email";
import { getForm, logFormAudit, rescindForm } from "@/lib/lounge/forms/db";
import { getFormSpec } from "@/lib/lounge/forms/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const body = await req.json().catch(() => null) as null | { reason?: string; emailRescindNotice?: boolean };
  if (!body?.reason || !body.reason.trim()) {
    return NextResponse.json({ error: "Reason is required to rescind." }, { status: 400 });
  }

  const existing = await getForm(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status !== "finalized") {
    return NextResponse.json({ error: "Only finalized forms can be rescinded." }, { status: 409 });
  }

  const updated = await rescindForm({
    id,
    byId: me.id,
    byName: `${me.firstName} ${me.lastName}`.trim(),
    reason: body.reason.trim(),
  });
  await logFormAudit({
    formId: id,
    actorId: me.id,
    actorName: `${me.firstName} ${me.lastName}`.trim(),
    action: "rescinded",
    details: body.reason.trim(),
  });

  if (body.emailRescindNotice) {
    const spec = getFormSpec(existing.formType);
    const emp = await getEmployee(existing.employeeId);
    if (spec && emp) {
      const employeeName = `${emp.firstName} ${emp.lastName}`.trim();
      const formattedDate = existing.finalizedAt ? new Date(existing.finalizedAt).toLocaleDateString("en-US") : "—";
      const subject = `Millstadt EMS - Rescinded Document Notice - ${spec.label} - ${employeeName}`;
      const body = `The previously issued ${spec.label} dated ${formattedDate} for ${employeeName} has been rescinded/voided in the Millstadt EMS Employee Lounge. Please disregard the prior version. If a corrected version is issued, it will be provided separately.`;
      if (existing.emailedToEmployee && emp.email) {
        try {
          await sendEmployeeEmail({
            to: emp.emailSecondary && emp.emailSecondaryAlerts ? [emp.email, emp.emailSecondary] : [emp.email],
            subject,
            kicker: "Rescinded document",
            headline: spec.label,
            meta: `Originally finalized ${formattedDate}`,
            bodyText: body,
          });
        } catch (e) { console.error("[rescind] employee email failed:", e); }
      }
      if (existing.emailedToAdminInbox) {
        try {
          await emailAdmins({
            kicker: "Rescinded document",
            headline: `${spec.label} — ${employeeName}`,
            meta: `Originally finalized ${formattedDate}`,
            bodyText: body,
            subject,
          });
        } catch (e) { console.error("[rescind] admin email failed:", e); }
      }
    }
  }

  return NextResponse.json({ form: updated });
}
