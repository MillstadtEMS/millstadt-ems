/**
 * POST /api/admin/form-requests/[id]/deny
 *   Body: { reason }
 *   Denies an employee's form request, notifies the employee in-lounge
 *   + by email with the reason so they aren't left guessing.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import { denyRequest, getRequest } from "@/lib/lounge/form-requests";
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

  const body = await req.json().catch(() => null) as null | Record<string, unknown>;
  const reason = body && typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason) return NextResponse.json({ error: "Reason required" }, { status: 400 });

  await denyRequest({ id: r.id, deniedById: me.id, reason });

  const spec = getFormSpec(r.formType);
  const formLabel = spec?.label ?? r.formType;
  const emp = await getEmployee(r.employeeId);

  try {
    await createNotifications([{
      recipientId: r.employeeId,
      kind: "message",
      title: `Form request denied: ${formLabel}`,
      bodyPreview: reason,
      linkUrl: `/lounge/forms`,
      sourceId: r.id,
      actorId: me.id,
    }]);
  } catch (e) { console.error("[form-requests deny] notify failed:", e); }
  if (emp?.email) {
    try {
      await sendEmployeeEmail({
        to: emp.emailSecondary && emp.emailSecondaryAlerts ? [emp.email, emp.emailSecondary] : [emp.email],
        subject: `Millstadt EMS — Form request denied: ${formLabel}`,
        kicker: "HR Forms",
        headline: `Request denied: ${formLabel}`,
        meta: `Reviewed ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })} CT`,
        bodyText: `Your request for "${formLabel}" was denied.\n\nReason from administrator:\n${reason}\n\nIf you'd like to follow up, contact the office.`,
      });
    } catch (e) { console.error("[form-requests deny] email failed:", e); }
  }

  return NextResponse.json({ ok: true });
}
