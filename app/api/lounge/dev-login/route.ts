/** Development-only shortcut for the synthetic test account. */

import { NextRequest, NextResponse } from "next/server";
import {
  cookieOptions,
  findEmployeeByUsername,
  makeSessionToken,
} from "@/lib/lounge/auth";
import { sql } from "@/lib/lounge/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const enabled =
    process.env.NODE_ENV !== "production" &&
    process.env.LOUNGE_DEV_LOGIN_ENABLED === "true";
  const expectedPin = process.env.LOUNGE_DEV_LOGIN_PIN?.trim();
  if (!enabled || !expectedPin) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const pin = typeof body.pin === "string" ? body.pin.trim() : "";
  if (pin !== expectedPin) {
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

  // Dev shortcut should never trip the password-reset gate or any
  // future "must change password" guards — it's a PIN-only express
  // lane. Make sure the chosen account is clean every time.
  try {
    const db = sql();
    await db`
      UPDATE lounge_employees
      SET must_change_password = FALSE, updated_at = NOW()
      WHERE id = ${emp.id} AND must_change_password = TRUE
    `;
  } catch (e) {
    console.error("[dev-login] could not clear password-reset flag:", e);
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
