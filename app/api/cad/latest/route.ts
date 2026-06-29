/**
 * GET /api/cad/latest
 * Returns the 3 most recent calls (public — no sensitive data).
 */

import { NextResponse } from "next/server";
import { getLatestCalls } from "@/lib/cad/db";

export const runtime = "nodejs";
export const revalidate = 0; // always fresh

export async function GET() {
  const calls = await getLatestCalls(10);
  // Strip the internal audit fields (who/when edited) from the public feed.
  return NextResponse.json(calls.map(({ editedBy: _e, editedAt: _a, ...c }) => c));
}
