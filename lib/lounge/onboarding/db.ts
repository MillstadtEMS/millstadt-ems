/**
 * Persistence layer for the EMS onboarding checklist.
 *
 * Tables (all created lazily via ensureSchemaAndSeed):
 *   lounge_onboarding_sections   — admin-editable section list
 *   lounge_onboarding_items      — admin-editable items per section
 *   lounge_onboarding_records    — per-employee onboarding instance
 *   lounge_onboarding_progress   — per-item status / notes / file / expiry
 *   lounge_onboarding_signatures — three signature panels (employee /
 *                                  preceptor / witness)
 *   lounge_onboarding_audit      — every meaningful action on a record
 *
 * The seed lives in seed.ts and runs once on first invocation. Subsequent
 * runs detect the existing sections marker and skip seeding so admin
 * edits aren't clobbered.
 */
import { randomUUID } from "crypto";
import { sql } from "../db";
import { SEED_SECTIONS } from "./seed";
import type {
  CredentialLevel,
  EmploymentType,
  FinalOutcome,
  ItemRow,
  ItemStatus,
  OnboardingRecord,
  ProgressRow,
  RecordStatus,
  SectionRow,
  SignatureRow,
  SignerWho,
} from "./types";

// ── coercion helpers (Neon returns DATE/TIMESTAMPTZ as Date) ────────────

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

let schemaReady = false;

