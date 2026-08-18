import { NextRequest } from "next/server";
import {
  LOUNGE_PREAUTH_COOKIE_NAME,
  consumePreauthChallenge,
  cookieOptions,
  findEmployeeById,
  logLogin,
  makeSessionToken,
  readPreauthChallenge,
  recordPreauthFailure,
} from "@/lib/lounge/auth";
import { verifyLoginCode } from "@/lib/lounge/sms-login";
import { issueTrustedDevice, trustCookieOptions } from "@/lib/lounge/trusted-devices";
import { contentLengthWithin, hasContentType, isSameOriginRequest, noStoreJson } from "@/lib/security/http";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { recordSecurityAudit } from "@/lib/security/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function uaToDeviceLabel(ua: string | null): string | null {
  if (!ua) return null;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows PC";
  return null;
}

export async function POST(req: NextRequest) {
  if (
    !isSameOriginRequest(req) ||
    !hasContentType(req, "application/json") ||
    !contentLengthWithin(req, 4 * 1024)
  ) {
    return noStoreJson({ error: "Invalid request" }, { status: 403 });
  }
  const cookie = req.cookies.get(LOUNGE_PREAUTH_COOKIE_NAME)?.value;
  const limit = await checkRateLimit(req, "lounge-sms-login-verify", {
    limit: 8,
    windowMs: 15 * 60_000,
    blockMs: 30 * 60_000,
    discriminator: cookie ?? "missing",
  });
  if (!limit.allowed) {
    return noStoreJson({ error: "Too many attempts. Sign in again." }, { status: 429 });
  }
  const session = cookie ? await readPreauthChallenge(cookie, "verify_sms") : null;
  if (!session) {
    await recordSecurityAudit({
      actorType: "employee",
      action: "lounge_sms_code_verify",
      resourceType: "authentication",
      outcome: "denied",
      req,
      detail: { reason: "invalid_challenge" },
    });
    return noStoreJson({ error: "Preauth expired — log in again." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const trustDevice = body.trustDevice === true;
  const result = await verifyLoginCode(session.employeeId, code);
  if (!result.ok) {
    await recordPreauthFailure(cookie!);
    await recordSecurityAudit({
      actorType: "employee",
      actorId: session.employeeId,
      action: "lounge_sms_code_verify",
      resourceType: "authentication",
      outcome: "denied",
      req,
      detail: { reason: "wrong_or_expired_code" },
    });
    return noStoreJson({ error: result.reason ?? "Wrong code." }, { status: 401 });
  }

  const emp = await findEmployeeById(session.employeeId);
  if (!emp || !emp.isActive) {
    return noStoreJson({ error: "Account inactive" }, { status: 403 });
  }

  const consumed = await consumePreauthChallenge(cookie!, "verify_sms");
  if (!consumed) {
    return noStoreJson({ error: "That verification was already used or expired. Sign in again." }, { status: 409 });
  }

  await logLogin(
    emp.id,
    emp.username,
    true,
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    req.headers.get("user-agent") ?? null,
  );
  await recordSecurityAudit({
    actorType: "employee",
    actorId: emp.id,
    action: "lounge_sms_code_verify",
    resourceType: "authentication",
    outcome: "completed",
    req,
    detail: { setupTokenConsumed: consumed.usesSetupToken },
  });

  const token = makeSessionToken(emp);
  const opts = cookieOptions(token);
  const res = noStoreJson({
    ok: true,
    employee: { id: emp.id, firstName: emp.firstName, lastName: emp.lastName, isAdmin: emp.isAdmin },
  });
  res.cookies.set(opts.name, opts.value, {
    httpOnly: opts.httpOnly,
    secure: opts.secure,
    sameSite: opts.sameSite,
    maxAge: opts.maxAge,
    path: opts.path,
  });
  res.cookies.set(LOUNGE_PREAUTH_COOKIE_NAME, "", { path: "/", maxAge: 0 });

  if (trustDevice) {
    const label = uaToDeviceLabel(req.headers.get("user-agent"));
    const trustToken = await issueTrustedDevice(emp.id, label);
    const tOpts = trustCookieOptions(trustToken);
    res.cookies.set(tOpts.name, tOpts.value, {
      httpOnly: tOpts.httpOnly,
      secure: tOpts.secure,
      sameSite: tOpts.sameSite,
      maxAge: tOpts.maxAge,
      path: tOpts.path,
    });
  }

  return res;
}
