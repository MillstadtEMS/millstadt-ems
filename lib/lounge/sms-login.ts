/**
 * SMS-based login 2FA. Uses the same Twilio sender as the About Me
 * phone-verification flow, but stores codes in dedicated columns so a
 * user who's re-verifying their phone in About Me doesn't collide with
 * the code that was just texted to them at sign-in.
 *
 * Codes expire after 10 minutes and after 5 wrong attempts.
 */
import { createHash, randomInt } from "crypto";
import { sql } from "./db";
import { sendSms } from "./sms";

let columnsEnsured = false;
async function ensureColumns() {
  if (columnsEnsured) return;
  const db = sql();
  await db`ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS sms_login_code_hash      TEXT`;
  await db`ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS sms_login_code_expires_at TIMESTAMPTZ`;
  await db`ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS sms_login_code_attempts  INTEGER NOT NULL DEFAULT 0`;
  columnsEnsured = true;
}

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

const CODE_TTL_SECONDS = 10 * 60;
const MAX_ATTEMPTS = 5;

export interface SendLoginCodeResult {
  ok: boolean;
  reason?: string;
  delivered?: boolean;
  via?: "twilio" | "fallback";
  /** Last 4 digits of the destination phone — safe to surface in UI. */
  phoneTail?: string;
  /** Only returned in fallback when Twilio isn't configured (dev/setup). */
  devCode?: string;
}

export async function sendLoginCode(employeeId: string): Promise<SendLoginCodeResult> {
  await ensureColumns();
  const db = sql();
  const rows = (await db`
    SELECT phone, phone_verified_at FROM lounge_employees WHERE id = ${employeeId} LIMIT 1
  `) as unknown as { phone: string | null; phone_verified_at: string | null }[];
  const row = rows[0];
  if (!row || !row.phone) {
    return { ok: false, reason: "No phone number on file. Verify your mobile in About Me first, or use the authenticator app." };
  }

  // Generate a fresh 6-digit code and stash the hash.
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const expires = new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString();
  await db`
    UPDATE lounge_employees
    SET sms_login_code_hash       = ${hashCode(code)},
        sms_login_code_expires_at = ${expires}::timestamptz,
        sms_login_code_attempts   = 0,
        updated_at                = NOW()
    WHERE id = ${employeeId}
  `;

  const result = await sendSms(
    row.phone,
    `Millstadt EMS Lounge: your sign-in code is ${code}. It expires in 10 minutes.`,
  );

  const last4 = row.phone.slice(-4);
  return {
    ok: true,
    delivered: result.delivered,
    via: result.via,
    phoneTail: last4,
    ...(result.via === "fallback" ? { devCode: code } : {}),
  };
}

export interface VerifyLoginCodeResult {
  ok: boolean;
  reason?: string;
}

export async function verifyLoginCode(employeeId: string, submitted: string): Promise<VerifyLoginCodeResult> {
  await ensureColumns();
  const db = sql();
  const rows = (await db`
    SELECT sms_login_code_hash, sms_login_code_expires_at, sms_login_code_attempts
    FROM lounge_employees WHERE id = ${employeeId} LIMIT 1
  `) as unknown as {
    sms_login_code_hash: string | null;
    sms_login_code_expires_at: string | null;
    sms_login_code_attempts: number;
  }[];
  const row = rows[0];
  if (!row || !row.sms_login_code_hash || !row.sms_login_code_expires_at) {
    return { ok: false, reason: "No code on file. Tap Resend." };
  }
  if (new Date(row.sms_login_code_expires_at).getTime() < Date.now()) {
    return { ok: false, reason: "Code expired. Tap Resend." };
  }
  if (row.sms_login_code_attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: "Too many wrong attempts. Tap Resend." };
  }
  if (!/^\d{6}$/.test(submitted)) {
    await db`UPDATE lounge_employees SET sms_login_code_attempts = sms_login_code_attempts + 1 WHERE id = ${employeeId}`;
    return { ok: false, reason: "Enter the 6-digit code." };
  }
  if (hashCode(submitted) !== row.sms_login_code_hash) {
    await db`UPDATE lounge_employees SET sms_login_code_attempts = sms_login_code_attempts + 1 WHERE id = ${employeeId}`;
    return { ok: false, reason: "Wrong code. Try again." };
  }

  // Burn the code so it can't be reused.
  await db`
    UPDATE lounge_employees
    SET sms_login_code_hash = NULL,
        sms_login_code_expires_at = NULL,
        sms_login_code_attempts = 0,
        updated_at = NOW()
    WHERE id = ${employeeId}
  `;
  return { ok: true };
}
