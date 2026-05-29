/**
 * Maintenance Request — crew-submitted ticketing for vehicle and building
 * issues. Mirrors the original Expo app's "Maintenance" tab but lives in
 * this Next.js port.
 */
import { randomUUID } from "crypto";
import { sql } from "./db";

export type MaintenanceKind = "vehicle" | "building";
export type MaintenanceStatus = "open" | "in_progress" | "resolved" | "dismissed";

export interface MaintenanceRequest {
  id: string;
  kind: MaintenanceKind;
  category: string;          // The chosen common item or "Other"
  customCategory: string | null; // Filled when category === "Other"
  unitOrLocation: string | null;
  summary: string;
  details: string | null;
  status: MaintenanceStatus;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolvedNotes: string | null;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

let columnsEnsured = false;
async function ensureSchema() {
  if (columnsEnsured) return;
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS lounge_maintenance_requests (
      id                  TEXT PRIMARY KEY,
      created_by          TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
      kind                TEXT NOT NULL CHECK (kind IN ('vehicle','building')),
      category            TEXT NOT NULL,
      custom_category     TEXT,
      unit_or_location    TEXT,
      summary             TEXT NOT NULL,
      details             TEXT,
      status              TEXT NOT NULL DEFAULT 'open',
      resolved_by         TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
      resolved_at         TIMESTAMPTZ,
      resolved_notes      TEXT,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS lounge_maintenance_created_idx ON lounge_maintenance_requests (created_at DESC)`;
  await db`CREATE INDEX IF NOT EXISTS lounge_maintenance_status_idx  ON lounge_maintenance_requests (status)`;
  columnsEnsured = true;
}

interface DbRow {
  id: string;
  kind: MaintenanceKind;
  category: string;
  custom_category: string | null;
  unit_or_location: string | null;
  summary: string;
  details: string | null;
  status: MaintenanceStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  resolved_notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  author_first_name: string;
  author_last_name: string;
  author_photo_url: string | null;
}

function toRequest(r: DbRow): MaintenanceRequest {
  return {
    id: r.id,
    kind: r.kind,
    category: r.category,
    customCategory: r.custom_category,
    unitOrLocation: r.unit_or_location,
    summary: r.summary,
    details: r.details,
    status: r.status,
    resolvedBy: r.resolved_by,
    resolvedAt: r.resolved_at,
    resolvedNotes: r.resolved_notes,
    createdBy: {
      id: r.created_by,
      firstName: r.author_first_name,
      lastName: r.author_last_name,
      photoUrl: r.author_photo_url,
    },
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export interface CreateMaintenanceInput {
  createdBy: string;
  kind: MaintenanceKind;
  category: string;
  customCategory?: string | null;
  unitOrLocation?: string | null;
  summary: string;
  details?: string | null;
}

export async function createMaintenanceRequest(input: CreateMaintenanceInput): Promise<MaintenanceRequest> {
  await ensureSchema();
  const db = sql();
  const id = randomUUID();
  await db`
    INSERT INTO lounge_maintenance_requests
      (id, created_by, kind, category, custom_category, unit_or_location, summary, details)
    VALUES
      (${id}, ${input.createdBy}, ${input.kind}, ${input.category},
       ${input.customCategory ?? null}, ${input.unitOrLocation ?? null},
       ${input.summary}, ${input.details ?? null})
  `;
  const rows = (await db`
    SELECT m.*, e.first_name AS author_first_name, e.last_name AS author_last_name, e.photo_url AS author_photo_url
    FROM lounge_maintenance_requests m
    JOIN lounge_employees e ON e.id = m.created_by
    WHERE m.id = ${id}
  `) as unknown as DbRow[];
  return toRequest(rows[0]);
}

export async function listMaintenanceRequests(opts?: { mine?: string; status?: MaintenanceStatus }): Promise<MaintenanceRequest[]> {
  await ensureSchema();
  const db = sql();
  let rows;
  if (opts?.mine && opts.status) {
    rows = await db`
      SELECT m.*, e.first_name AS author_first_name, e.last_name AS author_last_name, e.photo_url AS author_photo_url
      FROM lounge_maintenance_requests m
      JOIN lounge_employees e ON e.id = m.created_by
      WHERE m.created_by = ${opts.mine} AND m.status = ${opts.status}
      ORDER BY m.created_at DESC
    `;
  } else if (opts?.mine) {
    rows = await db`
      SELECT m.*, e.first_name AS author_first_name, e.last_name AS author_last_name, e.photo_url AS author_photo_url
      FROM lounge_maintenance_requests m
      JOIN lounge_employees e ON e.id = m.created_by
      WHERE m.created_by = ${opts.mine}
      ORDER BY m.created_at DESC
    `;
  } else if (opts?.status) {
    rows = await db`
      SELECT m.*, e.first_name AS author_first_name, e.last_name AS author_last_name, e.photo_url AS author_photo_url
      FROM lounge_maintenance_requests m
      JOIN lounge_employees e ON e.id = m.created_by
      WHERE m.status = ${opts.status}
      ORDER BY m.created_at DESC
    `;
  } else {
    rows = await db`
      SELECT m.*, e.first_name AS author_first_name, e.last_name AS author_last_name, e.photo_url AS author_photo_url
      FROM lounge_maintenance_requests m
      JOIN lounge_employees e ON e.id = m.created_by
      ORDER BY m.created_at DESC
    `;
  }
  return (rows as unknown as DbRow[]).map(toRequest);
}

export async function setMaintenanceStatus(
  id: string,
  status: MaintenanceStatus,
  by: string,
  notes?: string | null,
): Promise<void> {
  await ensureSchema();
  const db = sql();
  const resolvedAt = status === "resolved" || status === "dismissed" ? new Date().toISOString() : null;
  await db`
    UPDATE lounge_maintenance_requests
    SET status = ${status},
        resolved_by = ${resolvedAt ? by : null},
        resolved_at = ${resolvedAt},
        resolved_notes = ${notes ?? null},
        updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function deleteMaintenanceRequest(id: string): Promise<void> {
  await ensureSchema();
  const db = sql();
  await db`DELETE FROM lounge_maintenance_requests WHERE id = ${id}`;
}

// ── Canonical category lists (kept here so the API + UI agree) ─────────
export const VEHICLE_CATEGORIES = [
  "Oil change due",
  "Tire pressure / rotation",
  "Brakes",
  "Battery",
  "Lights / sirens / strobes",
  "Suction unit",
  "Onboard O₂ system",
  "Stretcher / cot / power-load",
  "AC / heat / climate",
  "Wipers / fluids",
  "Engine warning light",
  "Fuel system",
  "Body damage / scratch / dent",
  "Interior cleanliness",
  "Other",
] as const;

export const BUILDING_CATEGORIES = [
  "HVAC / AC / heat",
  "Plumbing",
  "Electrical / lighting",
  "Door / lock / garage door",
  "Roof / ceiling / leak",
  "Internet / network / Wi-Fi",
  "Appliance (fridge/stove/etc.)",
  "Bay floor / drain",
  "Office equipment",
  "Pest / cleanliness",
  "Security / camera",
  "Cleaning supplies needed",
  "Other",
] as const;
