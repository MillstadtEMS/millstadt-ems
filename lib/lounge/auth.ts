/**
 * Employee Lounge auth — username/password with first-login forced change.
 *
 * Mirrors the lib/inventory/auth.ts pattern (scrypt hashes, HMAC-signed
 * session cookie tied to the password hash so changing PW invalidates
 * outstanding sessions), but identifies employees by username instead of
 * a single shared password.
 */
import { scryptSync, randomBytes, createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { sql } from "./db";
import { encrypt, decrypt } from "./encryption";

const COOKIE = "mas_lounge";
const MAX_AGE = 60 * 15; // 15 minutes — short session, must log in again after

export const LOUNGE_COOKIE_NAME = COOKIE;
export const LOUNGE_PREAUTH_COOKIE_NAME = "mas_lounge_preauth";
const PREAUTH_MAX_AGE = 60 * 10; // 10 minutes to finish 2FA
const PREAUTH_MAX_ATTEMPTS = 5;
export const SETUP_TOKEN_TTL_HOURS = 24;

export type PreauthPurpose = "verify_totp" | "verify_sms" | "enroll_totp";

export interface PreauthChallenge {
  employeeId: string;
  purpose: PreauthPurpose;
  issuedAt: string;
  usesSetupToken: boolean;
  enrollmentSecret: string | null;
}

function sessionKey(): string {
  const configured = process.env.LOUNGE_SESSION_SECRET || process.env.LOUNGE_ENCRYPTION_KEY;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("LOUNGE_SESSION_SECRET or LOUNGE_ENCRYPTION_KEY is required in production");
  }
  return "development-only-lounge-session-key";
}

function opaqueTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateSetupToken(): string {
  return randomBytes(24).toString("base64url");
}

export function setupTokenHash(token: string): string {
  return opaqueTokenHash(token);
}

export function setupTokenExpiresAt(now = Date.now()): string {
  return new Date(now + SETUP_TOKEN_TTL_HOURS * 60 * 60 * 1000).toISOString();
}

export async function issuePreauthChallenge(
  employeeId: string,
  purpose: PreauthPurpose,
  options?: { usesSetupToken?: boolean; enrollmentSecret?: string | null },
): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const nonceHash = opaqueTokenHash(token);
  const encryptedSecret = options?.enrollmentSecret ? encrypt(options.enrollmentSecret) : null;
  const expiresAt = new Date(Date.now() + PREAUTH_MAX_AGE * 1000).toISOString();
  const db = sql();
  await db`
    INSERT INTO lounge_preauth_challenges
      (nonce_hash, employee_id, purpose, issued_at, expires_at, uses_setup_token, enrollment_secret_encrypted)
    VALUES
      (${nonceHash}, ${employeeId}, ${purpose}, NOW(), ${expiresAt},
       ${options?.usesSetupToken === true}, ${encryptedSecret})
  `;
  return token;
}

type PreauthRow = {
  employee_id: string;
  purpose: string;
  issued_at: string | Date;
  expires_at: string | Date;
  uses_setup_token: boolean;
  enrollment_secret_encrypted: string | null;
  attempt_count: number;
  used_at: string | Date | null;
  revoked_at: string | Date | null;
};

function asIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

export async function readPreauthChallenge(
  token: string,
  expectedPurpose: PreauthPurpose,
): Promise<PreauthChallenge | null> {
  if (!token) return null;
  const nonceHash = opaqueTokenHash(token);
  const db = sql();
  const rows = (await db`
    SELECT employee_id, purpose, issued_at, expires_at, uses_setup_token,
           enrollment_secret_encrypted, attempt_count, used_at, revoked_at
    FROM lounge_preauth_challenges
    WHERE nonce_hash = ${nonceHash}
    LIMIT 1
  `) as unknown as PreauthRow[];
  const row = rows[0];
  const invalid =
    !row ||
    row.purpose !== expectedPurpose ||
    row.used_at !== null ||
    row.revoked_at !== null ||
    Number(row.attempt_count) >= PREAUTH_MAX_ATTEMPTS ||
    new Date(row.expires_at).getTime() <= Date.now();
  if (invalid) {
    if (row) {
      await db`
        UPDATE lounge_preauth_challenges
        SET revoked_at = COALESCE(revoked_at, NOW())
        WHERE nonce_hash = ${nonceHash}
      `;
    }
    return null;
  }

  let enrollmentSecret: string | null = null;
  if (row.enrollment_secret_encrypted) {
    try {
      enrollmentSecret = decrypt(row.enrollment_secret_encrypted);
    } catch {
      await revokePreauthChallenge(token);
      return null;
    }
  }
  return {
    employeeId: row.employee_id,
    purpose: row.purpose as PreauthPurpose,
    issuedAt: asIso(row.issued_at),
    usesSetupToken: row.uses_setup_token === true,
    enrollmentSecret,
  };
}

