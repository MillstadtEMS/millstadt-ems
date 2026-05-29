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

export const dynamic = "force-dynamic";

// POST { code } — already-enrolled employee verifies the 6-digit TOTP code
// against their stored secret. Trades preauth for full session cookie.
export async function POST(req: NextRequest) {
  const cookie = req.cookies.get(LOUNGE_PREAUTH_COOKIE_NAME)?.value;
  const session = cookie ? verifyPreauthToken(cookie) : null;
  if (!session) return NextResponse.json({ error: "Preauth expired — log in again." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code.trim() : "";
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
  return res;
}
