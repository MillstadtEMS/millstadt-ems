/**
 * Incident reports.
 *
 * Mixed-storage: a handful of flat indexed columns for filtering/sort, plus
 * a `payload` JSONB blob for the long tail of fields (mirrors the RN app's
 * IncidentReport type so we don't run a migration every time the form grows).
 *
 * Admin notes are an append-only array stored in `admin_notes` JSONB.
 */
import { randomUUID } from "crypto";
import { sql } from "./db";

export type IncidentStatus = "pending" | "under_review" | "resolved" | "dismissed";

export interface IncidentAuthor {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
}
export interface IncidentAdminNote {
  authorId: string;
  authorName: string;
  body: string;
  at: string;
}
export interface IncidentMedia {
  url: string;
  kind: "image" | "file";
  name?: string;
}
export interface IncidentReport {
  id: string;
  createdBy: IncidentAuthor;
  reviewStatus: IncidentStatus;
  incidentDate: string | null;
  incidentTime: string | null;
  city: string | null;
  specificLocation: string | null;
  unitInvolved: string | null;
  media: IncidentMedia[];
  adminNotes: IncidentAdminNote[];
  payload: Record<string, unknown>;
  pdfUrl: string | null;
  emailSentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DbRow {
  id: string;
  created_by: string;
  review_status: string;
  incident_date: string | null;
  incident_time: string | null;
  city: string | null;
  specific_location: string | null;
  unit_involved: string | null;
  media: unknown;
  admin_notes: unknown;
  payload: unknown;
  pdf_url: string | null;
  email_sent_at: string | null;
  created_at: string;
  updated_at: string;
  author_first_name: string;
  author_last_name: string;
  author_photo_url: string | null;
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}
function asObject(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function rowToReport(r: DbRow): IncidentReport {
  return {
    id: r.id,
    createdBy: {
      id: r.created_by,
      firstName: r.author_first_name,
      lastName: r.author_last_name,
      photoUrl: r.author_photo_url,
    },
    reviewStatus: (r.review_status as IncidentStatus) ?? "pending",
    incidentDate: r.incident_date,
    incidentTime: r.incident_time,
    city: r.city,
    specificLocation: r.specific_location,
    unitInvolved: r.unit_involved,
    media: asArray<IncidentMedia>(r.media),
    adminNotes: asArray<IncidentAdminNote>(r.admin_notes),
    payload: asObject(r.payload),
    pdfUrl: r.pdf_url,
    emailSentAt: r.email_sent_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listIncidents(opts: {
  viewerId: string;
  isAdmin: boolean;
}): Promise<IncidentReport[]> {
  const db = sql();
  // Employees see only their own; admins see everyone's.
  const rows = opts.isAdmin
    ? ((await db`
        SELECT i.id, i.created_by, i.review_status, i.incident_date, i.incident_time,
               i.city, i.specific_location, i.unit_involved, i.media, i.admin_notes,
               i.payload, i.pdf_url, i.email_sent_at, i.created_at, i.updated_at,
               e.first_name AS author_first_name, e.last_name AS author_last_name,
               e.photo_url AS author_photo_url
        FROM lounge_incident_reports i
        JOIN lounge_employees e ON e.id = i.created_by
        ORDER BY
          CASE i.review_status
            WHEN 'pending' THEN 0
            WHEN 'under_review' THEN 1
            WHEN 'resolved' THEN 2
            ELSE 3
          END,
          i.created_at DESC
      `) as unknown as DbRow[])
    : ((await db`
        SELECT i.id, i.created_by, i.review_status, i.incident_date, i.incident_time,
               i.city, i.specific_location, i.unit_involved, i.media, i.admin_notes,
               i.payload, i.pdf_url, i.email_sent_at, i.created_at, i.updated_at,
               e.first_name AS author_first_name, e.last_name AS author_last_name,
               e.photo_url AS author_photo_url
        FROM lounge_incident_reports i
        JOIN lounge_employees e ON e.id = i.created_by
        WHERE i.created_by = ${opts.viewerId}
        ORDER BY i.created_at DESC
      `) as unknown as DbRow[]);
  return rows.map(rowToReport);
}

export async function getIncident(id: string): Promise<IncidentReport | null> {
  const db = sql();
  const rows = (await db`
    SELECT i.id, i.created_by, i.review_status, i.incident_date, i.incident_time,
           i.city, i.specific_location, i.unit_involved, i.media, i.admin_notes,
           i.payload, i.pdf_url, i.email_sent_at, i.created_at, i.updated_at,
           e.first_name AS author_first_name, e.last_name AS author_last_name,
           e.photo_url AS author_photo_url
    FROM lounge_incident_reports i
    JOIN lounge_employees e ON e.id = i.created_by
    WHERE i.id = ${id}
    LIMIT 1
  `) as unknown as DbRow[];
  return rows[0] ? rowToReport(rows[0]) : null;
}

export interface CreateIncidentInput {
  authorId: string;
  incidentDate?: string;
  incidentTime?: string;
  city?: string;
  specificLocation?: string;
  unitInvolved?: string;
  payload?: Record<string, unknown>;
  media?: IncidentMedia[];
}

export async function createIncident(input: CreateIncidentInput): Promise<IncidentReport> {
  const id = randomUUID();
  const db = sql();
  await db`
    INSERT INTO lounge_incident_reports
      (id, created_by, incident_date, incident_time, city, specific_location,
       unit_involved, media, payload)
    VALUES
      (${id}, ${input.authorId},
       ${input.incidentDate ?? null}, ${input.incidentTime ?? null},
       ${input.city ?? null}, ${input.specificLocation ?? null},
       ${input.unitInvolved ?? null},
       ${JSON.stringify(input.media ?? [])}::jsonb,
       ${JSON.stringify(input.payload ?? {})}::jsonb)
  `;
  const created = await getIncident(id);
  if (!created) throw new Error("Created but not retrievable");
  return created;
}

export async function updateStatus(id: string, status: IncidentStatus): Promise<void> {
  const db = sql();
  await db`
    UPDATE lounge_incident_reports
    SET review_status = ${status}, updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function markIncidentPdfReady(id: string, pdfUrl: string): Promise<void> {
  const db = sql();
  await db`
    UPDATE lounge_incident_reports
    SET pdf_url = ${pdfUrl}, pdf_generated_at = NOW(), updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function markIncidentEmailSent(id: string): Promise<void> {
  const db = sql();
  await db`
    UPDATE lounge_incident_reports
    SET email_sent_at = NOW(), updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function addAdminNote(input: {
  incidentId: string;
  authorId: string;
  authorName: string;
  body: string;
}): Promise<IncidentAdminNote> {
  const note: IncidentAdminNote = {
    authorId: input.authorId,
    authorName: input.authorName,
    body: input.body.trim(),
    at: new Date().toISOString(),
  };
  const db = sql();
  await db`
    UPDATE lounge_incident_reports
    SET admin_notes = COALESCE(admin_notes, '[]'::jsonb) || ${JSON.stringify(note)}::jsonb,
        updated_at = NOW()
    WHERE id = ${input.incidentId}
  `;
  return note;
}

export async function deleteIncident(id: string): Promise<void> {
  const db = sql();
  await db`DELETE FROM lounge_incident_reports WHERE id = ${id}`;
}
