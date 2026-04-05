/**
 * GET /api/cad/log
 * Returns all calls for the current Chicago calendar year (public).
 */

import { NextResponse } from "next/server";
import { getCallsForCurrentYear } from "@/lib/cad/db";

export const runtime = "nodejs";
export const revalidate = 0;

export async function GET() {
  const calls = await getCallsForCurrentYear();
  return NextResponse.json(calls);
}
