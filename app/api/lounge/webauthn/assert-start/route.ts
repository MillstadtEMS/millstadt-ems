import { NextRequest } from "next/server";
import { findEmployeeByUsername } from "@/lib/lounge/auth";
import { startAuthentication } from "@/lib/lounge/webauthn";
import { contentLengthWithin, hasContentType, isSameOriginRequest, noStoreJson } from "@/lib/security/http";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Generates an authentication challenge. Optionally accepts a username to
 * narrow the allowed credentials list — useful when the same iPhone has
 * passkeys for several lounge accounts. Omit for a fully-discoverable
 * sign-in.
 */
export async function POST(req: NextRequest) {
  if (
    !isSameOriginRequest(req) ||
    !hasContentType(req, "application/json") ||
    !contentLengthWithin(req, 2 * 1024)
  ) {
    return noStoreJson({ error: "Invalid request" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const username = typeof body.username === "string" ? body.username.trim() : "";
  if (username.length > 254) {
    return noStoreJson({ error: "Biometric sign-in unavailable" }, { status: 401 });
  }
  const limit = await checkRateLimit(req, "lounge-passkey-start", {
    limit: 10,
    windowMs: 15 * 60_000,
    blockMs: 30 * 60_000,
    discriminator: username,
  });
  if (!limit.allowed) {
    const response = noStoreJson({ error: "Too many attempts. Try again later." }, { status: 429 });
    response.headers.set("Retry-After", String(limit.retryAfterSeconds));
    return response;
  }
  let employeeId: string | undefined;
  if (username) {
    const emp = await findEmployeeByUsername(username);
    if (!emp || !emp.isActive) {
      return noStoreJson({ error: "Biometric sign-in unavailable" }, { status: 401 });
    }
    employeeId = emp.id;
  }
  const options = await startAuthentication(
    employeeId,
    req.headers.get("host"),
    req.headers.get("origin"),
  );
  return noStoreJson({ options });
}
