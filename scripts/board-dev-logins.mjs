/**
 * Board Portal — temporary dev persona logins.
 *
 *   node scripts/board-dev-logins.mjs create
 *   node scripts/board-dev-logins.mjs list
 *   node scripts/board-dev-logins.mjs delete
 *
 * Creates dev1, dev2, etc. for active board portal personas with generated
 * passwords. Do not use username-matching passwords on a public deployment.
 * Dev logins are flagged with board_users.is_dev_login so they can be removed
 * cleanly and excluded from real attendance/quorum counts.
 */
import { readFileSync } from "node:fs";
import { randomBytes, scryptSync } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const command = (process.argv[2] ?? "create").toLowerCase();
const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const readEnv = (name) => env.match(new RegExp(`^${name}=(.*)$`, "m"))?.[1]?.trim().replace(/^["']|["']$/g, "");
const url = readEnv("DATABASE_URL");
if (!url) {
  console.error("DATABASE_URL missing in .env.local");
  process.exit(1);
}

const sql = neon(url);
const hash = (password) => {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
};
const randomPassword = () => randomBytes(24).toString("base64url");

await sql`ALTER TABLE board_users ADD COLUMN IF NOT EXISTS photo_url TEXT`;
await sql`ALTER TABLE board_users ADD COLUMN IF NOT EXISTS is_dev_login BOOLEAN NOT NULL DEFAULT FALSE`;
await sql`ALTER TABLE board_users ADD COLUMN IF NOT EXISTS setup_token_hash TEXT`;
await sql`ALTER TABLE board_users ADD COLUMN IF NOT EXISTS setup_token_expires_at TIMESTAMPTZ`;
await sql`ALTER TABLE board_users ADD COLUMN IF NOT EXISTS setup_token_used_at TIMESTAMPTZ`;

if (command === "delete" || command === "remove") {
  const removed = await sql`DELETE FROM board_users WHERE is_dev_login = TRUE OR username ~ '^dev[0-9]+$' RETURNING username`;
  console.log(`Removed ${removed.length} dev login(s).`);
  process.exit(0);
}

if (command === "list") {
  const rows = await sql`
    SELECT username, first_name, last_name, role, officer_title, is_active
    FROM board_users
    WHERE is_dev_login = TRUE OR username ~ '^dev[0-9]+$'
    ORDER BY username`;
  for (const row of rows) {
    console.log(`${row.username} — ${row.first_name} ${row.last_name} (${row.role}${row.officer_title ? `, ${row.officer_title}` : ""})`);
  }
  console.log(`${rows.length} dev login(s).`);
  process.exit(0);
}

if (command !== "create") {
  console.error("Usage: node scripts/board-dev-logins.mjs [create|list|delete]");
  process.exit(1);
}

const realUsers = await sql`
  SELECT username, first_name, last_name, role, officer_title, photo_url, simple_view_default
  FROM board_users
  WHERE is_active = TRUE
    AND COALESCE(is_dev_login, FALSE) = FALSE
    AND username <> 'dev'
    AND username !~ '^dev[0-9]+$'
    AND role IN ('admin', 'ems_president', 'ems_board', 'submitter', 'fire_board')
  ORDER BY
    CASE role
      WHEN 'admin' THEN 0
      WHEN 'ems_president' THEN 1
      WHEN 'ems_board' THEN 2
      WHEN 'submitter' THEN 3
      WHEN 'fire_board' THEN 4
      ELSE 9
    END,
    last_name ASC,
    first_name ASC`;

let index = 0;
for (const person of realUsers) {
  index += 1;
  const username = `dev${index}`;
  const password = randomPassword();
  await sql`
    WITH upserted AS (
      INSERT INTO board_users (
        username, first_name, last_name, role, officer_title, photo_url,
        password_hash, is_active, must_change_password, setup_token_hash,
        setup_token_expires_at, setup_token_used_at, simple_view_default, is_dev_login
      )
      VALUES (
        ${username}, ${person.first_name}, ${person.last_name}, ${person.role},
        ${person.officer_title ?? null}, ${person.photo_url ?? null},
        ${hash(password)}, TRUE, FALSE, NULL, NULL, NULL,
        ${person.simple_view_default === true}, TRUE
      )
      ON CONFLICT (username) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        role = EXCLUDED.role,
        officer_title = EXCLUDED.officer_title,
        photo_url = EXCLUDED.photo_url,
        password_hash = EXCLUDED.password_hash,
        is_active = TRUE,
        must_change_password = FALSE,
        setup_token_hash = NULL,
        setup_token_expires_at = NULL,
        setup_token_used_at = NULL,
        simple_view_default = EXCLUDED.simple_view_default,
        is_dev_login = TRUE
      RETURNING id, username, role
    )
    INSERT INTO board_audit (user_id, username, role, action, detail)
    SELECT id, username, role, 'dev_credential_rotated', 'board-dev-logins create'
    FROM upserted`;
  console.log(`${username} / ${password} — ${person.first_name} ${person.last_name} (${person.role}${person.officer_title ? `, ${person.officer_title}` : ""})`);
}

console.log(`Created/updated ${index} dev login(s).`);
