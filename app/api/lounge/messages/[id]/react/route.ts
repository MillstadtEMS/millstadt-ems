import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { MESSAGE_REACTIONS, toggleMessageReaction, type MessageReactionKind } from "@/lib/lounge/messages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const kind = body.kind === null
    ? null
    : (typeof body.kind === "string" && (MESSAGE_REACTIONS as string[]).includes(body.kind))
      ? (body.kind as MessageReactionKind)
      : null;
  await toggleMessageReaction(id, me.id, kind);
  return NextResponse.json({ ok: true });
}
