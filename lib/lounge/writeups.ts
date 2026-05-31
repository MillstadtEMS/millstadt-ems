/**
 * Employee disciplinary write-up / corrective action records.
 *
 * Stored separately from the personnel-records table so the form's
 * structured fields (incident, evidence, prior notice, expectations,
 * employee response, signatures, etc.) all have a stable home. When a
 * write-up is finalized AND the manager checked "save to employee file",
 * a corresponding personnel record + attachment is created so the PDF
 * lives in the canonical file alongside everything else.
 *
 * All writes are gated behind requireAdmin() on the API routes. Crew
 * never see write-up rows except by way of a personnel record an admin
 * has explicitly marked employee_visible.
 */
import { randomUUID } from "crypto";
import { sql } from "./db";

export const CORRECTIVE_ACTION_TYPES = [
  "Documented verbal counseling",
  "Written warning",
  "Final written warning",
  "Suspension recommendation",
  "Performance improvement plan",
  "Termination recommendation",
  "Other",
] as const;
export type CorrectiveActionType = (typeof CORRECTIVE_ACTION_TYPES)[number];

export const ISSUE_CATEGORIES = [
  "Attendance / tardiness",
  "Performance concern",
  "Policy violation",
  "Safety issue",
  "Conduct / professionalism",
  "Documentation issue",
  "Patient care concern",
  "Equipment / property issue",
  "Insubordination",
  "Confidentiality / HIPAA concern",
  "Workplace behavior",
  "Other",
] as const;
export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

export const RESPONSE_STATUS = [
  "provided",
  "declined",
  "submit_later",
  "refused_to_participate",
  "unavailable",
] as const;
export type ResponseStatus = (typeof RESPONSE_STATUS)[number];

export type WriteUpStatus = "draft" | "finalized";

export interface WriteUpSignature {
  printedName: string;
  signatureDataUrl: string; // PNG data URL captured by SignaturePad
  role: string;             // job title or "Witness"
  signedAt: string;         // ISO
}

export interface WriteUp {
  id: string;
  employeeId: string;
  status: WriteUpStatus;

  // Step 1 — employee & incident metadata
  employeeFullName: string;
  employeePosition: string | null;
  employeeDepartment: string | null;
  supervisorId: string | null;
  supervisorName: string | null;
  dateIssued: string | null;        // YYYY-MM-DD
  incidentDate: string | null;      // ISO datetime
  incidentLocation: string | null;

  // Step 2 — issue details
  correctiveActionType: CorrectiveActionType | null;
  issueCategory: IssueCategory | null;
  factualDescription: string;
  policyViolated: string;

  // Step 3 — evidence + history + impact
  evidenceReviewed: string;
  priorNoticeOfExpectation: string;
  priorRelatedDiscipline: string;
  operationalImpact: string;

  // Step 4 — corrective expectations + plan
  correctiveExpectations: string;
  actionPlan: string;
  improvementTimeline: string;
  consequencesStatement: string;
  managerInternalNotes: string | null;

  // Step 5 — employee response
  responseStatus: ResponseStatus | null;
  employeeResponseText: string | null;

  // Step 6 — signatures
  managerSignature: WriteUpSignature | null;
  employeeSignature: WriteUpSignature | null;
  employeeRefusedToSign: boolean;
  witnessSignature: WriteUpSignature | null;

  // Save-to-file linkage
  saveToFile: boolean;
  pdfUrl: string | null;
  pdfFilename: string | null;
  personnelRecordId: string | null;

