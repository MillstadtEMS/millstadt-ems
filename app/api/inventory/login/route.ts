import { NextRequest, NextResponse } from "next/server";
import { checkInventoryPassword, makeInventorySessionToken, inventoryCookieOptions } from "@/lib/inventory/auth";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    if (!password) {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }
    const valid = await checkInventoryPassword(password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }
    const token = await makeInventorySessionToken();
    const res = NextResponse.json({ ok: true });
    res.cookies.set(inventoryCookieOptions(token));
    return res;
  } catch (e) {
    console.error("Inventory login error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
