/**
 * PATCH  /api/admin/onboarding/template/items/[id]
 *   Edit any flag on an item — label, required, has_upload, share_*,
 *   display_order, active, section assignment.
 * DELETE /api/admin/onboarding/template/items/[id]
 *   Delete an item. Cascades to per-record progress rows.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { deleteItem, updateItem } from "@/lib/lounge/onboarding/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null) as null | Record<string, unknown>;
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const b = (k: string) => typeof body[k] === "boolean" ? body[k] as boolean : undefined;
  const s = (k: string) => typeof body[k] === "string" ? body[k] as string : undefined;
  const n = (k: string) => typeof body[k] === "number" ? body[k] as number : undefined;

  await updateItem(id, {
    label: s("label"),
    required: b("required"),
    hasUpload: b("hasUpload"),
    hasExpiration: b("hasExpiration"),
    hasNotes: b("hasNotes"),
    hasVerification: b("hasVerification"),
    shareSaveToFile: b("shareSaveToFile"),
    shareEmailEmployee: b("shareEmailEmployee"),
    shareEmailAdmin: b("shareEmailAdmin"),
    displayOrder: n("displayOrder"),
    active: b("active"),
    sectionId: s("sectionId"),
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const { id } = await ctx.params;
  await deleteItem(id);
  return NextResponse.json({ ok: true });
}
