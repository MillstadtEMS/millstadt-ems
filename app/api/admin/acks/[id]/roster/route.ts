import { NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { getAckForAdmin, listAckRoster } from "@/lib/lounge/acks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const ack = await getAckForAdmin(id);
  if (!ack) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const roster = await listAckRoster(id);
  return NextResponse.json({ ack, roster });
}
