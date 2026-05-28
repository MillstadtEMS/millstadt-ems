/**
 * POST /api/lounge/open-shifts/[id]/cancel   — admin marks the shift canceled
 *   (keeps the record + responses for audit; no body required)
 */
import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { cancelShift, getOpenShift } from "@/lib/lounge/open-shifts";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  await cancelShift({ shiftId: id, canceledBy: me.id });
  return NextResponse.json({ shift: await getOpenShift(id, me.id) });
}
