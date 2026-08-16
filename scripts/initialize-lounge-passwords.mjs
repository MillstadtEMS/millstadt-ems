#!/usr/bin/env node
/**
 * Reset every active Lounge employee to username/username exactly once.
 * The default mode is a dry run. Pass --apply to perform the reset after
 * the matching authentication release is deployed.
 *
 * Passkeys and authenticator enrollment are intentionally preserved.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, scryptSync } from "node:crypto";
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
  const passwordHash = hashPassword(employee.username);
  await db`
    UPDATE lounge_employees
    SET password_hash = ${passwordHash},
        must_change_password = TRUE,
        updated_at = NOW()
    WHERE id = ${employee.id}
  `;
}

if (apply) {
  console.log("Reset complete. Each employee must sign in with username/username and choose a permanent password.");
  console.log("Passkeys and authenticator enrollment were preserved.");
} else {
  console.log("No records changed. Re-run with --apply only after the matching authentication release is live.");
}
