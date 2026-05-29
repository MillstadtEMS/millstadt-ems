import { NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { dashboardRollups } from "@/lib/lounge/personnel";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await dashboardRollups());
}
