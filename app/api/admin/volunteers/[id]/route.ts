/**
 * PATCH  /api/admin/volunteers/[id]  — rename / toggle active / edit notes
 * DELETE /api/admin/volunteers/[id]  — hard delete (cascades to hours)
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { deleteVolunteer, updateVolunteer } from "@/lib/lounge/volunteers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null) as null | Record<string, unknown>;
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  await updateVolunteer(id, {
    name:   typeof body.name === "string" ? body.name.trim() : undefined,
    active: typeof body.active === "boolean" ? body.active : undefined,
    notes:  typeof body.notes === "string" ? body.notes : body.notes === null ? null : undefined,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const { id } = await ctx.params;
  await deleteVolunteer(id);
  return NextResponse.json({ ok: true });
}
