/**
 * "Request a change" workflow for the About Me page.
 *
 * Employees can no longer edit their own profile directly. Instead they
 * submit a change request — one record per submission, with the field
 * they want updated, a free-text comment, and an optional attachment
 * (license photo, marriage certificate, etc.). Admins review the request
 * from the employee detail page in /admin/employees/[id] and approve or
 * deny it. When approving, the admin can mark the attachment as visible
 * to the employee in their lounge (the same `employee_visible` model the
 * personnel records system already uses).
 */
import { randomUUID } from "crypto";
import { sql } from "./db";

export type ChangeRequestStatus = "pending" | "approved" | "denied";

export interface ProfileChangeRequest {
  id: string;
  employeeId: string;
  fieldKey: string;
  fieldLabel: string;
  proposedValue: string | null;
  comments: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentMime: string | null;
  shareWithEmployee: boolean;
  status: ChangeRequestStatus;
  adminDecisionNotes: string | null;
  decidedAt: string | null;
  decidedById: string | null;
  createdAt: string;
}

interface DbRow {
  id: string;
  employee_id: string;
  field_key: string;
  field_label: string;
  proposed_value: string | null;
  comments: string;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  share_with_employee: boolean | null;
  status: ChangeRequestStatus;
  admin_decision_notes: string | null;
  decided_at: string | null;
  decided_by_id: string | null;
  created_at: string;
}

function dateTime(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString();
  return String(v);
}

function toReq(r: DbRow): ProfileChangeRequest {
  return {
    id: r.id,
    employeeId: r.employee_id,
    fieldKey: r.field_key,
    fieldLabel: r.field_label,
    proposedValue: r.proposed_value,
    comments: r.comments,
    attachmentUrl: r.attachment_url,
    attachmentName: r.attachment_name,
    attachmentMime: r.attachment_mime,
    shareWithEmployee: Boolean(r.share_with_employee),
    status: r.status,
    adminDecisionNotes: r.admin_decision_notes,
    decidedAt: dateTime(r.decided_at),
    decidedById: r.decided_by_id,
    createdAt: dateTime(r.created_at) ?? "",
  };
}

let schemaEnsured = false;
async function ensureSchema() {
  if (schemaEnsured) return;
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
  await db`CREATE INDEX IF NOT EXISTS lounge_pcr_status_idx   ON lounge_profile_change_requests (status)`;
  schemaEnsured = true;
}

export interface CreateChangeRequestInput {
  employeeId: string;
  fieldKey: string;
  fieldLabel: string;
  proposedValue: string | null;
  comments: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentMime?: string | null;
}

export async function createChangeRequest(input: CreateChangeRequestInput): Promise<ProfileChangeRequest> {
  await ensureSchema();
  const db = sql();
  const id = randomUUID();
  await db`
    INSERT INTO lounge_profile_change_requests
      (id, employee_id, field_key, field_label, proposed_value, comments,
       attachment_url, attachment_name, attachment_mime)
    VALUES
      (${id}, ${input.employeeId}, ${input.fieldKey}, ${input.fieldLabel},
       ${input.proposedValue}, ${input.comments},
       ${input.attachmentUrl ?? null}, ${input.attachmentName ?? null}, ${input.attachmentMime ?? null})
  `;
  const rows = (await db`SELECT * FROM lounge_profile_change_requests WHERE id = ${id}`) as unknown as DbRow[];
  return toReq(rows[0]);
}

export async function listRequestsForEmployee(employeeId: string): Promise<ProfileChangeRequest[]> {
  await ensureSchema();
  const db = sql();
  const rows = (await db`
    SELECT * FROM lounge_profile_change_requests
    WHERE employee_id = ${employeeId}
    ORDER BY created_at DESC
  `) as unknown as DbRow[];
  return rows.map(toReq);
}

export async function listPendingRequests(): Promise<ProfileChangeRequest[]> {
  await ensureSchema();
  const db = sql();
  const rows = (await db`
    SELECT * FROM lounge_profile_change_requests
    WHERE status = 'pending'
    ORDER BY created_at DESC
  `) as unknown as DbRow[];
  return rows.map(toReq);
}

export async function getRequest(id: string): Promise<ProfileChangeRequest | null> {
  await ensureSchema();
  const db = sql();
  const rows = (await db`SELECT * FROM lounge_profile_change_requests WHERE id = ${id} LIMIT 1`) as unknown as DbRow[];
  return rows[0] ? toReq(rows[0]) : null;
}

export interface DecisionInput {
  status: "approved" | "denied";
  adminDecisionNotes?: string | null;
  shareWithEmployee?: boolean;
  decidedById: string;
}

export async function setRequestDecision(id: string, input: DecisionInput): Promise<void> {
  await ensureSchema();
  const db = sql();
  await db`
    UPDATE lounge_profile_change_requests SET
      status               = ${input.status},
      admin_decision_notes = ${input.adminDecisionNotes ?? null},
      share_with_employee  = ${Boolean(input.shareWithEmployee)},
      decided_at           = NOW(),
      decided_by_id        = ${input.decidedById}
    WHERE id = ${id}
  `;
}

export async function setShareWithEmployee(id: string, share: boolean): Promise<void> {
  await ensureSchema();
  const db = sql();
  await db`
    UPDATE lounge_profile_change_requests
    SET share_with_employee = ${share}
    WHERE id = ${id}
  `;
}

/** Field options exposed to the picker on the About Me page. */
export const REQUESTABLE_FIELDS: { key: string; label: string }[] = [
  { key: "email",              label: "Email address" },
  { key: "phone",              label: "Phone number" },
  { key: "addressStreet",      label: "Street address" },
  { key: "addressCity",        label: "City" },
  { key: "addressState",       label: "State" },
  { key: "addressZip",         label: "ZIP code" },
  { key: "dob",                label: "Date of birth" },
  { key: "driverLicenseNum",   label: "Driver's license number" },
  { key: "driverLicenseState", label: "Driver's license state" },
  { key: "ecName",             label: "Emergency contact #1 name" },
  { key: "ecRelationship",     label: "Emergency contact #1 relationship" },
  { key: "ecPhone",            label: "Emergency contact #1 phone" },
  { key: "ec2Name",            label: "Emergency contact #2 name" },
  { key: "ec2Relationship",    label: "Emergency contact #2 relationship" },
  { key: "ec2Phone",           label: "Emergency contact #2 phone" },
  { key: "shirtSize",          label: "Shirt size" },
  { key: "pantSize",           label: "Pant size" },
  { key: "jacketSize",         label: "Jacket size" },
  { key: "allergies",          label: "Allergies" },
  { key: "medicalConditions",  label: "Medical conditions" },
  { key: "bloodType",          label: "Blood type" },
  { key: "certification",      label: "Certification level" },
  { key: "emailSecondary",     label: "Secondary email address" },
  { key: "other",              label: "Something else (see comments)" },
];

export function labelForField(key: string): string {
  const f = REQUESTABLE_FIELDS.find((x) => x.key === key);
  return f?.label ?? key;
}
