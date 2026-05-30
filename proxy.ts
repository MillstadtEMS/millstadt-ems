import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken as verifyAdminToken } from "@/lib/admin/auth";
import { verifySessionToken as verifyTruckCheckToken } from "@/lib/truckcheck/auth";

/**
 * Attach a conservative set of security headers to every response so
 * they're applied uniformly without each route having to remember them.
 *
 * - X-Content-Type-Options: nosniff           -> blocks MIME sniffing
 * - X-Frame-Options: DENY                     -> blocks iframe embeds
 * - Referrer-Policy: strict-origin-when-cross-origin
 * - Permissions-Policy: camera + microphone allowed on same origin
 *   (microphone for the inventory voice input); geolocation/payment off
 * - Strict-Transport-Security: 2-year HSTS, production only
 */
function withSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(self), geolocation=(), payment=(), interest-cohort=()",
  );
  if (process.env.NODE_ENV === "production") {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }
  return res;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect all /admin/* except /admin/login
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const adminToken = req.cookies.get("mas_admin")?.value;
    const loungeToken = req.cookies.get("mas_lounge")?.value;
    const adminOk = adminToken && verifyAdminToken(adminToken);
    // Lounge SSO: any active lounge admin gets through middleware. The
    // /admin routes call isAdminAuthed() which re-verifies the lounge
    // cookie against the DB and checks isAdmin — so a forged lounge
    // cookie still can't see admin data, it just gets past the gate.
    if (!adminOk && !loungeToken) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("from", pathname);
      return withSecurityHeaders(NextResponse.redirect(url));
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
      return withSecurityHeaders(NextResponse.redirect(url));
    }
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  // Cover pages + API routes for both the auth gates and the security
  // headers. Skip Next.js' internal asset paths and any request that
  // looks like a static file (has an extension).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
