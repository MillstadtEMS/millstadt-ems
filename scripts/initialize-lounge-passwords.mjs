#!/usr/bin/env node
/**
 * Rotate every active Lounge employee to a distinct random, expiring,
 * one-time setup password. The default mode is a dry run. Pass --apply to
 * perform the reset after the P0 auth migration and release are deployed.
 *
 * Existing sessions, trusted devices, SMS codes, and pre-auth challenges are
 * revoked. Passkeys and authenticator enrollment are intentionally preserved.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomBytes, scryptSync } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));

try {
  const contents = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
} catch {
  // Environment variables may already be provided by the shell.
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function setupTokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

function createSetupCredential() {
  const token = randomBytes(24).toString("base64url");
  return {
    token,
    tokenHash: setupTokenHash(token),
    passwordHash: hashPassword(token),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

const apply = process.argv.includes("--apply");
const db = neon(process.env.DATABASE_URL);
const employees = await db`
  SELECT id, username, first_name, last_name
  FROM lounge_employees
  WHERE is_active = TRUE
  ORDER BY last_name, first_name
`;

console.log(`${apply ? "Applying" : "Dry run for"} ${employees.length} active employee account(s):`);
for (const employee of employees) {
  console.log(`  ${employee.username} (${employee.first_name} ${employee.last_name})`);
  if (!apply) continue;
  const credential = createSetupCredential();
  await db`
    WITH updated AS (
      UPDATE lounge_employees
      SET password_hash = ${credential.passwordHash},
          must_change_password = TRUE,
          setup_token_hash = ${credential.tokenHash},
          setup_token_expires_at = ${credential.expiresAt},
          setup_token_used_at = NULL,
          sms_login_code_hash = NULL,
          sms_login_code_expires_at = NULL,
          sms_login_code_attempts = 0,
          updated_at = NOW()
      WHERE id = ${employee.id}
      RETURNING id
    ), revoked_challenges AS (
      UPDATE lounge_preauth_challenges challenge
      SET revoked_at = COALESCE(challenge.revoked_at, NOW())
      FROM updated
      WHERE challenge.employee_id = updated.id
        AND challenge.used_at IS NULL
        AND challenge.revoked_at IS NULL
    ), deleted_devices AS (
      DELETE FROM lounge_trusted_devices device
      USING updated
      WHERE device.employee_id = updated.id
    )
    INSERT INTO lounge_personnel_audit (employee_id, action, detail)
    SELECT id, 'password_reset', ${JSON.stringify({
      source: "initialize-lounge-passwords",
      setupTokenExpiresAt: credential.expiresAt,
      sessionsAndTrustedDevicesRevoked: true,
    })}::jsonb
    FROM updated
  `;
  console.log(`    one-time setup password: ${credential.token}`);
  console.log(`    expires: ${credential.expiresAt}`);
}

if (apply) {
  console.log("Reset complete. Deliver each one-time password securely; it cannot be recovered or reused.");
  console.log("Passkeys and authenticator enrollment were preserved; sessions and trusted devices were revoked.");
} else {
  console.log("No records changed. Run the P0 auth migration first, then re-run with --apply only after approval.");
}
