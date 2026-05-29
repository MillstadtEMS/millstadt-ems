import { NextRequest, NextResponse } from "next/server";
import {
  cookieOptions,
  currentEmployee,
  makeSessionToken,
  findEmployeeById,
} from "@/lib/lounge/auth";

export const dynamic = "force-dynamic";

// Slide the session forward by re-issuing the cookie with a fresh 15-min
// TTL whenever the active user pings. The lounge UI calls this every few
// minutes so working employees stay logged in indefinitely; idle ones
// get logged out automatically when the cookie expires.
export async function POST(req: NextRequest) {
  void req;
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Re-fetch to get the most up-to-date password hash (used in token).
  const emp = await findEmployeeById(me.id);
  if (!emp || !emp.isActive) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = makeSessionToken(emp);
  const opts = cookieOptions(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(opts.name, opts.value, {
    httpOnly: opts.httpOnly,
    secure: opts.secure,
    sameSite: opts.sameSite,
    maxAge: opts.maxAge,
    path: opts.path,
  });
  return res;
}
