import { NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { markAllRead } from "@/lib/lounge/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await markAllRead(me.id);
  return NextResponse.json({ ok: true });
}
