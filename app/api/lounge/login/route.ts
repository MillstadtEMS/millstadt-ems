import { NextRequest, NextResponse } from "next/server";
import {
  findEmployeeByUsername,
  verifyPassword,
  logLogin,
  getTotpEnrollment,
  makePreauthToken,
  preauthCookieOptions,
} from "@/lib/lounge/auth";

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
  const enrolled = !!secret && !!enrolledAt;
  const preauth = makePreauthToken(emp.id);

  const res = NextResponse.json({
    ok: true,
    step: enrolled ? "verify_2fa" : "setup_2fa",
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
