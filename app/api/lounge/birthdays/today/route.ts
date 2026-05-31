import { NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { listTodaysBirthdays } from "@/lib/lounge/birthdays";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const people = await listTodaysBirthdays();
  return NextResponse.json({ count: people.length, people });
}
