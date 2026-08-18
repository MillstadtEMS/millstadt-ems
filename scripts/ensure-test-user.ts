/**
 * Idempotent: make sure a synthetic "Test User" employee exists for
 * safely exercising employee-facing workflows. Run with:
 *   npx tsx scripts/ensure-test-user.ts
 */

import fs from "node:fs";
import path from "node:path";

// Load .env.local manually so tsx doesn't need a wrapper.
(function loadEnvLocal() {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf-8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = val;
  }
})();

import { sql } from "../lib/lounge/db";
import { createEmployee } from "../lib/lounge/employees";

const USERNAME = "testuser";
const FIRST = "Test";
const LAST = "User";
const EMAIL = "testuser@millstadtems.local";

async function main() {
  const db = sql();
  const existing = (await db`
    SELECT id, username FROM lounge_employees
    WHERE LOWER(username) = ${USERNAME}
    LIMIT 1
  `) as unknown as { id: string; username: string }[];

  if (existing.length > 0) {
    console.log(`Already exists: ${existing[0].username}`);
    return;
  }

  const { employee, setupToken, setupTokenExpiresAt } = await createEmployee({
    firstName: FIRST,
    lastName: LAST,
    email: EMAIL,
    certification: "EMT",
    position: "Synthetic workflow test account",
    isAdmin: false,
    username: USERNAME,
  });
  console.log(`Created: ${employee.firstName} ${employee.lastName} (${employee.username})`);
  console.log(`One-time setup password: ${setupToken}`);
  console.log(`Expires: ${setupTokenExpiresAt}`);
  console.log("This credential is shown once and must be changed after first sign-in.");
}

main().catch((err) => {
  console.error("ensure-test-user failed:", err);
  process.exit(1);
});