  // Audit timestamps
  createdById: string | null;
  finalizedAt: string | null;
  finalizedById: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DbRow {
  id: string;
  employee_id: string;
  status: string;
  employee_full_name: string;
  employee_position: string | null;
  employee_department: string | null;
  supervisor_id: string | null;
  supervisor_name: string | null;
  date_issued: string | null;
  incident_date: string | null;
  incident_location: string | null;
  corrective_action_type: string | null;
  issue_category: string | null;
  factual_description: string;
  policy_violated: string;
  evidence_reviewed: string;
  prior_notice_of_expectation: string;
  prior_related_discipline: string;
  operational_impact: string;
  corrective_expectations: string;
  action_plan: string;
  improvement_timeline: string;
  consequences_statement: string;
  manager_internal_notes: string | null;
  response_status: string | null;
  employee_response_text: string | null;
  manager_signature: WriteUpSignature | null;
  employee_signature: WriteUpSignature | null;
  employee_refused_to_sign: boolean;
  witness_signature: WriteUpSignature | null;
  save_to_file: boolean;
  pdf_url: string | null;
  pdf_filename: string | null;
  personnel_record_id: string | null;
  created_by_id: string | null;
  finalized_at: string | null;
  finalized_by_id: string | null;
  created_at: string;
  updated_at: string;
}

function toWriteUp(r: DbRow): WriteUp {
  return {
    id: r.id,
    employeeId: r.employee_id,
    status: r.status as WriteUpStatus,
    employeeFullName: r.employee_full_name,
    employeePosition: r.employee_position,
    employeeDepartment: r.employee_department,
    supervisorId: r.supervisor_id,
    supervisorName: r.supervisor_name,
    dateIssued: r.date_issued,
    incidentDate: r.incident_date,
    incidentLocation: r.incident_location,
    correctiveActionType: r.corrective_action_type as CorrectiveActionType | null,
    issueCategory: r.issue_category as IssueCategory | null,
    factualDescription: r.factual_description,
    policyViolated: r.policy_violated,
    evidenceReviewed: r.evidence_reviewed,
    priorNoticeOfExpectation: r.prior_notice_of_expectation,
    priorRelatedDiscipline: r.prior_related_discipline,
    operationalImpact: r.operational_impact,
    correctiveExpectations: r.corrective_expectations,
    actionPlan: r.action_plan,
    improvementTimeline: r.improvement_timeline,
    consequencesStatement: r.consequences_statement,
    managerInternalNotes: r.manager_internal_notes,
    responseStatus: r.response_status as ResponseStatus | null,
    employeeResponseText: r.employee_response_text,
    managerSignature: r.manager_signature,
    employeeSignature: r.employee_signature,
    employeeRefusedToSign: Boolean(r.employee_refused_to_sign),
    witnessSignature: r.witness_signature,
    saveToFile: Boolean(r.save_to_file),
    pdfUrl: r.pdf_url,
    pdfFilename: r.pdf_filename,
    personnelRecordId: r.personnel_record_id,
    createdById: r.created_by_id,
    finalizedAt: r.finalized_at,
    finalizedById: r.finalized_by_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

let schemaEnsured = false;
async function ensureSchema() {
  if (schemaEnsured) return;
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS lounge_writeups (
      id                            TEXT PRIMARY KEY,
      employee_id                   TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
      status                        TEXT NOT NULL DEFAULT 'draft',
      employee_full_name            TEXT NOT NULL DEFAULT '',
      employee_position             TEXT,
      employee_department           TEXT,
      supervisor_id                 TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
      supervisor_name               TEXT,
      date_issued                   DATE,
      incident_date                 TIMESTAMPTZ,
      incident_location             TEXT,
      corrective_action_type        TEXT,
      issue_category                TEXT,
      factual_description           TEXT NOT NULL DEFAULT '',
      policy_violated               TEXT NOT NULL DEFAULT '',
      evidence_reviewed             TEXT NOT NULL DEFAULT '',
      prior_notice_of_expectation   TEXT NOT NULL DEFAULT '',
      prior_related_discipline      TEXT NOT NULL DEFAULT '',
      operational_impact            TEXT NOT NULL DEFAULT '',
      corrective_expectations       TEXT NOT NULL DEFAULT '',
      action_plan                   TEXT NOT NULL DEFAULT '',
      improvement_timeline          TEXT NOT NULL DEFAULT '',
      consequences_statement        TEXT NOT NULL DEFAULT '',
      manager_internal_notes        TEXT,
      response_status               TEXT,
      employee_response_text        TEXT,
      manager_signature             JSONB,
      employee_signature            JSONB,
      employee_refused_to_sign      BOOLEAN NOT NULL DEFAULT FALSE,
      witness_signature             JSONB,
      save_to_file                  BOOLEAN NOT NULL DEFAULT FALSE,
      pdf_url                       TEXT,
      pdf_filename                  TEXT,
      personnel_record_id           TEXT REFERENCES lounge_personnel_records(id) ON DELETE SET NULL,
      created_by_id                 TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
      finalized_at                  TIMESTAMPTZ,
      finalized_by_id               TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
      created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS lounge_writeups_employee_idx ON lounge_writeups (employee_id)`;
  await db`CREATE INDEX IF NOT EXISTS lounge_writeups_status_idx ON lounge_writeups (status)`;

  await db`
    CREATE TABLE IF NOT EXISTS lounge_writeup_audit (
      id          TEXT PRIMARY KEY,
      writeup_id  TEXT NOT NULL REFERENCES lounge_writeups(id) ON DELETE CASCADE,
      actor_id    TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
      actor_name  TEXT,
      action      TEXT NOT NULL,
      details     TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS lounge_writeup_audit_writeup_idx ON lounge_writeup_audit (writeup_id)`;
  schemaEnsured = true;
}

// ── Audit helper ────────────────────────────────────────────────────────

export type WriteUpAuditAction =
  | "created"
  | "edited"
  | "previewed"
  | "manager_signed"
  | "employee_signed"
  | "employee_refused_signature"
  | "witness_signed"
  | "finalized"
  | "saved_to_file"
  | "pdf_generated";

export async function logWriteUpAudit(input: {
  writeupId: string;
  actorId: string | null;
  actorName: string | null;
  action: WriteUpAuditAction;
  details?: string;
}): Promise<void> {
  await ensureSchema();
  const db = sql();
  await db`
    INSERT INTO lounge_writeup_audit (id, writeup_id, actor_id, actor_name, action, details)
    VALUES (${randomUUID()}, ${input.writeupId}, ${input.actorId}, ${input.actorName}, ${input.action}, ${input.details ?? null})
  `;
}

export interface WriteUpAuditEntry {
  id: string;
  actorId: string | null;
  actorName: string | null;
  action: string;
  details: string | null;
  createdAt: string;
}

export async function listAuditForWriteUp(writeupId: string): Promise<WriteUpAuditEntry[]> {
  await ensureSchema();
  const db = sql();
  const rows = (await db`
    SELECT id, actor_id, actor_name, action, details, created_at
    FROM lounge_writeup_audit
    WHERE writeup_id = ${writeupId}
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

// ── CRUD ────────────────────────────────────────────────────────────────

export interface CreateWriteUpInput {
  employeeId: string;
  employeeFullName: string;
  employeePosition?: string | null;
  employeeDepartment?: string | null;
  supervisorId?: string | null;
  supervisorName?: string | null;
  createdById?: string | null;
}

export async function createWriteUp(input: CreateWriteUpInput): Promise<WriteUp> {
  await ensureSchema();
  const db = sql();
  const id = randomUUID();
  await db`
    INSERT INTO lounge_writeups (
      id, employee_id, employee_full_name, employee_position, employee_department,
      supervisor_id, supervisor_name, created_by_id, consequences_statement
    ) VALUES (
      ${id}, ${input.employeeId}, ${input.employeeFullName},
      ${input.employeePosition ?? null}, ${input.employeeDepartment ?? null},
      ${input.supervisorId ?? null}, ${input.supervisorName ?? null},
      ${input.createdById ?? null},
      ${"Failure to meet these expectations, or further violations of agency policy, may result in additional corrective action, up to and including suspension or termination."}
    )
  `;
  const rows = (await db`SELECT * FROM lounge_writeups WHERE id = ${id}`) as unknown as DbRow[];
  return toWriteUp(rows[0]);
}

export type UpdateWriteUpInput = Partial<Omit<WriteUp,
  | "id" | "employeeId" | "status" | "createdAt" | "updatedAt"
  | "finalizedAt" | "finalizedById" | "createdById"
  | "personnelRecordId" | "pdfUrl" | "pdfFilename"
>>;

export async function updateWriteUpFields(id: string, input: UpdateWriteUpInput): Promise<WriteUp | null> {
  await ensureSchema();
  const db = sql();

  // Run per-field UPDATEs so neon's tagged-template can parameterize each
  // value safely. The set is small, so this stays readable.
  const s = (v: unknown): string | null => {
    if (v === null || v === undefined) return null;
    const t = String(v);
    return t === "" ? null : t;
  };

  if (input.employeeFullName !== undefined) await db`UPDATE lounge_writeups SET employee_full_name = ${input.employeeFullName}, updated_at = NOW() WHERE id = ${id}`;
  if (input.employeePosition !== undefined) await db`UPDATE lounge_writeups SET employee_position = ${s(input.employeePosition)}, updated_at = NOW() WHERE id = ${id}`;
  if (input.employeeDepartment !== undefined) await db`UPDATE lounge_writeups SET employee_department = ${s(input.employeeDepartment)}, updated_at = NOW() WHERE id = ${id}`;
  if (input.supervisorId !== undefined) await db`UPDATE lounge_writeups SET supervisor_id = ${s(input.supervisorId)}, updated_at = NOW() WHERE id = ${id}`;
  if (input.supervisorName !== undefined) await db`UPDATE lounge_writeups SET supervisor_name = ${s(input.supervisorName)}, updated_at = NOW() WHERE id = ${id}`;
  if (input.dateIssued !== undefined) await db`UPDATE lounge_writeups SET date_issued = ${s(input.dateIssued)}, updated_at = NOW() WHERE id = ${id}`;
  if (input.incidentDate !== undefined) await db`UPDATE lounge_writeups SET incident_date = ${s(input.incidentDate)}, updated_at = NOW() WHERE id = ${id}`;
  if (input.incidentLocation !== undefined) await db`UPDATE lounge_writeups SET incident_location = ${s(input.incidentLocation)}, updated_at = NOW() WHERE id = ${id}`;
  if (input.correctiveActionType !== undefined) await db`UPDATE lounge_writeups SET corrective_action_type = ${s(input.correctiveActionType)}, updated_at = NOW() WHERE id = ${id}`;
  if (input.issueCategory !== undefined) await db`UPDATE lounge_writeups SET issue_category = ${s(input.issueCategory)}, updated_at = NOW() WHERE id = ${id}`;
  if (input.factualDescription !== undefined) await db`UPDATE lounge_writeups SET factual_description = ${input.factualDescription}, updated_at = NOW() WHERE id = ${id}`;
  if (input.policyViolated !== undefined) await db`UPDATE lounge_writeups SET policy_violated = ${input.policyViolated}, updated_at = NOW() WHERE id = ${id}`;
  if (input.evidenceReviewed !== undefined) await db`UPDATE lounge_writeups SET evidence_reviewed = ${input.evidenceReviewed}, updated_at = NOW() WHERE id = ${id}`;
  if (input.priorNoticeOfExpectation !== undefined) await db`UPDATE lounge_writeups SET prior_notice_of_expectation = ${input.priorNoticeOfExpectation}, updated_at = NOW() WHERE id = ${id}`;
  if (input.priorRelatedDiscipline !== undefined) await db`UPDATE lounge_writeups SET prior_related_discipline = ${input.priorRelatedDiscipline}, updated_at = NOW() WHERE id = ${id}`;
  if (input.operationalImpact !== undefined) await db`UPDATE lounge_writeups SET operational_impact = ${input.operationalImpact}, updated_at = NOW() WHERE id = ${id}`;
  if (input.correctiveExpectations !== undefined) await db`UPDATE lounge_writeups SET corrective_expectations = ${input.correctiveExpectations}, updated_at = NOW() WHERE id = ${id}`;
  if (input.actionPlan !== undefined) await db`UPDATE lounge_writeups SET action_plan = ${input.actionPlan}, updated_at = NOW() WHERE id = ${id}`;
  if (input.improvementTimeline !== undefined) await db`UPDATE lounge_writeups SET improvement_timeline = ${input.improvementTimeline}, updated_at = NOW() WHERE id = ${id}`;
  if (input.consequencesStatement !== undefined) await db`UPDATE lounge_writeups SET consequences_statement = ${input.consequencesStatement}, updated_at = NOW() WHERE id = ${id}`;
  if (input.managerInternalNotes !== undefined) await db`UPDATE lounge_writeups SET manager_internal_notes = ${s(input.managerInternalNotes)}, updated_at = NOW() WHERE id = ${id}`;
  if (input.responseStatus !== undefined) await db`UPDATE lounge_writeups SET response_status = ${s(input.responseStatus)}, updated_at = NOW() WHERE id = ${id}`;
  if (input.employeeResponseText !== undefined) await db`UPDATE lounge_writeups SET employee_response_text = ${s(input.employeeResponseText)}, updated_at = NOW() WHERE id = ${id}`;
  if (input.managerSignature !== undefined) await db`UPDATE lounge_writeups SET manager_signature = ${input.managerSignature ? JSON.stringify(input.managerSignature) : null}::jsonb, updated_at = NOW() WHERE id = ${id}`;
  if (input.employeeSignature !== undefined) await db`UPDATE lounge_writeups SET employee_signature = ${input.employeeSignature ? JSON.stringify(input.employeeSignature) : null}::jsonb, updated_at = NOW() WHERE id = ${id}`;
  if (input.employeeRefusedToSign !== undefined) await db`UPDATE lounge_writeups SET employee_refused_to_sign = ${input.employeeRefusedToSign}, updated_at = NOW() WHERE id = ${id}`;
  if (input.witnessSignature !== undefined) await db`UPDATE lounge_writeups SET witness_signature = ${input.witnessSignature ? JSON.stringify(input.witnessSignature) : null}::jsonb, updated_at = NOW() WHERE id = ${id}`;
  if (input.saveToFile !== undefined) await db`UPDATE lounge_writeups SET save_to_file = ${input.saveToFile}, updated_at = NOW() WHERE id = ${id}`;

  return getWriteUp(id);
}

export async function getWriteUp(id: string): Promise<WriteUp | null> {
  await ensureSchema();
  const db = sql();
  const rows = (await db`SELECT * FROM lounge_writeups WHERE id = ${id} LIMIT 1`) as unknown as DbRow[];
  return rows[0] ? toWriteUp(rows[0]) : null;
}

export async function listWriteUpsForEmployee(employeeId: string): Promise<WriteUp[]> {
  await ensureSchema();
  const db = sql();
  const rows = (await db`
    SELECT * FROM lounge_writeups
    WHERE employee_id = ${employeeId}
    ORDER BY created_at DESC
  `) as unknown as DbRow[];
  return rows.map(toWriteUp);
}

export async function deleteWriteUp(id: string): Promise<void> {
  await ensureSchema();
  const db = sql();
  await db`DELETE FROM lounge_writeups WHERE id = ${id} AND status = 'draft'`;
}

export async function finalizeWriteUp(input: {
  id: string;
  pdfUrl: string;
  pdfFilename: string;
  personnelRecordId: string | null;
  finalizedById: string;
}): Promise<WriteUp | null> {
  await ensureSchema();
  const db = sql();
  await db`
    UPDATE lounge_writeups SET
      status              = 'finalized',
      pdf_url             = ${input.pdfUrl},
      pdf_filename        = ${input.pdfFilename},
      personnel_record_id = ${input.personnelRecordId},
      finalized_at        = NOW(),
      finalized_by_id     = ${input.finalizedById},
      updated_at          = NOW()
    WHERE id = ${input.id}
  `;
  return getWriteUp(input.id);
}

/** What every step of the wizard needs validated before finalization. */
export function missingRequiredFields(w: WriteUp): string[] {
  const missing: string[] = [];
  if (!w.employeeFullName?.trim()) missing.push("Employee name");
  if (!w.supervisorName?.trim()) missing.push("Manager name");
  if (!w.dateIssued) missing.push("Date issued");
  if (!w.incidentDate) missing.push("Incident date / time");
  if (!w.correctiveActionType) missing.push("Corrective action type");
  if (!w.issueCategory) missing.push("Category of issue");
  if (!w.factualDescription?.trim()) missing.push("Factual description");
  if (!w.policyViolated?.trim()) missing.push("Policy / expectation violated");
  if (!w.correctiveExpectations?.trim()) missing.push("Corrective expectations");
  if (!w.improvementTimeline?.trim()) missing.push("Timeline for improvement");
  if (!w.consequencesStatement?.trim()) missing.push("Consequence statement");
  if (!w.managerSignature) missing.push("Manager signature");
  const employeeSatisfied = !!w.employeeSignature || w.employeeRefusedToSign;
  if (!employeeSatisfied) missing.push("Employee signature or refusal");
  return missing;
}
