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
  addressStreet: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  driverLicenseNum: string | null;
  driverLicenseState: string | null;
  ecName: string | null;
  ecRelationship: string | null;
  ecPhone: string | null;
  ec2Name: string | null;
  ec2Relationship: string | null;
  ec2Phone: string | null;
  shirtSize: string | null;
  pantSize: string | null;
  jacketSize: string | null;
  allergies: string | null;
  medicalConditions: string | null;
  bloodType: string | null;
  profileCompletedAt: string | null;
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
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  driver_license_num: string | null;
  driver_license_state: string | null;
  ec_name: string | null;
  ec_relationship: string | null;
  ec_phone: string | null;
  ec2_name: string | null;
  ec2_relationship: string | null;
  ec2_phone: string | null;
  shirt_size: string | null;
  pant_size: string | null;
  jacket_size: string | null;
  allergies: string | null;
  medical_conditions: string | null;
  blood_type: string | null;
  profile_completed_at: string | null;
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
    addressStreet: row.address_street,
    addressCity: row.address_city,
    addressState: row.address_state,
    addressZip: row.address_zip,
    driverLicenseNum: row.driver_license_num,
    driverLicenseState: row.driver_license_state,
    ecName: row.ec_name,
    ecRelationship: row.ec_relationship,
    ecPhone: row.ec_phone,
    ec2Name: row.ec2_name,
    ec2Relationship: row.ec2_relationship,
    ec2Phone: row.ec2_phone,
    shirtSize: row.shirt_size,
    pantSize: row.pant_size,
    jacketSize: row.jacket_size,
    allergies: row.allergies,
    medicalConditions: row.medical_conditions,
    bloodType: row.blood_type,
    profileCompletedAt: row.profile_completed_at,
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
               is_admin, is_active, must_change_password,
               address_street, address_city, address_state, address_zip,
               driver_license_num, driver_license_state,
               ec_name, ec_relationship, ec_phone,
               ec2_name, ec2_relationship, ec2_phone,
               shirt_size, pant_size, jacket_size, allergies, medical_conditions,
               blood_type, profile_completed_at,
               created_at, updated_at
        FROM lounge_employees
        ORDER BY last_name ASC, first_name ASC
      `) as unknown as DbEmployeeRow[])
    : ((await db`
        SELECT id, username, first_name, last_name, certification, position,
               email, phone, dob, ssn_encrypted, photo_url, hire_date, notes,
               is_admin, is_active, must_change_password,
               address_street, address_city, address_state, address_zip,
               driver_license_num, driver_license_state,
               ec_name, ec_relationship, ec_phone,
               ec2_name, ec2_relationship, ec2_phone,
               shirt_size, pant_size, jacket_size, allergies, medical_conditions,
               blood_type, profile_completed_at,
               created_at, updated_at
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
  // About-Me / personal fields (employee-fillable)
  addressStreet?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZip?: string | null;
  driverLicenseNum?: string | null;
  driverLicenseState?: string | null;
  ecName?: string | null;
  ecRelationship?: string | null;
  ecPhone?: string | null;
  ec2Name?: string | null;
  ec2Relationship?: string | null;
  ec2Phone?: string | null;
  shirtSize?: string | null;
  pantSize?: string | null;
  jacketSize?: string | null;
  allergies?: string | null;
  medicalConditions?: string | null;
  bloodType?: string | null;
  markProfileCompleted?: boolean;
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

  if (input.addressStreet !== undefined)
    await db`UPDATE lounge_employees SET address_street = ${input.addressStreet}, updated_at = NOW() WHERE id = ${id}`;
  if (input.addressCity !== undefined)
    await db`UPDATE lounge_employees SET address_city = ${input.addressCity}, updated_at = NOW() WHERE id = ${id}`;
  if (input.addressState !== undefined)
    await db`UPDATE lounge_employees SET address_state = ${input.addressState}, updated_at = NOW() WHERE id = ${id}`;
  if (input.addressZip !== undefined)
    await db`UPDATE lounge_employees SET address_zip = ${input.addressZip}, updated_at = NOW() WHERE id = ${id}`;
  if (input.driverLicenseNum !== undefined)
    await db`UPDATE lounge_employees SET driver_license_num = ${input.driverLicenseNum}, updated_at = NOW() WHERE id = ${id}`;
  if (input.driverLicenseState !== undefined)
    await db`UPDATE lounge_employees SET driver_license_state = ${input.driverLicenseState}, updated_at = NOW() WHERE id = ${id}`;
  if (input.ecName !== undefined)
    await db`UPDATE lounge_employees SET ec_name = ${input.ecName}, updated_at = NOW() WHERE id = ${id}`;
  if (input.ecRelationship !== undefined)
    await db`UPDATE lounge_employees SET ec_relationship = ${input.ecRelationship}, updated_at = NOW() WHERE id = ${id}`;
  if (input.ecPhone !== undefined)
    await db`UPDATE lounge_employees SET ec_phone = ${input.ecPhone}, updated_at = NOW() WHERE id = ${id}`;
  if (input.ec2Name !== undefined)
    await db`UPDATE lounge_employees SET ec2_name = ${input.ec2Name}, updated_at = NOW() WHERE id = ${id}`;
  if (input.ec2Relationship !== undefined)
    await db`UPDATE lounge_employees SET ec2_relationship = ${input.ec2Relationship}, updated_at = NOW() WHERE id = ${id}`;
  if (input.ec2Phone !== undefined)
    await db`UPDATE lounge_employees SET ec2_phone = ${input.ec2Phone}, updated_at = NOW() WHERE id = ${id}`;
  if (input.shirtSize !== undefined)
    await db`UPDATE lounge_employees SET shirt_size = ${input.shirtSize}, updated_at = NOW() WHERE id = ${id}`;
  if (input.pantSize !== undefined)
    await db`UPDATE lounge_employees SET pant_size = ${input.pantSize}, updated_at = NOW() WHERE id = ${id}`;
  if (input.jacketSize !== undefined)
    await db`UPDATE lounge_employees SET jacket_size = ${input.jacketSize}, updated_at = NOW() WHERE id = ${id}`;
  if (input.allergies !== undefined)
    await db`UPDATE lounge_employees SET allergies = ${input.allergies}, updated_at = NOW() WHERE id = ${id}`;
  if (input.medicalConditions !== undefined)
    await db`UPDATE lounge_employees SET medical_conditions = ${input.medicalConditions}, updated_at = NOW() WHERE id = ${id}`;
  if (input.bloodType !== undefined)
    await db`UPDATE lounge_employees SET blood_type = ${input.bloodType}, updated_at = NOW() WHERE id = ${id}`;
  if (input.markProfileCompleted)
    await db`UPDATE lounge_employees SET profile_completed_at = NOW(), updated_at = NOW() WHERE id = ${id}`;

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
