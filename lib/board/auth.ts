/**
 * Board Portal auth — username/password with forced first-login change.
 *
 * Mirrors the Employee Lounge model (scrypt password hashes + an HMAC-signed
 * session cookie bound to the current password hash, so a password change
 * invalidates outstanding sessions). Separate cookie + user table from the
 * lounge — board members are not employees.
 */
import { scryptSync, randomBytes, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getUserById, getUserByUsername, type BoardUser } from "./db";

const COOKIE = "mas_board";
const MAX_AGE = 60 * 30; // 30 minutes inactivity (brief §15)

export const BOARD_COOKIE_NAME = COOKIE;

function sessionKey(): string {
  const configured = process.env.BOARD_SESSION_SECRET || process.env.LOUNGE_ENCRYPTION_KEY;
  if (configured) return `board_session_${configured}`;
  if (process.env.NODE_ENV === "production") {
    throw new Error("BOARD_SESSION_SECRET or LOUNGE_ENCRYPTION_KEY is required in production");
  }
  return "board_session_development-only-key";
}

// ── Password hashing (scrypt) ───────────────────────────────────────────────
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = scryptSync(password, salt, 64).toString("hex");
  try { return timingSafeEqual(Buffer.from(test, "hex"), Buffer.from(hash, "hex")); }
  catch { return false; }
}

const COMMON_WEAK_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "admin",
  "admin123",
  "millstadtems",
  "millstadt",
  "ems",
  "dev",
  "dev1",
  "welcome",
  "welcome1",
  "letmein",
  "changeme",
]);

export function validateBoardPassword(password: string, identityValues: string[] = []): string | null {
  const normalized = password.trim().toLowerCase();
  if (password.length < 12) return "Use at least 12 characters.";
  if (COMMON_WEAK_PASSWORDS.has(normalized)) return "Use a stronger password.";
  if (/^(.)\1+$/.test(password)) return "Use a stronger password.";
  if (/^(?:1234567890|0987654321|qwerty|asdfgh|dev\d+)$/i.test(password)) return "Use a stronger password.";
  for (const value of identityValues) {
    const part = value.trim().toLowerCase();
    if (part.length >= 3 && normalized.includes(part)) return "Do not include your name or username in the password.";
  }
  return null;
}

// ── Session token: userId.issuedAt.hmac(userId.issuedAt.pwFingerprint) ──────
function pwFingerprint(passwordHash: string): string {
  return createHmac("sha256", sessionKey()).update(passwordHash).digest("hex").slice(0, 16);
}
function signSession(userId: string, passwordHash: string): string {
  const ts = Date.now().toString();
  const body = `${userId}.${ts}`;
  const sig = createHmac("sha256", sessionKey()).update(`${body}.${pwFingerprint(passwordHash)}`).digest("hex");
  return `${body}.${sig}`;
}

export function sessionCookieOptions(userId: string, passwordHash: string) {
  return {
    name: COOKIE,
    value: signSession(userId, passwordHash),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: MAX_AGE,
    path: "/",
  };
}

export async function setSession(userId: string, passwordHash: string): Promise<void> {
  const c = await cookies();
  c.set(sessionCookieOptions(userId, passwordHash));
}
export async function clearSession(): Promise<void> {
  const c = await cookies();
  c.set({ name: COOKIE, value: "", httpOnly: true, path: "/", maxAge: 0 });
}

/** Resolve the signed-in board user from the cookie, or null. */
export async function currentBoardUser(): Promise<BoardUser | null> {
  const c = await cookies();
  const token = c.get(COOKIE)?.value;
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, ts, sig] = parts;
  const issuedAt = Number(ts);
  const age = Date.now() - issuedAt;
  if (!Number.isFinite(issuedAt) || age < -60_000 || age > MAX_AGE * 1000) return null;
  const user = await getUserById(userId);
  if (!user || !user.isActive) return null;
  const expected = createHmac("sha256", sessionKey())
    .update(`${userId}.${ts}.${pwFingerprint(user.passwordHash)}`).digest("hex");
  try {
    if (!timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) return null;
  } catch { return null; }
  // Strip the hash before returning.
  const { passwordHash: _omit, ...safe } = user;
  void _omit;
  return safe;
}

export { getUserByUsername };

/** Roles allowed to see the detailed (non-simple) financial view by default. */
export function canUseDetailedView(role: BoardUser["role"]): boolean {
  return role === "admin" || role === "submitter" || role === "ems_board" || role === "ems_president";
}
export function isAdmin(u: BoardUser | null): boolean { return u?.role === "admin"; }
