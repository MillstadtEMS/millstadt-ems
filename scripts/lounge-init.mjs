#!/usr/bin/env node
/**
 * One-shot initializer for the Employee Lounge:
 *   1. Applies lib/lounge/schema.sql to Neon (idempotent — re-runnable).
 *   2. Seeds the 32 active employees from the May 2026 roster.
 *
 * Each employee gets:
 *   - username:  firstinitial + lastname (lowercase)
 *   - password:  a distinct random, expiring, one-time setup credential
 *   - must_change_password = TRUE
 *   - is_admin = TRUE for kjames + jgoetz only
 *
 * Re-runs are safe. Existing employees (by username) are SKIPPED, never
 * overwritten — so re-running this won't reset somebody's password they
 * already changed.
 *
 * Run with:
 *   node scripts/lounge-init.mjs
 *
 * Requires DATABASE_URL in env (read from .env.local automatically).
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { neon } from "@neondatabase/serverless";
import { createHash, scryptSync, randomBytes, randomUUID } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env.local manually so we don't need dotenv ────────────────────
function loadEnvLocal() {
  try {
    const txt = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!m) continue;
      let [, k, v] = m;
      v = v.trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    // .env.local optional
  }
}
loadEnvLocal();

if (!process.env.DATABASE_URL) {
  console.error("✗ DATABASE_URL not set. Add it to .env.local or export it.");
  process.exit(1);
}

// ── Roster (May 2026, from Payroll Tracking.pdf page 1) ────────────────
// [firstName, lastName, certification]
const ROSTER = [
  ["Daniel",    "Bemenderfer", "Paramedic"],
  ["Christian", "Beckett",     "EMT-B"],
  ["Jennifer",  "Beckett",     "Medic"],
  ["Josh",      "Blasdale",    "Paramedic"],
  ["Chandler",  "Davis",       "EMT-B"],
  ["Carson",    "Frost",       "EMT-B / Medic pending"],
  ["Charles",   "Germaine",    "EMT-B"],
  ["Jennifer",  "Goetz",       "PHRN / Chief"],
  ["Jordan",    "Gomric",      "EMT-B"],
  ["Nick",      "Hoeffken",    "Paramedic"],
  ["Cameron",   "Hopkinson",   "EMT"],
  ["Kenneth",   "James",       "Paramedic / Asst. Chief"],
  ["Berta",     "Jerashen",    "EMT-B"],
  ["Beth",      "Johns",       "PHAPRN"],
  ["George",    "Johns",       "Paramedic"],
  ["Stephen",   "Johns",       "EMT-B"],
  ["Gabrielle", "Johnson",     "Paramedic"],
  ["Jerry",     "Joyce",       "Paramedic"],
  ["Michael",   "Kelley",      "Paramedic"],
  ["Travis",    "Knoche",      "EMT-B"],
  ["Andrew",    "Kreher",      "Paramedic - pending"],
  ["Michael",   "McGarry",     "EMT-B"],
  ["Stacy",     "McManus",     "EMT-B"],
  ["Zach",      "Orr",         "PHAPRN"],
  ["Brooklyn",  "Parrish",     "EMT-B"],
  ["Joshua",    "Peyman",      "EMT-B"],
  ["Braeden",   "Pfeil",       "EMT-B"],
  ["Breanna",   "Reynolds",    "EMT-B"],
  ["Aiden",     "Ross",        "EMT-B"],
  ["Georgia",   "Sasser",      "EMT-B"],
  ["Dylan",     "Spencer",     "EMT-B / Lead EMT"],
  ["Kallista",  "Wetzel",      "EMT-B"],
];

// Phone + email lifted from the same PDF, indexed by username.
const CONTACT = {
  dbemenderfer: { phone: "319-538-4877", email: "djbemenderfer@gmail.com" },
  cbeckett:     { phone: "618-696-1912", email: "christianbeckett115@gmail.com" },
  jbeckett:     { phone: "618-960-0123", email: "wildkatzgurl@gmail.com" },
  jblasdale:    { phone: "618-979-8140", email: "jblaz08@gmail.com" },
  cdavis:       { phone: "618-719-3263", email: "ckdavis0503@gmail.com" },
  cfrost:       { phone: "618-889-9646", email: "carsonray03@hotmail.com" },
  cgermaine:    { phone: "618-779-1686", email: "cegermaine487@yahoo.com" },
  jgoetz:       { phone: "618-806-4539", email: "jennifer.goetz17@gmail.com" },
  jgomric:      { phone: "618-803-8799", email: "firefighter3910@gmail.com" },
  nhoeffken:    { phone: "618-781-5080", email: "nick.hoeffken@gmail.com" },
  chopkinson:   { phone: "781-460-4648", email: "c.c.hopkinson@wustl.edu" },
  kjames:       { phone: "618-719-3558", email: "kjames618@icloud.com" },
  bjerashen:    { phone: "618-719-3768", email: "r.jerashen04@gmail.com" },
  bjohns:       { phone: "618-830-3623", email: "kidrn0414@gmail.com" },
  gjohns:       { phone: "618-980-3639", email: "71opus@hotmail.com" },
  sjohns:       { phone: "618-612-8721", email: "choppy1104@gmail.com" },
  gjohnson:     { phone: "618-578-4618", email: "gabbybough@gmail.com" },
  jjoyce:       { phone: "618-818-5068", email: "jerryj89@gmail.com" },
  mkelley:      { phone: "618-708-1800", email: "mkellez@gmail.com" },
  tknoche:      { phone: "480-524-8824", email: "twknoche05@gmail.com" },
  akreher:      { phone: "618-806-4017", email: "akreher34@gmail.com" },
  mmcgarry:     { phone: "618-340-3968", email: "mmcgarry20@yahoo.com" },
  smcmanus:     { phone: "618-979-0957", email: "mcmanus94@aol.com" },
  zorr:         { phone: "217-257-8677", email: "zachoor14@gmail.com" },
  bparrish:     { phone: "636-579-6859", email: "parishbrooklyn16@gmail.com" },
  jpeyman:      { phone: "618-402-6092", email: "j_peymen@att.net" },
  bpfeil:       { phone: "618-530-5172", email: "bcp5002@gmail.com" },
  breynolds:    { phone: "618-316-4686", email: "breannareynolds06@gmail.com" },
  aross:        { phone: "618-979-4565", email: "aidenfire1215@gmail.com" },
  gsasser:      { phone: "618-504-9184", email: "gsasser0@gmail.com" },
  dspencer:     { phone: "618-491-9875", email: "djs62298@gmail.com" },
  kwetzel:      { phone: "618-340-8184", email: "kalistawetzel@gmail.com" },
};

const ADMIN_USERNAMES = new Set(["kjames", "jgoetz"]);

function usernameFor(first, last) {
  return (first[0] + last).toLowerCase().replace(/[^a-z]/g, "");
}

function hashPassword(plain) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${hash}`;
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

// ── Run ────────────────────────────────────────────────────────────────
const db = neon(process.env.DATABASE_URL);

async function applySchema() {
  const sqlText = readFileSync(join(__dirname, "..", "lib", "lounge", "schema.sql"), "utf8");
  // Strip line-comments, then split on `;` at end of statement boundary.
  // Skip blocks wrapped in DO $$ ... $$ — we handle those whole.
  const statements = splitStatements(sqlText);
  let n = 0;
  for (const stmt of statements) {
    if (!stmt.trim()) continue;
    await db.query(stmt);
    n++;
  }
  return n;
}

/** Naive SQL splitter that respects DO $$ ... $$ blocks. */
function splitStatements(text) {
  const out = [];
  let buf = "";
  let inDollar = false;
  for (const line of text.split(/\r?\n/)) {
    const stripped = line.replace(/--.*$/, "");
    buf += stripped + "\n";
    if (/\$\$/.test(stripped)) {
      // Toggle for each $$ occurrence on the line.
      const count = (stripped.match(/\$\$/g) || []).length;
      for (let i = 0; i < count; i++) inDollar = !inDollar;
    }
    if (!inDollar && stripped.trim().endsWith(";")) {
      out.push(buf);
      buf = "";
    }
  }
  if (buf.trim()) out.push(buf);
  return out;
}

