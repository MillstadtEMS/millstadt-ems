/**
 * One-shot: reset a single user's lounge credentials.
 * Wipes WebAuthn passkeys, clears TOTP enrollment, resets the password
 * to the default ({firstInitial}{lastName}3935), and flips
 * must_change_password = TRUE so the new first-login gate sends them
 * straight to /lounge/change-password.
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
  const newPassword = defaultInitialPassword(u.first_name, u.last_name);
  const newHash = hashPassword(newPassword);

  console.log(`Resetting ${u.username} (${u.first_name} ${u.last_name})${u.is_admin ? " [admin]" : ""}…`);

  await db`DELETE FROM lounge_webauthn_credentials WHERE employee_id = ${u.id}`;
  await db`DELETE FROM lounge_webauthn_challenges  WHERE employee_id = ${u.id}`;
  await db`
    UPDATE lounge_employees SET
      password_hash         = ${newHash},
      must_change_password  = TRUE,
      totp_secret_encrypted = NULL,
      totp_enrolled_at      = NULL,
      updated_at            = NOW()
    WHERE id = ${u.id}
  `;

  console.log("Done.");
  console.log(`  username: ${u.username}`);
  console.log(`  password: ${newPassword}`);
  console.log("  Next sign-in will force password change, then prompt 2FA + biometrics again.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
