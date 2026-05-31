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
    CREATE TABLE IF NOT EXISTS lounge_writeups (
      id                            TEXT PRIMARY KEY,
      employee_id                   TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
      status                        TEXT NOT NULL DEFAULT 'draft',
      employee_full_name            TEXT NOT NULL DEFAULT '',
      employee_position             TEXT,
      employee_department           TEXT,
      supervisor_id                 TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
      supervisor_name               TEXT,
      date_issued                   DATE,
      incident_date                 TIMESTAMPTZ,
      incident_location             TEXT,
      corrective_action_type        TEXT,
      issue_category                TEXT,
      factual_description           TEXT NOT NULL DEFAULT '',
      policy_violated               TEXT NOT NULL DEFAULT '',
      evidence_reviewed             TEXT NOT NULL DEFAULT '',
      prior_notice_of_expectation   TEXT NOT NULL DEFAULT '',
      prior_related_discipline      TEXT NOT NULL DEFAULT '',
      operational_impact            TEXT NOT NULL DEFAULT '',
      corrective_expectations       TEXT NOT NULL DEFAULT '',
      action_plan                   TEXT NOT NULL DEFAULT '',
      improvement_timeline          TEXT NOT NULL DEFAULT '',
      consequences_statement        TEXT NOT NULL DEFAULT '',
      manager_internal_notes        TEXT,
      response_status               TEXT,
      employee_response_text        TEXT,
      manager_signature             JSONB,
      employee_signature            JSONB,
      employee_refused_to_sign      BOOLEAN NOT NULL DEFAULT FALSE,
      witness_signature             JSONB,
      save_to_file                  BOOLEAN NOT NULL DEFAULT FALSE,
      pdf_url                       TEXT,
      pdf_filename                  TEXT,
      personnel_record_id           TEXT REFERENCES lounge_personnel_records(id) ON DELETE SET NULL,
      created_by_id                 TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
      finalized_at                  TIMESTAMPTZ,
      finalized_by_id               TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
      created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS lounge_writeups_employee_idx ON lounge_writeups (employee_id)`;
  await db`CREATE INDEX IF NOT EXISTS lounge_writeups_status_idx ON lounge_writeups (status)`;
  await db`
    CREATE TABLE IF NOT EXISTS lounge_writeup_audit (
      id          TEXT PRIMARY KEY,
      writeup_id  TEXT NOT NULL REFERENCES lounge_writeups(id) ON DELETE CASCADE,
      actor_id    TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
      actor_name  TEXT,
      action      TEXT NOT NULL,
      details     TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS lounge_writeup_audit_writeup_idx ON lounge_writeup_audit (writeup_id)`;
  console.log("lounge_writeups + lounge_writeup_audit ready.");
}

main().catch((e) => { console.error(e); process.exit(1); });
