/**
 * Generic form instance + assignment + audit storage. Every form type
 * in the registry shares this table — the per-form schema lives inside
 * the `data` JSONB blob and is validated against the registry on save.
 */
import { randomUUID } from "crypto";
import { sql } from "../db";

export type FormStatus = "draft" | "finalized" | "rescinded";

export interface FormSignature {
  who: "manager" | "employee" | "evaluator" | "witness";
  printedName: string;
  signatureDataUrl: string;
  role: string;
  signedAt: string;
}

export interface FormShareOptions {
  saveToFile: boolean;
  visibleToEmployee: boolean;
  emailEmployee: boolean;
  emailAdminInbox: boolean;
}

export interface FormInstance {
  id: string;
  formType: string;
  employeeId: string;
  status: FormStatus;
  data: Record<string, unknown>;
  signatures: FormSignature[];
  refusedToSign: string[]; // signer "who" values where employee refused
  share: FormShareOptions;
  assignmentId: string | null;
  pdfUrl: string | null;
  pdfFilename: string | null;
  personnelRecordId: string | null;
  emailedToEmployee: boolean;
  emailedToAdminInbox: boolean;
  emailedAt: string | null;
  finalizedAt: string | null;
  finalizedById: string | null;
  rescindedAt: string | null;
  rescindedById: string | null;
  rescindedReason: string | null;
  rescindedByName: string | null;
  correctedById: string | null;     // points at the corrected version's form id
  correctsId: string | null;        // when this IS the corrected version, points at the rescinded one
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DbRow {
  id: string;
  form_type: string;
  employee_id: string;
  status: string;
  data: Record<string, unknown> | null;
  signatures: FormSignature[] | null;
  refused_to_sign: string[] | null;
  save_to_file: boolean;
  visible_to_employee: boolean;
  email_employee: boolean;
  email_admin_inbox: boolean;
  assignment_id: string | null;
  pdf_url: string | null;
  pdf_filename: string | null;
  personnel_record_id: string | null;
  emailed_to_employee: boolean;
  emailed_to_admin_inbox: boolean;
  emailed_at: string | null;
  finalized_at: string | null;
  finalized_by_id: string | null;
  rescinded_at: string | null;
  rescinded_by_id: string | null;
  rescinded_reason: string | null;
  rescinded_by_name: string | null;
  corrected_by_id: string | null;
  corrects_id: string | null;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

// Neon returns TIMESTAMPTZ as JS Date objects. Coerce so downstream
// string-typed consumers don't call .match() / .slice() on a Date.
function dateTime(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString();
  return String(v);
}

function toFormInstance(r: DbRow): FormInstance {
  return {
    id: r.id,
    formType: r.form_type,
    employeeId: r.employee_id,
    status: r.status as FormStatus,
    data: r.data ?? {},
    signatures: r.signatures ?? [],
    refusedToSign: r.refused_to_sign ?? [],
    share: {
      saveToFile: r.save_to_file,
      visibleToEmployee: r.visible_to_employee,
      emailEmployee: r.email_employee,
      emailAdminInbox: r.email_admin_inbox,
    },
    assignmentId: r.assignment_id,
    pdfUrl: r.pdf_url,
    pdfFilename: r.pdf_filename,
    personnelRecordId: r.personnel_record_id,
    emailedToEmployee: r.emailed_to_employee,
    emailedToAdminInbox: r.emailed_to_admin_inbox,
    emailedAt: dateTime(r.emailed_at),
    finalizedAt: dateTime(r.finalized_at),
    finalizedById: r.finalized_by_id,
    rescindedAt: dateTime(r.rescinded_at),
    rescindedById: r.rescinded_by_id,
    rescindedReason: r.rescinded_reason,
    rescindedByName: r.rescinded_by_name,
    correctedById: r.corrected_by_id,
    correctsId: r.corrects_id,
    createdById: r.created_by_id,
    createdAt: dateTime(r.created_at) ?? "",
    updatedAt: dateTime(r.updated_at) ?? "",
  };
}

let schemaEnsured = false;
async function ensureSchema() {
  if (schemaEnsured) return;
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
      target_kind           TEXT NOT NULL,     -- 'all' | 'explicit' | 'admin' | 'crew'
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
  schemaEnsured = true;
}

// ── Audit ───────────────────────────────────────────────────────────────

export type FormAuditAction =
  | "created" | "edited" | "previewed" | "signed" | "refused_signature"
  | "finalized" | "saved_to_file" | "emailed_employee" | "emailed_admin"
  | "rescinded" | "corrected" | "assigned";

export async function logFormAudit(input: {
  formId: string;
  actorId: string | null;
  actorName: string | null;
  action: FormAuditAction;
  details?: string;
}): Promise<void> {
  await ensureSchema();
  const db = sql();
  await db`
    INSERT INTO lounge_form_audit (id, form_id, actor_id, actor_name, action, details)
    VALUES (${randomUUID()}, ${input.formId}, ${input.actorId}, ${input.actorName}, ${input.action}, ${input.details ?? null})
  `;
}

export interface FormAuditEntry {
  id: string;
  actorId: string | null;
  actorName: string | null;
  action: string;
  details: string | null;
  createdAt: string;
}

export async function listAuditForForm(formId: string): Promise<FormAuditEntry[]> {
  await ensureSchema();
  const db = sql();
  const rows = (await db`
    SELECT id, actor_id, actor_name, action, details, created_at
    FROM lounge_form_audit
    WHERE form_id = ${formId}
    ORDER BY created_at DESC
  `) as unknown as { id: string; actor_id: string | null; actor_name: string | null; action: string; details: string | null; created_at: string }[];
  return rows.map((r) => ({
    id: r.id,
    actorId: r.actor_id,
    actorName: r.actor_name,
    action: r.action,
    details: r.details,
    createdAt: r.created_at,
  }));
}

// ── Instance CRUD ───────────────────────────────────────────────────────

export interface CreateFormInput {
  formType: string;
  employeeId: string;
  createdById: string | null;
  data?: Record<string, unknown>;
  share?: Partial<FormShareOptions>;
  assignmentId?: string | null;
}

const DEFAULT_SHARE: FormShareOptions = {
  saveToFile: false,
  visibleToEmployee: false,
  emailEmployee: false,
  emailAdminInbox: false,
};

export async function createForm(input: CreateFormInput): Promise<FormInstance> {
  await ensureSchema();
  const db = sql();
  const id = randomUUID();
  const share = { ...DEFAULT_SHARE, ...input.share };
  await db`
    INSERT INTO lounge_forms (
      id, form_type, employee_id, status, data,
      save_to_file, visible_to_employee, email_employee, email_admin_inbox,
      assignment_id, created_by_id
    ) VALUES (
      ${id}, ${input.formType}, ${input.employeeId}, 'draft',
      ${JSON.stringify(input.data ?? {})}::jsonb,
      ${share.saveToFile}, ${share.visibleToEmployee}, ${share.emailEmployee}, ${share.emailAdminInbox},
      ${input.assignmentId ?? null}, ${input.createdById}
    )
  `;
  return (await getForm(id))!;
}

export async function getForm(id: string): Promise<FormInstance | null> {
  await ensureSchema();
  const db = sql();
  const rows = (await db`SELECT * FROM lounge_forms WHERE id = ${id} LIMIT 1`) as unknown as DbRow[];
  return rows[0] ? toFormInstance(rows[0]) : null;
}

export async function listFormsForEmployee(employeeId: string): Promise<FormInstance[]> {
  await ensureSchema();
  const db = sql();
  const rows = (await db`
    SELECT * FROM lounge_forms
    WHERE employee_id = ${employeeId}
    ORDER BY created_at DESC
  `) as unknown as DbRow[];
  return rows.map(toFormInstance);
}

/** Forms an employee can see in their own lounge (visible + finalized + not rescinded). */
export async function listEmployeeVisibleForms(employeeId: string): Promise<FormInstance[]> {
  await ensureSchema();
  const db = sql();
  const rows = (await db`
    SELECT * FROM lounge_forms
    WHERE employee_id = ${employeeId}
      AND status = 'finalized'
      AND visible_to_employee = TRUE
    ORDER BY finalized_at DESC
  `) as unknown as DbRow[];
  return rows.map(toFormInstance);
}

/** Forms assigned to (or addressed to) this employee that are still pending signature. */
export async function listPendingForEmployee(employeeId: string): Promise<FormInstance[]> {
  await ensureSchema();
  const db = sql();
  const rows = (await db`
    SELECT * FROM lounge_forms
    WHERE employee_id = ${employeeId}
      AND status = 'draft'
      AND assignment_id IS NOT NULL
    ORDER BY created_at ASC
  `) as unknown as DbRow[];
  return rows.map(toFormInstance);
}

export interface UpdateFormInput {
  data?: Record<string, unknown>;
  signatures?: FormSignature[];
  refusedToSign?: string[];
  share?: Partial<FormShareOptions>;
}

export async function updateForm(id: string, input: UpdateFormInput): Promise<FormInstance | null> {
  await ensureSchema();
  const db = sql();
  if (input.data !== undefined) {
    await db`UPDATE lounge_forms SET data = ${JSON.stringify(input.data)}::jsonb, updated_at = NOW() WHERE id = ${id}`;
  }
  if (input.signatures !== undefined) {
    await db`UPDATE lounge_forms SET signatures = ${JSON.stringify(input.signatures)}::jsonb, updated_at = NOW() WHERE id = ${id}`;
  }
  if (input.refusedToSign !== undefined) {
    await db`UPDATE lounge_forms SET refused_to_sign = ${JSON.stringify(input.refusedToSign)}::jsonb, updated_at = NOW() WHERE id = ${id}`;
  }
  if (input.share) {
    const s = input.share;
    if (s.saveToFile !== undefined)        await db`UPDATE lounge_forms SET save_to_file = ${s.saveToFile}, updated_at = NOW() WHERE id = ${id}`;
    if (s.visibleToEmployee !== undefined) await db`UPDATE lounge_forms SET visible_to_employee = ${s.visibleToEmployee}, updated_at = NOW() WHERE id = ${id}`;
    if (s.emailEmployee !== undefined)     await db`UPDATE lounge_forms SET email_employee = ${s.emailEmployee}, updated_at = NOW() WHERE id = ${id}`;
    if (s.emailAdminInbox !== undefined)   await db`UPDATE lounge_forms SET email_admin_inbox = ${s.emailAdminInbox}, updated_at = NOW() WHERE id = ${id}`;
  }
  return getForm(id);
}

export async function deleteDraftForm(id: string): Promise<void> {
  await ensureSchema();
  const db = sql();
  await db`DELETE FROM lounge_forms WHERE id = ${id} AND status = 'draft'`;
}

export async function setFinalizedState(input: {
  id: string;
  pdfUrl: string;
  pdfFilename: string;
  personnelRecordId: string | null;
  finalizedById: string;
  emailedToEmployee: boolean;
  emailedToAdminInbox: boolean;
}): Promise<FormInstance | null> {
  await ensureSchema();
  const db = sql();
  await db`
    UPDATE lounge_forms SET
      status = 'finalized',
      pdf_url = ${input.pdfUrl},
      pdf_filename = ${input.pdfFilename},
      personnel_record_id = ${input.personnelRecordId},
      finalized_at = NOW(),
      finalized_by_id = ${input.finalizedById},
      emailed_to_employee = ${input.emailedToEmployee},
      emailed_to_admin_inbox = ${input.emailedToAdminInbox},
      emailed_at = ${input.emailedToEmployee || input.emailedToAdminInbox ? new Date().toISOString() : null},
      updated_at = NOW()
    WHERE id = ${input.id}
  `;
  return getForm(input.id);
}

export async function rescindForm(input: {
  id: string;
  byId: string;
  byName: string;
  reason: string;
}): Promise<FormInstance | null> {
  await ensureSchema();
  const db = sql();
  await db`
    UPDATE lounge_forms SET
      status = 'rescinded',
      rescinded_at = NOW(),
      rescinded_by_id = ${input.byId},
      rescinded_by_name = ${input.byName},
      rescinded_reason = ${input.reason},
      visible_to_employee = FALSE,
      updated_at = NOW()
    WHERE id = ${input.id} AND status = 'finalized'
  `;
  return getForm(input.id);
}

export async function linkCorrected(rescindedId: string, correctedId: string): Promise<void> {
  await ensureSchema();
  const db = sql();
  await db`UPDATE lounge_forms SET corrected_by_id = ${correctedId} WHERE id = ${rescindedId}`;
  await db`UPDATE lounge_forms SET corrects_id    = ${rescindedId} WHERE id = ${correctedId}`;
}

// ── Assignments ────────────────────────────────────────────────────────

export interface FormAssignment {
  id: string;
  formType: string;
  title: string;
  summary: string | null;
  prefillData: Record<string, unknown>;
  share: FormShareOptions;
  dueAt: string | null;
  targetKind: "all" | "explicit" | "admin" | "crew";
  targetEmployeeIds: string[];
  createdById: string | null;
  createdByName: string | null;
  closedAt: string | null;
  createdAt: string;
}

interface AssignRow {
  id: string;
  form_type: string;
  title: string;
  summary: string | null;
  prefill_data: Record<string, unknown> | null;
  share: Partial<FormShareOptions> | null;
  due_at: string | null;
  target_kind: string;
  target_employee_ids: string[] | null;
  created_by_id: string | null;
  created_by_name: string | null;
  closed_at: string | null;
  created_at: string;
}

function toAssignment(r: AssignRow): FormAssignment {
  return {
    id: r.id,
    formType: r.form_type,
    title: r.title,
    summary: r.summary,
    prefillData: r.prefill_data ?? {},
    share: { ...DEFAULT_SHARE, ...(r.share ?? {}) },
    dueAt: r.due_at,
    targetKind: r.target_kind as FormAssignment["targetKind"],
    targetEmployeeIds: r.target_employee_ids ?? [],
    createdById: r.created_by_id,
    createdByName: r.created_by_name,
    closedAt: r.closed_at,
    createdAt: r.created_at,
  };
}

export interface CreateAssignmentInput {
  formType: string;
  title: string;
  summary?: string;
  prefillData?: Record<string, unknown>;
  share?: FormShareOptions;
  dueAt?: string | null;
  targetKind: "all" | "explicit" | "admin" | "crew";
  targetEmployeeIds: string[];
  createdById: string | null;
  createdByName: string | null;
}

export async function createAssignment(input: CreateAssignmentInput): Promise<FormAssignment> {
  await ensureSchema();
  const db = sql();
  const id = randomUUID();
  await db`
    INSERT INTO lounge_form_assignments (
      id, form_type, created_by_id, created_by_name, title, summary,
      prefill_data, due_at, share, target_kind, target_employee_ids
    ) VALUES (
      ${id}, ${input.formType}, ${input.createdById}, ${input.createdByName},
      ${input.title}, ${input.summary ?? null},
      ${JSON.stringify(input.prefillData ?? {})}::jsonb,
      ${input.dueAt ?? null},
      ${JSON.stringify(input.share ?? DEFAULT_SHARE)}::jsonb,
      ${input.targetKind},
      ${JSON.stringify(input.targetEmployeeIds)}::jsonb
    )
  `;
  return (await getAssignment(id))!;
}

export async function getAssignment(id: string): Promise<FormAssignment | null> {
  await ensureSchema();
  const db = sql();
  const rows = (await db`SELECT * FROM lounge_form_assignments WHERE id = ${id} LIMIT 1`) as unknown as AssignRow[];
  return rows[0] ? toAssignment(rows[0]) : null;
}

export async function listAssignmentsForType(formType: string, includeClosed = false): Promise<FormAssignment[]> {
  await ensureSchema();
  const db = sql();
  const rows = includeClosed
    ? ((await db`SELECT * FROM lounge_form_assignments WHERE form_type = ${formType} ORDER BY created_at DESC`) as unknown as AssignRow[])
    : ((await db`SELECT * FROM lounge_form_assignments WHERE form_type = ${formType} AND closed_at IS NULL ORDER BY created_at DESC`) as unknown as AssignRow[]);
  return rows.map(toAssignment);
}

export async function listFormsForAssignment(assignmentId: string): Promise<FormInstance[]> {
  await ensureSchema();
  const db = sql();
  const rows = (await db`
    SELECT * FROM lounge_forms
    WHERE assignment_id = ${assignmentId}
    ORDER BY status ASC, created_at ASC
  `) as unknown as DbRow[];
  return rows.map(toFormInstance);
}

export async function progressForAssignment(assignmentId: string): Promise<{ assigned: number; finalized: number; pending: number }> {
  await ensureSchema();
  const db = sql();
  const rows = (await db`
    SELECT
      COUNT(*)::int AS assigned,
      COUNT(*) FILTER (WHERE status = 'finalized')::int AS finalized,
      COUNT(*) FILTER (WHERE status = 'draft')::int AS pending
    FROM lounge_forms WHERE assignment_id = ${assignmentId}
  `) as unknown as { assigned: number; finalized: number; pending: number }[];
  const r = rows[0] ?? { assigned: 0, finalized: 0, pending: 0 };
  return { assigned: r.assigned, finalized: r.finalized, pending: r.pending };
}

// ── Admin insights ─────────────────────────────────────────────────────

export interface AdminFormsInsights {
  finalizedThisMonth: number;
  finalizedYtd: number;
  pendingAssigned: number;
  awaitingAdminReview: number;
  overdueAssignments: number;
  draftAssignments: number;
  byTypeLast30: { formType: string; count: number }[];
  recentActivity: {
    formId: string;
    formType: string;
    employeeId: string;
    action: "finalized" | "awaiting_admin";
    when: string;
  }[];
}

export async function adminFormsInsights(): Promise<AdminFormsInsights> {
  await ensureSchema();
  const db = sql();

  const counts = (await db`
    SELECT
      COUNT(*) FILTER (
        WHERE status = 'finalized'
          AND finalized_at >= date_trunc('month', CURRENT_DATE)
      )::int AS finalized_month,
      COUNT(*) FILTER (
        WHERE status = 'finalized'
          AND finalized_at >= date_trunc('year', CURRENT_DATE)
      )::int AS finalized_ytd,
      COUNT(*) FILTER (
        WHERE status = 'draft' AND assignment_id IS NOT NULL
      )::int AS pending_assigned,
      COUNT(*) FILTER (
        WHERE status = 'draft'
          AND assignment_id IS NULL
          AND signatures @> '[{"who":"employee"}]'::jsonb
      )::int AS awaiting_review
    FROM lounge_forms
  `) as unknown as {
    finalized_month: number;
    finalized_ytd: number;
    pending_assigned: number;
    awaiting_review: number;
  }[];
  const c = counts[0] ?? { finalized_month: 0, finalized_ytd: 0, pending_assigned: 0, awaiting_review: 0 };

  const overdueRows = (await db`
    SELECT a.id
    FROM lounge_form_assignments a
    WHERE a.closed_at IS NULL
      AND a.due_at IS NOT NULL
      AND a.due_at < NOW()
      AND EXISTS (
        SELECT 1 FROM lounge_forms f
        WHERE f.assignment_id = a.id AND f.status = 'draft'
      )
  `) as unknown as { id: string }[];

  const draftAssignRows = (await db`
    SELECT COUNT(DISTINCT a.id)::int AS n
    FROM lounge_form_assignments a
    WHERE a.closed_at IS NULL
      AND EXISTS (
        SELECT 1 FROM lounge_forms f
        WHERE f.assignment_id = a.id AND f.status = 'draft'
      )
  `) as unknown as { n: number }[];

  const byType = (await db`
    SELECT form_type, COUNT(*)::int AS count
    FROM lounge_forms
    WHERE finalized_at >= NOW() - INTERVAL '30 days'
    GROUP BY form_type
    ORDER BY count DESC
    LIMIT 6
  `) as unknown as { form_type: string; count: number }[];

  const recentFinalized = (await db`
    SELECT id, form_type, employee_id, finalized_at AS ts
    FROM lounge_forms
    WHERE status = 'finalized'
    ORDER BY finalized_at DESC NULLS LAST
    LIMIT 6
  `) as unknown as { id: string; form_type: string; employee_id: string; ts: unknown }[];

  const recentAwaiting = (await db`
    SELECT id, form_type, employee_id, created_at AS ts
    FROM lounge_forms
    WHERE status = 'draft'
      AND assignment_id IS NULL
      AND signatures @> '[{"who":"employee"}]'::jsonb
    ORDER BY created_at DESC
    LIMIT 6
  `) as unknown as { id: string; form_type: string; employee_id: string; ts: unknown }[];

  const recentActivity: AdminFormsInsights["recentActivity"] = [
    ...recentFinalized.map((r) => ({
      formId: r.id,
      formType: r.form_type,
      employeeId: r.employee_id,
      action: "finalized" as const,
      when: dateTime(r.ts) ?? "",
    })),
    ...recentAwaiting.map((r) => ({
      formId: r.id,
      formType: r.form_type,
      employeeId: r.employee_id,
      action: "awaiting_admin" as const,
      when: dateTime(r.ts) ?? "",
    })),
  ]
    .sort((a, b) => b.when.localeCompare(a.when))
    .slice(0, 8);

  return {
    finalizedThisMonth: c.finalized_month,
    finalizedYtd: c.finalized_ytd,
    pendingAssigned: c.pending_assigned,
    awaitingAdminReview: c.awaiting_review,
    overdueAssignments: overdueRows.length,
    draftAssignments: draftAssignRows[0]?.n ?? 0,
    byTypeLast30: byType.map((r) => ({ formType: r.form_type, count: r.count })),
    recentActivity,
  };
}
