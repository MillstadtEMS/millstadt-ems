/**
 * Board Portal — one-time / repeatable setup.
 *
 *   node scripts/board-setup.mjs
 *
 * Ensures the board account and audit tables exist, then seeds Kenneth's admin
 * account if it is missing. Budget workbook data is managed through the portal
 * upload flow, not this script.
 */
import { readFileSync } from "node:fs";
import { scryptSync, randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const readEnv = (name) => env.match(new RegExp(`^${name}=(.*)$`, "m"))?.[1]?.trim().replace(/^["']|["']$/g, "");
const url = readEnv("DATABASE_URL");
if (!url) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}
const initialTemporaryPassword = readEnv("BOARD_INITIAL_TEMP_PASSWORD");
const sql = neon(url);

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

await sql`
  CREATE TABLE IF NOT EXISTS board_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'ems_board',
    officer_title TEXT,
    photo_url TEXT,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
    simple_view_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_dev_login BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
await sql`ALTER TABLE board_users ADD COLUMN IF NOT EXISTS photo_url TEXT`;
await sql`ALTER TABLE board_users ADD COLUMN IF NOT EXISTS is_dev_login BOOLEAN NOT NULL DEFAULT FALSE`;
await sql`
  CREATE TABLE IF NOT EXISTS board_audit (
    id BIGSERIAL PRIMARY KEY,
    at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID,
    username TEXT,
    role TEXT,
    action TEXT NOT NULL,
    detail TEXT,
    ip TEXT
  )`;

const existing = await sql`SELECT username FROM board_users WHERE username = 'kjames' LIMIT 1`;
if (existing.length) {
  console.log("admin 'kjames' already exists; left unchanged.");
} else {
  if (!initialTemporaryPassword) {
    console.error("BOARD_INITIAL_TEMP_PASSWORD missing; set it in .env.local before seeding the board admin account.");
    process.exit(1);
  }
  await sql`
    INSERT INTO board_users (username, first_name, last_name, email, role, officer_title, password_hash, must_change_password)
    VALUES ('kjames', 'Kenneth', 'James', 'millstadtems@gmail.com', 'admin', 'Administrator', ${hashPassword(initialTemporaryPassword)}, TRUE)`;
  console.log("seeded admin 'kjames' with temporary password assigned; forced password change enabled.");
}

console.log("Board setup complete.");
