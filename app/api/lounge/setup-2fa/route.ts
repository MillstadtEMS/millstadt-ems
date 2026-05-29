import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
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

// GET — issue (or reuse) a TOTP secret for a preauth-authenticated user and
// return the otpauth URL + QR data URL so they can scan.
export async function GET(req: NextRequest) {
  const cookie = req.cookies.get(LOUNGE_PREAUTH_COOKIE_NAME)?.value;
  const session = cookie ? verifyPreauthToken(cookie) : null;
  if (!session) return NextResponse.json({ error: "Preauth expired" }, { status: 401 });

  const emp = await findEmployeeById(session.employeeId);
  if (!emp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await getTotpEnrollment(emp.id);
  let secret = existing.secret;
  // If they have a secret but never confirmed it, re-use it. Otherwise mint a fresh one.
  if (!secret) {
    secret = generateSecret();
    await setTotpSecret(emp.id, secret);
  }

  const otp = otpauthUrl({
    issuer: "Millstadt EMS",
    account: `${emp.firstName}.${emp.lastName}`.toLowerCase(),
    secret,
  });
  const qr = await QRCode.toDataURL(otp, { margin: 1, width: 260 });
  return NextResponse.json({ otpauth: otp, secret, qr });
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
