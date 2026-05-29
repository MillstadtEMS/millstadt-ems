import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { deletePoll, getPoll, setPollOpen } from "@/lib/lounge/polls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const poll = await getPoll(id);
  if (!poll) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ poll });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  if (typeof body.open !== "boolean") return NextResponse.json({ error: "open boolean required" }, { status: 400 });
  await setPollOpen(id, body.open);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  await deletePoll(id);
  return NextResponse.json({ ok: true });
}
