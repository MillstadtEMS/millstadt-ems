import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { createGroupConversation } from "@/lib/lounge/messages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const participantIds = Array.isArray(body.participantIds)
    ? body.participantIds.filter((p: unknown): p is string => typeof p === "string" && p.length > 0)
    : [];
  if (participantIds.length < 2) {
    return NextResponse.json({ error: "Pick at least two other people for a group." }, { status: 400 });
  }
  const title = typeof body.title === "string" ? body.title.trim() || null : null;
  try {
    const id = await createGroupConversation(me.id, participantIds, title);
    return NextResponse.json({ conversationId: id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not create" }, { status: 400 });
  }
}
