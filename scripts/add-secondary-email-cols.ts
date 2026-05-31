/**
 * Emergency: add email_secondary + email_secondary_alerts columns to
 * lounge_employees so the new SELECTs stop failing in prod.
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

async function main() {
  const db = sql();
  await db`ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS email_secondary TEXT`;
  await db`ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS email_secondary_alerts BOOLEAN NOT NULL DEFAULT FALSE`;
  const cols = (await db`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'lounge_employees' AND column_name IN ('email_secondary','email_secondary_alerts')
  `) as unknown as { column_name: string }[];
  console.log("Columns now present:", cols.map((c) => c.column_name).join(", "));
}

main().catch((e) => { console.error(e); process.exit(1); });
