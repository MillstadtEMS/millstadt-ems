import { NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { getTodayEvents } from "@/lib/lounge/today-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const events = await getTodayEvents();
  return NextResponse.json({ events, fetchedAt: new Date().toISOString() });
}
