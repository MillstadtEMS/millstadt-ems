/**
 * Inventory auth — separate from admin auth.
 * Password stored as scrypt hash in site_content table.
 * Session cookie: mas_inventory (httpOnly, 8h TTL).
 */

import { scryptSync, randomBytes, createHmac } from "crypto";
import { cookies } from "next/headers";
import { neon } from "@neondatabase/serverless";

const COOKIE = "mas_inventory";
const MAX_AGE = 60 * 60 * 8; // 8 hours
const PW_KEY = "inventory_password_hash";

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  return neon(url);
}

// ── Password hashing ───────────────────────────────────────────────────────

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const testHash = scryptSync(password, salt, 64).toString("hex");
  return hash === testHash;
}

// ── Password storage (in site_content table) ───────────────────────────────

async function ensurePwTable() {
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS site_content (
      key         TEXT PRIMARY KEY,
      live_value  TEXT NOT NULL DEFAULT '',
      draft_value TEXT,
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export async function getPasswordHash(): Promise<string | null> {
  await ensurePwTable();
  const db = sql();
  const rows = await db`SELECT live_value FROM site_content WHERE key = ${PW_KEY}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = (rows as any[])[0];
  return row?.live_value || null;
}

export async function setPasswordHash(hash: string): Promise<void> {
  await ensurePwTable();
  const db = sql();
  await db`
    INSERT INTO site_content (key, live_value, updated_at)
    VALUES (${PW_KEY}, ${hash}, NOW())
    ON CONFLICT (key) DO UPDATE SET live_value = ${hash}, updated_at = NOW()
  `;
}

/**
 * Initialize the inventory password if it doesn't exist yet.
 * Uses INVENTORY_PASSWORD env var or the default.
 */
export async function ensurePassword(): Promise<void> {
  const existing = await getPasswordHash();
  if (existing) return;
  const initial = process.env.INVENTORY_PASSWORD ?? "$Millstadtinventory3935!";
  const hash = hashPassword(initial);
  await setPasswordHash(hash);
}

/**
 * Verify a login attempt against the stored password.
 */
export async function checkInventoryPassword(password: string): Promise<boolean> {
  await ensurePassword();
  const stored = await getPasswordHash();
  if (!stored) return false;
  return verifyPassword(password, stored);
}

/**
 * Change the inventory password. Returns true on success.
 */
export async function changeInventoryPassword(newPassword: string): Promise<boolean> {
  const hash = hashPassword(newPassword);
  await setPasswordHash(hash);
  return true;
}

// ── Session tokens ─────────────────────────────────────────────────────────

async function getSigningSecret(): Promise<string> {
  const hash = await getPasswordHash();
  // Use the password hash as part of the signing secret
  // This means changing the password invalidates all sessions
  return `inv_session_${hash ?? "default"}`;
}

function signWithSecret(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export async function makeInventorySessionToken(): Promise<string> {
  const secret = await getSigningSecret();
  const ts = Date.now().toString();
  return `${ts}.${signWithSecret(ts, secret)}`;
}

export async function verifyInventorySession(token: string): Promise<boolean> {
  const [ts, sig] = token.split(".");
  if (!ts || !sig) return false;
  if (Date.now() - Number(ts) > MAX_AGE * 1000) return false;
  const secret = await getSigningSecret();
  return signWithSecret(ts, secret) === sig;
}

export async function isInventoryAuthed(): Promise<boolean> {
  try {
    const jar = await cookies();
    const token = jar.get(COOKIE)?.value;
    if (!token) return false;
    return await verifyInventorySession(token);
  } catch {
    return false;
  }
}

export function inventoryCookieOptions(token: string) {
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

export const INVENTORY_COOKIE_NAME = COOKIE;
