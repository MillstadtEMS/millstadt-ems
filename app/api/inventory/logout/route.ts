import { NextResponse } from "next/server";
import { INVENTORY_COOKIE_NAME } from "@/lib/inventory/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: INVENTORY_COOKIE_NAME,
    value: "",
    maxAge: 0,
    path: "/",
  });
  return res;
}