export async function recordPreauthFailure(token: string): Promise<void> {
  if (!token) return;
  const db = sql();
  const nonceHash = opaqueTokenHash(token);
  await db`
    UPDATE lounge_preauth_challenges
    SET attempt_count = attempt_count + 1,
        revoked_at = CASE
          WHEN attempt_count + 1 >= ${PREAUTH_MAX_ATTEMPTS} THEN COALESCE(revoked_at, NOW())
          ELSE revoked_at
        END
    WHERE nonce_hash = ${nonceHash} AND used_at IS NULL AND revoked_at IS NULL
  `;
}

export async function revokePreauthChallenge(token: string): Promise<void> {
  if (!token) return;
  const db = sql();
  await db`
    UPDATE lounge_preauth_challenges
    SET revoked_at = COALESCE(revoked_at, NOW())
    WHERE nonce_hash = ${opaqueTokenHash(token)}
  `;
}

export async function revokeAllPreauthChallenges(employeeId: string): Promise<number> {
  const db = sql();
  const rows = (await db`
    UPDATE lounge_preauth_challenges
    SET revoked_at = COALESCE(revoked_at, NOW())
    WHERE employee_id = ${employeeId} AND used_at IS NULL AND revoked_at IS NULL
    RETURNING nonce_hash
  `) as unknown as { nonce_hash: string }[];
  return rows.length;
}

export async function consumePreauthChallenge(
  token: string,
  expectedPurpose: PreauthPurpose,
): Promise<PreauthChallenge | null> {
  if (!token) return null;
  const nonceHash = opaqueTokenHash(token);
  const db = sql();
  const rows = (await db`
    WITH target AS (
      SELECT nonce_hash, employee_id, purpose, issued_at, uses_setup_token,
             enrollment_secret_encrypted
      FROM lounge_preauth_challenges
      WHERE nonce_hash = ${nonceHash}
        AND purpose = ${expectedPurpose}
        AND used_at IS NULL
        AND revoked_at IS NULL
        AND attempt_count < ${PREAUTH_MAX_ATTEMPTS}
        AND expires_at > NOW()
    ), setup_consumed AS (
      UPDATE lounge_employees employee
      SET setup_token_used_at = NOW(), updated_at = NOW()
      FROM target
      WHERE target.uses_setup_token = TRUE
        AND employee.id = target.employee_id
        AND employee.must_change_password = TRUE
        AND employee.setup_token_hash IS NOT NULL
        AND employee.setup_token_used_at IS NULL
        AND employee.setup_token_expires_at > NOW()
      RETURNING employee.id
    )
    UPDATE lounge_preauth_challenges challenge
    SET used_at = NOW()
    FROM target
    WHERE challenge.nonce_hash = target.nonce_hash
      AND challenge.used_at IS NULL
      AND challenge.revoked_at IS NULL
      AND (
        target.uses_setup_token = FALSE
        OR EXISTS (SELECT 1 FROM setup_consumed)
      )
    RETURNING challenge.employee_id, challenge.purpose, challenge.issued_at,
              challenge.uses_setup_token, challenge.enrollment_secret_encrypted
  `) as unknown as Array<{
    employee_id: string;
    purpose: string;
    issued_at: string | Date;
    uses_setup_token: boolean;
    enrollment_secret_encrypted: string | null;
  }>;
  const row = rows[0];
  if (!row) {
    await revokePreauthChallenge(token);
    return null;
  }
  let enrollmentSecret: string | null = null;
  if (row.enrollment_secret_encrypted) {
    try { enrollmentSecret = decrypt(row.enrollment_secret_encrypted); } catch { enrollmentSecret = null; }
  }
  return {
    employeeId: row.employee_id,
    purpose: row.purpose as PreauthPurpose,
    issuedAt: asIso(row.issued_at),
    usesSetupToken: row.uses_setup_token === true,
    enrollmentSecret,
  };
}

