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
  // Strip the internal audit fields (who/when edited) from the public feed.
  return NextResponse.json(calls.map(({ editedBy: _e, editedAt: _a, ...c }) => c));
}
