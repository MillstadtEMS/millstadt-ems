import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { currentEmployee } from "@/lib/lounge/auth";
import { sql } from "@/lib/lounge/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_ATTEMPTS = 5;

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export async function POST(req: NextRequest) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: "6-digit code required" }, { status: 400 });

  const db = sql();
  const rows = (await db`
    SELECT phone_verify_code_hash, phone_verify_expires_at, phone_verify_attempts, phone
    FROM lounge_employees WHERE id = ${me.id} LIMIT 1
  `) as unknown as {
    phone_verify_code_hash: string | null;
    phone_verify_expires_at: string | null;
    phone_verify_attempts: number;
    phone: string | null;
  }[];
  const row = rows[0];
  if (!row || !row.phone_verify_code_hash || !row.phone_verify_expires_at) {
    return NextResponse.json({ error: "No verification in progress. Send a code first." }, { status: 400 });
  }
  if (new Date(row.phone_verify_expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Code expired. Send a new one." }, { status: 410 });
  }
  if (row.phone_verify_attempts >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "Too many attempts. Send a new code." }, { status: 429 });
  }
  if (hashCode(code) !== row.phone_verify_code_hash) {
    await db`
      UPDATE lounge_employees
      SET phone_verify_attempts = phone_verify_attempts + 1, updated_at = NOW()
      WHERE id = ${me.id}
    `;
    return NextResponse.json({ error: "Wrong code." }, { status: 401 });
  }

  await db`
    UPDATE lounge_employees
    SET phone_verified_at = NOW(),
        phone_verify_code_hash = NULL,
        phone_verify_expires_at = NULL,
        phone_verify_attempts = 0,
        updated_at = NOW()
    WHERE id = ${me.id}
  `;

  return NextResponse.json({ ok: true, phone: row.phone, verifiedAt: new Date().toISOString() });
}
