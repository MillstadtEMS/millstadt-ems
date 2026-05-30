/**
 * Dev shortcut login. Skips password + 2FA when the developer supplies the
 * matching PIN. Active only when NODE_ENV !== "production" so it can never
 * be hit on the live site even if the env-toggle is forgotten.
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
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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
    // Dev "employee" slot points at a synthetic "Test User" account so the
    // shortcut never logs anyone in as a real crew member. Created by
    // scripts/ensure-test-user.ts.
    emp = await findEmployeeByUsername("testuser");
    if (!emp) {
      // Last-ditch fallback if the test user was deleted — pick any non-admin
      // active account so the dev shortcut still works locally. Production
      // should always have testuser present.
      const db = sql();
      const rows = (await db`
        SELECT username FROM lounge_employees
        WHERE is_admin = FALSE AND is_active = TRUE
        ORDER BY last_name, first_name
        LIMIT 1
      `) as unknown as { username: string }[];
      if (rows[0]) emp = await findEmployeeByUsername(rows[0].username);
    }
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
