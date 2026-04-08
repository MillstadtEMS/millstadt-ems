import { NextRequest, NextResponse } from "next/server";
import { makeSessionToken, sessionCookieOptions } from "@/lib/admin/auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }
  const token = makeSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookieOptions(token));
  return res;
}
