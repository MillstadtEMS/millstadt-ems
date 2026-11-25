import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The station TVs check they can still reach the site (before their nightly reload, and to notice
 *  a long disconnection) without rendering the whole page. Nothing private in it. */
export function GET() {
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
