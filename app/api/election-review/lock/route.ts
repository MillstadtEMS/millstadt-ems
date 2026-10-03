import { NextRequest, NextResponse } from "next/server";
import { REVIEW_COOKIE } from "@/lib/election-review-auth";
import { isSameOriginRequest } from "@/lib/security/http";

function lock(req: NextRequest) {
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: req.nextUrl.searchParams.get("next") === "review" ? "/election-review" : "/election-information", "Cache-Control": "no-store, private" },
  });
  response.cookies.set(REVIEW_COOKIE, "", { httpOnly: true, secure: req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https", sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
export function GET(req: NextRequest) { return lock(req); }
export function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) return new NextResponse("Invalid request origin.", { status: 403 });
  return lock(req);
}
