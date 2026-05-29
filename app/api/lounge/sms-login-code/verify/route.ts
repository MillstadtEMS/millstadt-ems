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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const cookie = req.cookies.get(LOUNGE_PREAUTH_COOKIE_NAME)?.value;
  const session = cookie ? verifyPreauthToken(cookie) : null;
  if (!session) return NextResponse.json({ error: "Preauth expired — log in again." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code.trim() : "";
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
  return res;
}