export async function completeTotpEnrollmentChallenge(token: string): Promise<PreauthChallenge | null> {
  if (!token) return null;
  const nonceHash = opaqueTokenHash(token);
  const db = sql();
  const rows = (await db`
    WITH target AS (
      SELECT nonce_hash, employee_id, purpose, issued_at, uses_setup_token,
             enrollment_secret_encrypted
      FROM lounge_preauth_challenges
      WHERE nonce_hash = ${nonceHash}
        AND purpose = 'enroll_totp'
        AND enrollment_secret_encrypted IS NOT NULL
        AND used_at IS NULL
        AND revoked_at IS NULL
        AND attempt_count < ${PREAUTH_MAX_ATTEMPTS}
        AND expires_at > NOW()
    ), enrolled AS (
      UPDATE lounge_employees employee
      SET totp_secret_encrypted = target.enrollment_secret_encrypted,
          totp_enrolled_at = NOW(),
          setup_token_used_at = CASE
            WHEN target.uses_setup_token THEN NOW()
            ELSE employee.setup_token_used_at
          END,
          updated_at = NOW()
      FROM target
      WHERE employee.id = target.employee_id
        AND employee.totp_secret_encrypted IS NULL
        AND employee.totp_enrolled_at IS NULL
        AND (
          target.uses_setup_token = FALSE
          OR (
            employee.must_change_password = TRUE
            AND employee.setup_token_hash IS NOT NULL
            AND employee.setup_token_used_at IS NULL
            AND employee.setup_token_expires_at > NOW()
          )
        )
      RETURNING employee.id
    )
    UPDATE lounge_preauth_challenges challenge
    SET used_at = NOW()
    FROM target
    WHERE challenge.nonce_hash = target.nonce_hash
      AND challenge.used_at IS NULL
      AND challenge.revoked_at IS NULL
      AND EXISTS (SELECT 1 FROM enrolled)
    RETURNING challenge.employee_id, challenge.purpose, challenge.issued_at,
              challenge.uses_setup_token, challenge.enrollment_secret_encrypted
  `) as unknown as Array<{
    employee_id: string;
    purpose: string;
    issued_at: string | Date;
    uses_setup_token: boolean;
    enrollment_secret_encrypted: string;
  }>;
  const row = rows[0];
  if (!row) {
    await revokePreauthChallenge(token);
    return null;
  }
  return {
    employeeId: row.employee_id,
    purpose: row.purpose as PreauthPurpose,
    issuedAt: asIso(row.issued_at),
    usesSetupToken: row.uses_setup_token === true,
    enrollmentSecret: decrypt(row.enrollment_secret_encrypted),
  };
}

export async function replacePreauthChallenge(
  token: string,
  fromPurpose: PreauthPurpose,
  toPurpose: PreauthPurpose,
): Promise<string | null> {
  if (!token) return null;
  const nextToken = randomBytes(32).toString("base64url");
  const currentHash = opaqueTokenHash(token);
  const nextHash = opaqueTokenHash(nextToken);
  const expiresAt = new Date(Date.now() + PREAUTH_MAX_AGE * 1000).toISOString();
  const db = sql();
  const rows = (await db`
    WITH revoked AS (
      UPDATE lounge_preauth_challenges
      SET revoked_at = NOW()
      WHERE nonce_hash = ${currentHash}
        AND purpose = ${fromPurpose}
        AND used_at IS NULL
        AND revoked_at IS NULL
        AND expires_at > NOW()
      RETURNING employee_id, uses_setup_token
    )
    INSERT INTO lounge_preauth_challenges
      (nonce_hash, employee_id, purpose, issued_at, expires_at, uses_setup_token)
    SELECT ${nextHash}, employee_id, ${toPurpose}, NOW(), ${expiresAt}, uses_setup_token
    FROM revoked
    RETURNING employee_id
  `) as unknown as { employee_id: string }[];
  return rows.length === 1 ? nextToken : null;
}

export async function consumeSetupToken(employeeId: string): Promise<boolean> {
  const db = sql();
  const rows = (await db`
    UPDATE lounge_employees
    SET setup_token_used_at = NOW(), updated_at = NOW()
    WHERE id = ${employeeId}
      AND must_change_password = TRUE
      AND setup_token_hash IS NOT NULL
      AND setup_token_used_at IS NULL
      AND setup_token_expires_at > NOW()
    RETURNING id
  `) as unknown as { id: string }[];
  return rows.length === 1;
}

export function preauthCookieOptions(token: string) {
  return {
    name: LOUNGE_PREAUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: PREAUTH_MAX_AGE,
    path: "/",
  };
}

// ── Password hashing ────────────────────────────────────────────────────

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const testHash = scryptSync(password, salt, 64).toString("hex");
  const actualBytes = Buffer.from(testHash, "hex");
  const expectedBytes = Buffer.from(hash, "hex");
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

