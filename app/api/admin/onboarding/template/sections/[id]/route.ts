/**
 * PATCH  /api/admin/onboarding/template/sections/[id]
 *   Edit section title / order / active state.
 * DELETE /api/admin/onboarding/template/sections/[id]
 *   Remove a section and (via cascade) its items. Use with care — admin
 *   can also just set active=false to hide without losing items.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { deleteSection, updateSection } from "@/lib/lounge/onboarding/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null) as null | Record<string, unknown>;
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  await updateSection(id, {
    title: typeof body.title === "string" ? body.title : undefined,
    displayOrder: typeof body.displayOrder === "number" ? body.displayOrder : undefined,
    active: typeof body.active === "boolean" ? body.active : undefined,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const { id } = await ctx.params;
  await deleteSection(id);
  return NextResponse.json({ ok: true });
}
