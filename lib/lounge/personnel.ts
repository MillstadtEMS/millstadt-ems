/**
 * Personnel Records — admin-only personnel file CRUD + audit logging.
 *
 * Every read/write through this module is expected to be gated by
 * requireAdmin() in the caller. The functions themselves don't re-check
 * because some flows (employee acknowledgments) need to update specific
 * rows without admin auth.
 */

import { randomUUID } from "crypto";
import { sql } from "./db";
import { privateBlobDeleteTarget, privateLoungeBlobUrl } from "./private-blobs";

export type PersonnelCategory =
  | "conduct"
  | "performance"
  | "attendance"
  | "accommodations"
  | "clinical"
  | "positive"
  | "attachments";

export type PersonnelSeverity =
  | "informational" | "coaching" | "minor" | "moderate" | "serious" | "critical";

export type PersonnelStatus =
  | "draft" | "active" | "pending_review" | "resolved" | "archived";

export interface PersonnelRecord {
  id: string;
  employeeId: string;
  category: PersonnelCategory;
  recordType: string;
  title: string;
  summary: string | null;
  actionTaken: string | null;
  severity: PersonnelSeverity;
  status: PersonnelStatus;
  incidentDate: string | null;
  createdBy: string | null;
  supervisorId: string | null;
  witnesses: string | null;
  relatedUnit: string | null;
  relatedCall: string | null;
  followUpRequired: boolean;
  followUpDueDate: string | null;
  followUpCompletedAt: string | null;
  employeeVisible: boolean;
  restrictedVisibility: boolean;
  acknowledgmentRequired: boolean;
  acknowledgedAt: string | null;
  acknowledgedSignature: string | null;
  employeeResponse: string | null;
  relatedPolicy: string | null;
  locked: boolean;
  retentionCategory: string | null;
  archiveDate: string | null;
  accommodationType: string | null;
  accommodationStart: string | null;
  accommodationEnd: string | null;
  accommodationReview: string | null;
  workLimitations: string | null;
  approvedBy: string | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PersonnelAttachment {
  id: string;
  recordId: string;
  employeeId: string;
  fileName: string;
  fileUrl: string;
  fileMime: string | null;
  fileSize: number | null;
  documentCategory: string | null;
  visibilityLevel: "admin" | "employee" | "restricted_hr";
  adminNotes: string | null;
  employeeNotes: string | null;
  replacedById: string | null;
  uploadedBy: string | null;
  uploadedAt: string;
}

interface RecordRow {
  id: string;
  employee_id: string;
  category: string;
  record_type: string;
  title: string;
  summary: string | null;
  action_taken: string | null;
  severity: string;
  status: string;
  incident_date: string | null;
  created_by: string | null;
  supervisor_id: string | null;
  witnesses: string | null;
  related_unit: string | null;
  related_call: string | null;
  follow_up_required: boolean;
  follow_up_due_date: string | null;
  follow_up_completed_at: string | null;
  employee_visible: boolean;
  restricted_visibility: boolean;
  acknowledgment_required: boolean;
  acknowledged_at: string | null;
  acknowledged_signature: string | null;
  employee_response: string | null;
  related_policy: string | null;
  locked: boolean;
  retention_category: string | null;
  archive_date: string | null;
  accommodation_type: string | null;
  accommodation_start: string | null;
  accommodation_end: string | null;
  accommodation_review: string | null;
  work_limitations: string | null;
  approved_by: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

// Neon returns DATE / TIMESTAMPTZ as JS Date objects. Coerce so the
// downstream string-typed consumers don't call .match() on a Date.
function dateOnly(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
  return String(v);
}
function dateTime(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString();
  return String(v);
}

function toRecord(r: RecordRow): PersonnelRecord {
  return {
    id: r.id,
    employeeId: r.employee_id,
    category: r.category as PersonnelCategory,
    recordType: r.record_type,
    title: r.title,
    summary: r.summary,
    actionTaken: r.action_taken,
    severity: r.severity as PersonnelSeverity,
    status: r.status as PersonnelStatus,
    incidentDate: dateTime(r.incident_date),
    createdBy: r.created_by,
    supervisorId: r.supervisor_id,
    witnesses: r.witnesses,
    relatedUnit: r.related_unit,
    relatedCall: r.related_call,
    followUpRequired: r.follow_up_required,
    followUpDueDate: dateOnly(r.follow_up_due_date),
    followUpCompletedAt: dateTime(r.follow_up_completed_at),
    employeeVisible: r.employee_visible,
    restrictedVisibility: r.restricted_visibility,
    acknowledgmentRequired: r.acknowledgment_required,
    acknowledgedAt: dateTime(r.acknowledged_at),
    acknowledgedSignature: r.acknowledged_signature,
    employeeResponse: r.employee_response,
    relatedPolicy: r.related_policy,
    locked: r.locked,
    retentionCategory: r.retention_category,
    archiveDate: dateOnly(r.archive_date),
    accommodationType: r.accommodation_type,
    accommodationStart: dateOnly(r.accommodation_start),
    accommodationEnd: dateOnly(r.accommodation_end),
    accommodationReview: dateOnly(r.accommodation_review),
    workLimitations: r.work_limitations,
    approvedBy: r.approved_by,
    adminNotes: r.admin_notes,
    createdAt: dateTime(r.created_at) ?? "",
    updatedAt: dateTime(r.updated_at) ?? "",
  };
}

export async function listRecordsForEmployee(employeeId: string): Promise<PersonnelRecord[]> {
  const db = sql();
  const rows = (await db`
    SELECT * FROM lounge_personnel_records
    WHERE employee_id = ${employeeId}
    ORDER BY incident_date DESC NULLS LAST, created_at DESC
  `) as unknown as RecordRow[];
  return rows.map(toRecord);
}

export async function listEmployeeVisibleRecords(employeeId: string): Promise<PersonnelRecord[]> {
  const db = sql();
  const rows = (await db`
    SELECT * FROM lounge_personnel_records
    WHERE employee_id = ${employeeId}
      AND employee_visible = TRUE
      AND status <> 'draft'
    ORDER BY created_at DESC
  `) as unknown as RecordRow[];
  return rows.map(toRecord);
}

export async function getRecord(id: string): Promise<PersonnelRecord | null> {
  const db = sql();
  const rows = (await db`
    SELECT * FROM lounge_personnel_records WHERE id = ${id} LIMIT 1
  `) as unknown as RecordRow[];
  return rows[0] ? toRecord(rows[0]) : null;
}

export interface CreateRecordInput {
  employeeId: string;
  category: PersonnelCategory;
  recordType: string;
  title: string;
  summary?: string | null;
  actionTaken?: string | null;
  severity?: PersonnelSeverity;
  status?: PersonnelStatus;
  incidentDate?: string | null;
  createdBy?: string | null;
  supervisorId?: string | null;
  witnesses?: string | null;
  relatedUnit?: string | null;
  relatedCall?: string | null;
  followUpRequired?: boolean;
  followUpDueDate?: string | null;
  employeeVisible?: boolean;
  restrictedVisibility?: boolean;
  acknowledgmentRequired?: boolean;
  relatedPolicy?: string | null;
  retentionCategory?: string | null;
  accommodationType?: string | null;
  accommodationStart?: string | null;
  accommodationEnd?: string | null;
  accommodationReview?: string | null;
  workLimitations?: string | null;
  approvedBy?: string | null;
  adminNotes?: string | null;
}

export async function createRecord(input: CreateRecordInput): Promise<PersonnelRecord> {
  const id = randomUUID();
  const db = sql();
  await db`
    INSERT INTO lounge_personnel_records (
      id, employee_id, category, record_type, title, summary, action_taken,
      severity, status, incident_date, created_by, supervisor_id, witnesses,
      related_unit, related_call, follow_up_required, follow_up_due_date,
      employee_visible, restricted_visibility, acknowledgment_required,
      related_policy, retention_category,
      accommodation_type, accommodation_start, accommodation_end,
      accommodation_review, work_limitations, approved_by, admin_notes
    ) VALUES (
      ${id}, ${input.employeeId}, ${input.category}, ${input.recordType},
      ${input.title}, ${input.summary ?? null}, ${input.actionTaken ?? null},
      ${input.severity ?? "informational"}, ${input.status ?? "active"},
      ${input.incidentDate ?? null}, ${input.createdBy ?? null},
      ${input.supervisorId ?? null}, ${input.witnesses ?? null},
      ${input.relatedUnit ?? null}, ${input.relatedCall ?? null},
      ${input.followUpRequired ?? false}, ${input.followUpDueDate ?? null},
      ${input.employeeVisible ?? false}, ${input.restrictedVisibility ?? false},
      ${input.acknowledgmentRequired ?? false},
      ${input.relatedPolicy ?? null}, ${input.retentionCategory ?? null},
      ${input.accommodationType ?? null}, ${input.accommodationStart ?? null},
      ${input.accommodationEnd ?? null}, ${input.accommodationReview ?? null},
      ${input.workLimitations ?? null}, ${input.approvedBy ?? null},
      ${input.adminNotes ?? null}
    )
  `;
  const r = await getRecord(id);
  if (!r) throw new Error("Failed to create personnel record");
  return r;
}

export interface UpdateRecordInput {
  category?: PersonnelCategory;
  recordType?: string;
  title?: string;
  summary?: string | null;
  actionTaken?: string | null;
  severity?: PersonnelSeverity;
  status?: PersonnelStatus;
  incidentDate?: string | null;
  supervisorId?: string | null;
  witnesses?: string | null;
  relatedUnit?: string | null;
  relatedCall?: string | null;
  followUpRequired?: boolean;
  followUpDueDate?: string | null;
  followUpCompletedAt?: string | null;
  employeeVisible?: boolean;
  restrictedVisibility?: boolean;
  acknowledgmentRequired?: boolean;
  relatedPolicy?: string | null;
  locked?: boolean;
  retentionCategory?: string | null;
  archiveDate?: string | null;
  accommodationType?: string | null;
  accommodationStart?: string | null;
  accommodationEnd?: string | null;
  accommodationReview?: string | null;
  workLimitations?: string | null;
  approvedBy?: string | null;
  adminNotes?: string | null;
}

export async function updateRecord(id: string, input: UpdateRecordInput): Promise<PersonnelRecord | null> {
  const db = sql();
  // Refuse to update locked records.
  const current = await getRecord(id);
  if (!current) return null;
  if (current.locked && input.locked !== false) {
    // Allow unlock action specifically; otherwise block edits.
    throw new Error("LOCKED");
  }

  if (input.category !== undefined)              await db`UPDATE lounge_personnel_records SET category = ${input.category}, updated_at = NOW() WHERE id = ${id}`;
  if (input.recordType !== undefined)            await db`UPDATE lounge_personnel_records SET record_type = ${input.recordType}, updated_at = NOW() WHERE id = ${id}`;
  if (input.title !== undefined)                 await db`UPDATE lounge_personnel_records SET title = ${input.title}, updated_at = NOW() WHERE id = ${id}`;
  if (input.summary !== undefined)               await db`UPDATE lounge_personnel_records SET summary = ${input.summary}, updated_at = NOW() WHERE id = ${id}`;
  if (input.actionTaken !== undefined)           await db`UPDATE lounge_personnel_records SET action_taken = ${input.actionTaken}, updated_at = NOW() WHERE id = ${id}`;
  if (input.severity !== undefined)              await db`UPDATE lounge_personnel_records SET severity = ${input.severity}, updated_at = NOW() WHERE id = ${id}`;
  if (input.status !== undefined)                await db`UPDATE lounge_personnel_records SET status = ${input.status}, updated_at = NOW() WHERE id = ${id}`;
  if (input.incidentDate !== undefined)          await db`UPDATE lounge_personnel_records SET incident_date = ${input.incidentDate}, updated_at = NOW() WHERE id = ${id}`;
  if (input.supervisorId !== undefined)          await db`UPDATE lounge_personnel_records SET supervisor_id = ${input.supervisorId}, updated_at = NOW() WHERE id = ${id}`;
  if (input.witnesses !== undefined)             await db`UPDATE lounge_personnel_records SET witnesses = ${input.witnesses}, updated_at = NOW() WHERE id = ${id}`;
  if (input.relatedUnit !== undefined)           await db`UPDATE lounge_personnel_records SET related_unit = ${input.relatedUnit}, updated_at = NOW() WHERE id = ${id}`;
  if (input.relatedCall !== undefined)           await db`UPDATE lounge_personnel_records SET related_call = ${input.relatedCall}, updated_at = NOW() WHERE id = ${id}`;
  if (input.followUpRequired !== undefined)      await db`UPDATE lounge_personnel_records SET follow_up_required = ${input.followUpRequired}, updated_at = NOW() WHERE id = ${id}`;
  if (input.followUpDueDate !== undefined)       await db`UPDATE lounge_personnel_records SET follow_up_due_date = ${input.followUpDueDate}, updated_at = NOW() WHERE id = ${id}`;
  if (input.followUpCompletedAt !== undefined)   await db`UPDATE lounge_personnel_records SET follow_up_completed_at = ${input.followUpCompletedAt}, updated_at = NOW() WHERE id = ${id}`;
  if (input.employeeVisible !== undefined)       await db`UPDATE lounge_personnel_records SET employee_visible = ${input.employeeVisible}, updated_at = NOW() WHERE id = ${id}`;
  if (input.restrictedVisibility !== undefined)  await db`UPDATE lounge_personnel_records SET restricted_visibility = ${input.restrictedVisibility}, updated_at = NOW() WHERE id = ${id}`;
  if (input.acknowledgmentRequired !== undefined) await db`UPDATE lounge_personnel_records SET acknowledgment_required = ${input.acknowledgmentRequired}, updated_at = NOW() WHERE id = ${id}`;
  if (input.relatedPolicy !== undefined)         await db`UPDATE lounge_personnel_records SET related_policy = ${input.relatedPolicy}, updated_at = NOW() WHERE id = ${id}`;
  if (input.locked !== undefined)                await db`UPDATE lounge_personnel_records SET locked = ${input.locked}, updated_at = NOW() WHERE id = ${id}`;
  if (input.retentionCategory !== undefined)     await db`UPDATE lounge_personnel_records SET retention_category = ${input.retentionCategory}, updated_at = NOW() WHERE id = ${id}`;
  if (input.archiveDate !== undefined)           await db`UPDATE lounge_personnel_records SET archive_date = ${input.archiveDate}, updated_at = NOW() WHERE id = ${id}`;
  if (input.accommodationType !== undefined)     await db`UPDATE lounge_personnel_records SET accommodation_type = ${input.accommodationType}, updated_at = NOW() WHERE id = ${id}`;
  if (input.accommodationStart !== undefined)    await db`UPDATE lounge_personnel_records SET accommodation_start = ${input.accommodationStart}, updated_at = NOW() WHERE id = ${id}`;
  if (input.accommodationEnd !== undefined)      await db`UPDATE lounge_personnel_records SET accommodation_end = ${input.accommodationEnd}, updated_at = NOW() WHERE id = ${id}`;
  if (input.accommodationReview !== undefined)   await db`UPDATE lounge_personnel_records SET accommodation_review = ${input.accommodationReview}, updated_at = NOW() WHERE id = ${id}`;
  if (input.workLimitations !== undefined)       await db`UPDATE lounge_personnel_records SET work_limitations = ${input.workLimitations}, updated_at = NOW() WHERE id = ${id}`;
  if (input.approvedBy !== undefined)            await db`UPDATE lounge_personnel_records SET approved_by = ${input.approvedBy}, updated_at = NOW() WHERE id = ${id}`;
  if (input.adminNotes !== undefined)            await db`UPDATE lounge_personnel_records SET admin_notes = ${input.adminNotes}, updated_at = NOW() WHERE id = ${id}`;

  return getRecord(id);
}

export async function archiveRecord(id: string): Promise<void> {
  const db = sql();
  await db`
    UPDATE lounge_personnel_records
    SET status = 'archived',
        archive_date = COALESCE(archive_date, CURRENT_DATE),
        updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function acknowledgeRecord(input: {
  recordId: string;
  employeeId: string;          // must match record.employee_id
  signatureDataUrl: string | null;
  response: string | null;
}): Promise<PersonnelRecord | null> {
  const db = sql();
  const r = await getRecord(input.recordId);
  if (!r || r.employeeId !== input.employeeId) return null;
  if (!r.employeeVisible) return null;
  await db`
    UPDATE lounge_personnel_records
    SET acknowledged_at = NOW(),
        acknowledged_signature = ${input.signatureDataUrl ?? null},
        employee_response = ${input.response ?? null},
        updated_at = NOW()
    WHERE id = ${input.recordId}
  `;
  return getRecord(input.recordId);
}

// ── Attachments ─────────────────────────────────────────────────────────

interface AttachmentRow {
  id: string;
  record_id: string;
  employee_id: string;
  file_name: string;
  file_url: string;
  file_mime: string | null;
  file_size: number | null;
  document_category: string | null;
  visibility_level: string;
  admin_notes: string | null;
  employee_notes: string | null;
  replaced_by_id: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

function toAttachment(r: AttachmentRow): PersonnelAttachment {
  return {
    id: r.id,
    recordId: r.record_id,
    employeeId: r.employee_id,
    fileName: r.file_name,
    fileUrl: privateLoungeBlobUrl(r.file_url) ?? r.file_url,
    fileMime: r.file_mime,
    fileSize: r.file_size,
    documentCategory: r.document_category,
    visibilityLevel: r.visibility_level as PersonnelAttachment["visibilityLevel"],
    adminNotes: r.admin_notes,
    employeeNotes: r.employee_notes,
    replacedById: r.replaced_by_id,
    uploadedBy: r.uploaded_by,
    uploadedAt: r.uploaded_at,
  };
}

export async function listAttachmentsForRecord(recordId: string): Promise<PersonnelAttachment[]> {
  const db = sql();
  const rows = (await db`
    SELECT * FROM lounge_personnel_attachments
    WHERE record_id = ${recordId}
    ORDER BY uploaded_at DESC
  `) as unknown as AttachmentRow[];
  return rows.map(toAttachment);
}

export async function getAttachment(id: string): Promise<PersonnelAttachment | null> {
  const db = sql();
  const rows = (await db`
    SELECT * FROM lounge_personnel_attachments WHERE id = ${id} LIMIT 1
  `) as unknown as AttachmentRow[];
  return rows[0] ? toAttachment(rows[0]) : null;
}

export interface CreateAttachmentInput {
  recordId: string;
  employeeId: string;
  fileName: string;
  fileUrl: string;
  fileMime?: string;
  fileSize?: number;
  documentCategory?: string;
  visibilityLevel?: PersonnelAttachment["visibilityLevel"];
  adminNotes?: string;
  employeeNotes?: string;
  uploadedBy: string;
}

export async function createAttachment(input: CreateAttachmentInput): Promise<PersonnelAttachment> {
  const id = randomUUID();
  const db = sql();
  await db`
    INSERT INTO lounge_personnel_attachments (
      id, record_id, employee_id, file_name, file_url, file_mime, file_size,
      document_category, visibility_level, admin_notes, employee_notes, uploaded_by
    ) VALUES (
      ${id}, ${input.recordId}, ${input.employeeId}, ${input.fileName}, ${input.fileUrl},
      ${input.fileMime ?? null}, ${input.fileSize ?? null},
      ${input.documentCategory ?? null}, ${input.visibilityLevel ?? "admin"},
      ${input.adminNotes ?? null}, ${input.employeeNotes ?? null}, ${input.uploadedBy}
    )
  `;
  const a = await getAttachment(id);
  if (!a) throw new Error("Failed to create attachment");
  return a;
}

export async function deleteAttachment(id: string): Promise<string | null> {
  const db = sql();
  const rows = (await db`
    SELECT file_url FROM lounge_personnel_attachments WHERE id = ${id} LIMIT 1
  `) as unknown as { file_url: string }[];
  const fileUrl = rows[0]?.file_url ?? null;
  if (!fileUrl) return null;
  await db`DELETE FROM lounge_personnel_attachments WHERE id = ${id}`;
  return privateBlobDeleteTarget(fileUrl);
}

// ── Audit ───────────────────────────────────────────────────────────────

export type AuditAction =
  | "view" | "create" | "update" | "upload" | "download" | "delete"
  | "archive" | "visibility_change" | "acknowledge";

export async function audit(input: {
  recordId?: string;
  attachmentId?: string;
  employeeId?: string;
  actorId: string;
  action: AuditAction;
  detail?: object;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    const db = sql();
    await db`
      INSERT INTO lounge_personnel_audit
        (record_id, attachment_id, employee_id, actor_id, action, detail, ip, user_agent)
      VALUES (
        ${input.recordId ?? null}, ${input.attachmentId ?? null},
        ${input.employeeId ?? null}, ${input.actorId},
        ${input.action},
        ${input.detail ? JSON.stringify(input.detail) : null}::jsonb,
        ${input.ip ?? null}, ${input.userAgent ?? null}
      )
    `;
  } catch (e) {
    console.error("personnel audit log failed:", e);
  }
}

// ── Dashboard rollups ───────────────────────────────────────────────────

export interface DashboardRollups {
  openFollowUps: PersonnelRecord[];
  pendingAcks: PersonnelRecord[];
  activeAccommodations: PersonnelRecord[];
  accommodationsDueReview: PersonnelRecord[];
  unresolvedDiscipline: PersonnelRecord[];
}

export async function dashboardRollups(): Promise<DashboardRollups> {
  const db = sql();
  const followUps = (await db`
    SELECT * FROM lounge_personnel_records
    WHERE follow_up_required = TRUE AND follow_up_completed_at IS NULL
    ORDER BY follow_up_due_date NULLS LAST, created_at ASC
    LIMIT 100
  `) as unknown as RecordRow[];
  const pendingAcks = (await db`
    SELECT * FROM lounge_personnel_records
    WHERE acknowledgment_required = TRUE AND acknowledged_at IS NULL
      AND employee_visible = TRUE
    ORDER BY created_at DESC
    LIMIT 100
  `) as unknown as RecordRow[];
  const activeAcc = (await db`
    SELECT * FROM lounge_personnel_records
    WHERE category = 'accommodations' AND status = 'active'
    ORDER BY accommodation_review NULLS LAST
    LIMIT 100
  `) as unknown as RecordRow[];
  const accDue = (await db`
    SELECT * FROM lounge_personnel_records
    WHERE category = 'accommodations' AND status = 'active'
      AND accommodation_review IS NOT NULL
      AND accommodation_review < CURRENT_DATE + INTERVAL '30 days'
    ORDER BY accommodation_review ASC
    LIMIT 100
  `) as unknown as RecordRow[];
  const unresolvedDisc = (await db`
    SELECT * FROM lounge_personnel_records
    WHERE category = 'conduct' AND status NOT IN ('resolved', 'archived')
    ORDER BY created_at DESC
    LIMIT 100
  `) as unknown as RecordRow[];
  return {
    openFollowUps: followUps.map(toRecord),
    pendingAcks: pendingAcks.map(toRecord),
    activeAccommodations: activeAcc.map(toRecord),
    accommodationsDueReview: accDue.map(toRecord),
    unresolvedDiscipline: unresolvedDisc.map(toRecord),
  };
}
