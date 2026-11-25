import { NextRequest, NextResponse } from "next/server";
import { STATION_COOKIE, stationSameOrigin, wantsSecureCookie } from "@/lib/station/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!stationSameOrigin(req.headers, req.nextUrl)) return new NextResponse("Invalid request origin.", { status: 403 });
  const response = new NextResponse(null, { status: 303, headers: { Location: "/station/login", "Cache-Control": "no-store, private" } });
  response.cookies.set(STATION_COOKIE, "", {
    httpOnly: true, secure: wantsSecureCookie(req.nextUrl.protocol, req.headers.get("x-forwarded-proto")), sameSite: "lax", path: "/", maxAge: 0,
  });
  return response;
}
