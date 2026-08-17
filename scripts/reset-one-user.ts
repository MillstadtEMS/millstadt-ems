/**
 * One-shot: reset a single user's lounge credentials.
 * Resets the one-time password to the assigned username and flips
 * must_change_password = TRUE so the new first-login gate sends them
 * straight to /lounge/change-password. Existing passkeys and TOTP
 * enrollment are preserved.
 *
 * Run: npx tsx scripts/reset-one-user.ts <username>
 */

import fs from "node:fs";
import path from "node:path";

(function loadEnvLocal() {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf-8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!process.env[m[1]]) process.env[m[1]] = val;
  }
})();

import { sql } from "../lib/neon";
import { hashPassword } from "../lib/lounge/auth";
import { defaultInitialPassword } from "../lib/lounge/employees";

async function main() {
  const username = (process.argv[2] ?? "").trim().toLowerCase();
  if (!username) {
    console.error("Usage: npx tsx scripts/reset-one-user.ts <username>");
    process.exit(1);
  }

  const db = sql();
  const rows = (await db`
    SELECT id, username, first_name, last_name, is_admin
    FROM lounge_employees
    WHERE LOWER(username) = ${username}
    LIMIT 1
  `) as unknown as { id: string; username: string; first_name: string; last_name: string; is_admin: boolean }[];

  if (rows.length === 0) {
    console.error(`No user with username "${username}"`);
    process.exit(1);
  }
  const u = rows[0];
  const newPassword = defaultInitialPassword(u.username);
  const newHash = hashPassword(newPassword);

  console.log(`Resetting ${u.username} (${u.first_name} ${u.last_name})${u.is_admin ? " [admin]" : ""}…`);

  await db`
    UPDATE lounge_employees SET
      password_hash         = ${newHash},
      must_change_password  = TRUE,
      updated_at            = NOW()
    WHERE id = ${u.id}
  `;

  console.log("Done.");
  console.log(`  username: ${u.username}`);
  console.log(`  password: ${newPassword}`);
  console.log("  Next password sign-in will force a permanent password change.");
  console.log("  Existing authenticator and passkey enrollment was preserved.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
