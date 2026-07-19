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
const sharedDevPassword = process.env.BOARD_DEV_SHARED_PASSWORD;
const passwordFor = (index) => sharedDevPassword || `MemsBoard!Dev${index}-2026`;

await sql`ALTER TABLE board_users ADD COLUMN IF NOT EXISTS photo_url TEXT`;
await sql`ALTER TABLE board_users ADD COLUMN IF NOT EXISTS is_dev_login BOOLEAN NOT NULL DEFAULT FALSE`;

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
    const n = Number(String(row.username).replace(/^dev/, ""));
    const password = Number.isFinite(n) ? passwordFor(n) : "(generated)";
    console.log(`${row.username} / ${password} — ${row.first_name} ${row.last_name} (${row.role}${row.officer_title ? `, ${row.officer_title}` : ""})`);
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
  const password = passwordFor(index);
  await sql`
    INSERT INTO board_users (
      username, first_name, last_name, role, officer_title, photo_url,
      password_hash, is_active, must_change_password, simple_view_default, is_dev_login
    )
    VALUES (
      ${username}, ${person.first_name}, ${person.last_name}, ${person.role},
      ${person.officer_title ?? null}, ${person.photo_url ?? null},
      ${hash(password)}, TRUE, FALSE, ${person.simple_view_default === true}, TRUE
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
      simple_view_default = EXCLUDED.simple_view_default,
      is_dev_login = TRUE`;
  console.log(`${username} / ${password} — ${person.first_name} ${person.last_name} (${person.role}${person.officer_title ? `, ${person.officer_title}` : ""})`);
}

console.log(`Created/updated ${index} dev login(s).`);
