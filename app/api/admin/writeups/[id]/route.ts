/**
 * GET    /api/admin/writeups/[id]    — fetch a single write-up + audit log
 * PATCH  /api/admin/writeups/[id]    — update a DRAFT write-up
 * DELETE /api/admin/writeups/[id]    — delete a DRAFT write-up
 *
 * Finalized records are locked: PATCH and DELETE 409.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { currentEmployee } from "@/lib/lounge/auth";
import {
  deleteWriteUp,
  getWriteUp,
  listAuditForWriteUp,
  logWriteUpAudit,
  updateWriteUpFields,
  type UpdateWriteUpInput,
} from "@/lib/lounge/writeups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const { id } = await ctx.params;
  const wu = await getWriteUp(id);
  if (!wu) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const audit = await listAuditForWriteUp(id);
  return NextResponse.json({ writeup: wu, audit });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const existing = await getWriteUp(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status === "finalized") {
    return NextResponse.json({ error: "Write-up is finalized and cannot be edited." }, { status: 409 });
  }

  const body = await req.json().catch(() => null) as null | UpdateWriteUpInput;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const updated = await updateWriteUpFields(id, body);
  await logWriteUpAudit({
    writeupId: id,
    actorId: me.id,
    actorName: `${me.firstName} ${me.lastName}`.trim(),
    action: "edited",
    details: Object.keys(body).join(", "),
  });

  // Signature-specific audit lines so the trail clearly shows which
  // party signed (and when employee refusal was recorded).
  if (body.managerSignature !== undefined && body.managerSignature) {
    await logWriteUpAudit({ writeupId: id, actorId: me.id, actorName: body.managerSignature.printedName, action: "manager_signed" });
  }
  if (body.employeeSignature !== undefined && body.employeeSignature) {
    await logWriteUpAudit({ writeupId: id, actorId: null, actorName: body.employeeSignature.printedName, action: "employee_signed" });
  }
  if (body.employeeRefusedToSign === true) {
    await logWriteUpAudit({ writeupId: id, actorId: me.id, actorName: `${me.firstName} ${me.lastName}`.trim(), action: "employee_refused_signature" });
  }
  if (body.witnessSignature !== undefined && body.witnessSignature) {
    await logWriteUpAudit({ writeupId: id, actorId: null, actorName: body.witnessSignature.printedName, action: "witness_signed" });
  }

  return NextResponse.json({ writeup: updated });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const { id } = await ctx.params;
  const existing = await getWriteUp(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status === "finalized") {
    return NextResponse.json({ error: "Cannot delete a finalized write-up." }, { status: 409 });
  }
  await deleteWriteUp(id);
  return NextResponse.json({ ok: true });
}
