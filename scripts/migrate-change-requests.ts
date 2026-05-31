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
    CREATE TABLE IF NOT EXISTS lounge_profile_change_requests (
      id                   TEXT PRIMARY KEY,
      employee_id          TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
      field_key            TEXT NOT NULL,
      field_label          TEXT NOT NULL,
      proposed_value       TEXT,
      comments             TEXT NOT NULL DEFAULT '',
      attachment_url       TEXT,
      attachment_name      TEXT,
      attachment_mime      TEXT,
      share_with_employee  BOOLEAN NOT NULL DEFAULT FALSE,
      status               TEXT NOT NULL DEFAULT 'pending',
      admin_decision_notes TEXT,
      decided_at           TIMESTAMPTZ,
      decided_by_id        TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS lounge_pcr_employee_idx ON lounge_profile_change_requests (employee_id)`;
  await db`CREATE INDEX IF NOT EXISTS lounge_pcr_status_idx ON lounge_profile_change_requests (status)`;
  console.log("lounge_profile_change_requests ready.");
}

main().catch((e) => { console.error(e); process.exit(1); });
