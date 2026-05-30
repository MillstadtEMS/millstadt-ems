import { NextResponse } from "next/server";
import { getChangeLog } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";

export async function GET() {
  const denied = await requireAdmin(); if (denied) return denied;
  const entries = await getChangeLog(200);
  return NextResponse.json(entries);
}
