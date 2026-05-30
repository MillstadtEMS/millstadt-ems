/**
 * Idempotent: make sure a "Test User" employee exists so the dev-login
 * shortcut has a non-real account to drop into. Run with:
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
import { createEmployee, defaultInitialPassword } from "../lib/lounge/employees";

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

  const created = await createEmployee({
    firstName: FIRST,
    lastName: LAST,
    email: EMAIL,
    certification: "EMT",
    position: "Dev shortcut test account",
    isAdmin: false,
    username: USERNAME,
  });
  console.log(`Created: ${created.firstName} ${created.lastName} (${created.username})`);
  console.log(`First-time password: ${defaultInitialPassword(FIRST, LAST)}`);
}

main().catch((err) => {
  console.error("ensure-test-user failed:", err);
  process.exit(1);
});
