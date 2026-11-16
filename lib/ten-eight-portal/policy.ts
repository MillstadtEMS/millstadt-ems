export const UPSTREAM_ORIGIN = "https://ten-eight-training.onrender.com";
const READS = new Set([
  "workspace-config",
  "snapshot",
  "map-assets",
  "map-categories",
  "voice",
  "radio",
  "map-config",
  "agency/service-profile",
  "emergencies",
]);
const WRITES = new Set([
  "demo/login",
  "logout",
  "demo/scenario",
  "training/dispatch",
  "radio/channels",
  "map-assets",
  "map-categories",
  "media/fixture",
  "emergencies",
]);
const ID = "[^/]+";
const EXTRA_READS = new RegExp(`^(training/dispatch/${ID}|media/${ID})$`);
const EXTRA_WRITES = new RegExp(
  `^(media/${ID}/remove|map-assets/${ID}/review|incidents/${ID}/(notes|respond|team-notes)|team-notes/${ID}/(submit|review)|radio/channels/${ID}/transcripts|radio/transcripts/${ID}/review|emergencies/${ID}/(acknowledge|resolve))$`,
);

export function allowedDemoRequest(method: string, path: string): boolean {
  // IDs may contain spaces or colons, but never an alternate separator or a
  // dot path. The caller re-encodes each component before constructing a URL.
  if (
    path.length > 1024 ||
    path
      .split("/")
      .some(
        (segment) =>
          !segment ||
          segment === "." ||
          segment === ".." ||
          /[\\%?#\u0000-\u001f\u007f]/.test(segment),
      )
  )
    return false;
  return method === "GET"
    ? READS.has(path) || EXTRA_READS.test(path)
    : method === "POST" && (WRITES.has(path) || EXTRA_WRITES.test(path));
}
export function validDemoBody(
  path: string,
  body: Record<string, unknown>,
): boolean {
  if (
    /^incidents\/[^/]+\/respond$/.test(path) &&
    body.shareLocation !== undefined &&
    body.shareLocation !== false
  )
    return false;
  if (path === "training/dispatch" && body.criticalRequested !== false)
    return false;
  return true;
}
export function sameOriginMutation(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") return false;
  const origin = request.headers.get("origin");
  if (!origin) return fetchSite === "same-origin";
  try {
    let expected = new URL(request.url);
    // Next's Node handler can retain an HTTP internal URL behind TLS
    // termination. Match the website's existing forwarded-protocol handling,
    // without accepting a caller-supplied destination or forwarded host.
    const protocol = request.headers
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim();
    if (protocol && !["https", "http"].includes(protocol)) return false;
    if (protocol) expected.protocol = `${protocol}:`;
    const host = request.headers.get("host");
    if (host) {
      if (host.length > 255 || !/^[a-z0-9.\-:\[\]]+$/i.test(host)) return false;
      // Use the actual HTTP Host, as the site's existing CSRF policy does;
      // Next may construct request.url with an internal localhost hostname.
      expected = new URL(`${expected.protocol}//${host}`);
    }
    return (
      new URL(origin).origin === expected.origin &&
      origin === new URL(origin).origin
    );
  } catch {
    return false;
  }
}
export function isPublicDemo(value: unknown): value is Record<string, unknown> {
  return (
    !!value &&
    typeof value === "object" &&
    (value as Record<string, unknown>).publicPreview === true &&
    (value as Record<string, unknown>).realm === "public-demo"
  );
}
export const PORTAL_CSP = [
  "default-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://tile.openstreetmap.org",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "frame-src 'none'",
  "worker-src 'none'",
  "manifest-src 'none'",
].join("; ");
export function protectResponse(response: Response): Response {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("CDN-Cache-Control", "no-store");
  response.headers.set("Vercel-CDN-Cache-Control", "no-store");
  response.headers.set(
    "X-Robots-Tag",
    "noindex, nofollow, noarchive, nosnippet",
  );
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Content-Security-Policy", PORTAL_CSP);
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  return response;
}
