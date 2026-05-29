import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import {
  deleteMaintenanceRequest,
  listMaintenanceRequests,
  setMaintenanceStatus,
} from "@/lib/lounge/maintenance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!me.isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const status = body.status;
  const valid = ["open", "in_progress", "resolved", "dismissed"];
  if (!valid.includes(status)) {
    return NextResponse.json({ error: "Bad status" }, { status: 400 });
  }
  await setMaintenanceStatus(id, status, me.id, typeof body.notes === "string" ? body.notes : null);
  const all = await listMaintenanceRequests();
  return NextResponse.json({ ok: true, request: all.find((r) => r.id === id) ?? null });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!me.isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { id } = await ctx.params;
  await deleteMaintenanceRequest(id);
  return NextResponse.json({ ok: true });
}
