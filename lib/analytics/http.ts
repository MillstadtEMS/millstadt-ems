import { NextRequest, NextResponse } from "next/server";
import { saveSecurityEvent } from "./store";

type RateLimitEntry = { count: number; resetAt: number };

declare global {
  var __millstadtAnalyticsRateLimits: Map<string, RateLimitEntry> | undefined;
}

function rateLimits() {
  globalThis.__millstadtAnalyticsRateLimits ??= new Map();
  return globalThis.__millstadtAnalyticsRateLimits;
}

export function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store, private");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

export function isSameOriginRequest(req: NextRequest) {
  const origin = req.headers.get("origin");
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") return false;
  if (!origin) return fetchSite === "same-origin";
  try {
    const requestHost = req.headers.get("host")?.trim() || req.nextUrl.host;
    return new URL(origin).host === requestHost;
  } catch {
    return false;
  }
}

export function requestIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    null
  );
}

export async function allowAnalyticsRequest(
  req: NextRequest,
  bucket: string,
  maximum = 120,
  windowMs = 60_000,
) {
  const now = Date.now();
  const ip = requestIp(req) ?? "unavailable";
  const key = `${bucket}:${ip}`;
  const current = rateLimits().get(key);
  const entry = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
  entry.count += 1;
  rateLimits().set(key, entry);
  if (entry.count <= maximum) return true;

  await saveSecurityEvent({
    eventType: "rate_limit",
    route: req.nextUrl.pathname,
    method: req.method,
    responseStatus: 429,
    ipAddress: requestIp(req),
    userAgent: req.headers.get("user-agent"),
    reason: "Analytics endpoint rate limit exceeded.",
  }).catch(() => undefined);
  return false;
}

export function hasJsonContentType(req: NextRequest) {
  return req.headers.get("content-type")?.toLowerCase().startsWith("application/json") ?? false;
}

export function contentLengthWithin(req: NextRequest, maximumBytes: number) {
  const raw = req.headers.get("content-length");
  if (!raw) return true;
  const length = Number(raw);
  return Number.isFinite(length) && length >= 0 && length <= maximumBytes;
}

export function cleanDateRange(fromValue: string | null, toValue: string | null) {
  const defaultTo = new Date();
  const defaultFrom = new Date(defaultTo.getTime() - 30 * 86_400_000);
  const from = fromValue ? new Date(fromValue) : defaultFrom;
  const to = toValue ? new Date(toValue) : defaultTo;
  if (
    Number.isNaN(from.getTime()) ||
    Number.isNaN(to.getTime()) ||
    from > to ||
    to.getTime() - from.getTime() > 366 * 86_400_000
  ) {
    return null;
  }
  return { from, to };
}
