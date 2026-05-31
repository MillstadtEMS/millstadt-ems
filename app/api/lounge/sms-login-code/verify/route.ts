import { NextRequest, NextResponse } from "next/server";
import {
  LOUNGE_PREAUTH_COOKIE_NAME,
  cookieOptions,
  findEmployeeById,
  logLogin,
  makeSessionToken,
  verifyPreauthToken,
} from "@/lib/lounge/auth";
import { verifyLoginCode } from "@/lib/lounge/sms-login";
import { issueTrustedDevice, trustCookieOptions } from "@/lib/lounge/trusted-devices";

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
  const cookie = req.cookies.get(LOUNGE_PREAUTH_COOKIE_NAME)?.value;
  const session = cookie ? verifyPreauthToken(cookie) : null;
  if (!session) return NextResponse.json({ error: "Preauth expired — log in again." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const trustDevice = body.trustDevice === true;
  const result = await verifyLoginCode(session.employeeId, code);
  if (!result.ok) return NextResponse.json({ error: result.reason ?? "Wrong code." }, { status: 401 });

  const emp = await findEmployeeById(session.employeeId);
  if (!emp || !emp.isActive) {
    return NextResponse.json({ error: "Account inactive" }, { status: 403 });
  }

  await logLogin(
    emp.id,
    emp.username,
    true,
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    req.headers.get("user-agent") ?? null,
  );

  const token = makeSessionToken(emp);
  const opts = cookieOptions(token);
  const res = NextResponse.json({
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
