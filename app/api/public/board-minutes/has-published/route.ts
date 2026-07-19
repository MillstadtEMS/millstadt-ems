import { NextResponse } from "next/server";
import { hasPublicMinutes } from "@/lib/board/governance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ hasMinutes: await hasPublicMinutes() });
}
