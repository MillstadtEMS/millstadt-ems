import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken as verifyTruckCheckToken } from "@/lib/truckcheck/auth";
import { verifySessionToken as verifyLoungeToken } from "@/lib/lounge/auth";

const RETAINED_BOARD_MIGRATION_ARTIFACTS = new Set([
  "/board/referendum/current.xlsx",
  "/board/referendum/current.json",
]);

function isSameOriginRequest(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") return false;
  if (!origin) return fetchSite === "same-origin";
  try {
    const parsed = new URL(origin);
    return parsed.protocol === req.nextUrl.protocol && parsed.host === req.nextUrl.host;
  } catch {
    return false;
  }
}

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
function withSecurityHeaders(res: NextResponse, pathname = ""): NextResponse {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  res.headers.set("X-Download-Options", "noopen");
  res.headers.set("Origin-Agent-Cluster", "?1");
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
  const productionUpgrade = process.env.NODE_ENV === "production" ? "; upgrade-insecure-requests" : "";
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "script-src 'self' 'unsafe-inline'" +
        (process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"),
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://api.weather.gov https://tilecache.rainviewer.com https://*.basemaps.cartocdn.com https://mesonet.agron.iastate.edu",
      "font-src 'self' data:",
      "connect-src 'self' https://api.weather.gov https://api.open-meteo.com https://api.rainviewer.com https://tilecache.rainviewer.com",
      "frame-src 'self' https://calendar.google.com https://embed.waze.com https://www.youtube.com",
      "media-src 'self' blob:",
      "worker-src 'self' blob:",
      `manifest-src 'self'${productionUpgrade}`,
    ].join("; "),
  );
  const protectedPath =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/lounge") ||
    pathname.startsWith("/board") ||
    pathname.startsWith("/inventory") ||
    pathname.startsWith("/truckcheck") ||
    pathname.startsWith("/api/");
  if (protectedPath) {
    res.headers.set("Cache-Control", "no-store, private");
    res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  if (
    pathname.startsWith("/financials-information-hub") ||
    pathname.startsWith("/admin/financials") ||
    pathname.startsWith("/api/financials") ||
    pathname.startsWith("/api/admin/financials")
  ) {
    res.headers.set("Cache-Control", "no-store, private");
    res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    res.headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "object-src 'none'",
        "script-src 'self' 'unsafe-inline'" +
          (process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"),
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "worker-src 'self' blob:",
      ].join("; "),
    );
  }
  return res;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtectedBrowserMutation =
    ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
    (pathname.startsWith("/api/lounge/") || pathname.startsWith("/api/board/"));
  if (isProtectedBrowserMutation && !isSameOriginRequest(req)) {
    return withSecurityHeaders(
      NextResponse.json({ error: "Invalid request origin." }, { status: 403 }),
      pathname,
    );
  }

  if (RETAINED_BOARD_MIGRATION_ARTIFACTS.has(pathname)) {
    return withSecurityHeaders(new NextResponse("Not found", { status: 404 }), pathname);
  }

  if (process.env.NODE_ENV === "production" && req.headers.get("x-forwarded-proto") === "http") {
    const secureUrl = req.nextUrl.clone();
    secureUrl.protocol = "https:";
    return withSecurityHeaders(NextResponse.redirect(secureUrl, 308), pathname);
  }

  if (
    process.env.NODE_ENV === "production" &&
    (pathname.startsWith("/admin/dev-tools") || pathname.startsWith("/api/admin/dev/"))
  ) {
    return withSecurityHeaders(new NextResponse("Not found", { status: 404 }), pathname);
  }

  const loungeSurface =
    pathname.startsWith("/lounge") ||
    pathname.startsWith("/api/lounge") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin");
  if (loungeSurface) {
    const loungeToken = req.cookies.get("mas_lounge")?.value;
    const employee = loungeToken
      ? await verifyLoungeToken(loungeToken, { allowPasswordChangeRequired: true })
      : null;
    if (employee?.mustChangePassword) {
      const allowed =
        pathname === "/lounge/change-password" ||
        pathname === "/api/lounge/me" ||
        pathname === "/api/lounge/change-password" ||
        pathname === "/api/lounge/logout" ||
        pathname === "/api/lounge/setup-2fa" ||
        pathname === "/api/lounge/verify-2fa" ||
        pathname.startsWith("/api/lounge/sms-login-code/");
      if (!allowed) {
        if (pathname.startsWith("/api/")) {
          return withSecurityHeaders(
            NextResponse.json(
              { error: "Password change required", code: "PASSWORD_CHANGE_REQUIRED" },
              { status: 409 },
            ),
            pathname,
          );
        }
        const url = req.nextUrl.clone();
        url.pathname = "/lounge/change-password";
        url.search = "";
        return withSecurityHeaders(NextResponse.redirect(url), pathname);
      }
    }
  }

  // Protect administrator pages and APIs with a verified named Lounge
  // session. Financial APIs keep their own feature-gated guard so disabled
  // production routes continue to return 404 without disclosing them.
  const protectedAdminPage = pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");
  const protectedAdminApi =
    pathname.startsWith("/api/admin") &&
    !pathname.startsWith("/api/admin/login") &&
    !pathname.startsWith("/api/admin/analytics") &&
    !pathname.startsWith("/api/admin/financials");
  if (protectedAdminPage || protectedAdminApi) {
    const loungeToken = req.cookies.get("mas_lounge")?.value;
    const employee = loungeToken ? await verifyLoungeToken(loungeToken) : null;
    const tickerEditorApi =
      pathname.startsWith("/api/admin/calls") || pathname.startsWith("/api/admin/cad-poll");
    const authorized = tickerEditorApi ? Boolean(employee?.isActive) : Boolean(employee?.isActive && employee.isAdmin);
    if (!authorized) {
      if (protectedAdminApi) {
        return withSecurityHeaders(
          NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
          pathname,
        );
      }
      const url = req.nextUrl.clone();
      url.pathname = "/lounge/login";
      url.search = "";
      url.searchParams.set("next", pathname);
      return withSecurityHeaders(NextResponse.redirect(url), pathname);
    }
  }

  // Protect /truckcheck pages — except the login page and the PWA manifest
  if (
    pathname.startsWith("/truckcheck") &&
    !pathname.startsWith("/truckcheck/login") &&
    !pathname.startsWith("/truckcheck/manifest")
  ) {
    const token = req.cookies.get("mas_truckcheck")?.value;
    const loungeToken = req.cookies.get("mas_lounge")?.value;
    if (!token || !loungeToken || !verifyTruckCheckToken(token, loungeToken)) {
      const url = req.nextUrl.clone();
      url.pathname = "/truckcheck/login";
      return withSecurityHeaders(NextResponse.redirect(url), pathname);
    }
  }

  return withSecurityHeaders(NextResponse.next(), pathname);
}

export const config = {
  // Cover pages + API routes for both the auth gates and the security
  // headers. Skip Next.js' internal asset paths and any request that
  // looks like a static file (has an extension).
  matcher: [
    "/board/referendum/current.xlsx",
    "/board/referendum/current.json",
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
