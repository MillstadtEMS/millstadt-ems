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
import { createHash, scryptSync, randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const readEnv = (name) => env.match(new RegExp(`^${name}=(.*)$`, "m"))?.[1]?.trim().replace(/^["']|["']$/g, "");
const url = readEnv("DATABASE_URL");
if (!url) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}
const sql = neon(url);

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

function createSetupCredential() {
  const token = randomBytes(24).toString("base64url");
  return {
    token,
    tokenHash: createHash("sha256").update(token).digest("hex"),
    passwordHash: hashPassword(token),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
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
    setup_token_hash TEXT,
    setup_token_expires_at TIMESTAMPTZ,
    setup_token_used_at TIMESTAMPTZ,
    simple_view_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_dev_login BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
await sql`ALTER TABLE board_users ADD COLUMN IF NOT EXISTS photo_url TEXT`;
await sql`ALTER TABLE board_users ADD COLUMN IF NOT EXISTS is_dev_login BOOLEAN NOT NULL DEFAULT FALSE`;
await sql`ALTER TABLE board_users ADD COLUMN IF NOT EXISTS setup_token_hash TEXT`;
await sql`ALTER TABLE board_users ADD COLUMN IF NOT EXISTS setup_token_expires_at TIMESTAMPTZ`;
await sql`ALTER TABLE board_users ADD COLUMN IF NOT EXISTS setup_token_used_at TIMESTAMPTZ`;
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
  const credential = createSetupCredential();
  await sql`
    WITH inserted AS (
      INSERT INTO board_users (
        username, first_name, last_name, email, role, officer_title,
        password_hash, must_change_password, setup_token_hash,
        setup_token_expires_at, setup_token_used_at
      )
      VALUES (
        'kjames', 'Kenneth', 'James', 'millstadtems@gmail.com', 'admin', 'Administrator',
        ${credential.passwordHash}, TRUE, ${credential.tokenHash}, ${credential.expiresAt}, NULL
      )
      RETURNING id, username, role
    )
    INSERT INTO board_audit (user_id, username, role, action, detail)
    SELECT id, username, role, 'setup_token_created',
           ${JSON.stringify({ source: "board-setup", setupTokenExpiresAt: credential.expiresAt })}
    FROM inserted`;
  console.log("seeded admin 'kjames'; forced password change enabled.");
  console.log(`one-time setup password: ${credential.token}`);
  console.log(`expires: ${credential.expiresAt}`);
  console.log("This credential is shown once and must be delivered securely.");
}

console.log("Board setup complete.");
