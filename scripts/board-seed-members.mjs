/**
 * Board Portal — seed the board roster + a dev quick-login.
 *   node scripts/board-seed-members.mjs
 *
 * Idempotent: existing usernames are left untouched. Temporary password for
 * each real member is <username>39 (forced change at first login). The dev
 * account logs in fast with password 957223 and never forces a change.
 *
 * Roles/officer titles are intentionally minimal — everyone starts as a
 * standard EMS Board member (Jennifer = submitter). Kenneth sets exact
 * boards/officers/audit-reviewer from the admin screen.
 */
import { readFileSync } from "node:fs";
import { scryptSync, randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const url = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
  .match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
if (!url) { console.error("DATABASE_URL missing"); process.exit(1); }
const sql = neon(url);
const hash = (pw) => { const s = randomBytes(16).toString("hex"); return `${s}:${scryptSync(pw, s, 64).toString("hex")}`; };

await sql`ALTER TABLE board_users ADD COLUMN IF NOT EXISTS photo_url TEXT`;

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
    VALUES (${username}, ${first}, ${last}, ${role}, ${hash(username + "39")}, ${mustChange}, ${role === "fire_board"})`;
  created++;
  console.log(`  + ${username}  (${first} ${last}, ${role})  temp pw: ${username}39`);
}

// dev quick-login
const devExists = await sql`SELECT 1 FROM board_users WHERE username = 'dev' LIMIT 1`;
if (devExists.length) {
  await sql`UPDATE board_users SET password_hash = ${hash("957223")}, must_change_password = FALSE, role = 'admin', is_active = TRUE WHERE username = 'dev'`;
  console.log("  · dev updated (pw 957223)");
} else {
  await sql`
    INSERT INTO board_users (username, first_name, last_name, role, password_hash, must_change_password)
    VALUES ('dev','Dev','Login','admin', ${hash("957223")}, FALSE)`;
  console.log("  + dev  (quick login, pw 957223)");
}

console.log(`\nDone. ${created} created, ${skipped} skipped.`);