// ── Employee record (auth-relevant fields only) ─────────────────────────

export interface LoungeEmployee {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  isActive: boolean;
  mustChangePassword: boolean;
  passwordHash: string;
  setupTokenHash: string | null;
  setupTokenExpiresAt: string | null;
  setupTokenUsedAt: string | null;
}

interface EmployeeRow {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  is_admin: boolean;
  is_active: boolean;
  must_change_password: boolean;
  password_hash: string;
  setup_token_hash: string | null;
  setup_token_expires_at: string | Date | null;
  setup_token_used_at: string | Date | null;
}

function optionalIso(value: string | Date | null): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function rowToEmployee(row: EmployeeRow): LoungeEmployee {
  return {
    id: row.id,
    username: row.username,
    firstName: row.first_name,
    lastName: row.last_name,
    isAdmin: row.is_admin,
    isActive: row.is_active,
    mustChangePassword: row.must_change_password,
    passwordHash: row.password_hash,
    setupTokenHash: row.setup_token_hash,
    setupTokenExpiresAt: optionalIso(row.setup_token_expires_at),
    setupTokenUsedAt: optionalIso(row.setup_token_used_at),
  };
}

export async function findEmployeeByUsername(
  username: string,
): Promise<LoungeEmployee | null> {
  const db = sql();
  // Accept either the assigned username (e.g. "jgoetz") OR the employee's
  // email — crew kept typing their email/full address at the login screen
  // and getting locked out. Emails are unique per employee, so this stays
  // unambiguous; a true username match is preferred when both could hit.
  const needle = username.trim();
  if (!needle) return null;
  const rows = (await db`
    SELECT id, username, first_name, last_name,
           is_admin, is_active, must_change_password, password_hash,
           setup_token_hash, setup_token_expires_at, setup_token_used_at
    FROM lounge_employees
    WHERE LOWER(username) = LOWER(${needle})
       OR (email IS NOT NULL AND email <> '' AND LOWER(email) = LOWER(${needle}))
       OR (email_secondary IS NOT NULL AND email_secondary <> '' AND LOWER(email_secondary) = LOWER(${needle}))
    ORDER BY (LOWER(username) = LOWER(${needle})) DESC
    LIMIT 1
  `) as unknown as EmployeeRow[];
  const row = rows[0];
  return row ? rowToEmployee(row) : null;
}

// ── TOTP enrollment state ───────────────────────────────────────────────

export async function getTotpEnrollment(employeeId: string): Promise<{ secret: string | null; enrolledAt: string | null }> {
  const db = sql();
  const rows = (await db`
    SELECT totp_secret_encrypted, totp_enrolled_at
    FROM lounge_employees WHERE id = ${employeeId} LIMIT 1
  `) as unknown as { totp_secret_encrypted: string | null; totp_enrolled_at: string | null }[];
  const r = rows[0];
  if (!r) return { secret: null, enrolledAt: null };
  let secret: string | null = null;
  if (r.totp_secret_encrypted) {
    try { secret = decrypt(r.totp_secret_encrypted); } catch { secret = null; }
  }
  return { secret, enrolledAt: r.totp_enrolled_at };
}

export async function setTotpSecret(employeeId: string, secret: string): Promise<void> {
  const db = sql();
  const enc = encrypt(secret);
  await db`
    UPDATE lounge_employees
    SET totp_secret_encrypted = ${enc}, updated_at = NOW()
    WHERE id = ${employeeId}
  `;
}

export async function markTotpEnrolled(employeeId: string): Promise<void> {
  const db = sql();
  await db`
    UPDATE lounge_employees
    SET totp_enrolled_at = NOW(), updated_at = NOW()
    WHERE id = ${employeeId}
  `;
}

export async function findEmployeeById(
  id: string,
): Promise<LoungeEmployee | null> {
  const db = sql();
  const rows = (await db`
    SELECT id, username, first_name, last_name,
           is_admin, is_active, must_change_password, password_hash,
           setup_token_hash, setup_token_expires_at, setup_token_used_at
    FROM lounge_employees
    WHERE id = ${id}
    LIMIT 1
  `) as unknown as EmployeeRow[];
  const row = rows[0];
  return row ? rowToEmployee(row) : null;
}

