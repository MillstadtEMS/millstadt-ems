/**
 * GET    /api/lounge/policies/[id]   — single policy detail
 * DELETE /api/lounge/policies/[id]   — admin only; deletes record + blob (best-effort)
 */
import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { currentEmployee } from "@/lib/lounge/auth";
import { deletePolicy, getPolicy } from "@/lib/lounge/policies";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const policy = await getPolicy(id, me.id);
  if (!policy) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ policy });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const blobUrl = await deletePolicy(id);
  if (blobUrl) {
    try {
      await del(blobUrl);
    } catch {
      // best-effort: record is already gone
    }
  }
  return NextResponse.json({ ok: true });
}
