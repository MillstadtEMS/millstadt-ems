/**
 * Employee form-request workflow.
 *
 * The agency wants forms to be "request → admin push → fill → sign"
 * rather than having any form directly self-startable by crew. This
 * module backs that flow: employees post a request, admins approve
 * (which creates the corresponding lounge_form_assignment) or deny
 * (with a reason). All transitions notify the other side via the in-
 * lounge bell + an email.
 *
 * Storage: lounge_form_requests with status pending | approved | denied
 * and a soft FK to lounge_form_assignments.id when approved.
 */
import { randomUUID } from "crypto";
import { sql } from "./db";

export type RequestStatus = "pending" | "approved" | "denied";

export interface FormRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  formType: string;
  message: string | null;
  status: RequestStatus;
  deniedReason: string | null;
  assignmentId: string | null;
  approvedById: string | null;
  approvedAt: string | null;
  deniedById: string | null;
  deniedAt: string | null;
  createdAt: string;
}

interface DbRow {
  id: string;
  employee_id: string;
  form_type: string;
  message: string | null;
  status: string;
  denied_reason: string | null;
  assignment_id: string | null;
  approved_by_id: string | null;
  approved_at: unknown;
  denied_by_id: string | null;
  denied_at: unknown;
  created_at: unknown;
  first_name?: string;
  last_name?: string;
}

function dateTime(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString();
  return String(v);
}

function toRequest(r: DbRow): FormRequest {
  return {
    id: r.id,
    employeeId: r.employee_id,
    employeeName: `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || r.employee_id,
    formType: r.form_type,
    message: r.message,
    status: r.status as RequestStatus,
    deniedReason: r.denied_reason,
    assignmentId: r.assignment_id,
    approvedById: r.approved_by_id,
    approvedAt: dateTime(r.approved_at),
    deniedById: r.denied_by_id,
    deniedAt: dateTime(r.denied_at),
    createdAt: dateTime(r.created_at) ?? "",
  };
}

let schemaReady = false;
async function ensureSchema() {
  if (schemaReady) return;
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS lounge_form_requests (
      id              TEXT PRIMARY KEY,
      employee_id     TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
      form_type       TEXT NOT NULL,
      message         TEXT,
      status          TEXT NOT NULL DEFAULT 'pending',
      denied_reason   TEXT,
      assignment_id   TEXT,
      approved_by_id  TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
      approved_at     TIMESTAMPTZ,
      denied_by_id    TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
      denied_at       TIMESTAMPTZ,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS lounge_form_requests_employee_idx ON lounge_form_requests (employee_id)`;
  await db`CREATE INDEX IF NOT EXISTS lounge_form_requests_status_idx ON lounge_form_requests (status)`;
  schemaReady = true;
}

export async function createRequest(input: {
  employeeId: string;
  formType: string;
  message: string | null;
}): Promise<FormRequest> {
  await ensureSchema();
  const db = sql();
  const id = randomUUID();
  await db`
    INSERT INTO lounge_form_requests (id, employee_id, form_type, message)
    VALUES (${id}, ${input.employeeId}, ${input.formType}, ${input.message})
  `;
  return (await getRequest(id))!;
}

export async function getRequest(id: string): Promise<FormRequest | null> {
  await ensureSchema();
  const db = sql();
  const rows = (await db`
    SELECT r.*, e.first_name, e.last_name
    FROM lounge_form_requests r
    JOIN lounge_employees e ON e.id = r.employee_id
    WHERE r.id = ${id} LIMIT 1
  `) as unknown as DbRow[];
  return rows[0] ? toRequest(rows[0]) : null;
}

export async function listRequestsForEmployee(employeeId: string): Promise<FormRequest[]> {
  await ensureSchema();
  const db = sql();
  const rows = (await db`
    SELECT r.*, e.first_name, e.last_name
    FROM lounge_form_requests r
    JOIN lounge_employees e ON e.id = r.employee_id
    WHERE r.employee_id = ${employeeId}
    ORDER BY r.created_at DESC
  `) as unknown as DbRow[];
  return rows.map(toRequest);
}

export async function listPendingRequests(): Promise<FormRequest[]> {
  await ensureSchema();
  const db = sql();
  const rows = (await db`
    SELECT r.*, e.first_name, e.last_name
    FROM lounge_form_requests r
    JOIN lounge_employees e ON e.id = r.employee_id
    WHERE r.status = 'pending'
    ORDER BY r.created_at ASC
  `) as unknown as DbRow[];
  return rows.map(toRequest);
}

export async function listAllRequests(limit = 200): Promise<FormRequest[]> {
  await ensureSchema();
  const db = sql();
  const rows = (await db`
    SELECT r.*, e.first_name, e.last_name
    FROM lounge_form_requests r
    JOIN lounge_employees e ON e.id = r.employee_id
    ORDER BY r.created_at DESC
    LIMIT ${limit}
  `) as unknown as DbRow[];
  return rows.map(toRequest);
}

export async function approveRequest(input: {
  id: string;
  approvedById: string;
  assignmentId: string;
}): Promise<void> {
  await ensureSchema();
  const db = sql();
  await db`
    UPDATE lounge_form_requests
    SET status = 'approved',
        assignment_id = ${input.assignmentId},
        approved_by_id = ${input.approvedById},
        approved_at = NOW()
    WHERE id = ${input.id} AND status = 'pending'
  `;
}

export async function denyRequest(input: {
  id: string;
  deniedById: string;
  reason: string;
}): Promise<void> {
  await ensureSchema();
  const db = sql();
  await db`
    UPDATE lounge_form_requests
    SET status = 'denied',
        denied_reason = ${input.reason},
        denied_by_id = ${input.deniedById},
        denied_at = NOW()
    WHERE id = ${input.id} AND status = 'pending'
  `;
}

export async function countPendingRequests(): Promise<number> {
  await ensureSchema();
  const db = sql();
  const rows = (await db`SELECT COUNT(*)::int AS n FROM lounge_form_requests WHERE status = 'pending'`) as unknown as { n: number }[];
  return rows[0]?.n ?? 0;
}
