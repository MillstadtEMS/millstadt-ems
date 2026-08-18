import { NextRequest, NextResponse } from "next/server";
import {
  currentEmployeeForPasswordChange,
  LOUNGE_COOKIE_NAME,
  LOUNGE_PREAUTH_COOKIE_NAME,
} from "@/lib/lounge/auth";

export async function POST(req: NextRequest) {
  const employee = await currentEmployeeForPasswordChange();
  const url = new URL("/lounge/goodbye", req.url);
  if (employee?.firstName) url.searchParams.set("name", employee.firstName);

  const res = NextResponse.redirect(url, 303);
  res.cookies.set({
    name: LOUNGE_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  res.cookies.set({
    name: LOUNGE_PREAUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return res;
}

export async function GET(req: NextRequest) {
  return POST(req);
}
