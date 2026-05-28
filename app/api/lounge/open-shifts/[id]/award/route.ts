/**
 * POST /api/lounge/open-shifts/[id]/award
 *   body: { userId: string }   — admin-only; marks shift awarded.
 */
import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { awardShift, getOpenShift } from "@/lib/lounge/open-shifts";

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const body = await req.json();
  if (!body.userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  await awardShift({ shiftId: id, awardedTo: String(body.userId), awardedBy: me.id });
  return NextResponse.json({ shift: await getOpenShift(id, me.id) });
}
