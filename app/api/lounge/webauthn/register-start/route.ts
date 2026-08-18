import { NextRequest } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { startRegistration } from "@/lib/lounge/webauthn";
import { isSameOriginRequest, noStoreJson } from "@/lib/security/http";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return noStoreJson({ error: "Invalid request" }, { status: 403 });
  }
  const me = await currentEmployee();
  if (!me) return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  if (me.mustChangePassword) {
    return noStoreJson({ error: "Choose your permanent password before adding a passkey" }, { status: 409 });
  }
  const limit = await checkRateLimit(req, "lounge-passkey-register", {
    limit: 6,
    windowMs: 60 * 60_000,
    blockMs: 60 * 60_000,
    discriminator: me.id,
  });
  if (!limit.allowed) {
    const response = noStoreJson({ error: "Too many attempts. Try again later." }, { status: 429 });
    response.headers.set("Retry-After", String(limit.retryAfterSeconds));
    return response;
  }
  const host = req.headers.get("host");
  const options = await startRegistration(
    me.id,
    me.username,
    `${me.firstName} ${me.lastName}`,
    host,
    req.headers.get("origin"),
  );
  return noStoreJson({ options });
}