async function seedEmployees() {
  let inserted = 0;
  let skipped = 0;
  const credentials = [];
  for (const [first, last, cert] of ROSTER) {
    const username = usernameFor(first, last);
    const contact = CONTACT[username] ?? {};
    const id = randomUUID();
    const isAdmin = ADMIN_USERNAMES.has(username);

    const existing = await db`
      SELECT id FROM lounge_employees WHERE LOWER(username) = LOWER(${username}) LIMIT 1
    `;
    if (existing.length) {
      skipped++;
      continue;
    }

    const credential = createSetupCredential();

    await db`
      WITH inserted AS (
        INSERT INTO lounge_employees
          (id, username, first_name, last_name, certification, email, phone,
           password_hash, must_change_password, setup_token_hash,
           setup_token_expires_at, setup_token_used_at, is_admin, is_active)
        VALUES
          (${id}, ${username}, ${first}, ${last}, ${cert},
           ${contact.email ?? null}, ${contact.phone ?? null},
           ${credential.passwordHash}, TRUE, ${credential.tokenHash},
           ${credential.expiresAt}, NULL, ${isAdmin}, TRUE)
        RETURNING id
      )
      INSERT INTO lounge_personnel_audit (employee_id, action, detail)
      SELECT id, 'employee_setup_token_created',
             ${JSON.stringify({ source: "lounge-init", setupTokenExpiresAt: credential.expiresAt })}::jsonb
      FROM inserted
    `;
    credentials.push({ first, last, username, ...credential });
    inserted++;
  }
  return { inserted, skipped, credentials };
}

async function main() {
  console.log("→ Applying schema (lib/lounge/schema.sql)…");
  const n = await applySchema();
  console.log(`  ✓ ${n} statements executed`);

  console.log("→ Seeding employees…");
  const { inserted, skipped, credentials } = await seedEmployees();
  console.log(`  ✓ ${inserted} inserted, ${skipped} already existed`);

  if (credentials.length) {
    console.log("\nNew one-time setup passwords (shown once; deliver securely):\n");
  }
  for (const credential of credentials) {
    console.log(
      `  ${credential.first.padEnd(11)} ${credential.last.padEnd(13)} →  username: ${credential.username.padEnd(13)} password: ${credential.token}  expires: ${credential.expiresAt}`,
    );
  }
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("✗ Failed:", err);
  process.exit(1);
});
