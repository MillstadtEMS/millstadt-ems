/**
 * GET    /api/lounge/open-shifts/[id]   — single shift detail
 * DELETE /api/lounge/open-shifts/[id]   — admin or creator deletes outright
 */
import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { getOpenShift, deleteShift } from "@/lib/lounge/open-shifts";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const shift = await getOpenShift(id, me.id);
  if (!shift) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ shift });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const shift = await getOpenShift(id, me.id);
  if (!shift) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (shift.createdBy.id !== me.id && !me.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await deleteShift(id);
  return NextResponse.json({ ok: true });
}
