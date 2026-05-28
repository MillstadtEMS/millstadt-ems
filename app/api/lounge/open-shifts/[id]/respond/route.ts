/**
 * POST /api/lounge/open-shifts/[id]/respond
 *   body: { response: 'available' | 'unavailable', note?: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { respondToShift, getOpenShift } from "@/lib/lounge/open-shifts";

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json();
  const response = body.response === "unavailable" ? "unavailable" : "available";
  await respondToShift({ shiftId: id, userId: me.id, response, note: body.note });
  return NextResponse.json({ shift: await getOpenShift(id, me.id) });
}
