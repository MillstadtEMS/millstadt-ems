import { NextResponse } from "next/server";
import { LOUNGE_COOKIE_NAME } from "@/lib/lounge/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: LOUNGE_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return res;
}
