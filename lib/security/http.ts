import { randomBytes, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const CSRF_HEADER = "x-csrf-token";

export function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store, private");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

export function csrfCookieName(scope: string) {
  return `mas_csrf_${scope.replace(/[^a-z0-9_-]/gi, "").slice(0, 24)}`;
}

export function issueCsrfToken(scope: string) {
  const token = randomBytes(32).toString("base64url");
  const response = noStoreJson({ csrfToken: token });
  response.cookies.set(csrfCookieName(scope), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60,
    path: "/",
  });
  return response;
}

export function isSameOriginRequest(req: NextRequest) {
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

export function hasValidCsrfToken(req: NextRequest, scope: string) {
  if (!isSameOriginRequest(req)) return false;
  const cookieToken = req.cookies.get(csrfCookieName(scope))?.value ?? "";
  const headerToken = req.headers.get(CSRF_HEADER) ?? "";
  if (!cookieToken || !headerToken) return false;
  const cookieBytes = Buffer.from(cookieToken);
  const headerBytes = Buffer.from(headerToken);
  return cookieBytes.length === headerBytes.length && timingSafeEqual(cookieBytes, headerBytes);
}

export function hasContentType(req: NextRequest, expected: string) {
  return req.headers.get("content-type")?.toLowerCase().startsWith(expected) ?? false;
}

export function contentLengthWithin(req: NextRequest, maximumBytes: number) {
  const raw = req.headers.get("content-length");
  if (!raw) return true;
  const size = Number(raw);
  return Number.isFinite(size) && size >= 0 && size <= maximumBytes;
}

export function requestIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export function safeHeaderValue(value: string, maximum = 160) {
  return value.replace(/[\r\n\0]/g, " ").replace(/\s+/g, " ").trim().slice(0, maximum);
}

export function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
