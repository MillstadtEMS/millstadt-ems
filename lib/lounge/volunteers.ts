/**
 * Volunteer hours tracking. Admin-only.
 *
 * Two tables, lazy-created on first call:
 *   lounge_volunteers       — one row per volunteer (name, active)
 *   lounge_volunteer_hours  — one row per (volunteer, year, month) with
 *                             a single hours total. Composite unique key
 *                             so we upsert on edit.
 *
 * Seeded once with Cameron Hopkinson per the agency's existing volunteer
 * roster — subsequent boots don't re-seed so admin edits stick.
 */
import { randomUUID } from "crypto";
import { sql } from "./db";

export interface Volunteer {
  id: string;
  name: string;
  active: boolean;
  notes: string | null;
  createdAt: string;
}

export interface VolunteerMonthRow {
  volunteerId: string;
  year: number;
  month: number; // 1-12
  hours: number;
  notes: string | null;
  updatedById: string | null;
  updatedAt: string;
}

interface VolunteerDbRow {
  id: string;
  name: string;
  active: boolean;
  notes: string | null;
  created_at: unknown;
}
interface HoursDbRow {
  volunteer_id: string;
  year: number;
  month: number;
  hours: string | number;
  notes: string | null;
  updated_by_id: string | null;
  updated_at: unknown;
}

function dateTime(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString();
  return String(v);
}

function toVolunteer(r: VolunteerDbRow): Volunteer {
  return {
    id: r.id,
    name: r.name,
    active: r.active,
    notes: r.notes,
    createdAt: dateTime(r.created_at) ?? "",
  };
}

function toHours(r: HoursDbRow): VolunteerMonthRow {
  return {
    volunteerId: r.volunteer_id,
    year: r.year,
    month: r.month,
    hours: typeof r.hours === "string" ? Number(r.hours) : r.hours,
    notes: r.notes,
    updatedById: r.updated_by_id,
    updatedAt: dateTime(r.updated_at) ?? "",
  };
}

let schemaReady = false;
async function ensureSchema() {
  if (schemaReady) return;
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS lounge_volunteers (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      active     BOOLEAN NOT NULL DEFAULT TRUE,
      notes      TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS lounge_volunteer_hours (
      volunteer_id  TEXT NOT NULL REFERENCES lounge_volunteers(id) ON DELETE CASCADE,
      year          INTEGER NOT NULL,
      month         INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
      hours         NUMERIC(8,2) NOT NULL DEFAULT 0,
      notes         TEXT,
      updated_by_id TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (volunteer_id, year, month)
    )
  `;
  // Seed initial volunteer on first run only.
  const count = (await db`SELECT COUNT(*)::int AS n FROM lounge_volunteers`) as unknown as { n: number }[];
  if ((count[0]?.n ?? 0) === 0) {
    await db`
      INSERT INTO lounge_volunteers (id, name, active)
      VALUES (${randomUUID()}, 'Cameron Hopkinson', TRUE)
    `;
  }
  schemaReady = true;
}

export async function listVolunteers(includeInactive = false): Promise<Volunteer[]> {
  await ensureSchema();
  const db = sql();
  const rows = includeInactive
    ? ((await db`SELECT id, name, active, notes, created_at FROM lounge_volunteers ORDER BY name ASC`) as unknown as VolunteerDbRow[])
    : ((await db`SELECT id, name, active, notes, created_at FROM lounge_volunteers WHERE active = TRUE ORDER BY name ASC`) as unknown as VolunteerDbRow[]);
  return rows.map(toVolunteer);
}

export async function createVolunteer(input: { name: string; notes?: string | null }): Promise<Volunteer> {
  await ensureSchema();
  const db = sql();
  const id = randomUUID();
  await db`
    INSERT INTO lounge_volunteers (id, name, notes)
    VALUES (${id}, ${input.name}, ${input.notes ?? null})
  `;
  const rows = (await db`
    SELECT id, name, active, notes, created_at
    FROM lounge_volunteers WHERE id = ${id} LIMIT 1
  `) as unknown as VolunteerDbRow[];
  return toVolunteer(rows[0]);
}

export async function updateVolunteer(id: string, input: { name?: string; active?: boolean; notes?: string | null }): Promise<void> {
  await ensureSchema();
  const db = sql();
  if (input.name !== undefined)   await db`UPDATE lounge_volunteers SET name = ${input.name} WHERE id = ${id}`;
  if (input.active !== undefined) await db`UPDATE lounge_volunteers SET active = ${input.active} WHERE id = ${id}`;
  if (input.notes !== undefined)  await db`UPDATE lounge_volunteers SET notes = ${input.notes} WHERE id = ${id}`;
}

export async function deleteVolunteer(id: string): Promise<void> {
  await ensureSchema();
  const db = sql();
  await db`DELETE FROM lounge_volunteers WHERE id = ${id}`;
}

export async function listHoursForYear(year: number): Promise<VolunteerMonthRow[]> {
  await ensureSchema();
  const db = sql();
  const rows = (await db`
    SELECT volunteer_id, year, month, hours, notes, updated_by_id, updated_at
    FROM lounge_volunteer_hours
    WHERE year = ${year}
    ORDER BY volunteer_id, month
  `) as unknown as HoursDbRow[];
  return rows.map(toHours);
}

export async function setHours(input: {
  volunteerId: string;
  year: number;
  month: number;
  hours: number;
  notes?: string | null;
  updatedById: string;
}): Promise<VolunteerMonthRow> {
  await ensureSchema();
  const db = sql();
  await db`
    INSERT INTO lounge_volunteer_hours (volunteer_id, year, month, hours, notes, updated_by_id)
    VALUES (${input.volunteerId}, ${input.year}, ${input.month}, ${input.hours}, ${input.notes ?? null}, ${input.updatedById})
    ON CONFLICT (volunteer_id, year, month) DO UPDATE SET
      hours = EXCLUDED.hours,
      notes = EXCLUDED.notes,
      updated_by_id = EXCLUDED.updated_by_id,
      updated_at = NOW()
  `;
  const rows = (await db`
    SELECT volunteer_id, year, month, hours, notes, updated_by_id, updated_at
    FROM lounge_volunteer_hours
    WHERE volunteer_id = ${input.volunteerId} AND year = ${input.year} AND month = ${input.month}
    LIMIT 1
  `) as unknown as HoursDbRow[];
  return toHours(rows[0]);
}

export async function deleteHours(volunteerId: string, year: number, month: number): Promise<void> {
  await ensureSchema();
  const db = sql();
  await db`
    DELETE FROM lounge_volunteer_hours
    WHERE volunteer_id = ${volunteerId} AND year = ${year} AND month = ${month}
  `;
}
