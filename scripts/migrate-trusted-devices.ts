/**
 * Pre-deploy migration: create lounge_trusted_devices on the live DB so
 * the first sign-in after deploy doesn't pay the CREATE-TABLE latency.
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
  await db`
    CREATE TABLE IF NOT EXISTS lounge_trusted_devices (
      id           TEXT PRIMARY KEY,
      employee_id  TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
      token_hash   TEXT NOT NULL UNIQUE,
      device_label TEXT,
      last_used_at TIMESTAMPTZ,
      expires_at   TIMESTAMPTZ NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS lounge_trusted_devices_employee_idx ON lounge_trusted_devices (employee_id)`;
  const cols = (await db`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'lounge_trusted_devices'
    ORDER BY ordinal_position
  `) as unknown as { column_name: string }[];
  console.log("lounge_trusted_devices columns:");
  for (const c of cols) console.log("  -", c.column_name);
}

main().catch((e) => { console.error(e); process.exit(1); });
