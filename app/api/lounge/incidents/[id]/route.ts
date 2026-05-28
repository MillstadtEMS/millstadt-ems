import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { getIncident, deleteIncident } from "@/lib/lounge/incidents";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const report = await getIncident(id);
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (report.createdBy.id !== me.id && !me.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ report });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const report = await getIncident(id);
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (report.createdBy.id !== me.id && !me.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await deleteIncident(id);
  return NextResponse.json({ ok: true });
}
