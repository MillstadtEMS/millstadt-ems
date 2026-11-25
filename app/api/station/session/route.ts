import { NextRequest, NextResponse } from "next/server";
import { createStationSession, STATION_COOKIE, stationCookieOptions, stationSameOrigin, verifyStationSession, wantsSecureCookie } from "@/lib/station/auth";

export const runtime = "nodejs";

/** The station page renews its sign-in once a day, so a TV that stays on stays signed in. A TV let
 *  in through the Lounge has no station session to renew (signedIn: false), which is fine. */
export async function POST(req: NextRequest) {
  const headers = { "Cache-Control": "no-store, private" };
  if (!stationSameOrigin(req.headers, req.nextUrl)) return NextResponse.json({ signedIn: false }, { status: 403, headers });
  if (!(await verifyStationSession(req.cookies.get(STATION_COOKIE)?.value))) {
    return NextResponse.json({ signedIn: false }, { status: 401, headers });
  }
  const token = await createStationSession();
  if (!token) return NextResponse.json({ signedIn: false }, { status: 503, headers });
  const response = NextResponse.json({ signedIn: true }, { headers });
  response.cookies.set(STATION_COOKIE, token, stationCookieOptions(wantsSecureCookie(req.nextUrl.protocol, req.headers.get("x-forwarded-proto"))));
  return response;
}
