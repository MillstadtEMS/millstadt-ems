/**
 * Pre-deploy migration for Lounge purpose-bound challenges and Lounge/Board
 * one-use setup credentials. This changes schema only; it does not rotate any
 * existing account or mint recoverable credentials for current users.
 */
import fs from "node:fs";
import path from "node:path";

(function loadEnvLocal() {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
})();

import { sql } from "../lib/neon";

async function main() {
  const db = sql();
  const tables = (await db`
    SELECT to_regclass('public.lounge_employees')::text AS lounge_table,
           to_regclass('public.board_users')::text AS board_table,
           to_regclass('public.lounge_truck_checks')::text AS truck_checks_table
  `) as unknown as Array<{
    lounge_table: string | null;
    board_table: string | null;
    truck_checks_table: string | null;
  }>;
  if (!tables[0]?.lounge_table) {
    throw new Error(
      "lounge_employees does not exist. Apply lib/lounge/schema.sql before running the P0 auth migration.",
    );
  }

  await db`ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS setup_token_hash TEXT`;
  await db`ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS setup_token_expires_at TIMESTAMPTZ`;
  await db`ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS setup_token_used_at TIMESTAMPTZ`;
  await db`ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS sms_login_code_hash TEXT`;
  await db`ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS sms_login_code_expires_at TIMESTAMPTZ`;
  await db`ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS sms_login_code_attempts INTEGER NOT NULL DEFAULT 0`;
  await db`
    CREATE TABLE IF NOT EXISTS lounge_preauth_challenges (
      nonce_hash                   TEXT PRIMARY KEY,
      employee_id                  TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
      purpose                      TEXT NOT NULL CHECK (purpose IN ('verify_totp', 'verify_sms', 'enroll_totp')),
      issued_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at                   TIMESTAMPTZ NOT NULL,
      uses_setup_token             BOOLEAN NOT NULL DEFAULT FALSE,
      enrollment_secret_encrypted TEXT,
      attempt_count                INTEGER NOT NULL DEFAULT 0,
      used_at                      TIMESTAMPTZ,
      revoked_at                   TIMESTAMPTZ
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS lounge_preauth_challenges_employee_idx ON lounge_preauth_challenges (employee_id, issued_at DESC)`;
  await db`CREATE INDEX IF NOT EXISTS lounge_preauth_challenges_active_idx ON lounge_preauth_challenges (expires_at) WHERE used_at IS NULL AND revoked_at IS NULL`;
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

  if (tables[0]?.board_table) {
    await db`ALTER TABLE board_users ADD COLUMN IF NOT EXISTS setup_token_hash TEXT`;
    await db`ALTER TABLE board_users ADD COLUMN IF NOT EXISTS setup_token_expires_at TIMESTAMPTZ`;
    await db`ALTER TABLE board_users ADD COLUMN IF NOT EXISTS setup_token_used_at TIMESTAMPTZ`;
  } else {
    console.log("Board table is not installed; Board setup will create the setup-token columns later.");
  }

  if (tables[0]?.truck_checks_table) {
    await db`ALTER TABLE lounge_truck_checks ADD COLUMN IF NOT EXISTS idempotency_key TEXT`;
    await db`ALTER TABLE lounge_truck_checks ADD COLUMN IF NOT EXISTS request_hash TEXT`;
    await db`ALTER TABLE lounge_truck_checks ADD COLUMN IF NOT EXISTS submission_result JSONB`;
    await db`
      CREATE UNIQUE INDEX IF NOT EXISTS lounge_truck_checks_idempotency_idx
      ON lounge_truck_checks (submitted_by_id, idempotency_key)
      WHERE idempotency_key IS NOT NULL
    `;
    await db`
      CREATE TABLE IF NOT EXISTS lounge_truck_check_outbox (
        id              TEXT PRIMARY KEY,
        truck_check_id  TEXT NOT NULL REFERENCES lounge_truck_checks(id) ON DELETE CASCADE,
        job_type        TEXT NOT NULL CHECK (job_type IN ('legacy_copy', 'pdf_email')),
        status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'processing', 'failed', 'completed')),
        attempt_count   INTEGER NOT NULL DEFAULT 0,
        available_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        claimed_at      TIMESTAMPTZ,
        completed_at    TIMESTAMPTZ,
        last_error      TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (truck_check_id, job_type)
      )
    `;
    await db`
      CREATE INDEX IF NOT EXISTS lounge_truck_check_outbox_pending_idx
      ON lounge_truck_check_outbox (available_at, created_at)
      WHERE status IN ('pending', 'failed', 'processing')
    `;
  } else {
    console.log("TruckCheck tables are not installed; apply lib/lounge/schema.sql before enabling TruckCheck submissions.");
  }

  const loungeLegacy = (await db`
    SELECT COUNT(*)::int AS count
    FROM lounge_employees
    WHERE must_change_password = TRUE
      AND (setup_token_hash IS NULL OR setup_token_expires_at IS NULL)
  `) as unknown as Array<{ count: number }>;
  const boardLegacy = tables[0]?.board_table
    ? ((await db`
        SELECT COUNT(*)::int AS count
        FROM board_users
        WHERE must_change_password = TRUE
          AND (setup_token_hash IS NULL OR setup_token_expires_at IS NULL)
      `) as unknown as Array<{ count: number }>)[0]?.count ?? 0
    : 0;

  console.log("Lounge, Board, and installed TruckCheck P0 schema is ready.");
  console.log(
    `Migration caveat: ${Number(loungeLegacy[0]?.count ?? 0)} Lounge and ${Number(boardLegacy)} Board legacy must-change account(s) have no recoverable setup token.`,
  );
  console.log(
    "Those accounts intentionally remain locked until an approved random credential rotation is performed; this migration never changes production passwords.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
