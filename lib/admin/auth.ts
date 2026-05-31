import { createHmac } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";

const COOKIE = "mas_admin";
const MAX_AGE = 60 * 60 * 8; // 8 hours

function sign(value: string): string {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error("ADMIN_PASSWORD is not configured");
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function makeSessionToken(): string {
  const ts = Date.now().toString();
  return `${ts}.${sign(ts)}`;
}

export function verifySessionToken(token: string): boolean {
  const [ts, sig] = token.split(".");
  if (!ts || !sig) return false;
  // Expire after 8 hours
  if (Date.now() - Number(ts) > MAX_AGE * 1000) return false;
  return sign(ts) === sig;
}

/**
 * Returns true if either:
 *   - the legacy shared-admin-password cookie (mas_admin) is valid, OR
 *   - a logged-in lounge employee has is_admin = true.
 *
 * This lets the lounge SSO replace the shared password without touching
 * every /api/admin/* route. Once the legacy cookie path is removed we
 * can drop the first half.
 */
export async function isAdminAuthed(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token && verifySessionToken(token)) return true;
  const emp = await currentEmployee();
  return !!emp && emp.isAdmin && emp.isActive;
}

export function sessionCookieOptions(token: string) {
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

/**
 * Drop-in guard for API routes that must run as admin. Returns a 401
 * response if the caller is not authed; otherwise returns null so the
 * caller can proceed.
 *
 * Usage:
 *   const denied = await requireAdmin();
 *   if (denied) return denied;
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  if (await isAdminAuthed()) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * True when the caller is allowed to edit the live CAD ticker. Admins
 * always pass; non-admin employees pass if their `can_edit_ticker` flag
 * on lounge_employees is TRUE. Used by /api/admin/calls and
 * /api/admin/cad-poll so a non-admin "ticker editor" employee can
 * curate the front-page ticker without needing global admin rights.
 */
export async function canEditTicker(): Promise<boolean> {
  if (await isAdminAuthed()) return true;
  const emp = await currentEmployee();
  if (!emp || !emp.isActive) return false;
  // currentEmployee returns a lean snapshot, so re-read the live flag
  // from the DB rather than trusting a stale field.
  const { sql } = await import("@/lib/lounge/db");
  const db = sql();
  const rows = (await db`
    SELECT COALESCE(can_edit_ticker, FALSE) AS can_edit_ticker
    FROM lounge_employees WHERE id = ${emp.id} LIMIT 1
  `) as unknown as { can_edit_ticker: boolean }[];
  return rows[0]?.can_edit_ticker ?? false;
}

export async function requireTickerEditor(): Promise<NextResponse | null> {
  if (await canEditTicker()) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
