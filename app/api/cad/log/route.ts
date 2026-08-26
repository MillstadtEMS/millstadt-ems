/**
 * GET /api/cad/log
 * Returns all calls for the current Chicago calendar year (public).
 */

import { NextResponse } from "next/server";
import { getCallsForCurrentYear } from "@/lib/cad/db";
import { readPublicDevelopmentFeed, shouldReadPublicDevelopmentFeed } from "@/lib/cad/public-development-feed";

export const runtime = "nodejs";
export const revalidate = 0;

export async function GET() {
  if (shouldReadPublicDevelopmentFeed(process.env)) {
    try {
      const calls = await readPublicDevelopmentFeed();
      return NextResponse.json(calls, { headers: { "Cache-Control": "no-store", "X-CAD-Source": "public-production-feed" } });
    } catch {
      return NextResponse.json({ error: "Live call data is temporarily unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
  }
  const calls = await getCallsForCurrentYear();
  // Strip the internal audit fields (who/when edited) from the public feed.
  return NextResponse.json(calls.map(({ editedBy: _e, editedAt: _a, ...c }) => c), { headers: { "Cache-Control": "no-store" } });
}
