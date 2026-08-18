/**
 * Board Portal — seed the Fire District Board (Trustees) and set profile
 * photos from ~/Desktop/*.png. Idempotent.
 *   node scripts/board-fire-photos.mjs
 *
 * Uploads each photo to Vercel Blob (unguessable URL) and stores it as the
 * member's photo_url — used as their avatar and welcome-popup picture.
 */
import { readFileSync } from "node:fs";
import { createHash, scryptSync, randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { put } from "@vercel/blob";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const pick = (k) => env.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1]?.trim().replace(/^["']|["']$/g, "");
const DB = pick("DATABASE_URL");
if (!DB) throw new Error("DATABASE_URL is required in .env.local");
process.env.BLOB_READ_WRITE_TOKEN = pick("BLOB_READ_WRITE_TOKEN");
const sql = neon(DB);
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
const DESK = `${process.env.HOME}/Desktop`;

await sql`ALTER TABLE board_users ADD COLUMN IF NOT EXISTS setup_token_hash TEXT`;
await sql`ALTER TABLE board_users ADD COLUMN IF NOT EXISTS setup_token_expires_at TIMESTAMPTZ`;
await sql`ALTER TABLE board_users ADD COLUMN IF NOT EXISTS setup_token_used_at TIMESTAMPTZ`;

// ---- Fire District Board (Trustees) ----
const FIRE = [
  ["tgroesch",  "Todd",    "Groesch"],
  ["rwolfmeier","Robert",  "Wolfmeier"],
  ["mcolbert",  "Matt",    "Colbert"],
  ["todonnell", "Timothy", "O’Donnell"],
  ["dkossina",  "David",   "Kossina"],
];
for (const [u, first, last] of FIRE) {
  const exists = await sql`SELECT 1 FROM board_users WHERE username=${u} LIMIT 1`;
  if (exists.length) { console.log(`  · ${u} exists`); continue; }
  const credential = createSetupCredential();
  await sql`
    WITH inserted AS (
      INSERT INTO board_users (
        username, first_name, last_name, role, officer_title, password_hash,
        must_change_password, setup_token_hash, setup_token_expires_at,
        setup_token_used_at, simple_view_default
      )
      VALUES (
        ${u}, ${first}, ${last}, 'fire_board', 'District Trustee',
        ${credential.passwordHash}, TRUE, ${credential.tokenHash},
        ${credential.expiresAt}, NULL, TRUE
      )
      RETURNING id, username, role
    )
    INSERT INTO board_audit (user_id, username, role, action, detail)
    SELECT id, username, role, 'setup_token_created',
           ${JSON.stringify({ source: "board-fire-photos", setupTokenExpiresAt: credential.expiresAt })}
    FROM inserted`;
  console.log(`  + ${u} (${first} ${last}, District Trustee)`);
  console.log(`    one-time setup password: ${credential.token}`);
  console.log(`    expires: ${credential.expiresAt}`);
}

// ---- Photos: "<First Last>.png" on the Desktop -> username ----
const PHOTOS = [
  ["Joe Wagner.png",        "jwagner"],
  ["Phil Acker.png",        "packer"],
  ["Suzanne Alberter.png",  "salberter"],
  ["Linda Lehr.png",        "llehr"],
  ["Michael Kempf.png",     "mkempf"],
  ["Jeannine Kochmann.png", "jkochmann"],
  ["Todd Groesch.png",      "tgroesch"],
  ["Matt Colbert.png",      "mcolbert"],
  ["David Kossina.png",     "dkossina"],
];
for (const [file, u] of PHOTOS) {
  let buf;
  try { buf = readFileSync(`${DESK}/${file}`); }
  catch { console.log(`  ! ${file} not found — skipped`); continue; }
  const blob = await put(`board-photos/${u}.png`, buf, { access: "public", contentType: "image/png", addRandomSuffix: true });
  await sql`UPDATE board_users SET photo_url=${blob.url} WHERE username=${u}`;
  console.log(`  ⟳ ${u} photo set (${Math.round(buf.length / 1024)} KB)`);
}
console.log("Fire board + photos done.");
