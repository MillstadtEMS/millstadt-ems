import { NextRequest, NextResponse } from "next/server";
import { makeSessionToken, sessionCookieOptions } from "@/lib/admin/auth";

export async function POST(req: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: "Admin login is not configured" }, { status: 500 });
  }
  const { password } = await req.json();
  if (typeof password !== "string" || password !== expected) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }
  const token = makeSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookieOptions(token));
  return res;
}
