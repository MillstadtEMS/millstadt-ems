/**
 * Employee Lounge auth — username/password with first-login forced change.
 *
 * Mirrors the lib/inventory/auth.ts pattern (scrypt hashes, HMAC-signed
 * session cookie tied to the password hash so changing PW invalidates
 * outstanding sessions), but identifies employees by username instead of
 * a single shared password.
 */
import { scryptSync, randomBytes, createHmac } from "crypto";
import { cookies } from "next/headers";
import { sql } from "./db";

const COOKIE = "mas_lounge";
const MAX_AGE = 60 * 60 * 12; // 12 hours

export const LOUNGE_COOKIE_NAME = COOKIE;

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
  return hash === testHash;
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
  };
}

export async function findEmployeeByUsername(
  username: string,
): Promise<LoungeEmployee | null> {
  const db = sql();
  const rows = (await db`
    SELECT id, username, first_name, last_name,
           is_admin, is_active, must_change_password, password_hash
    FROM lounge_employees
    WHERE LOWER(username) = LOWER(${username})
    LIMIT 1
  `) as unknown as EmployeeRow[];
  const row = rows[0];
  return row ? rowToEmployee(row) : null;
}

export async function findEmployeeById(
  id: string,
): Promise<LoungeEmployee | null> {
  const db = sql();
  const rows = (await db`
    SELECT id, username, first_name, last_name,
           is_admin, is_active, must_change_password, password_hash
    FROM lounge_employees
    WHERE id = ${id}
    LIMIT 1
  `) as unknown as EmployeeRow[];
  const row = rows[0];
  return row ? rowToEmployee(row) : null;
}

export async function updatePassword(
  employeeId: string,
  newPassword: string,
): Promise<void> {
  const hash = hashPassword(newPassword);
  const db = sql();
  await db`
    UPDATE lounge_employees
    SET password_hash = ${hash},
        must_change_password = FALSE,
        updated_at = NOW()
    WHERE id = ${employeeId}
  `;
}

// ── Session token ───────────────────────────────────────────────────────
// Signed payload: `${employeeId}.${ts}.${sig}`. The signing key includes
// the user's password hash, so any password change invalidates every
// outstanding cookie for that user.

function signingSecret(emp: LoungeEmployee): string {
  return `lounge_${emp.id}_${emp.passwordHash}`;
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
): Promise<LoungeEmployee | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [empId, ts, sig] = parts;
  if (Date.now() - Number(ts) > MAX_AGE * 1000) return null;
  const emp = await findEmployeeById(empId);
  if (!emp || !emp.isActive) return null;
  if (sign(`${empId}.${ts}`, signingSecret(emp)) !== sig) return null;
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
