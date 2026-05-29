import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { findOrCreateDm } from "@/lib/lounge/messages";

export const dynamic = "force-dynamic";

// Find or create the persistent 1:1 thread between me and the requested
// employee. Returns the same conversation id on repeat calls — that's the
// "ongoing message" behavior.
export async function POST(req: NextRequest) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const otherId = typeof body.employeeId === "string" ? body.employeeId : null;
  if (!otherId) return NextResponse.json({ error: "employeeId required" }, { status: 400 });
  if (otherId === me.id) return NextResponse.json({ error: "Cannot DM yourself" }, { status: 400 });

  const conversationId = await findOrCreateDm(me.id, otherId);
  return NextResponse.json({ conversationId });
}
