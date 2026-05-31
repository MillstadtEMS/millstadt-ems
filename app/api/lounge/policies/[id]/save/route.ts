/**
 * POST /api/lounge/policies/[id]/save   — toggle bookmark for current employee
 */
import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { toggleSavePolicy } from "@/lib/lounge/policies";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const result = await toggleSavePolicy({ policyId: id, userId: me.id });
  return NextResponse.json(result);
}
