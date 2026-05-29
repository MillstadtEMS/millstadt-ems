import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { submitResponse } from "@/lib/lounge/polls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const choiceIds = Array.isArray(body.choiceIds) ? body.choiceIds.filter((c: unknown): c is string => typeof c === "string") : [];
  const comment = typeof body.comment === "string" ? body.comment.trim() || null : null;
  const result = await submitResponse(id, me.id, { choiceIds, comment });
  if (!result.ok) return NextResponse.json({ error: result.reason ?? "Could not save" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
