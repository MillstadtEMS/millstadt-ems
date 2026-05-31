/**
 * POST /api/admin/form-assignments/[id]/remind
 *   Fires a lounge notification (and optionally an email) to every
 *   employee whose assigned form is still in `draft` status. The
 *   notification deep-links to /lounge/forms/<formId> so the employee
 *   can sign in one tap.
 *
 *   body: { emailToo?: boolean }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { currentEmployee } from "@/lib/lounge/auth";
import { getAssignment, listFormsForAssignment } from "@/lib/lounge/forms/db";
import { getFormSpec } from "@/lib/lounge/forms/registry";
import { getEmployee } from "@/lib/lounge/employees";
import { createNotifications } from "@/lib/lounge/notifications";
import { sendEmployeeEmail } from "@/lib/lounge/employee-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const assignment = await getAssignment(id);
  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const spec = getFormSpec(assignment.formType);
  if (!spec) return NextResponse.json({ error: "Unknown form type" }, { status: 400 });

  const body = await req.json().catch(() => null) as null | { emailToo?: boolean };
  const emailToo = body?.emailToo === true;

  const forms = await listFormsForAssignment(id);
  const pending = forms.filter((f) => f.status === "draft");

  if (pending.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: "Nothing pending — nobody to remind." });
  }

  let sentNotifications = 0;
  let sentEmails = 0;

  await createNotifications(pending.map((f) => ({
    recipientId: f.employeeId,
    kind: "post",
    title: `Reminder: please sign — ${assignment.title}`,
    bodyPreview: assignment.summary?.slice(0, 200) ?? `Open to sign your ${spec.label}.`,
    linkUrl: `/lounge/forms/${f.id}`,
    sourceId: assignment.id,
    actorId: me.id,
  })));
  sentNotifications = pending.length;

  if (emailToo) {
    for (const f of pending) {
      try {
        const emp = await getEmployee(f.employeeId);
        if (!emp?.email) continue;
        const to = emp.emailSecondary && emp.emailSecondaryAlerts ? [emp.email, emp.emailSecondary] : [emp.email];
        await sendEmployeeEmail({
          to,
          subject: `Reminder — please sign: ${assignment.title}`,
          kicker: "Action needed",
          headline: assignment.title,
          meta: spec.label,
          bodyText: [
            `Hi ${emp.firstName},`,
            ``,
            `This is a reminder to sign the ${spec.label.toLowerCase()} that leadership pushed out${assignment.dueAt ? ` (due ${new Date(assignment.dueAt).toLocaleDateString()})` : ""}.`,
            ``,
            assignment.summary?.trim() || "",
            ``,
            `Open the form: https://www.millstadtems.org/lounge/forms/${f.id}`,
          ].filter(Boolean).join("\n"),
          link: { url: `https://www.millstadtems.org/lounge/forms/${f.id}`, label: "Open & sign" },
        });
        sentEmails += 1;
      } catch (e) { console.error("[remind] email failed:", e); }
    }
  }

  return NextResponse.json({ ok: true, sent: sentNotifications, sentEmails });
}
