/**
 * GET    /api/admin/forms/[id]   form + spec + audit
 * PATCH  /api/admin/forms/[id]   update draft (data / signatures / share)
 * DELETE /api/admin/forms/[id]   delete draft (never delete finalized)
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { currentEmployee } from "@/lib/lounge/auth";
import {
  deleteDraftForm,
  getForm,
  listAuditForForm,
  logFormAudit,
  updateForm,
} from "@/lib/lounge/forms/db";
import { getFormSpec } from "@/lib/lounge/forms/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const { id } = await ctx.params;
  const form = await getForm(id);
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const spec = getFormSpec(form.formType);
  if (!spec) return NextResponse.json({ error: "Form type missing from registry" }, { status: 500 });
  const audit = await listAuditForForm(id);
  return NextResponse.json({ form, spec, audit });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const existing = await getForm(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status !== "draft") {
    return NextResponse.json({ error: "Form is locked." }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const updated = await updateForm(id, body);

  await logFormAudit({
    formId: id,
    actorId: me.id,
    actorName: `${me.firstName} ${me.lastName}`.trim(),
    action: "edited",
  });
  if (body.signatures !== undefined) {
    await logFormAudit({ formId: id, actorId: me.id, actorName: `${me.firstName} ${me.lastName}`.trim(), action: "signed", details: `count=${Array.isArray(body.signatures) ? body.signatures.length : 0}` });
  }
  if (Array.isArray(body.refusedToSign) && body.refusedToSign.length) {
    await logFormAudit({ formId: id, actorId: me.id, actorName: `${me.firstName} ${me.lastName}`.trim(), action: "refused_signature", details: body.refusedToSign.join(",") });
  }
  return NextResponse.json({ form: updated });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const { id } = await ctx.params;
  const existing = await getForm(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status !== "draft") {
    return NextResponse.json({ error: "Cannot delete a finalized/rescinded form." }, { status: 409 });
  }
  await deleteDraftForm(id);
  return NextResponse.json({ ok: true });
}
