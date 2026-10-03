import { NextRequest, NextResponse } from "next/server";
import { createReviewToken, REVIEW_COOKIE, REVIEW_SECONDS, reviewConfigured, safeReviewPath, verifyReviewPassword } from "@/lib/election-review-auth";
import { isSameOriginRequest } from "@/lib/security/http";
import { checkRateLimit } from "@/lib/security/rate-limit";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) return new NextResponse("Invalid request origin.", { status: 403 });
  if (!reviewConfigured()) return NextResponse.redirect(new URL("/election-review?error=setup", req.url), 303);
  const rate = await checkRateLimit(req, "election-review", { limit: 10, windowMs: 15 * 60_000, blockMs: 15 * 60_000 });
  if (!rate.allowed) return NextResponse.redirect(new URL("/election-review?error=wait", req.url), 303);
  // Bound the body while streaming, including requests without Content-Length.
  if (!req.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) return new NextResponse("Unsupported form.", { status: 415 });
  const reader = req.body?.getReader();
  if (!reader) return new NextResponse("Invalid form.", { status: 400 });
  const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 4096) { await reader.cancel(); return new NextResponse("Form too large.", { status: 413 }); } chunks.push(value); } }
  finally { reader.releaseLock(); }
  const form = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
  const next = safeReviewPath(form.get("next"));
  if (!verifyReviewPassword(form.get("password"))) return NextResponse.redirect(new URL(`/election-review?error=password&next=${encodeURIComponent(next)}`, req.url), 303);
  const response = NextResponse.redirect(new URL(next, req.url), 303);
  response.cookies.set(REVIEW_COOKIE, createReviewToken(), { httpOnly: true, secure: req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https", sameSite: "lax", path: "/", maxAge: REVIEW_SECONDS });
  response.headers.set("Cache-Control", "no-store, private");
  return response;
}
