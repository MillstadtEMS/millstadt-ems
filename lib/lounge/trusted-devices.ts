/**
 * "Trust this device" — skip the 2FA challenge for 30 days after a
 * successful sign-in on a given device. The user opts in with a checkbox
 * on the 2FA screen, and can revoke any device from /lounge/security.
 *
 * Storage model: we hand the browser a random opaque token in a
 * long-lived cookie, and store SHA-256(token) server-side. On the next
 * login, we hash the cookie value and look it up — if a matching row
 * exists for this user and hasn't expired, we skip the TOTP step and
 * issue a full session immediately.
 */
import { createHash, randomBytes } from "crypto";
import { sql } from "./db";

export const TRUST_COOKIE_NAME = "mas_lounge_trust";
// Lifted from 30 → 365 days so users only have to clear 2FA once per
// device. Server still validates the row + auto-deletes on expiry, so
// extending the cookie life can't be used to bypass a revoked device.
export const TRUST_TTL_DAYS = 365;
export const TRUST_TTL_SECONDS = TRUST_TTL_DAYS * 24 * 60 * 60;

let schemaEnsured = false;
async function ensureSchema() {
  if (schemaEnsured) return;
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS lounge_trusted_devices (
      id           TEXT PRIMARY KEY,
      employee_id  TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
      token_hash   TEXT NOT NULL UNIQUE,
      device_label TEXT,
      last_used_at TIMESTAMPTZ,
      expires_at   TIMESTAMPTZ NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS lounge_trusted_devices_employee_idx ON lounge_trusted_devices (employee_id)`;
  schemaEnsured = true;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newDeviceId(): string {
  return randomBytes(16).toString("hex");
}

export function newTrustToken(): string {
  // 32 bytes of randomness, URL-safe so it can sit in a cookie.
  return randomBytes(32).toString("base64url");
}

/**
 * Persist a trust row for this employee. Returns the raw token to set
 * in the cookie. The hash is what's stored — we can never recover the
 * raw value once it's left this function.
 */
export async function issueTrustedDevice(
  employeeId: string,
  deviceLabel: string | null,
): Promise<string> {
  await ensureSchema();
  const db = sql();
  const token = newTrustToken();
  const tokenHash = hashToken(token);
  const id = newDeviceId();
  const expires = new Date(Date.now() + TRUST_TTL_SECONDS * 1000).toISOString();
  await db`
    INSERT INTO lounge_trusted_devices (id, employee_id, token_hash, device_label, expires_at)
    VALUES (${id}, ${employeeId}, ${tokenHash}, ${deviceLabel}, ${expires})
  `;
  return token;
}

/**
 * Look up the trust cookie. If a non-expired row exists for this
 * employee + token, return its id (after bumping last_used_at).
 * Otherwise null. Constant-time-ish: we use a hash lookup, not a
 * compare, so the search itself doesn't leak whether a row existed.
 */
export async function verifyTrustedDevice(
  employeeId: string,
  rawToken: string,
): Promise<{ trustedDeviceId: string } | null> {
  if (!rawToken) return null;
  await ensureSchema();
  const tokenHash = hashToken(rawToken);
  const db = sql();
  const rows = (await db`
    SELECT id, expires_at
    FROM lounge_trusted_devices
    WHERE employee_id = ${employeeId} AND token_hash = ${tokenHash}
    LIMIT 1
  `) as unknown as { id: string; expires_at: string }[];
  const row = rows[0];
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    // Auto-cleanup: drop the stale row so the cookie can't be reused.
    await db`DELETE FROM lounge_trusted_devices WHERE id = ${row.id}`;
    return null;
  }
  await db`UPDATE lounge_trusted_devices SET last_used_at = NOW() WHERE id = ${row.id}`;
  return { trustedDeviceId: row.id };
}

export interface TrustedDeviceRow {
  id: string;
  deviceLabel: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
}

export async function listTrustedDevices(employeeId: string): Promise<TrustedDeviceRow[]> {
  await ensureSchema();
  const db = sql();
  const rows = (await db`
    SELECT id, device_label, created_at, last_used_at, expires_at
    FROM lounge_trusted_devices
    WHERE employee_id = ${employeeId}
    ORDER BY created_at DESC
  `) as unknown as { id: string; device_label: string | null; created_at: string; last_used_at: string | null; expires_at: string }[];
  const dt = (v: unknown): string | null => {
    if (v === null || v === undefined) return null;
    if (typeof v === "string") return v;
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString();
    return String(v);
  };
  return rows.map((r) => ({
    id: r.id,
    deviceLabel: r.device_label,
    createdAt: dt(r.created_at) ?? "",
    lastUsedAt: dt(r.last_used_at),
    expiresAt: dt(r.expires_at) ?? "",
  }));
}

export async function revokeTrustedDevice(employeeId: string, id: string): Promise<void> {
  await ensureSchema();
  const db = sql();
  await db`DELETE FROM lounge_trusted_devices WHERE id = ${id} AND employee_id = ${employeeId}`;
}

export function trustCookieOptions(token: string) {
  return {
    name: TRUST_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: TRUST_TTL_SECONDS,
    path: "/",
  };
}