async function ensureSchemaAndSeed() {
  if (schemaReady) return;
  const db = sql();

  await db`
    CREATE TABLE IF NOT EXISTS lounge_onboarding_sections (
      id            TEXT PRIMARY KEY,
      title         TEXT NOT NULL,
      display_order INTEGER NOT NULL,
      active        BOOLEAN NOT NULL DEFAULT TRUE,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS lounge_onboarding_items (
      id                   TEXT PRIMARY KEY,
      section_id           TEXT NOT NULL REFERENCES lounge_onboarding_sections(id) ON DELETE CASCADE,
      label                TEXT NOT NULL,
      required             BOOLEAN NOT NULL DEFAULT FALSE,
      has_upload           BOOLEAN NOT NULL DEFAULT FALSE,
      has_expiration       BOOLEAN NOT NULL DEFAULT FALSE,
      has_notes            BOOLEAN NOT NULL DEFAULT TRUE,
      has_verification     BOOLEAN NOT NULL DEFAULT FALSE,
      share_save_to_file   BOOLEAN NOT NULL DEFAULT FALSE,
      share_email_employee BOOLEAN NOT NULL DEFAULT FALSE,
      share_email_admin    BOOLEAN NOT NULL DEFAULT FALSE,
      display_order        INTEGER NOT NULL,
      active               BOOLEAN NOT NULL DEFAULT TRUE,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS lounge_onboarding_items_section_idx ON lounge_onboarding_items (section_id, display_order)`;

  await db`
    CREATE TABLE IF NOT EXISTS lounge_onboarding_records (
      id                  TEXT PRIMARY KEY,
      employee_id         TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
      position            TEXT,
      start_date          DATE,
      employment_type     TEXT,
      credential_level    TEXT,
      assigned_unit       TEXT,
      preceptor_id        TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
      witness_id          TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
      status              TEXT NOT NULL DEFAULT 'in_progress',
      final_outcome       TEXT,
      final_notes         TEXT,
      pdf_url             TEXT,
      pdf_filename        TEXT,
      personnel_record_id TEXT REFERENCES lounge_personnel_records(id) ON DELETE SET NULL,
      finalized_at        TIMESTAMPTZ,
      finalized_by_id     TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
      rescinded_at        TIMESTAMPTZ,
      rescinded_by_id     TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
      rescinded_reason    TEXT,
      created_by_id       TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS lounge_onboarding_records_employee_idx ON lounge_onboarding_records (employee_id)`;

  await db`
    CREATE TABLE IF NOT EXISTS lounge_onboarding_progress (
      id                TEXT PRIMARY KEY,
      record_id         TEXT NOT NULL REFERENCES lounge_onboarding_records(id) ON DELETE CASCADE,
      item_id           TEXT NOT NULL REFERENCES lounge_onboarding_items(id) ON DELETE CASCADE,
      status            TEXT NOT NULL DEFAULT 'pending',
      notes             TEXT,
      file_url          TEXT,
      file_name         TEXT,
      expiration_date   DATE,
      completed_by_id   TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
      completed_by_name TEXT,
      completed_at      TIMESTAMPTZ,
      UNIQUE(record_id, item_id)
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS lounge_onboarding_signatures (
      id                 TEXT PRIMARY KEY,
      record_id          TEXT NOT NULL REFERENCES lounge_onboarding_records(id) ON DELETE CASCADE,
      who                TEXT NOT NULL,
      printed_name       TEXT NOT NULL,
      signature_data_url TEXT NOT NULL,
      signed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(record_id, who)
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS lounge_onboarding_audit (
      id         TEXT PRIMARY KEY,
      record_id  TEXT NOT NULL REFERENCES lounge_onboarding_records(id) ON DELETE CASCADE,
      actor_id   TEXT,
      actor_name TEXT,
      action     TEXT NOT NULL,
      details    TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Seed once if there are no sections.
  const sectionsExist = (await db`SELECT COUNT(*)::int AS n FROM lounge_onboarding_sections`) as unknown as { n: number }[];
  if ((sectionsExist[0]?.n ?? 0) === 0) {
    for (let sIdx = 0; sIdx < SEED_SECTIONS.length; sIdx++) {
      const sec = SEED_SECTIONS[sIdx];
      const sectionId = randomUUID();
      await db`
        INSERT INTO lounge_onboarding_sections (id, title, display_order, active)
        VALUES (${sectionId}, ${sec.title}, ${sIdx}, TRUE)
      `;
      for (let iIdx = 0; iIdx < sec.items.length; iIdx++) {
        const item = sec.items[iIdx];
        await db`
          INSERT INTO lounge_onboarding_items (
            id, section_id, label, required,
            has_upload, has_expiration, has_notes, has_verification,
            share_save_to_file, share_email_employee, share_email_admin,
            display_order, active
          ) VALUES (
            ${randomUUID()}, ${sectionId}, ${item.label}, ${item.required ?? false},
            ${item.hasUpload ?? false}, ${item.hasExpiration ?? false}, ${true}, ${item.hasVerification ?? false},
            ${item.shareSaveToFile ?? false}, ${item.shareEmailEmployee ?? false}, ${item.shareEmailAdmin ?? false},
            ${iIdx}, TRUE
          )
        `;
      }
    }
  }

  schemaReady = true;
}

// ── Audit ──────────────────────────────────────────────────────────────

export async function logOnboardingAudit(input: {
  recordId: string;
  actorId: string | null;
  actorName: string | null;
  action: string;
  details?: string;
}): Promise<void> {
  await ensureSchemaAndSeed();
  const db = sql();
  await db`
    INSERT INTO lounge_onboarding_audit (id, record_id, actor_id, actor_name, action, details)
    VALUES (${randomUUID()}, ${input.recordId}, ${input.actorId}, ${input.actorName}, ${input.action}, ${input.details ?? null})
  `;
}

export interface AuditEntry {
  id: string;
  actorId: string | null;
  actorName: string | null;
  action: string;
  details: string | null;
  createdAt: string;
}

export async function listAudit(recordId: string): Promise<AuditEntry[]> {
  await ensureSchemaAndSeed();
  const db = sql();
  const rows = (await db`
    SELECT id, actor_id, actor_name, action, details, created_at
    FROM lounge_onboarding_audit
    WHERE record_id = ${recordId}
    ORDER BY created_at DESC
  `) as unknown as { id: string; actor_id: string | null; actor_name: string | null; action: string; details: string | null; created_at: unknown }[];
  return rows.map((r) => ({
    id: r.id,
    actorId: r.actor_id,
    actorName: r.actor_name,
    action: r.action,
    details: r.details,
    createdAt: dateTime(r.created_at) ?? "",
  }));
}

// ── Template (sections / items) ────────────────────────────────────────

interface SectionDbRow {
  id: string;
  title: string;
  display_order: number;
  active: boolean;
}

interface ItemDbRow {
  id: string;
  section_id: string;
  label: string;
  required: boolean;
  has_upload: boolean;
  has_expiration: boolean;
  has_notes: boolean;
  has_verification: boolean;
  share_save_to_file: boolean;
  share_email_employee: boolean;
  share_email_admin: boolean;
  display_order: number;
  active: boolean;
}

function toSection(r: SectionDbRow): SectionRow {
  return { id: r.id, title: r.title, displayOrder: r.display_order, active: r.active };
}
function toItem(r: ItemDbRow): ItemRow {
  return {
    id: r.id, sectionId: r.section_id, label: r.label,
    required: r.required, hasUpload: r.has_upload, hasExpiration: r.has_expiration,
    hasNotes: r.has_notes, hasVerification: r.has_verification,
    shareSaveToFile: r.share_save_to_file, shareEmailEmployee: r.share_email_employee, shareEmailAdmin: r.share_email_admin,
    displayOrder: r.display_order, active: r.active,
  };
}

export async function listTemplate(): Promise<{ sections: SectionRow[]; items: ItemRow[] }> {
  await ensureSchemaAndSeed();
  const db = sql();
  const secs = (await db`
    SELECT id, title, display_order, active
    FROM lounge_onboarding_sections
    ORDER BY display_order ASC, title ASC
  `) as unknown as SectionDbRow[];
  const its = (await db`
    SELECT id, section_id, label, required, has_upload, has_expiration, has_notes, has_verification,
           share_save_to_file, share_email_employee, share_email_admin, display_order, active
    FROM lounge_onboarding_items
    ORDER BY section_id, display_order ASC
  `) as unknown as ItemDbRow[];
  return { sections: secs.map(toSection), items: its.map(toItem) };
}

export interface SectionInput {
  title: string;
  displayOrder?: number;
  active?: boolean;
}
export async function createSection(input: SectionInput): Promise<SectionRow> {
  await ensureSchemaAndSeed();
  const db = sql();
  const id = randomUUID();
  const order = input.displayOrder ?? (((await db`SELECT COALESCE(MAX(display_order)+1,0) AS n FROM lounge_onboarding_sections`) as unknown as { n: number }[])[0]?.n ?? 0);
  await db`
    INSERT INTO lounge_onboarding_sections (id, title, display_order, active)
    VALUES (${id}, ${input.title}, ${order}, ${input.active ?? true})
  `;
  const rows = (await db`SELECT id, title, display_order, active FROM lounge_onboarding_sections WHERE id = ${id}`) as unknown as SectionDbRow[];
  return toSection(rows[0]);
}

export async function updateSection(id: string, input: Partial<SectionInput>): Promise<void> {
  await ensureSchemaAndSeed();
  const db = sql();
  if (input.title !== undefined)        await db`UPDATE lounge_onboarding_sections SET title = ${input.title}, updated_at = NOW() WHERE id = ${id}`;
  if (input.displayOrder !== undefined) await db`UPDATE lounge_onboarding_sections SET display_order = ${input.displayOrder}, updated_at = NOW() WHERE id = ${id}`;
  if (input.active !== undefined)       await db`UPDATE lounge_onboarding_sections SET active = ${input.active}, updated_at = NOW() WHERE id = ${id}`;
}

export async function deleteSection(id: string): Promise<void> {
  await ensureSchemaAndSeed();
  const db = sql();
  await db`DELETE FROM lounge_onboarding_sections WHERE id = ${id}`;
}

export interface ItemInput {
  sectionId: string;
  label: string;
  required?: boolean;
  hasUpload?: boolean;
  hasExpiration?: boolean;
  hasNotes?: boolean;
  hasVerification?: boolean;
  shareSaveToFile?: boolean;
  shareEmailEmployee?: boolean;
  shareEmailAdmin?: boolean;
  displayOrder?: number;
  active?: boolean;
}

export async function createItem(input: ItemInput): Promise<ItemRow> {
  await ensureSchemaAndSeed();
  const db = sql();
  const id = randomUUID();
  const order = input.displayOrder ?? (((await db`SELECT COALESCE(MAX(display_order)+1,0) AS n FROM lounge_onboarding_items WHERE section_id = ${input.sectionId}`) as unknown as { n: number }[])[0]?.n ?? 0);
  await db`
    INSERT INTO lounge_onboarding_items (
      id, section_id, label, required,
      has_upload, has_expiration, has_notes, has_verification,
      share_save_to_file, share_email_employee, share_email_admin,
      display_order, active
    ) VALUES (
      ${id}, ${input.sectionId}, ${input.label}, ${input.required ?? false},
      ${input.hasUpload ?? false}, ${input.hasExpiration ?? false}, ${input.hasNotes ?? true}, ${input.hasVerification ?? false},
      ${input.shareSaveToFile ?? false}, ${input.shareEmailEmployee ?? false}, ${input.shareEmailAdmin ?? false},
      ${order}, ${input.active ?? true}
    )
  `;
  const rows = (await db`
    SELECT id, section_id, label, required, has_upload, has_expiration, has_notes, has_verification,
           share_save_to_file, share_email_employee, share_email_admin, display_order, active
    FROM lounge_onboarding_items WHERE id = ${id}
  `) as unknown as ItemDbRow[];
  return toItem(rows[0]);
}

export async function updateItem(id: string, input: Partial<ItemInput>): Promise<void> {
  await ensureSchemaAndSeed();
  const db = sql();
  if (input.label !== undefined)              await db`UPDATE lounge_onboarding_items SET label = ${input.label}, updated_at = NOW() WHERE id = ${id}`;
  if (input.required !== undefined)           await db`UPDATE lounge_onboarding_items SET required = ${input.required}, updated_at = NOW() WHERE id = ${id}`;
  if (input.hasUpload !== undefined)          await db`UPDATE lounge_onboarding_items SET has_upload = ${input.hasUpload}, updated_at = NOW() WHERE id = ${id}`;
  if (input.hasExpiration !== undefined)      await db`UPDATE lounge_onboarding_items SET has_expiration = ${input.hasExpiration}, updated_at = NOW() WHERE id = ${id}`;
  if (input.hasNotes !== undefined)           await db`UPDATE lounge_onboarding_items SET has_notes = ${input.hasNotes}, updated_at = NOW() WHERE id = ${id}`;
  if (input.hasVerification !== undefined)    await db`UPDATE lounge_onboarding_items SET has_verification = ${input.hasVerification}, updated_at = NOW() WHERE id = ${id}`;
  if (input.shareSaveToFile !== undefined)    await db`UPDATE lounge_onboarding_items SET share_save_to_file = ${input.shareSaveToFile}, updated_at = NOW() WHERE id = ${id}`;
  if (input.shareEmailEmployee !== undefined) await db`UPDATE lounge_onboarding_items SET share_email_employee = ${input.shareEmailEmployee}, updated_at = NOW() WHERE id = ${id}`;
  if (input.shareEmailAdmin !== undefined)    await db`UPDATE lounge_onboarding_items SET share_email_admin = ${input.shareEmailAdmin}, updated_at = NOW() WHERE id = ${id}`;
  if (input.displayOrder !== undefined)       await db`UPDATE lounge_onboarding_items SET display_order = ${input.displayOrder}, updated_at = NOW() WHERE id = ${id}`;
  if (input.active !== undefined)             await db`UPDATE lounge_onboarding_items SET active = ${input.active}, updated_at = NOW() WHERE id = ${id}`;
  if (input.sectionId !== undefined)          await db`UPDATE lounge_onboarding_items SET section_id = ${input.sectionId}, updated_at = NOW() WHERE id = ${id}`;
}

export async function deleteItem(id: string): Promise<void> {
  await ensureSchemaAndSeed();
  const db = sql();
  await db`DELETE FROM lounge_onboarding_items WHERE id = ${id}`;
}

// ── Records ────────────────────────────────────────────────────────────

interface RecordDbRow {
  id: string;
  employee_id: string;
  position: string | null;
  start_date: unknown;
  employment_type: string | null;
  credential_level: string | null;
  assigned_unit: string | null;
  preceptor_id: string | null;
  witness_id: string | null;
  status: string;
  final_outcome: string | null;
  final_notes: string | null;
  pdf_url: string | null;
  pdf_filename: string | null;
  personnel_record_id: string | null;
  finalized_at: unknown;
  finalized_by_id: string | null;
  rescinded_at: unknown;
  rescinded_by_id: string | null;
  rescinded_reason: string | null;
  created_by_id: string | null;
  created_at: unknown;
  updated_at: unknown;
  employee_first_name?: string;
  employee_last_name?: string;
  preceptor_first_name?: string | null;
  preceptor_last_name?: string | null;
  witness_first_name?: string | null;
  witness_last_name?: string | null;
}

function toRecord(r: RecordDbRow): OnboardingRecord {
  const empName = `${r.employee_first_name ?? ""} ${r.employee_last_name ?? ""}`.trim() || r.employee_id;
  const preName = r.preceptor_first_name ? `${r.preceptor_first_name} ${r.preceptor_last_name ?? ""}`.trim() : null;
  const witName = r.witness_first_name ? `${r.witness_first_name} ${r.witness_last_name ?? ""}`.trim() : null;
  return {
    id: r.id,
    employeeId: r.employee_id,
    employeeName: empName,
    position: r.position,
    startDate: dateOnly(r.start_date),
    employmentType: (r.employment_type ?? null) as EmploymentType | null,
    credentialLevel: (r.credential_level ?? null) as CredentialLevel | null,
    assignedUnit: r.assigned_unit,
    preceptorId: r.preceptor_id,
    preceptorName: preName,
    witnessId: r.witness_id,
    witnessName: witName,
    status: r.status as RecordStatus,
    finalOutcome: (r.final_outcome ?? null) as FinalOutcome | null,
    finalNotes: r.final_notes,
    pdfUrl: r.pdf_url,
    pdfFilename: r.pdf_filename,
    personnelRecordId: r.personnel_record_id,
    finalizedAt: dateTime(r.finalized_at),
    finalizedById: r.finalized_by_id,
    rescindedAt: dateTime(r.rescinded_at),
    rescindedById: r.rescinded_by_id,
    rescindedReason: r.rescinded_reason,
    createdById: r.created_by_id,
    createdAt: dateTime(r.created_at) ?? "",
    updatedAt: dateTime(r.updated_at) ?? "",
  };
}

export async function listRecords(): Promise<OnboardingRecord[]> {
  await ensureSchemaAndSeed();
  const db = sql();
  const rows = (await db`
    SELECT
      r.*,
      e.first_name AS employee_first_name, e.last_name AS employee_last_name,
      p.first_name AS preceptor_first_name, p.last_name AS preceptor_last_name,
      w.first_name AS witness_first_name,   w.last_name AS witness_last_name
    FROM lounge_onboarding_records r
    JOIN lounge_employees e ON e.id = r.employee_id
    LEFT JOIN lounge_employees p ON p.id = r.preceptor_id
    LEFT JOIN lounge_employees w ON w.id = r.witness_id
    ORDER BY r.created_at DESC
  `) as unknown as RecordDbRow[];
  return rows.map(toRecord);
}

export async function getRecord(id: string): Promise<OnboardingRecord | null> {
  await ensureSchemaAndSeed();
  const db = sql();
  const rows = (await db`
    SELECT
      r.*,
      e.first_name AS employee_first_name, e.last_name AS employee_last_name,
      p.first_name AS preceptor_first_name, p.last_name AS preceptor_last_name,
      w.first_name AS witness_first_name,   w.last_name AS witness_last_name
    FROM lounge_onboarding_records r
    JOIN lounge_employees e ON e.id = r.employee_id
    LEFT JOIN lounge_employees p ON p.id = r.preceptor_id
    LEFT JOIN lounge_employees w ON w.id = r.witness_id
    WHERE r.id = ${id}
    LIMIT 1
  `) as unknown as RecordDbRow[];
  return rows[0] ? toRecord(rows[0]) : null;
}

export interface CreateRecordInput {
  employeeId: string;
  position?: string | null;
  startDate?: string | null;
  employmentType?: EmploymentType | null;
  credentialLevel?: CredentialLevel | null;
  assignedUnit?: string | null;
  preceptorId?: string | null;
  witnessId?: string | null;
  createdById: string;
}

export async function createRecord(input: CreateRecordInput): Promise<OnboardingRecord> {
  await ensureSchemaAndSeed();
  const db = sql();
  const id = randomUUID();
  await db`
    INSERT INTO lounge_onboarding_records (
      id, employee_id, position, start_date, employment_type, credential_level,
      assigned_unit, preceptor_id, witness_id, status, created_by_id
    ) VALUES (
      ${id}, ${input.employeeId}, ${input.position ?? null}, ${input.startDate ?? null},
      ${input.employmentType ?? null}, ${input.credentialLevel ?? null},
      ${input.assignedUnit ?? null}, ${input.preceptorId ?? null}, ${input.witnessId ?? null},
      'in_progress', ${input.createdById}
    )
  `;
  // Pre-create progress rows so the UI can render the full checklist
  // immediately and updates target a known row.
  await db`
    INSERT INTO lounge_onboarding_progress (id, record_id, item_id, status)
    SELECT gen_random_uuid()::text, ${id}, i.id, 'pending'
    FROM lounge_onboarding_items i
    WHERE i.active = TRUE
  `;
  return (await getRecord(id))!;
}

export interface UpdateRecordInput {
  position?: string | null;
  startDate?: string | null;
  employmentType?: EmploymentType | null;
  credentialLevel?: CredentialLevel | null;
  assignedUnit?: string | null;
  preceptorId?: string | null;
  witnessId?: string | null;
  finalOutcome?: FinalOutcome | null;
  finalNotes?: string | null;
}

export async function updateRecord(id: string, input: UpdateRecordInput): Promise<void> {
  await ensureSchemaAndSeed();
  const db = sql();
  if (input.position !== undefined)         await db`UPDATE lounge_onboarding_records SET position = ${input.position}, updated_at = NOW() WHERE id = ${id}`;
  if (input.startDate !== undefined)        await db`UPDATE lounge_onboarding_records SET start_date = ${input.startDate}, updated_at = NOW() WHERE id = ${id}`;
  if (input.employmentType !== undefined)   await db`UPDATE lounge_onboarding_records SET employment_type = ${input.employmentType}, updated_at = NOW() WHERE id = ${id}`;
  if (input.credentialLevel !== undefined)  await db`UPDATE lounge_onboarding_records SET credential_level = ${input.credentialLevel}, updated_at = NOW() WHERE id = ${id}`;
  if (input.assignedUnit !== undefined)     await db`UPDATE lounge_onboarding_records SET assigned_unit = ${input.assignedUnit}, updated_at = NOW() WHERE id = ${id}`;
  if (input.preceptorId !== undefined)      await db`UPDATE lounge_onboarding_records SET preceptor_id = ${input.preceptorId}, updated_at = NOW() WHERE id = ${id}`;
  if (input.witnessId !== undefined)        await db`UPDATE lounge_onboarding_records SET witness_id = ${input.witnessId}, updated_at = NOW() WHERE id = ${id}`;
  if (input.finalOutcome !== undefined)     await db`UPDATE lounge_onboarding_records SET final_outcome = ${input.finalOutcome}, updated_at = NOW() WHERE id = ${id}`;
  if (input.finalNotes !== undefined)       await db`UPDATE lounge_onboarding_records SET final_notes = ${input.finalNotes}, updated_at = NOW() WHERE id = ${id}`;
}

export async function deleteRecord(id: string): Promise<void> {
  await ensureSchemaAndSeed();
  const db = sql();
  await db`DELETE FROM lounge_onboarding_records WHERE id = ${id}`;
}

export async function setFinalizedState(input: {
  id: string;
  pdfUrl: string;
  pdfFilename: string;
  personnelRecordId: string | null;
  finalizedById: string;
}): Promise<void> {
  await ensureSchemaAndSeed();
  const db = sql();
  await db`
    UPDATE lounge_onboarding_records
    SET status = 'finalized',
        pdf_url = ${input.pdfUrl},
        pdf_filename = ${input.pdfFilename},
        personnel_record_id = ${input.personnelRecordId},
        finalized_at = NOW(),
        finalized_by_id = ${input.finalizedById},
        updated_at = NOW()
    WHERE id = ${input.id}
  `;
}

export async function rescindRecord(input: {
  id: string;
  byId: string;
  reason: string;
}): Promise<void> {
  await ensureSchemaAndSeed();
  const db = sql();
  await db`
    UPDATE lounge_onboarding_records
    SET status = 'rescinded',
        rescinded_at = NOW(),
        rescinded_by_id = ${input.byId},
        rescinded_reason = ${input.reason},
        updated_at = NOW()
    WHERE id = ${input.id} AND status = 'finalized'
  `;
}

// ── Progress (per-item) ────────────────────────────────────────────────

interface ProgressDbRow {
  id: string;
  record_id: string;
  item_id: string;
  status: string;
  notes: string | null;
  file_url: string | null;
  file_name: string | null;
  expiration_date: unknown;
  completed_by_id: string | null;
  completed_by_name: string | null;
  completed_at: unknown;
}

function toProgress(r: ProgressDbRow): ProgressRow {
  return {
    id: r.id,
    recordId: r.record_id,
    itemId: r.item_id,
    status: r.status as ItemStatus,
    notes: r.notes,
    fileUrl: r.file_url,
    fileName: r.file_name,
    expirationDate: dateOnly(r.expiration_date),
    completedById: r.completed_by_id,
    completedByName: r.completed_by_name,
    completedAt: dateTime(r.completed_at),
  };
}

export async function listProgress(recordId: string): Promise<ProgressRow[]> {
  await ensureSchemaAndSeed();
  const db = sql();
  const rows = (await db`
    SELECT id, record_id, item_id, status, notes, file_url, file_name, expiration_date,
           completed_by_id, completed_by_name, completed_at
    FROM lounge_onboarding_progress
    WHERE record_id = ${recordId}
  `) as unknown as ProgressDbRow[];
  return rows.map(toProgress);
}

export interface ProgressInput {
  status?: ItemStatus;
  notes?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  expirationDate?: string | null;
}

export async function setProgress(input: {
  recordId: string;
  itemId: string;
  patch: ProgressInput;
  actorId: string | null;
  actorName: string | null;
}): Promise<ProgressRow | null> {
  await ensureSchemaAndSeed();
  const db = sql();
  // Upsert: progress row pre-exists (createRecord seeds them), but be
  // defensive in case an item was added after the record was created.
  const existing = (await db`
    SELECT id FROM lounge_onboarding_progress
    WHERE record_id = ${input.recordId} AND item_id = ${input.itemId} LIMIT 1
  `) as unknown as { id: string }[];
  if (existing.length === 0) {
    await db`
      INSERT INTO lounge_onboarding_progress (id, record_id, item_id, status)
      VALUES (${randomUUID()}, ${input.recordId}, ${input.itemId}, 'pending')
    `;
  }
  const p = input.patch;
  if (p.status !== undefined) {
    await db`UPDATE lounge_onboarding_progress SET status = ${p.status} WHERE record_id = ${input.recordId} AND item_id = ${input.itemId}`;
    if (p.status === "completed" || p.status === "completed_with_followup") {
      await db`
        UPDATE lounge_onboarding_progress
        SET completed_by_id = ${input.actorId}, completed_by_name = ${input.actorName}, completed_at = NOW()
        WHERE record_id = ${input.recordId} AND item_id = ${input.itemId}
      `;
    } else if (p.status === "pending" || p.status === "not_applicable" || p.status === "not_met") {
      await db`
        UPDATE lounge_onboarding_progress
        SET completed_by_id = NULL, completed_by_name = NULL, completed_at = NULL
        WHERE record_id = ${input.recordId} AND item_id = ${input.itemId}
      `;
    }
  }
  if (p.notes !== undefined)          await db`UPDATE lounge_onboarding_progress SET notes = ${p.notes} WHERE record_id = ${input.recordId} AND item_id = ${input.itemId}`;
  if (p.fileUrl !== undefined)        await db`UPDATE lounge_onboarding_progress SET file_url = ${p.fileUrl} WHERE record_id = ${input.recordId} AND item_id = ${input.itemId}`;
  if (p.fileName !== undefined)       await db`UPDATE lounge_onboarding_progress SET file_name = ${p.fileName} WHERE record_id = ${input.recordId} AND item_id = ${input.itemId}`;
  if (p.expirationDate !== undefined) await db`UPDATE lounge_onboarding_progress SET expiration_date = ${p.expirationDate} WHERE record_id = ${input.recordId} AND item_id = ${input.itemId}`;

  const rows = (await db`
    SELECT id, record_id, item_id, status, notes, file_url, file_name, expiration_date,
           completed_by_id, completed_by_name, completed_at
    FROM lounge_onboarding_progress
    WHERE record_id = ${input.recordId} AND item_id = ${input.itemId} LIMIT 1
  `) as unknown as ProgressDbRow[];
  return rows[0] ? toProgress(rows[0]) : null;
}

// ── Signatures ─────────────────────────────────────────────────────────

interface SigDbRow {
  id: string;
  record_id: string;
  who: string;
  printed_name: string;
  signature_data_url: string;
  signed_at: unknown;
}
function toSig(r: SigDbRow): SignatureRow {
  return {
    id: r.id, recordId: r.record_id,
    who: r.who as SignerWho, printedName: r.printed_name,
    signatureDataUrl: r.signature_data_url, signedAt: dateTime(r.signed_at) ?? "",
  };
}

export async function listSignatures(recordId: string): Promise<SignatureRow[]> {
  await ensureSchemaAndSeed();
  const db = sql();
  const rows = (await db`
    SELECT id, record_id, who, printed_name, signature_data_url, signed_at
    FROM lounge_onboarding_signatures
    WHERE record_id = ${recordId}
  `) as unknown as SigDbRow[];
  return rows.map(toSig);
}

export async function upsertSignature(input: {
  recordId: string;
  who: SignerWho;
  printedName: string;
  signatureDataUrl: string;
}): Promise<SignatureRow> {
  await ensureSchemaAndSeed();
  const db = sql();
  await db`
    INSERT INTO lounge_onboarding_signatures (id, record_id, who, printed_name, signature_data_url)
    VALUES (${randomUUID()}, ${input.recordId}, ${input.who}, ${input.printedName}, ${input.signatureDataUrl})
    ON CONFLICT (record_id, who) DO UPDATE SET
      printed_name = EXCLUDED.printed_name,
      signature_data_url = EXCLUDED.signature_data_url,
      signed_at = NOW()
  `;
  const rows = (await db`
    SELECT id, record_id, who, printed_name, signature_data_url, signed_at
    FROM lounge_onboarding_signatures
    WHERE record_id = ${input.recordId} AND who = ${input.who} LIMIT 1
  `) as unknown as SigDbRow[];
  return toSig(rows[0]);
}

export async function deleteSignature(recordId: string, who: SignerWho): Promise<void> {
  await ensureSchemaAndSeed();
  const db = sql();
  await db`DELETE FROM lounge_onboarding_signatures WHERE record_id = ${recordId} AND who = ${who}`;
}
