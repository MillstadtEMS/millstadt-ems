import { NextRequest, NextResponse } from "next/server";
import {
  findEmployeeByUsername,
  verifyPassword,
  logLogin,
  getTotpEnrollment,
  makePreauthToken,
  preauthCookieOptions,
} from "@/lib/lounge/auth";
import { sql } from "@/lib/lounge/db";
import { sendLoginCode } from "@/lib/lounge/sms-login";

export const dynamic = "force-dynamic";

// Step 1 of 2 — verifies the password and issues a short-lived preauth
// cookie. The real session cookie is not granted until 2FA passes via
// /api/lounge/verify-2fa or /api/lounge/setup-2fa.
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = req.headers.get("user-agent") ?? null;

  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const username = (body.username ?? "").trim();
  const password = body.password ?? "";

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  const emp = await findEmployeeByUsername(username);
  if (!emp || !emp.isActive || !verifyPassword(password, emp.passwordHash)) {
    await logLogin(emp?.id ?? null, username, false, ip, ua);
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const { secret, enrolledAt } = await getTotpEnrollment(emp.id);
  const totpEnrolled = !!secret && !!enrolledAt;
  const preauth = makePreauthToken(emp.id);

  // SMS-via-Twilio is only used when:
  //   1. Twilio env vars are configured (so we're not paying for fallback
  //      "would-have-sent" placeholders that just confuse the user), AND
  //   2. The employee has a verified mobile on file.
  // Otherwise we stick with Microsoft Authenticator (TOTP) — free, no
  // per-message cost, and the experience users already know.
  const twilioConfigured =
    !!process.env.TWILIO_ACCOUNT_SID &&
    !!process.env.TWILIO_AUTH_TOKEN &&
    !!process.env.TWILIO_FROM_NUMBER;
  let hasVerifiedPhone = false;
  if (twilioConfigured) {
    const phoneRows = (await sql()`
      SELECT phone, phone_verified_at FROM lounge_employees WHERE id = ${emp.id} LIMIT 1
    `) as unknown as { phone: string | null; phone_verified_at: string | null }[];
    hasVerifiedPhone = !!(phoneRows[0]?.phone && phoneRows[0]?.phone_verified_at);
  }

  let step: "verify_sms" | "verify_2fa" | "setup_2fa";
  let phoneTail: string | null = null;
  let smsDevCode: string | undefined;
  if (twilioConfigured && hasVerifiedPhone) {
    step = "verify_sms";
    const sent = await sendLoginCode(emp.id);
    phoneTail = sent.phoneTail ?? null;
    if (sent.via === "fallback" && sent.devCode) smsDevCode = sent.devCode;
  } else if (totpEnrolled) {
    step = "verify_2fa";
  } else {
    step = "setup_2fa";
  }

  const res = NextResponse.json({
    ok: true,
    step,
    phoneTail,
    devCode: smsDevCode,
    canUseTotp: totpEnrolled,
    employee: { id: emp.id, firstName: emp.firstName, lastName: emp.lastName },
  });
  const opts = preauthCookieOptions(preauth);
  res.cookies.set(opts.name, opts.value, {
    httpOnly: opts.httpOnly,
    secure: opts.secure,
    sameSite: opts.sameSite,
    maxAge: opts.maxAge,
    path: opts.path,
  });
  return res;
}
