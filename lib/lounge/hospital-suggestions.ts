/**
 * Crew-submitted change suggestions for the hospital directory.
 *
 *   kind = "code_change"   — crew member is reporting that a door code,
 *                            patch line, fax, etc. for an existing
 *                            hospital is wrong or out of date.
 *   kind = "new_facility"  — crew member wants admin to add a brand-new
 *                            receiving facility to the directory.
 *
 * Both flow into the same review queue at /admin/hospitals/suggestions.
 */
import { randomUUID } from "crypto";
import { sql } from "./db";

export type SuggestionKind = "code_change" | "new_facility";
export type SuggestionStatus = "pending" | "approved" | "rejected";

export interface SuggestionAuthor {
  id: string;
  firstName: string;
  lastName: string;
}

export interface HospitalSuggestion {
  id: string;
  hospitalId: string | null;
  kind: SuggestionKind;
  payload: Record<string, unknown>;
  status: SuggestionStatus;
  submittedBy: SuggestionAuthor;
  decidedBy: SuggestionAuthor | null;
  adminNotes: string | null;
  createdAt: string;
  decidedAt: string | null;
}

let schemaEnsured = false;
async function ensureSchema() {
  if (schemaEnsured) return;
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS lounge_hospital_change_suggestions (
      id            TEXT PRIMARY KEY,
      hospital_id   TEXT,
      kind          TEXT NOT NULL CHECK (kind IN ('code_change','new_facility')),
      payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
      status        TEXT NOT NULL DEFAULT 'pending',
      submitted_by  TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
      decided_by    TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
      admin_notes   TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      decided_at    TIMESTAMPTZ
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS lounge_hospital_suggestions_status_idx ON lounge_hospital_change_suggestions (status, created_at DESC)`;
  schemaEnsured = true;
}

interface DbRow {
  id: string;
  hospital_id: string | null;
  kind: SuggestionKind;
  payload: Record<string, unknown>;
  status: SuggestionStatus;
  created_at: string;
  decided_at: string | null;
  admin_notes: string | null;
  submitted_by: string;
  submitter_first_name: string;
  submitter_last_name: string;
  decided_by: string | null;
  decider_first_name: string | null;
  decider_last_name: string | null;
}

function rowToSuggestion(r: DbRow): HospitalSuggestion {
  return {
    id: r.id,
    hospitalId: r.hospital_id,
    kind: r.kind,
    payload: r.payload || {},
    status: r.status,
    submittedBy: { id: r.submitted_by, firstName: r.submitter_first_name, lastName: r.submitter_last_name },
    decidedBy: r.decided_by ? {
      id: r.decided_by,
      firstName: r.decider_first_name ?? "",
      lastName: r.decider_last_name ?? "",
    } : null,
    adminNotes: r.admin_notes,
    createdAt: r.created_at,
    decidedAt: r.decided_at,
  };
}

export interface CreateSuggestionInput {
  submittedBy: string;
  hospitalId: string | null;
  kind: SuggestionKind;
  payload: Record<string, unknown>;
}

export async function createSuggestion(input: CreateSuggestionInput): Promise<HospitalSuggestion> {
  await ensureSchema();
  const db = sql();
  const id = randomUUID();
  await db`
    INSERT INTO lounge_hospital_change_suggestions
      (id, hospital_id, kind, payload, submitted_by)
    VALUES
      (${id}, ${input.hospitalId}, ${input.kind},
       ${JSON.stringify(input.payload)}::jsonb, ${input.submittedBy})
  `;
  return getSuggestion(id) as Promise<HospitalSuggestion>;
}

async function getSuggestion(id: string): Promise<HospitalSuggestion | null> {
  await ensureSchema();
  const db = sql();
  const rows = (await db`
    SELECT s.*,
           se.first_name AS submitter_first_name, se.last_name AS submitter_last_name,
           de.first_name AS decider_first_name,  de.last_name AS decider_last_name
    FROM lounge_hospital_change_suggestions s
    JOIN lounge_employees se ON se.id = s.submitted_by
    LEFT JOIN lounge_employees de ON de.id = s.decided_by
    WHERE s.id = ${id}
    LIMIT 1
  `) as unknown as DbRow[];
  return rows[0] ? rowToSuggestion(rows[0]) : null;
}

export async function listSuggestions(opts?: { status?: SuggestionStatus }): Promise<HospitalSuggestion[]> {
  await ensureSchema();
  const db = sql();
  const rows = opts?.status
    ? (await db`
        SELECT s.*,
               se.first_name AS submitter_first_name, se.last_name AS submitter_last_name,
               de.first_name AS decider_first_name,  de.last_name AS decider_last_name
        FROM lounge_hospital_change_suggestions s
        JOIN lounge_employees se ON se.id = s.submitted_by
        LEFT JOIN lounge_employees de ON de.id = s.decided_by
        WHERE s.status = ${opts.status}
        ORDER BY s.created_at DESC
      `) as unknown as DbRow[]
    : (await db`
        SELECT s.*,
               se.first_name AS submitter_first_name, se.last_name AS submitter_last_name,
               de.first_name AS decider_first_name,  de.last_name AS decider_last_name
        FROM lounge_hospital_change_suggestions s
        JOIN lounge_employees se ON se.id = s.submitted_by
        LEFT JOIN lounge_employees de ON de.id = s.decided_by
        ORDER BY s.created_at DESC
      `) as unknown as DbRow[];
  return rows.map(rowToSuggestion);
}

export async function decideSuggestion(
  id: string,
  status: "approved" | "rejected",
  decidedBy: string,
  adminNotes?: string | null,
): Promise<void> {
  await ensureSchema();
  const db = sql();
  await db`
    UPDATE lounge_hospital_change_suggestions
    SET status = ${status},
        decided_by = ${decidedBy},
        decided_at = NOW(),
        admin_notes = ${adminNotes ?? null}
    WHERE id = ${id}
  `;
}

export async function countPendingSuggestions(): Promise<number> {
  await ensureSchema();
  const db = sql();
  const rows = (await db`
    SELECT COUNT(*)::int AS c FROM lounge_hospital_change_suggestions WHERE status = 'pending'
  `) as unknown as { c: number }[];
  return rows[0]?.c ?? 0;
}
