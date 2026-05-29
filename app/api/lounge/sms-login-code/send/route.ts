import { NextRequest, NextResponse } from "next/server";
import {
  LOUNGE_PREAUTH_COOKIE_NAME,
  verifyPreauthToken,
} from "@/lib/lounge/auth";
import { sendLoginCode } from "@/lib/lounge/sms-login";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const cookie = req.cookies.get(LOUNGE_PREAUTH_COOKIE_NAME)?.value;
  const session = cookie ? verifyPreauthToken(cookie) : null;
  if (!session) return NextResponse.json({ error: "Preauth expired — log in again." }, { status: 401 });

  const result = await sendLoginCode(session.employeeId);
  if (!result.ok) return NextResponse.json({ error: result.reason ?? "Could not send code." }, { status: 400 });
  return NextResponse.json({
    ok: true,
    delivered: result.delivered,
    via: result.via,
    phoneTail: result.phoneTail,
    devCode: result.devCode,
  });
}
