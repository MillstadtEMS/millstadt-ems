import { NextRequest, NextResponse } from "next/server";
import { createReviewToken, REVIEW_COOKIE, REVIEW_SECONDS, reviewConfigured, safeReviewPath, verifyReviewPassword } from "@/lib/election-review-auth";
import { isSameOriginRequest } from "@/lib/security/http";
import { checkRateLimit } from "@/lib/security/rate-limit";
export const runtime = "nodejs";
function reviewRedirect(path: string) {
  // A relative Location preserves the browser's origin behind proxies and local aliases.
  return new NextResponse(null, { status: 303, headers: { Location: path, "Cache-Control": "no-store, private" } });
}
export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) return new NextResponse("Invalid request origin.", { status: 403 });
  if (!reviewConfigured()) return reviewRedirect("/election-review?error=setup");
  const rate = await checkRateLimit(req, "election-review", { limit: 10, windowMs: 15 * 60_000, blockMs: 15 * 60_000 });
  if (!rate.allowed) return reviewRedirect("/election-review?error=wait");
  // Bound the body while streaming, including requests without Content-Length.
  if (!req.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) return new NextResponse("Unsupported form.", { status: 415 });
  const reader = req.body?.getReader();
  if (!reader) return new NextResponse("Invalid form.", { status: 400 });
  const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 4096) { await reader.cancel(); return new NextResponse("Form too large.", { status: 413 }); } chunks.push(value); } }
  finally { reader.releaseLock(); }
  const form = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
  const next = safeReviewPath(form.get("next"));
  if (!verifyReviewPassword(form.get("password"))) return reviewRedirect(`/election-review?error=password&next=${encodeURIComponent(next)}`);
  const response = reviewRedirect(next);
  response.cookies.set(REVIEW_COOKIE, createReviewToken(), { httpOnly: true, secure: req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https", sameSite: "lax", path: "/", maxAge: REVIEW_SECONDS });
  response.headers.set("Cache-Control", "no-store, private");
  return response;
}
