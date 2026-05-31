import { NextRequest, NextResponse } from "next/server";
import {
  cookieOptions,
  findEmployeeById,
  getTotpEnrollment,
  LOUNGE_PREAUTH_COOKIE_NAME,
  makeSessionToken,
  verifyPreauthToken,
  logLogin,
} from "@/lib/lounge/auth";
import { verifyCode } from "@/lib/lounge/totp";
import { issueTrustedDevice, trustCookieOptions } from "@/lib/lounge/trusted-devices";

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
  const cookie = req.cookies.get(LOUNGE_PREAUTH_COOKIE_NAME)?.value;
  const session = cookie ? verifyPreauthToken(cookie) : null;
  if (!session) return NextResponse.json({ error: "Preauth expired — log in again." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code.trim() : "";
  // The trust-device opt-in is now implicit on every successful 2FA
  // verify — clearing the code once on a device is enough. Users can
  // still revoke any device from /lounge/security if a phone is lost.
  const trustDevice = body.trustDevice !== false;
  if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: "6-digit code required" }, { status: 400 });

  const emp = await findEmployeeById(session.employeeId);
  if (!emp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { secret, enrolledAt } = await getTotpEnrollment(emp.id);
  if (!secret || !enrolledAt) {
    return NextResponse.json({ error: "2FA not enrolled. Restart login." }, { status: 400 });
  }
  if (!verifyCode(secret, code)) {
    return NextResponse.json({ error: "Wrong code. Try again." }, { status: 401 });
  }

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
