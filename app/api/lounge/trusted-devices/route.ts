import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { listTrustedDevices, revokeTrustedDevice, TRUST_COOKIE_NAME } from "@/lib/lounge/trusted-devices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const devices = await listTrustedDevices(me.id);
  return NextResponse.json({ devices });
}

export async function DELETE(req: NextRequest) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await revokeTrustedDevice(me.id, id);

  // If the caller revoked their CURRENT device, blow away the cookie so
  // the next login on this browser asks for 2FA again.
  const res = NextResponse.json({ ok: true });
  res.cookies.set(TRUST_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
