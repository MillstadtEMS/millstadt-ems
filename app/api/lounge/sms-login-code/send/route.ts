import { NextRequest, NextResponse } from "next/server";
import {
  LOUNGE_PREAUTH_COOKIE_NAME,
  readPreauthChallenge,
} from "@/lib/lounge/auth";
import { sendLoginCode } from "@/lib/lounge/sms-login";
import { isSameOriginRequest, noStoreJson } from "@/lib/security/http";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { recordSecurityAudit } from "@/lib/security/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return noStoreJson({ error: "Invalid request" }, { status: 403 });
  }
  const cookie = req.cookies.get(LOUNGE_PREAUTH_COOKIE_NAME)?.value;
  const limit = await checkRateLimit(req, "lounge-sms-login-send", {
    limit: 5,
    windowMs: 15 * 60_000,
    blockMs: 30 * 60_000,
    discriminator: cookie ?? "missing",
  });
  if (!limit.allowed) {
    return noStoreJson({ error: "Too many codes requested. Sign in again later." }, { status: 429 });
  }
  const session = cookie ? await readPreauthChallenge(cookie, "verify_sms") : null;
  if (!session) {
    await recordSecurityAudit({
      actorType: "employee",
      action: "lounge_sms_code_send",
      resourceType: "authentication",
      outcome: "denied",
      req,
      detail: { reason: "invalid_challenge" },
    });
    return noStoreJson({ error: "Preauth expired — log in again." }, { status: 401 });
  }

  const result = await sendLoginCode(session.employeeId);
  await recordSecurityAudit({
    actorType: "employee",
    actorId: session.employeeId,
    action: "lounge_sms_code_send",
    resourceType: "authentication",
    outcome: result.ok ? "completed" : "failed",
    req,
  });
  if (!result.ok) return noStoreJson({ error: result.reason ?? "Could not send code." }, { status: 400 });
  return noStoreJson({
    ok: true,
    delivered: result.delivered,
    via: result.via,
    phoneTail: result.phoneTail,
    devCode: result.devCode,
  });
}
