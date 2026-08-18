import { NextRequest } from "next/server";
import {
  consumePreauthChallenge,
  cookieOptions,
  findEmployeeById,
  getTotpEnrollment,
  LOUNGE_PREAUTH_COOKIE_NAME,
  makeSessionToken,
  preauthCookieOptions,
  readPreauthChallenge,
  recordPreauthFailure,
  replacePreauthChallenge,
  logLogin,
} from "@/lib/lounge/auth";
import { verifyCode } from "@/lib/lounge/totp";
import { issueTrustedDevice, trustCookieOptions } from "@/lib/lounge/trusted-devices";
import { contentLengthWithin, hasContentType, isSameOriginRequest, noStoreJson } from "@/lib/security/http";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { recordSecurityAudit } from "@/lib/security/audit";

function uaToDeviceLabel(ua: string | null): string | null {
  if (!ua) return null;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows PC";
  return null;
}

export const dynamic = "force-dynamic";

// POST { code } — already-enrolled employee verifies the 6-digit TOTP code
// against their stored secret. Trades preauth for full session cookie.
export async function POST(req: NextRequest) {
  if (
    !isSameOriginRequest(req) ||
    !hasContentType(req, "application/json") ||
    !contentLengthWithin(req, 4 * 1024)
  ) {
    return noStoreJson({ error: "Invalid request" }, { status: 403 });
  }
  const cookie = req.cookies.get(LOUNGE_PREAUTH_COOKIE_NAME)?.value;
  const body = await req.json().catch(() => ({}));
  const limit = await checkRateLimit(req, "lounge-totp-verify", {
    limit: 8,
    windowMs: 15 * 60_000,
    blockMs: 30 * 60_000,
    discriminator: cookie ?? "missing",
  });
  if (!limit.allowed) {
    return noStoreJson({ error: "Too many attempts. Sign in again." }, { status: 429 });
  }

  if (body.switchToTotp === true) {
    const smsChallenge = cookie ? await readPreauthChallenge(cookie, "verify_sms") : null;
    if (!smsChallenge) {
      return noStoreJson({ error: "Preauth expired — log in again." }, { status: 401 });
    }
    const enrollment = await getTotpEnrollment(smsChallenge.employeeId);
    if (!enrollment.secret || !enrollment.enrolledAt) {
      return noStoreJson({ error: "Authenticator sign-in is not available." }, { status: 409 });
    }
    const replacement = await replacePreauthChallenge(cookie!, "verify_sms", "verify_totp");
    if (!replacement) {
      return noStoreJson({ error: "Preauth expired — log in again." }, { status: 401 });
    }
    await recordSecurityAudit({
      actorType: "employee",
      actorId: smsChallenge.employeeId,
      action: "lounge_preauth_factor_switched",
      resourceType: "authentication",
      outcome: "completed",
      req,
      detail: { from: "verify_sms", to: "verify_totp" },
    });
    const response = noStoreJson({ ok: true });
    response.cookies.set(preauthCookieOptions(replacement));
    return response;
  }

  const session = cookie ? await readPreauthChallenge(cookie, "verify_totp") : null;
  if (!session) {
    await recordSecurityAudit({
      actorType: "employee",
      action: "lounge_totp_verify",
      resourceType: "authentication",
      outcome: "denied",
      req,
      detail: { reason: "invalid_challenge" },
    });
    return noStoreJson({ error: "Preauth expired — log in again." }, { status: 401 });
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  const trustDevice = body.trustDevice === true;
  if (!/^\d{6}$/.test(code)) {
    await recordPreauthFailure(cookie!);
    return noStoreJson({ error: "6-digit code required" }, { status: 400 });
  }

  const emp = await findEmployeeById(session.employeeId);
  if (!emp || !emp.isActive) return noStoreJson({ error: "Not found" }, { status: 404 });

  const { secret, enrolledAt } = await getTotpEnrollment(emp.id);
  if (!secret || !enrolledAt) {
    return noStoreJson({ error: "2FA not enrolled. Restart login." }, { status: 400 });
  }
  if (!verifyCode(secret, code)) {
    await recordPreauthFailure(cookie!);
    await recordSecurityAudit({
      actorType: "employee",
      actorId: emp.id,
      action: "lounge_totp_verify",
      resourceType: "authentication",
      outcome: "denied",
      req,
      detail: { reason: "wrong_code" },
    });
    return noStoreJson({ error: "Wrong code. Try again." }, { status: 401 });
  }

  const consumed = await consumePreauthChallenge(cookie!, "verify_totp");
  if (!consumed) {
    return noStoreJson({ error: "That verification was already used or expired. Sign in again." }, { status: 409 });
  }
  await logLogin(emp.id, emp.username, true, req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, req.headers.get("user-agent") ?? null);
  await recordSecurityAudit({
    actorType: "employee",
    actorId: emp.id,
    action: "lounge_totp_verify",
    resourceType: "authentication",
    outcome: "completed",
    req,
    detail: { setupTokenConsumed: consumed.usesSetupToken },
  });

  const token = makeSessionToken(emp);
  const opts = cookieOptions(token);
  const res = noStoreJson({ ok: true, employee: { id: emp.id, firstName: emp.firstName, lastName: emp.lastName, isAdmin: emp.isAdmin } });
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
