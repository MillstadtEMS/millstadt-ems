/**
 * Dev shortcut login. Skips password + 2FA when the developer supplies the
 * matching PIN. Intentionally minimal: just two roles (admin / employee).
 *
 * Pin: 9572. When the user is finished developing, set DISABLE_DEV_LOGIN=1
 * in Vercel env (or delete this file) to turn it off entirely.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  cookieOptions,
  findEmployeeByUsername,
  makeSessionToken,
} from "@/lib/lounge/auth";
import { sql } from "@/lib/lounge/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEV_PIN = "9572";

export async function POST(req: NextRequest) {
  if (process.env.DISABLE_DEV_LOGIN === "1") {
    return NextResponse.json({ error: "Dev login disabled" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  if (typeof body.pin !== "string" || body.pin.trim() !== DEV_PIN) {
    return NextResponse.json({ error: "Wrong PIN" }, { status: 401 });
  }
  const role = body.role === "admin" ? "admin" : "employee";

  let emp = null;
  if (role === "admin") {
    emp = (await findEmployeeByUsername("kjames")) ?? (await findEmployeeByUsername("jgoetz"));
  } else {
    const db = sql();
    const rows = (await db`
      SELECT username FROM lounge_employees
      WHERE is_admin = FALSE AND is_active = TRUE
      ORDER BY last_name, first_name
      LIMIT 1
    `) as unknown as { username: string }[];
    if (rows[0]) emp = await findEmployeeByUsername(rows[0].username);
  }
  if (!emp) {
    return NextResponse.json({ error: "No matching employee found" }, { status: 404 });
  }

  const token = makeSessionToken(emp);
  const opts = cookieOptions(token);
  const res = NextResponse.json({
    ok: true,
    employee: {
      id: emp.id,
      username: emp.username,
      firstName: emp.firstName,
      lastName: emp.lastName,
      isAdmin: emp.isAdmin,
    },
  });
  res.cookies.set(opts.name, opts.value, {
    httpOnly: opts.httpOnly,
    secure: opts.secure,
    sameSite: opts.sameSite,
    maxAge: opts.maxAge,
    path: opts.path,
  });
  return res;
}
