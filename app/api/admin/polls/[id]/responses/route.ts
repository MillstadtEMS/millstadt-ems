import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { getPoll, listPollResponses } from "@/lib/lounge/polls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const [poll, responses] = await Promise.all([getPoll(id), listPollResponses(id)]);
  if (!poll) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ poll, responses });
}
