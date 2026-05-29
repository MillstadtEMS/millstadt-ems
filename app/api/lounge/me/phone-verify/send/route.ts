import { NextRequest, NextResponse } from "next/server";
import { createHash, randomInt } from "crypto";
import { currentEmployee } from "@/lib/lounge/auth";
import { sql } from "@/lib/lounge/db";
import { normalizePhone, sendSms } from "@/lib/lounge/sms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CODE_TTL_SECONDS = 10 * 60;

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export async function POST(req: NextRequest) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const raw = typeof body.phone === "string" ? body.phone : "";
  const e164 = normalizePhone(raw);
  if (!e164) return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });

  // Generate a fresh 6-digit code.
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const expires = new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString();

  const db = sql();
  await db`
    UPDATE lounge_employees
    SET phone = ${e164},
        phone_verified_at = NULL,
        phone_verify_code_hash = ${hashCode(code)},
        phone_verify_expires_at = ${expires}::timestamptz,
        phone_verify_attempts = 0,
        updated_at = NOW()
    WHERE id = ${me.id}
  `;

  const sms = await sendSms(e164, `Millstadt EMS: your verification code is ${code}. It expires in 10 minutes.`);

  return NextResponse.json({
    ok: true,
    phone: e164,
    delivered: sms.delivered,
    via: sms.via,
    // When SMS isn't configured we return the code so an admin can hand it
    // over manually. In a Twilio-configured deploy this is never sent.
    ...(sms.via === "fallback" ? { devCode: code } : {}),
  });
}
