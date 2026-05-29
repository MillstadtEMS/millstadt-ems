import { NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { listPollsForViewer } from "@/lib/lounge/polls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const polls = await listPollsForViewer(me.id);
  return NextResponse.json({ polls });
}
