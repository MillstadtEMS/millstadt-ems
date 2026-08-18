import { NextRequest } from "next/server";
import {
  completeTotpEnrollmentChallenge,
  cookieOptions,
  findEmployeeById,
  getTotpEnrollment,
  LOUNGE_PREAUTH_COOKIE_NAME,
  makeSessionToken,
  readPreauthChallenge,
  recordPreauthFailure,
  revokePreauthChallenge,
  logLogin,
} from "@/lib/lounge/auth";
import { otpauthUrl, verifyCode } from "@/lib/lounge/totp";
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
export const runtime = "nodejs";

// GET — reveal only the pending secret bound to a fresh enrollment challenge.
// The client generates the QR from the returned otpauth:// URL — that
// avoids any server-side QR library failure leaving the user stuck.
export async function GET(req: NextRequest) {
  try {
    const cookie = req.cookies.get(LOUNGE_PREAUTH_COOKIE_NAME)?.value;
    const limit = await checkRateLimit(req, "lounge-totp-enrollment-read", {
      limit: 10,
      windowMs: 10 * 60_000,
      blockMs: 30 * 60_000,
      discriminator: cookie ?? "missing",
    });
    if (!limit.allowed) {
      await recordSecurityAudit({
        actorType: "employee",
        action: "lounge_totp_enrollment_read",
        resourceType: "authentication",
        outcome: "denied",
        req,
        detail: { reason: "rate_limited" },
      });
      return noStoreJson({ error: "Too many attempts. Sign in again." }, { status: 429 });
    }
    const session = cookie ? await readPreauthChallenge(cookie, "enroll_totp") : null;
    if (!session) {
      await recordSecurityAudit({
        actorType: "employee",
        action: "lounge_totp_enrollment_read",
        resourceType: "authentication",
        outcome: "denied",
        req,
        detail: { reason: "invalid_challenge" },
      });
      return noStoreJson({ error: "Preauth expired — go back and sign in again." }, { status: 401 });
    }

    const emp = await findEmployeeById(session.employeeId);
    if (!emp || !emp.isActive) {
      await revokePreauthChallenge(cookie!);
      return noStoreJson({ error: "Employee not found" }, { status: 404 });
    }

    const existing = await getTotpEnrollment(emp.id);
    if (existing.secret || existing.enrolledAt || !session.enrollmentSecret) {
      await revokePreauthChallenge(cookie!);
      await recordSecurityAudit({
        actorType: "employee",
        actorId: emp.id,
        action: "lounge_totp_enrollment_read",
        resourceType: "authentication",
        outcome: "denied",
        req,
        detail: { reason: existing.enrolledAt ? "factor_already_enrolled" : "invalid_challenge" },
      });
      return noStoreJson({ error: "Authenticator setup is not available. Sign in normally or contact management." }, { status: 409 });
    }
    const secret = session.enrollmentSecret;

    const issuer = "Millstadt EMS Employee Lounge";
    const account = emp.username;
    const otp = otpauthUrl({
      issuer,
      account,
      secret,
    });
    await recordSecurityAudit({
      actorType: "employee",
      actorId: emp.id,
      action: "lounge_totp_enrollment_read",
      resourceType: "authentication",
      outcome: "allowed",
      req,
    });
    return noStoreJson({ otpauth: otp, secret, issuer, account, authenticator: "microsoft" });
  } catch (e) {
    console.error("[setup-2fa GET] failed:", e);
    return noStoreJson({ error: "Could not start two-factor setup. Please try again." }, { status: 500 });
  }
}

// POST { code } — verify the code, mark enrolled, issue the real session cookie.
export async function POST(req: NextRequest) {
  if (
    !isSameOriginRequest(req) ||
    !hasContentType(req, "application/json") ||
    !contentLengthWithin(req, 4 * 1024)
  ) {
    return noStoreJson({ error: "Invalid request" }, { status: 403 });
  }
  const cookie = req.cookies.get(LOUNGE_PREAUTH_COOKIE_NAME)?.value;
  const limit = await checkRateLimit(req, "lounge-totp-enrollment-verify", {
    limit: 8,
    windowMs: 15 * 60_000,
    blockMs: 30 * 60_000,
    discriminator: cookie ?? "missing",
  });
  if (!limit.allowed) {
    return noStoreJson({ error: "Too many attempts. Sign in again." }, { status: 429 });
  }
  const session = cookie ? await readPreauthChallenge(cookie, "enroll_totp") : null;
  if (!session) {
    await recordSecurityAudit({
      actorType: "employee",
      action: "lounge_totp_enrollment_verify",
      resourceType: "authentication",
      outcome: "denied",
      req,
      detail: { reason: "invalid_challenge" },
    });
    return noStoreJson({ error: "Preauth expired" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const trustDevice = body.trustDevice === true;
  if (!/^\d{6}$/.test(code)) {
    await recordPreauthFailure(cookie!);
    return noStoreJson({ error: "6-digit code required" }, { status: 400 });
  }

  const emp = await findEmployeeById(session.employeeId);
  if (!emp || !emp.isActive) {
    await revokePreauthChallenge(cookie!);
    return noStoreJson({ error: "Not found" }, { status: 404 });
  }

  const existing = await getTotpEnrollment(emp.id);
  const secret = session.enrollmentSecret;
  if (existing.secret || existing.enrolledAt || !secret) {
    await revokePreauthChallenge(cookie!);
    return noStoreJson({ error: "Authenticator setup is not available. Restart login." }, { status: 409 });
  }

  if (!verifyCode(secret, code)) {
    await recordPreauthFailure(cookie!);
    await recordSecurityAudit({
      actorType: "employee",
      actorId: emp.id,
      action: "lounge_totp_enrollment_verify",
      resourceType: "authentication",
      outcome: "denied",
      req,
      detail: { reason: "wrong_code" },
    });
    return noStoreJson({ error: "Wrong code. Try again." }, { status: 401 });
  }

  const completed = await completeTotpEnrollmentChallenge(cookie!);
  if (!completed) {
    return noStoreJson({ error: "That setup was already used or expired. Sign in again." }, { status: 409 });
  }
  await logLogin(emp.id, emp.username, true, req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, req.headers.get("user-agent") ?? null);
  await recordSecurityAudit({
    actorType: "employee",
    actorId: emp.id,
    action: "lounge_totp_enrollment_verify",
    resourceType: "authentication",
    outcome: "completed",
    req,
    detail: { setupTokenConsumed: completed.usesSetupToken },
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
  // Burn the preauth cookie
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
