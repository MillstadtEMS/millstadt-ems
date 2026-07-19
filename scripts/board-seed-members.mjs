/**
 * Board Portal — seed the board roster.
 *   node scripts/board-seed-members.mjs
 *
 * Idempotent: existing usernames are left untouched. Temporary passwords come
 * from BOARD_INITIAL_TEMP_PASSWORD and force a change at first login.
 * Development credentials are handled separately and must not be used for
 * production.
 *
 * Roles/officer titles are intentionally minimal — everyone starts as a
 * standard EMS Board member (Jennifer = submitter). Kenneth sets exact
 * boards/officers/audit-reviewer from the admin screen.
 */
import { readFileSync } from "node:fs";
import { scryptSync, randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const readEnv = (name) => env.match(new RegExp(`^${name}=(.*)$`, "m"))?.[1]?.trim().replace(/^["']|["']$/g, "");
const url = readEnv("DATABASE_URL");
if (!url) { console.error("DATABASE_URL missing"); process.exit(1); }
const initialTemporaryPassword = readEnv("BOARD_INITIAL_TEMP_PASSWORD");
if (!initialTemporaryPassword) {
  console.error("BOARD_INITIAL_TEMP_PASSWORD missing; set it in .env.local before seeding board members.");
  process.exit(1);
}
const developmentPassword = readEnv("BOARD_DEV_PASSWORD");
const sql = neon(url);
const hash = (pw) => { const s = randomBytes(16).toString("hex"); return `${s}:${scryptSync(pw, s, 64).toString("hex")}`; };

await sql`ALTER TABLE board_users ADD COLUMN IF NOT EXISTS photo_url TEXT`;
await sql`ALTER TABLE board_users ADD COLUMN IF NOT EXISTS is_dev_login BOOLEAN NOT NULL DEFAULT FALSE`;

// username, first, last, role, mustChange, password
const PEOPLE = [
  ["jwagner",   "Joe",      "Wagner",    "ems_board",  true],
  ["jkochmann", "Jeannine", "Kochmann",  "ems_board",  true],
  ["llehr",     "Linda",    "Lehr",      "ems_board",  true],
  ["packer",    "Phil",     "Acker",     "ems_board",  true],
  ["mkempf",    "Michael",  "Kempf",     "ems_board",  true],
  ["salberter", "Suzanne",  "Alberter",  "ems_board",  true],
  ["jgoetz",    "Jennifer", "Goetz",     "submitter",  true],
];

let created = 0, skipped = 0;
for (const [username, first, last, role, mustChange] of PEOPLE) {
  const exists = await sql`SELECT 1 FROM board_users WHERE username = ${username} LIMIT 1`;
  if (exists.length) { skipped++; console.log(`  · ${username} already exists — left as-is`); continue; }
  await sql`
    INSERT INTO board_users (username, first_name, last_name, role, password_hash, must_change_password, simple_view_default)
    VALUES (${username}, ${first}, ${last}, ${role}, ${hash(initialTemporaryPassword)}, ${mustChange}, ${role === "fire_board"})`;
  created++;
  console.log(`  + ${username}  (${first} ${last}, ${role})  temporary password assigned`);
}

// Optional local-only development login. Never create it without explicit config.
if (developmentPassword) {
  const devExists = await sql`SELECT 1 FROM board_users WHERE username = 'dev' LIMIT 1`;
  if (devExists.length) {
    await sql`UPDATE board_users SET password_hash = ${hash(developmentPassword)}, must_change_password = TRUE, role = 'admin', is_active = TRUE WHERE username = 'dev'`;
    console.log("  · dev updated from BOARD_DEV_PASSWORD; password change required");
  } else {
    await sql`
      INSERT INTO board_users (username, first_name, last_name, role, password_hash, must_change_password)
      VALUES ('dev','Dev','Login','admin', ${hash(developmentPassword)}, TRUE)`;
    console.log("  + dev created from BOARD_DEV_PASSWORD; password change required");
  }
} else {
  console.log("  · dev login skipped; BOARD_DEV_PASSWORD is not configured");
}

console.log(`\nDone. ${created} created, ${skipped} skipped.`);
