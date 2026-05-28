/**
 * Employee CRUD + file helpers for the admin side of /lounge.
 *
 * All write paths assume the caller has already gated on requireAdmin().
 * Read paths return safe-for-admin objects — SSN is returned as
 * `ssnLast4` (never plaintext). Use `getEmployeeSsnDecrypted()` to get
 * the full SSN in a dedicated endpoint with its own admin re-check.
 */
import { randomUUID } from "crypto";
import { sql } from "./db";
import { hashPassword } from "./auth";
import { encrypt, decrypt, ssnLast4 } from "./encryption";

// ── Public types ────────────────────────────────────────────────────────

export interface AdminEmployeeRow {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  certification: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  dob: string | null;
  ssnLast4: string | null;
  photoUrl: string | null;
  hireDate: string | null;
  notes: string | null;
  isAdmin: boolean;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeFile {
  id: string;
  employeeId: string;
  fileType: "cert" | "license" | "writeup" | "other";
  title: string;
  fileUrl: string;
  fileMime: string | null;
  notes: string | null;
  expiresOn: string | null;
  uploadedBy: string | null;
  uploadedAt: string;
}

// ── DB row → admin object ───────────────────────────────────────────────

interface DbEmployeeRow {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  certification: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  dob: string | null;
  ssn_encrypted: string | null;
  photo_url: string | null;
  hire_date: string | null;
  notes: string | null;
  is_admin: boolean;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
}

function toAdminEmployee(row: DbEmployeeRow): AdminEmployeeRow {
  let last4: string | null = null;
  if (row.ssn_encrypted) {
    try {
      last4 = ssnLast4(decrypt(row.ssn_encrypted));
    } catch {
      last4 = null;
    }
  }
  return {
    id: row.id,
    username: row.username,
    firstName: row.first_name,
    lastName: row.last_name,
    certification: row.certification,
    position: row.position,
    email: row.email,
    phone: row.phone,
    dob: row.dob,
    ssnLast4: last4,
    photoUrl: row.photo_url,
    hireDate: row.hire_date,
    notes: row.notes,
    isAdmin: row.is_admin,
    isActive: row.is_active,
    mustChangePassword: row.must_change_password,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── List + read ─────────────────────────────────────────────────────────

export async function listEmployees(opts?: {
  includeInactive?: boolean;
}): Promise<AdminEmployeeRow[]> {
  const db = sql();
  const rows = opts?.includeInactive
    ? ((await db`
        SELECT id, username, first_name, last_name, certification, position,
               email, phone, dob, ssn_encrypted, photo_url, hire_date, notes,
               is_admin, is_active, must_change_password, created_at, updated_at
        FROM lounge_employees
        ORDER BY last_name ASC, first_name ASC
      `) as unknown as DbEmployeeRow[])
    : ((await db`
        SELECT id, username, first_name, last_name, certification, position,
               email, phone, dob, ssn_encrypted, photo_url, hire_date, notes,
               is_admin, is_active, must_change_password, created_at, updated_at
        FROM lounge_employees
        WHERE is_active = TRUE
        ORDER BY last_name ASC, first_name ASC
      `) as unknown as DbEmployeeRow[]);
  return rows.map(toAdminEmployee);
}

export async function getEmployee(id: string): Promise<AdminEmployeeRow | null> {
  const db = sql();
  const rows = (await db`
    SELECT id, username, first_name, last_name, certification, position,
           email, phone, dob, ssn_encrypted, photo_url, hire_date, notes,
           is_admin, is_active, must_change_password, created_at, updated_at
    FROM lounge_employees
    WHERE id = ${id}
    LIMIT 1
  `) as unknown as DbEmployeeRow[];
  return rows[0] ? toAdminEmployee(rows[0]) : null;
}

/** Admin-only — returns decrypted SSN. Caller must re-gate. */
export async function getEmployeeSsnDecrypted(id: string): Promise<string | null> {
  const db = sql();
  const rows = (await db`
    SELECT ssn_encrypted FROM lounge_employees WHERE id = ${id} LIMIT 1
  `) as unknown as { ssn_encrypted: string | null }[];
  const enc = rows[0]?.ssn_encrypted;
  if (!enc) return null;
  return decrypt(enc);
}

// ── Create + update ─────────────────────────────────────────────────────

export interface CreateEmployeeInput {
  firstName: string;
  lastName: string;
  certification?: string;
  position?: string;
  email?: string;
  phone?: string;
  dob?: string;
  ssn?: string;
  hireDate?: string;
  notes?: string;
  isAdmin?: boolean;
  initialPassword?: string;  // defaults to firstinitial+lastname+3935
}

export function defaultUsername(firstName: string, lastName: string): string {
  return (firstName.trim()[0] + lastName.trim()).toLowerCase().replace(/[^a-z]/g, "");
}

export function defaultInitialPassword(firstName: string, lastName: string): string {
  return `${defaultUsername(firstName, lastName)}3935`;
}

export async function createEmployee(
  input: CreateEmployeeInput,
): Promise<AdminEmployeeRow> {
  const id = randomUUID();
  const username = defaultUsername(input.firstName, input.lastName);
  const pw = input.initialPassword || defaultInitialPassword(input.firstName, input.lastName);
  const passwordHash = hashPassword(pw);
  const ssnEnc = input.ssn ? encrypt(input.ssn) : null;

  const db = sql();
  await db`
    INSERT INTO lounge_employees
      (id, username, first_name, last_name, certification, position,
       email, phone, dob, ssn_encrypted, hire_date, notes,
       password_hash, must_change_password, is_admin, is_active)
    VALUES
      (${id}, ${username}, ${input.firstName}, ${input.lastName},
       ${input.certification ?? null}, ${input.position ?? null},
       ${input.email ?? null}, ${input.phone ?? null},
       ${input.dob ?? null}, ${ssnEnc},
       ${input.hireDate ?? null}, ${input.notes ?? null},
       ${passwordHash}, TRUE, ${input.isAdmin ?? false}, TRUE)
  `;

  const created = await getEmployee(id);
  if (!created) throw new Error("Failed to create employee");
  return created;
}

export interface UpdateEmployeeInput {
  firstName?: string;
  lastName?: string;
  certification?: string | null;
  position?: string | null;
  email?: string | null;
  phone?: string | null;
  dob?: string | null;
  ssn?: string | null;          // pass null to clear; undefined to leave alone
  photoUrl?: string | null;
  hireDate?: string | null;
  notes?: string | null;
  isAdmin?: boolean;
  isActive?: boolean;
}

export async function updateEmployee(
  id: string,
  input: UpdateEmployeeInput,
): Promise<AdminEmployeeRow | null> {
  const db = sql();

  // Build dynamic update. neon supports tagged-template only for whole
  // statements; we'll do per-field updates in a transaction-like batch.
  // For simplicity here, run a single UPDATE per provided field. Each
  // call is parameterized so this is safe.

  if (input.firstName !== undefined)
    await db`UPDATE lounge_employees SET first_name = ${input.firstName}, updated_at = NOW() WHERE id = ${id}`;
  if (input.lastName !== undefined)
    await db`UPDATE lounge_employees SET last_name = ${input.lastName}, updated_at = NOW() WHERE id = ${id}`;
  if (input.certification !== undefined)
    await db`UPDATE lounge_employees SET certification = ${input.certification}, updated_at = NOW() WHERE id = ${id}`;
  if (input.position !== undefined)
    await db`UPDATE lounge_employees SET position = ${input.position}, updated_at = NOW() WHERE id = ${id}`;
  if (input.email !== undefined)
    await db`UPDATE lounge_employees SET email = ${input.email}, updated_at = NOW() WHERE id = ${id}`;
  if (input.phone !== undefined)
    await db`UPDATE lounge_employees SET phone = ${input.phone}, updated_at = NOW() WHERE id = ${id}`;
  if (input.dob !== undefined)
    await db`UPDATE lounge_employees SET dob = ${input.dob}, updated_at = NOW() WHERE id = ${id}`;
  if (input.ssn !== undefined) {
    const enc = input.ssn ? encrypt(input.ssn) : null;
    await db`UPDATE lounge_employees SET ssn_encrypted = ${enc}, updated_at = NOW() WHERE id = ${id}`;
  }
  if (input.photoUrl !== undefined)
    await db`UPDATE lounge_employees SET photo_url = ${input.photoUrl}, updated_at = NOW() WHERE id = ${id}`;
  if (input.hireDate !== undefined)
    await db`UPDATE lounge_employees SET hire_date = ${input.hireDate}, updated_at = NOW() WHERE id = ${id}`;
  if (input.notes !== undefined)
    await db`UPDATE lounge_employees SET notes = ${input.notes}, updated_at = NOW() WHERE id = ${id}`;
  if (input.isAdmin !== undefined)
    await db`UPDATE lounge_employees SET is_admin = ${input.isAdmin}, updated_at = NOW() WHERE id = ${id}`;
  if (input.isActive !== undefined)
    await db`UPDATE lounge_employees SET is_active = ${input.isActive}, updated_at = NOW() WHERE id = ${id}`;

  return getEmployee(id);
}

/** Reset password back to a known string and force change on next login. */
export async function resetEmployeePassword(
  id: string,
  newPassword: string,
): Promise<void> {
  const hash = hashPassword(newPassword);
  const db = sql();
  await db`
    UPDATE lounge_employees
    SET password_hash = ${hash},
        must_change_password = TRUE,
        updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function deactivateEmployee(id: string): Promise<void> {
  const db = sql();
  await db`
    UPDATE lounge_employees
    SET is_active = FALSE, updated_at = NOW()
    WHERE id = ${id}
  `;
}

// ── Files ───────────────────────────────────────────────────────────────

interface DbFileRow {
  id: string;
  employee_id: string;
  file_type: string;
  title: string;
  file_url: string;
  file_mime: string | null;
  notes: string | null;
  expires_on: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

function toFile(row: DbFileRow): EmployeeFile {
  return {
    id: row.id,
    employeeId: row.employee_id,
    fileType: row.file_type as EmployeeFile["fileType"],
    title: row.title,
    fileUrl: row.file_url,
    fileMime: row.file_mime,
    notes: row.notes,
    expiresOn: row.expires_on,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at,
  };
}

export async function listEmployeeFiles(employeeId: string): Promise<EmployeeFile[]> {
  const db = sql();
  const rows = (await db`
    SELECT id, employee_id, file_type, title, file_url, file_mime,
           notes, expires_on, uploaded_by, uploaded_at
    FROM lounge_employee_files
    WHERE employee_id = ${employeeId}
    ORDER BY uploaded_at DESC
  `) as unknown as DbFileRow[];
  return rows.map(toFile);
}

export async function addEmployeeFile(input: {
  employeeId: string;
  fileType: EmployeeFile["fileType"];
  title: string;
  fileUrl: string;
  fileMime?: string;
  notes?: string;
  expiresOn?: string;
  uploadedBy?: string;
}): Promise<EmployeeFile> {
  const id = randomUUID();
  const db = sql();
  await db`
    INSERT INTO lounge_employee_files
      (id, employee_id, file_type, title, file_url, file_mime,
       notes, expires_on, uploaded_by)
    VALUES
      (${id}, ${input.employeeId}, ${input.fileType}, ${input.title},
       ${input.fileUrl}, ${input.fileMime ?? null},
       ${input.notes ?? null}, ${input.expiresOn ?? null},
       ${input.uploadedBy ?? null})
  `;
  const rows = (await db`
    SELECT id, employee_id, file_type, title, file_url, file_mime,
           notes, expires_on, uploaded_by, uploaded_at
    FROM lounge_employee_files WHERE id = ${id} LIMIT 1
  `) as unknown as DbFileRow[];
  return toFile(rows[0]);
}

export async function deleteEmployeeFile(fileId: string): Promise<string | null> {
  const db = sql();
  const rows = (await db`
    SELECT file_url FROM lounge_employee_files WHERE id = ${fileId} LIMIT 1
  `) as unknown as { file_url: string }[];
  const url = rows[0]?.file_url ?? null;
  await db`DELETE FROM lounge_employee_files WHERE id = ${fileId}`;
  return url;  // caller may del() from Vercel Blob
}
