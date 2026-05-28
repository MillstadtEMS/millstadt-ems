import { NextRequest, NextResponse } from "next/server";
import {
  findEmployeeByUsername,
  verifyPassword,
  makeSessionToken,
  cookieOptions,
  logLogin,
} from "@/lib/lounge/auth";

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
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
    return NextResponse.json(
      { error: "Username and password required" },
      { status: 400 },
    );
  }

  const emp = await findEmployeeByUsername(username);
  if (!emp || !emp.isActive || !verifyPassword(password, emp.passwordHash)) {
    await logLogin(emp?.id ?? null, username, false, ip, ua);
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 },
    );
  }

  await logLogin(emp.id, username, true, ip, ua);

  const token = makeSessionToken(emp);
  const res = NextResponse.json({
    ok: true,
    mustChangePassword: emp.mustChangePassword,
    employee: {
      id: emp.id,
      username: emp.username,
      firstName: emp.firstName,
      lastName: emp.lastName,
      isAdmin: emp.isAdmin,
    },
  });
  res.cookies.set(cookieOptions(token));
  return res;
}
