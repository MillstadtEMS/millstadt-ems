import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { finishRegistration } from "@/lib/lounge/webauthn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body.response) return NextResponse.json({ error: "Missing response" }, { status: 400 });
  const deviceLabel = typeof body.deviceLabel === "string" ? body.deviceLabel : undefined;
  const result = await finishRegistration(me.id, body.response, deviceLabel);
  if (!result.verified) {
    return NextResponse.json({ error: result.reason ?? "Could not register" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
