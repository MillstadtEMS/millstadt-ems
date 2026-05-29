/**
 * Truck Wash Log — per the Ambulance Washing Schedule, both crew members
 * are required to participate (except Chief/Asst. Chief). Each wash log
 * records the truck, date/time, every crew member who participated, the
 * verification checkboxes, and the submitter's signature. Admin-only view.
 */
import { randomUUID } from "crypto";
import { sql } from "./db";

export interface TruckWashLog {
  id: string;
  unit: string;
  washedAt: string;
  exempt: boolean;
  exemptReason: string | null;
  truckExteriorWashed: boolean;
  interiorFloorsMopped: boolean;
  signatureDataUrl: string;
  crew: {
    id: string | null; // null when crew member is typed in (not on roster)
    firstName: string;
    lastName: string;
  }[];
  submittedBy: {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
  };
  notes: string | null;
  createdAt: string;
}

let schemaEnsured = false;
async function ensureSchema() {
  if (schemaEnsured) return;
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS lounge_truck_washes (
      id                      TEXT PRIMARY KEY,
      submitted_by            TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
      unit                    TEXT NOT NULL,
      washed_at               TIMESTAMPTZ NOT NULL,
      exempt                  BOOLEAN NOT NULL DEFAULT FALSE,
      exempt_reason           TEXT,
      truck_exterior_washed   BOOLEAN NOT NULL DEFAULT FALSE,
      interior_floors_mopped  BOOLEAN NOT NULL DEFAULT FALSE,
      signature_data_url      TEXT NOT NULL,
      crew                    JSONB NOT NULL DEFAULT '[]'::jsonb,
      notes                   TEXT,
      created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS lounge_truck_washes_at_idx ON lounge_truck_washes (washed_at DESC)`;
  await db`CREATE INDEX IF NOT EXISTS lounge_truck_washes_unit_idx ON lounge_truck_washes (unit)`;
  schemaEnsured = true;
}

interface DbRow {
  id: string;
  unit: string;
  washed_at: string;
  exempt: boolean;
  exempt_reason: string | null;
  truck_exterior_washed: boolean;
  interior_floors_mopped: boolean;
  signature_data_url: string;
  crew: { id: string | null; firstName: string; lastName: string }[];
  notes: string | null;
  created_at: string;
  submitted_by: string;
  submitter_first_name: string;
  submitter_last_name: string;
  submitter_photo_url: string | null;
}

function toLog(r: DbRow): TruckWashLog {
  return {
    id: r.id,
    unit: r.unit,
    washedAt: r.washed_at,
    exempt: r.exempt,
    exemptReason: r.exempt_reason,
    truckExteriorWashed: r.truck_exterior_washed,
    interiorFloorsMopped: r.interior_floors_mopped,
    signatureDataUrl: r.signature_data_url,
    crew: Array.isArray(r.crew) ? r.crew : [],
    submittedBy: {
      id: r.submitted_by,
      firstName: r.submitter_first_name,
      lastName: r.submitter_last_name,
      photoUrl: r.submitter_photo_url,
    },
    notes: r.notes,
    createdAt: r.created_at,
  };
}

export interface CreateTruckWashInput {
  submittedBy: string;
  unit: string;
  washedAt: string; // ISO
  exempt: boolean;
  exemptReason?: string | null;
  truckExteriorWashed: boolean;
  interiorFloorsMopped: boolean;
  signatureDataUrl: string;
  crew: { id: string | null; firstName: string; lastName: string }[];
  notes?: string | null;
}

export async function createTruckWashLog(input: CreateTruckWashInput): Promise<TruckWashLog> {
  await ensureSchema();
  const db = sql();
  const id = randomUUID();
  await db`
    INSERT INTO lounge_truck_washes
      (id, submitted_by, unit, washed_at, exempt, exempt_reason,
       truck_exterior_washed, interior_floors_mopped,
       signature_data_url, crew, notes)
    VALUES
      (${id}, ${input.submittedBy}, ${input.unit}, ${input.washedAt},
       ${input.exempt}, ${input.exemptReason ?? null},
       ${input.truckExteriorWashed}, ${input.interiorFloorsMopped},
       ${input.signatureDataUrl}, ${JSON.stringify(input.crew)},
       ${input.notes ?? null})
  `;
  const rows = (await db`
    SELECT t.*,
           e.first_name AS submitter_first_name,
           e.last_name  AS submitter_last_name,
           e.photo_url  AS submitter_photo_url
    FROM lounge_truck_washes t
    JOIN lounge_employees e ON e.id = t.submitted_by
    WHERE t.id = ${id}
  `) as unknown as DbRow[];
  return toLog(rows[0]);
}

export async function listTruckWashLogs(opts?: { limit?: number; unit?: string }): Promise<TruckWashLog[]> {
  await ensureSchema();
  const db = sql();
  const limit = Math.min(500, Math.max(1, opts?.limit ?? 200));
  let rows;
  if (opts?.unit) {
    rows = await db`
      SELECT t.*,
             e.first_name AS submitter_first_name,
             e.last_name  AS submitter_last_name,
             e.photo_url  AS submitter_photo_url
      FROM lounge_truck_washes t
      JOIN lounge_employees e ON e.id = t.submitted_by
      WHERE t.unit = ${opts.unit}
      ORDER BY t.washed_at DESC
      LIMIT ${limit}
    `;
  } else {
    rows = await db`
      SELECT t.*,
             e.first_name AS submitter_first_name,
             e.last_name  AS submitter_last_name,
             e.photo_url  AS submitter_photo_url
      FROM lounge_truck_washes t
      JOIN lounge_employees e ON e.id = t.submitted_by
      ORDER BY t.washed_at DESC
      LIMIT ${limit}
    `;
  }
  return (rows as unknown as DbRow[]).map(toLog);
}

export async function deleteTruckWashLog(id: string): Promise<void> {
  await ensureSchema();
  const db = sql();
  await db`DELETE FROM lounge_truck_washes WHERE id = ${id}`;
}

export const TRUCK_WASH_UNITS = ["M3935", "M3926", "M3925"];
export const TRUCK_WASH_EXEMPT_REASONS = [
  "Inclement weather",
  "Truck out of service / repair",
  "Crew on continuous calls — no time",
  "Other",
];
