import { NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { outstandingAckCount } from "@/lib/lounge/acks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Tiny endpoint that returns the logged-in employee's outstanding required-ack
// count. Used by LoungeShell to lock the rest of the lounge until pending
// notices are signed.
export async function GET() {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const count = await outstandingAckCount(me.id);
  return NextResponse.json({ count });
}
