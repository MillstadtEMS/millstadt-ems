import { NextRequest, NextResponse } from "next/server";
import {
  cookieOptions,
  findEmployeeById,
  getTotpEnrollment,
  LOUNGE_PREAUTH_COOKIE_NAME,
  makeSessionToken,
  markTotpEnrolled,
  setTotpSecret,
  verifyPreauthToken,
  logLogin,
} from "@/lib/lounge/auth";
import { generateSecret, otpauthUrl, verifyCode } from "@/lib/lounge/totp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET — issue (or reuse) a TOTP secret for a preauth-authenticated user.
// The client generates the QR from the returned otpauth:// URL — that
// avoids any server-side QR library failure leaving the user stuck.
export async function GET(req: NextRequest) {
  try {
    const cookie = req.cookies.get(LOUNGE_PREAUTH_COOKIE_NAME)?.value;
    const session = cookie ? verifyPreauthToken(cookie) : null;
    if (!session) return NextResponse.json({ error: "Preauth expired — go back and sign in again." }, { status: 401 });

    const emp = await findEmployeeById(session.employeeId);
    if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    const existing = await getTotpEnrollment(emp.id);
    let secret = existing.secret;
    if (!secret) {
      secret = generateSecret();
      await setTotpSecret(emp.id, secret);
    }

    const issuer = "Millstadt EMS Employee Lounge";
    const account = emp.username;
    const otp = otpauthUrl({
      issuer,
      account,
      secret,
    });
    return NextResponse.json({ otpauth: otp, secret, issuer, account, authenticator: "microsoft" });
  } catch (e) {
    console.error("[setup-2fa GET] failed:", e);
    return NextResponse.json({ error: "Could not start two-factor setup. Please try again." }, { status: 500 });
  }
}

// POST { code } — verify the code, mark enrolled, issue the real session cookie.
export async function POST(req: NextRequest) {
  const cookie = req.cookies.get(LOUNGE_PREAUTH_COOKIE_NAME)?.value;
  const session = cookie ? verifyPreauthToken(cookie) : null;
  if (!session) return NextResponse.json({ error: "Preauth expired" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: "6-digit code required" }, { status: 400 });

  const emp = await findEmployeeById(session.employeeId);
  if (!emp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { secret } = await getTotpEnrollment(emp.id);
  if (!secret) return NextResponse.json({ error: "Secret missing — refresh page" }, { status: 400 });

  if (!verifyCode(secret, code)) {
    return NextResponse.json({ error: "Wrong code. Try again." }, { status: 401 });
  }

  await markTotpEnrolled(emp.id);
  await logLogin(emp.id, emp.username, true, req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, req.headers.get("user-agent") ?? null);

  const token = makeSessionToken(emp);
  const opts = cookieOptions(token);
  const res = NextResponse.json({ ok: true, employee: { id: emp.id, firstName: emp.firstName, lastName: emp.lastName, isAdmin: emp.isAdmin } });
  res.cookies.set(opts.name, opts.value, {
    httpOnly: opts.httpOnly,
    secure: opts.secure,
    sameSite: opts.sameSite,
    maxAge: opts.maxAge,
    path: opts.path,
  });
  // Burn the preauth cookie
  res.cookies.set(LOUNGE_PREAUTH_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
