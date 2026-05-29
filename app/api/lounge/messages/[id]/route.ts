import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { listMessages, markRead, sendMessage } from "@/lib/lounge/messages";

export const dynamic = "force-dynamic";

// GET messages in the thread (optional ?since=ISO for polling).
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const since = new URL(req.url).searchParams.get("since") ?? undefined;
  const messages = await listMessages(id, me.id, since);

  // Mark this conversation read every time the active user pulls messages
  // (so the unread badge clears as soon as they open the thread).
  if (!since) await markRead(id, me.id);

  return NextResponse.json({ messages });
}

// POST a new message into the existing thread.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  if (typeof body.body !== "string" || !body.body.trim()) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }
  const message = await sendMessage({
    conversationId: id,
    authorId: me.id,
    body: body.body,
  });
  if (!message) return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  return NextResponse.json({ message });
}
