/**
 * GET  /api/lounge/form-requests
 *   Returns the calling employee's request history + the catalog of
 *   form types they can ask for.
 * POST /api/lounge/form-requests
 *   Employee posts a new request: { formType, message? }. Notifies
 *   admins via the in-lounge bell + email.
 */
import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { createRequest, listRequestsForEmployee } from "@/lib/lounge/form-requests";
import { FORM_REGISTRY, getFormSpec } from "@/lib/lounge/forms/registry";
import { notifyAdminsInLounge } from "@/lib/lounge/notify-admins";
import { emailAdmins } from "@/lib/lounge/notify-admins";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requests = await listRequestsForEmployee(me.id);
  const labelByType = new Map(FORM_REGISTRY.map((f) => [f.id, f.label]));
  const catalog = FORM_REGISTRY
    .filter((f) => f.employeeFillable)
    .map((f) => ({ id: f.id, label: f.label, blurb: f.blurb }));

  return NextResponse.json({
    requests: requests.map((r) => ({ ...r, formLabel: labelByType.get(r.formType) ?? r.formType })),
    catalog,
  });
}

export async function POST(req: NextRequest) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as null | Record<string, unknown>;
  if (!body || typeof body.formType !== "string") {
    return NextResponse.json({ error: "formType required" }, { status: 400 });
  }
  const spec = getFormSpec(body.formType);
  if (!spec || !spec.employeeFillable) {
    return NextResponse.json({ error: "Form is not requestable by employees." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() || null : null;
  const reqRow = await createRequest({ employeeId: me.id, formType: spec.id, message });

  // Notify admins in-lounge + by email. Best-effort.
  const employeeName = `${me.firstName} ${me.lastName}`.trim();
  try {
    await notifyAdminsInLounge({
      kind: "message",
      title: `${employeeName} is requesting: ${spec.label}`,
      bodyPreview: message ?? "(no additional details provided)",
      linkUrl: `/admin/forms`,
      sourceId: reqRow.id,
      actorId: me.id,
    });
  } catch (e) { console.error("[form-requests POST] notify failed:", e); }
  try {
    await emailAdmins({
      kicker: "HR Forms · New request",
      headline: `${employeeName} requests ${spec.label}`,
      meta: `Document ID ${reqRow.id.slice(0, 8)} · ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })} CT`,
      bodyText: `Employee: ${employeeName}\nRequested form: ${spec.label}\n\nMessage from employee:\n${message ?? "(none)"}\n\nApprove or deny in admin → Forms.`,
      link: { url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://millstadtems.org"}/admin/forms`, label: "Open admin forms" },
      subject: `[EMS Forms] Request — ${employeeName} — ${spec.label}`,
    });
  } catch (e) { console.error("[form-requests POST] email failed:", e); }

  return NextResponse.json({ request: reqRow });
}
