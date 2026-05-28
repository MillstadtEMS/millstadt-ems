import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken as verifyAdminToken } from "@/lib/admin/auth";
import { verifySessionToken as verifyTruckCheckToken } from "@/lib/truckcheck/auth";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect all /admin/* except /admin/login
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const token = req.cookies.get("mas_admin")?.value;
    if (!token || !verifyAdminToken(token)) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
  }

  // Protect /truckcheck pages — except the login page and the PWA manifest
  if (
    pathname.startsWith("/truckcheck") &&
    !pathname.startsWith("/truckcheck/login") &&
    !pathname.startsWith("/truckcheck/manifest")
  ) {
    const token = req.cookies.get("mas_truckcheck")?.value;
    if (!token || !verifyTruckCheckToken(token)) {
      const url = req.nextUrl.clone();
      url.pathname = "/truckcheck/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/truckcheck/:path*"],
};
