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
    CREATE TABLE IF NOT EXISTS lounge_forms (
      id                    TEXT PRIMARY KEY,
      form_type             TEXT NOT NULL,
      employee_id           TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
      status                TEXT NOT NULL DEFAULT 'draft',
      data                  JSONB NOT NULL DEFAULT '{}'::jsonb,
      signatures            JSONB NOT NULL DEFAULT '[]'::jsonb,
      refused_to_sign       JSONB NOT NULL DEFAULT '[]'::jsonb,
      save_to_file          BOOLEAN NOT NULL DEFAULT FALSE,
      visible_to_employee   BOOLEAN NOT NULL DEFAULT FALSE,
      email_employee        BOOLEAN NOT NULL DEFAULT FALSE,
      email_admin_inbox     BOOLEAN NOT NULL DEFAULT FALSE,
      assignment_id         TEXT,
      pdf_url               TEXT,
      pdf_filename          TEXT,
      personnel_record_id   TEXT REFERENCES lounge_personnel_records(id) ON DELETE SET NULL,
      emailed_to_employee   BOOLEAN NOT NULL DEFAULT FALSE,
      emailed_to_admin_inbox BOOLEAN NOT NULL DEFAULT FALSE,
      emailed_at            TIMESTAMPTZ,
      finalized_at          TIMESTAMPTZ,
      finalized_by_id       TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
      rescinded_at          TIMESTAMPTZ,
      rescinded_by_id       TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
      rescinded_reason      TEXT,
      rescinded_by_name     TEXT,
      corrected_by_id       TEXT,
      corrects_id           TEXT,
      created_by_id         TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS lounge_forms_employee_idx ON lounge_forms (employee_id)`;
  await db`CREATE INDEX IF NOT EXISTS lounge_forms_type_idx ON lounge_forms (form_type)`;
  await db`CREATE INDEX IF NOT EXISTS lounge_forms_status_idx ON lounge_forms (status)`;
  await db`CREATE INDEX IF NOT EXISTS lounge_forms_assignment_idx ON lounge_forms (assignment_id)`;

  await db`
    CREATE TABLE IF NOT EXISTS lounge_form_assignments (
      id                    TEXT PRIMARY KEY,
      form_type             TEXT NOT NULL,
      created_by_id         TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
      created_by_name       TEXT,
      title                 TEXT NOT NULL,
      summary               TEXT,
      prefill_data          JSONB NOT NULL DEFAULT '{}'::jsonb,
      due_at                TIMESTAMPTZ,
      share                 JSONB NOT NULL DEFAULT '{}'::jsonb,
      target_kind           TEXT NOT NULL,
      target_employee_ids   JSONB NOT NULL DEFAULT '[]'::jsonb,
      closed_at             TIMESTAMPTZ,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS lounge_form_audit (
      id          TEXT PRIMARY KEY,
      form_id     TEXT NOT NULL REFERENCES lounge_forms(id) ON DELETE CASCADE,
      actor_id    TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
      actor_name  TEXT,
      action      TEXT NOT NULL,
      details     TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS lounge_form_audit_form_idx ON lounge_form_audit (form_id)`;
  console.log("lounge_forms + lounge_form_assignments + lounge_form_audit ready.");
}

main().catch((e) => { console.error(e); process.exit(1); });
