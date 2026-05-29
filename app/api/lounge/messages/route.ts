import { NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { listMyConversations } from "@/lib/lounge/messages";

export const dynamic = "force-dynamic";

// List the logged-in employee's conversations (ongoing threads + group chats).
export async function GET() {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const conversations = await listMyConversations(me.id);
  return NextResponse.json({ conversations });
}
