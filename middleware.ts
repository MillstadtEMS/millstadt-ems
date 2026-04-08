import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/admin/auth";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect all /admin/* except /admin/login
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const token = req.cookies.get("mas_admin")?.value;
    if (!token || !verifySessionToken(token)) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
