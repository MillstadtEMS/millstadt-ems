import { NextResponse, type NextRequest } from "next/server";

/**
 * Global edge middleware. Sole responsibility right now: attach a
 * conservative set of security headers to every response so they're
 * present uniformly without each route having to remember them.
 *
 * - X-Content-Type-Options: nosniff           -> blocks MIME sniffing
 * - X-Frame-Options: DENY                     -> blocks <iframe> embeds (we never
 *                                                embed ourselves; tighter than
 *                                                CSP frame-ancestors for older clients)
 * - Referrer-Policy: strict-origin-when-cross-origin -> path/query are not sent
 *                                                cross-origin
 * - Permissions-Policy: opt out of features we don't use
 * - Strict-Transport-Security: 2-year HSTS (production only — local dev runs
 *                                            on http://localhost)
 */
export function middleware(_req: NextRequest) {
  const res = NextResponse.next();

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

export const config = {
  // Skip the headers for Next.js' internal asset routes and the public files.
  // Everything else (pages + /api) gets them.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
