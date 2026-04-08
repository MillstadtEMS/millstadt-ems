import { NextResponse } from "next/server";
import { getChangeLog } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const entries = await getChangeLog(200);
  return NextResponse.json(entries);
}
