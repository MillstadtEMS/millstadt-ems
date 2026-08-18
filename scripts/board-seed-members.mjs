/**
 * Board Portal — seed the board roster.
 *   node scripts/board-seed-members.mjs
 *
 * Idempotent: existing usernames are left untouched. Every newly created user
 * receives a distinct random, expiring, one-time setup password. Development
 * credentials are handled separately and must not be used for production.
 *
 * Roles/officer titles are intentionally minimal — everyone starts as a
 * standard EMS Board member (Jennifer = submitter). Kenneth sets exact
 * boards/officers/audit-reviewer from the admin screen.
 */
import { readFileSync } from "node:fs";
import { createHash, scryptSync, randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const readEnv = (name) => env.match(new RegExp(`^${name}=(.*)$`, "m"))?.[1]?.trim().replace(/^["']|["']$/g, "");
const url = readEnv("DATABASE_URL");
if (!url) { console.error("DATABASE_URL missing"); process.exit(1); }
const sql = neon(url);
const hash = (pw) => { const s = randomBytes(16).toString("hex"); return `${s}:${scryptSync(pw, s, 64).toString("hex")}`; };
const createSetupCredential = () => {
  const token = randomBytes(24).toString("base64url");
  return {
    token,
    tokenHash: createHash("sha256").update(token).digest("hex"),
    passwordHash: hash(token),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
};

await sql`ALTER TABLE board_users ADD COLUMN IF NOT EXISTS photo_url TEXT`;
await sql`ALTER TABLE board_users ADD COLUMN IF NOT EXISTS is_dev_login BOOLEAN NOT NULL DEFAULT FALSE`;
await sql`ALTER TABLE board_users ADD COLUMN IF NOT EXISTS setup_token_hash TEXT`;
await sql`ALTER TABLE board_users ADD COLUMN IF NOT EXISTS setup_token_expires_at TIMESTAMPTZ`;
await sql`ALTER TABLE board_users ADD COLUMN IF NOT EXISTS setup_token_used_at TIMESTAMPTZ`;

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
  const credential = createSetupCredential();
  await sql`
    WITH inserted AS (
      INSERT INTO board_users (
        username, first_name, last_name, role, password_hash,
        must_change_password, setup_token_hash, setup_token_expires_at,
        setup_token_used_at, simple_view_default
      )
      VALUES (
        ${username}, ${first}, ${last}, ${role}, ${credential.passwordHash},
        ${mustChange}, ${credential.tokenHash}, ${credential.expiresAt}, NULL,
        ${role === "fire_board"}
      )
      RETURNING id, username, role
    )
    INSERT INTO board_audit (user_id, username, role, action, detail)
    SELECT id, username, role, 'setup_token_created',
           ${JSON.stringify({ source: "board-seed-members", setupTokenExpiresAt: credential.expiresAt })}
    FROM inserted`;
  created++;
  console.log(`  + ${username}  (${first} ${last}, ${role})`);
  console.log(`    one-time setup password: ${credential.token}`);
  console.log(`    expires: ${credential.expiresAt}`);
}

console.log(`\nDone. ${created} created, ${skipped} skipped.`);
console.log("Development personas, when needed locally, are managed by board-dev-logins.mjs.");
