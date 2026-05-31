/**
 * GET    /api/admin/onboarding/records/[id]
 *   Returns the record, current progress for every item, signatures,
 *   audit log, and the live template snapshot.
 * PATCH  /api/admin/onboarding/records/[id]
 *   Update header fields, final outcome, final notes. Locked records
 *   (status='finalized') reject patches.
 * DELETE /api/admin/onboarding/records/[id]
 *   Hard-delete (only allowed for in-progress records).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { currentEmployee } from "@/lib/lounge/auth";
import {
  deleteRecord,
  getRecord,
  listAudit,
  listProgress,
  listSignatures,
  listTemplate,
  logOnboardingAudit,
  updateRecord,
} from "@/lib/lounge/onboarding/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const { id } = await ctx.params;

  const rec = await getRecord(id);
  if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [template, progress, signatures, audit] = await Promise.all([
    listTemplate(),
    listProgress(id),
    listSignatures(id),
    listAudit(id),
  ]);

  return NextResponse.json({ record: rec, template, progress, signatures, audit });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const current = await getRecord(id);
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (current.status === "finalized") {
    return NextResponse.json({ error: "Record is finalized and locked." }, { status: 409 });
  }

  const body = await req.json().catch(() => null) as null | Record<string, unknown>;
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const s = (k: string) => typeof body[k] === "string" ? body[k] as string : body[k] === null ? null : undefined;
  await updateRecord(id, {
    position: s("position"),
    startDate: s("startDate"),
    employmentType: s("employmentType") as never,
    credentialLevel: s("credentialLevel") as never,
    assignedUnit: s("assignedUnit"),
    preceptorId: s("preceptorId"),
    witnessId: s("witnessId"),
    finalOutcome: s("finalOutcome") as never,
    finalNotes: s("finalNotes"),
  });
  await logOnboardingAudit({
    recordId: id,
    actorId: me.id,
    actorName: `${me.firstName} ${me.lastName}`.trim(),
    action: "edited",
    details: "Record header updated",
  });

  const updated = await getRecord(id);
  return NextResponse.json({ record: updated });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const { id } = await ctx.params;
  const current = await getRecord(id);
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (current.status !== "in_progress") {
    return NextResponse.json({ error: "Only in-progress records can be deleted." }, { status: 409 });
  }
  await deleteRecord(id);
  return NextResponse.json({ ok: true });
}