export async function updatePassword(
  employeeId: string,
  expectedPasswordHash: string,
  newPassword: string,
): Promise<boolean> {
  const hash = hashPassword(newPassword);
  const db = sql();
  const rows = (await db`
    UPDATE lounge_employees
    SET password_hash = ${hash},
        must_change_password = FALSE,
        setup_token_hash = NULL,
        setup_token_expires_at = NULL,
        setup_token_used_at = NULL,
        updated_at = NOW()
    WHERE id = ${employeeId} AND password_hash = ${expectedPasswordHash}
    RETURNING id
  `) as unknown as { id: string }[];
  return rows.length === 1;
}

export function verifyEmployeeLoginCredential(
  employee: LoungeEmployee,
  password: string,
): { ok: boolean; usesSetupToken: boolean } {
  if (!verifyPassword(password, employee.passwordHash)) {
    return { ok: false, usesSetupToken: false };
  }
  if (!employee.mustChangePassword) {
    return { ok: true, usesSetupToken: false };
  }
  if (
    !employee.setupTokenHash ||
    !employee.setupTokenExpiresAt ||
    employee.setupTokenUsedAt ||
    new Date(employee.setupTokenExpiresAt).getTime() <= Date.now()
  ) {
    return { ok: false, usesSetupToken: true };
  }
  const actual = Buffer.from(setupTokenHash(password), "hex");
  const expected = Buffer.from(employee.setupTokenHash, "hex");
  const ok = actual.length === expected.length && timingSafeEqual(actual, expected);
  return { ok, usesSetupToken: true };
}

export function permanentPasswordError(password: string, username: string): string | null {
  if (password.length < 12) return "New password must be at least 12 characters";
  if (password.length > 128) return "New password must be 128 characters or fewer";
  if (password.trim().toLowerCase() === username.trim().toLowerCase()) {
    return "New password cannot be your username";
  }
  return null;
}

// ── Session token ───────────────────────────────────────────────────────
// Signed payload: `${employeeId}.${ts}.${sig}`. The signing key includes
// the user's password hash, so any password change invalidates every
// outstanding cookie for that user.

function signingSecret(emp: LoungeEmployee): string {
  return `${sessionKey()}\nlounge\n${emp.id}\n${emp.passwordHash}`;
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function makeSessionToken(emp: LoungeEmployee): string {
  const ts = Date.now().toString();
  const payload = `${emp.id}.${ts}`;
  return `${payload}.${sign(payload, signingSecret(emp))}`;
}

export async function verifySessionToken(
  token: string,
  options?: { allowPasswordChangeRequired?: boolean },
): Promise<LoungeEmployee | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [empId, ts, sig] = parts;
  const issuedAt = Number(ts);
  const age = Date.now() - issuedAt;
  if (!Number.isFinite(issuedAt) || age < -60_000 || age > MAX_AGE * 1000) return null;
  const emp = await findEmployeeById(empId);
  if (!emp || !emp.isActive) return null;
  const expected = Buffer.from(sign(`${empId}.${ts}`, signingSecret(emp)), "hex");
  const actual = Buffer.from(sig, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  if (emp.mustChangePassword && !options?.allowPasswordChangeRequired) return null;
  return emp;
}

export function cookieOptions(token: string) {
  return {
    name: COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: MAX_AGE,
    path: "/",
  };
}

export async function currentEmployee(): Promise<LoungeEmployee | null> {
  try {
    const jar = await cookies();
    const token = jar.get(COOKIE)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function currentEmployeeForPasswordChange(): Promise<LoungeEmployee | null> {
  try {
    const jar = await cookies();
    const token = jar.get(COOKIE)?.value;
    if (!token) return null;
    return await verifySessionToken(token, { allowPasswordChangeRequired: true });
  } catch {
    return null;
  }
}

export async function requireEmployee(): Promise<LoungeEmployee> {
  const emp = await currentEmployee();
  if (!emp) throw new Error("UNAUTHORIZED");
  return emp;
}

export async function requireAdmin(): Promise<LoungeEmployee> {
  const emp = await requireEmployee();
  if (!emp.isAdmin) throw new Error("FORBIDDEN");
  return emp;
}

// ── Audit log helper ────────────────────────────────────────────────────

export async function logLogin(
  employeeId: string | null,
  usernameTried: string,
  success: boolean,
  ip: string | null,
  userAgent: string | null,
): Promise<void> {
  try {
    const db = sql();
    await db`
      INSERT INTO lounge_login_log (employee_id, username_tried, success, ip, user_agent)
      VALUES (${employeeId}, ${usernameTried}, ${success}, ${ip}, ${userAgent})
    `;
  } catch {
    // never let logging take down a login attempt
  }
}
