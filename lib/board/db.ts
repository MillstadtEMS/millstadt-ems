/**
 * Board of Directors Portal — database layer (Neon Postgres).
 *
 * The portal is the system of record for accounts, roles, audit, and a cached
 * copy of the financial figures pulled from the FY2026-27 workbook. It never
 * stores passwords, signatures, or audit data inside Excel. Tables are created
 * on demand (same pattern as lib/cad/settings.ts) so no separate migration
 * step is required to stand the portal up.
 */
import { neon } from "@neondatabase/serverless";

export function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  return neon(url);
}

export type BoardRole =
  | "admin"          // Kenneth — full control
  | "submitter"      // Jennifer — create/submit, no admin
  | "ems_board"      // EMS board voting member
  | "ems_president"  // EMS board president
  | "fire_board"     // Fire district board — restricted, granted visibility only
  | "audit_reviewer";// read-only audit access

export interface BoardUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  role: BoardRole;
  officerTitle: string | null;   // President / Vice President / Treasurer / Secretary / Member
  photoUrl: string | null;       // profile picture; also shown in the welcome popup
  isActive: boolean;
  mustChangePassword: boolean;
  simpleViewDefault: boolean;
  isDevLogin: boolean;
  createdAt: string;
}

let ready = false;

export async function ensureBoardSchema(): Promise<void> {
  if (ready) return;
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS board_users (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username            TEXT UNIQUE NOT NULL,
      first_name          TEXT NOT NULL,
      last_name           TEXT NOT NULL,
      email               TEXT,
      phone               TEXT,
      role                TEXT NOT NULL DEFAULT 'ems_board',
      officer_title       TEXT,
      password_hash       TEXT NOT NULL,
      is_active           BOOLEAN NOT NULL DEFAULT TRUE,
      must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
      simple_view_default BOOLEAN NOT NULL DEFAULT FALSE,
      is_dev_login       BOOLEAN NOT NULL DEFAULT FALSE,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`ALTER TABLE board_users ADD COLUMN IF NOT EXISTS photo_url TEXT`;
  await db`ALTER TABLE board_users ADD COLUMN IF NOT EXISTS is_dev_login BOOLEAN NOT NULL DEFAULT FALSE`;
  // Cached financial figures keyed by a stable slug, sourced from the workbook.
  await db`
    CREATE TABLE IF NOT EXISTS board_finance (
      key          TEXT PRIMARY KEY,
      label        TEXT NOT NULL,
      value        DOUBLE PRECISION,
      text_value   TEXT,
      unit         TEXT,
      grouping     TEXT,
      sort         INTEGER NOT NULL DEFAULT 0,
      source_cell  TEXT,
      needs_review BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  // Append-only audit trail.
  await db`
    CREATE TABLE IF NOT EXISTS board_audit (
      id         BIGSERIAL PRIMARY KEY,
      at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      user_id    UUID,
      username   TEXT,
      role       TEXT,
      action     TEXT NOT NULL,
      detail     TEXT,
      ip         TEXT
    )
  `;
  ready = true;
}

/** Write an audit entry. Never throws into the caller's happy path. */
export async function audit(entry: {
  userId?: string | null; username?: string | null; role?: string | null;
  action: string; detail?: string | null; ip?: string | null;
}): Promise<void> {
  try {
    const db = sql();
    await db`
      INSERT INTO board_audit (user_id, username, role, action, detail, ip)
      VALUES (${entry.userId ?? null}, ${entry.username ?? null}, ${entry.role ?? null},
              ${entry.action}, ${entry.detail ?? null}, ${entry.ip ?? null})
    `;
  } catch { /* audit must never break the request */ }
}

function rowToUser(r: Record<string, unknown>): BoardUser {
  return {
    id: String(r.id),
    username: String(r.username),
    firstName: String(r.first_name),
    lastName: String(r.last_name),
    email: r.email != null ? String(r.email) : null,
    phone: r.phone != null ? String(r.phone) : null,
    role: String(r.role) as BoardRole,
    officerTitle: r.officer_title != null ? String(r.officer_title) : null,
    photoUrl: r.photo_url != null ? String(r.photo_url) : null,
    isActive: r.is_active === true,
    mustChangePassword: r.must_change_password === true,
    simpleViewDefault: r.simple_view_default === true,
    isDevLogin: r.is_dev_login === true,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  };
}

export async function getUserByUsername(username: string): Promise<(BoardUser & { passwordHash: string }) | null> {
  await ensureBoardSchema();
  const db = sql();
  const rows = (await db`SELECT * FROM board_users WHERE username = ${username.toLowerCase()} LIMIT 1`) as Record<string, unknown>[];
  if (!rows.length) return null;
  return { ...rowToUser(rows[0]), passwordHash: String(rows[0].password_hash) };
}

export async function getUserById(id: string): Promise<(BoardUser & { passwordHash: string }) | null> {
  await ensureBoardSchema();
  const db = sql();
  const rows = (await db`SELECT * FROM board_users WHERE id = ${id} LIMIT 1`) as Record<string, unknown>[];
  if (!rows.length) return null;
  return { ...rowToUser(rows[0]), passwordHash: String(rows[0].password_hash) };
}
