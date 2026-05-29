import { NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { listPresence, recordHeartbeat } from "@/lib/lounge/presence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — list every active employee's online status + last seen.
export async function GET() {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const presence = await listPresence();
  return NextResponse.json({ presence });
}

// POST — pulse from the client when there's been recent cursor activity.
export async function POST() {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await recordHeartbeat(me.id);
  return NextResponse.json({ ok: true });
}
