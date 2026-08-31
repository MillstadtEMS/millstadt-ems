/**
 * GET /api/cad/summary
 * Compact year-to-date totals for public counters and charts.
 */

import { NextResponse } from "next/server";
import { getCurrentYearCallSummary } from "@/lib/cad/db";

export const runtime = "nodejs";
export const revalidate = 0;

export async function GET() {
  const summary = await getCurrentYearCallSummary();
  return NextResponse.json(summary, {
    headers: {
      "Cache-Control": "public, max-age=15, s-maxage=15, stale-while-revalidate=45",
    },
  });
}
