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
import { privateBlobDeleteTarget, privateLoungeBlobUrl } from "./private-blobs";
import {
  generateSetupToken,
  hashPassword,
  setupTokenExpiresAt,
  setupTokenHash,
} from "./auth";
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
  phoneVerifiedAt: string | null;
  profileCompletedAt: string | null;
  emailSecondary: string | null;
  emailSecondaryAlerts: boolean;
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
  phone_verified_at: string | null;
  profile_completed_at: string | null;
  email_secondary: string | null;
  email_secondary_alerts: boolean | null;
  created_at: string;
  updated_at: string;
}

/**
 * Neon's pg parser returns DATE columns as JS Date objects and
 * TIMESTAMPTZ columns as Date objects too. The rest of the codebase
 * (UI components, PDF builders, About Me ReadOnly, etc.) assumes
 * `string | null`. Normalize here so the type signature matches reality.
 */
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

const SENSITIVE_TEXT_PREFIX = "employee-sensitive-v1:";

function protectSensitiveText(value: string | null) {
  return value ? `${SENSITIVE_TEXT_PREFIX}${encrypt(value)}` : null;
}

function revealSensitiveText(value: string | null) {
  if (!value?.startsWith(SENSITIVE_TEXT_PREFIX)) return value;
  try {
    return decrypt(value.slice(SENSITIVE_TEXT_PREFIX.length));
  } catch {
    return null;
  }
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
    dob: dateOnly(row.dob),
    ssnLast4: last4,
    photoUrl: row.photo_url,
    hireDate: dateOnly(row.hire_date),
    notes: row.notes,
    isAdmin: row.is_admin,
    isActive: row.is_active,
    mustChangePassword: row.must_change_password,
    addressStreet: row.address_street,
    addressCity: row.address_city,
    addressState: row.address_state,
    addressZip: row.address_zip,
    driverLicenseNum: revealSensitiveText(row.driver_license_num),
    driverLicenseState: row.driver_license_state,
    ecName: revealSensitiveText(row.ec_name),
    ecRelationship: row.ec_relationship,
    ecPhone: revealSensitiveText(row.ec_phone),
    ec2Name: revealSensitiveText(row.ec2_name),
    ec2Relationship: row.ec2_relationship,
    ec2Phone: revealSensitiveText(row.ec2_phone),
    shirtSize: row.shirt_size,
    pantSize: row.pant_size,
    jacketSize: row.jacket_size,
    allergies: revealSensitiveText(row.allergies),
    medicalConditions: revealSensitiveText(row.medical_conditions),
    bloodType: revealSensitiveText(row.blood_type),
    phoneVerifiedAt: dateTime(row.phone_verified_at),
    profileCompletedAt: dateTime(row.profile_completed_at),
    emailSecondary: row.email_secondary,
    emailSecondaryAlerts: Boolean(row.email_secondary_alerts),
    createdAt: dateTime(row.created_at) ?? "",
    updatedAt: dateTime(row.updated_at) ?? "",
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
               blood_type, phone_verified_at, profile_completed_at,
               email_secondary, email_secondary_alerts,
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
               blood_type, phone_verified_at, profile_completed_at,
               email_secondary, email_secondary_alerts,
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
           is_admin, is_active, must_change_password,
           address_street, address_city, address_state, address_zip,
           driver_license_num, driver_license_state,
           ec_name, ec_relationship, ec_phone,
           ec2_name, ec2_relationship, ec2_phone,
           shirt_size, pant_size, jacket_size, allergies, medical_conditions,
           blood_type, phone_verified_at, profile_completed_at,
           email_secondary, email_secondary_alerts,
           created_at, updated_at
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
  username?: string;         // optional override; defaults to firstinitial+lastname
}

export function defaultUsername(firstName: string, lastName: string): string {
  return (firstName.trim()[0] + lastName.trim()).toLowerCase().replace(/[^a-z]/g, "");
}

export async function createEmployee(
  input: CreateEmployeeInput,
): Promise<{ employee: AdminEmployeeRow; setupToken: string; setupTokenExpiresAt: string }> {
  const id = randomUUID();
  const cleanUsername = (input.username ?? "").trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "");
  const username = cleanUsername || defaultUsername(input.firstName, input.lastName);
  const setupToken = generateSetupToken();
  const expiresAt = setupTokenExpiresAt();
  const passwordHash = hashPassword(setupToken);
  const ssnEnc = input.ssn ? encrypt(input.ssn) : null;

  const db = sql();
  await db`
    INSERT INTO lounge_employees
      (id, username, first_name, last_name, certification, position,
       email, phone, dob, ssn_encrypted, hire_date, notes,
       password_hash, must_change_password, setup_token_hash,
       setup_token_expires_at, setup_token_used_at, is_admin, is_active)
    VALUES
      (${id}, ${username}, ${input.firstName}, ${input.lastName},
       ${input.certification ?? null}, ${input.position ?? null},
       ${input.email ?? null}, ${input.phone ?? null},
       ${input.dob ?? null}, ${ssnEnc},
       ${input.hireDate ?? null}, ${input.notes ?? null},
       ${passwordHash}, TRUE, ${setupTokenHash(setupToken)},
       ${expiresAt}, NULL, ${input.isAdmin ?? false}, TRUE)
  `;

  const created = await getEmployee(id);
  if (!created) throw new Error("Failed to create employee");
  return { employee: created, setupToken, setupTokenExpiresAt: expiresAt };
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
  emailSecondary?: string | null;
  emailSecondaryAlerts?: boolean;
  markProfileCompleted?: boolean;
}

// Cache so we only run the column-repair once per process.
let columnsEnsured = false;
async function ensureAboutMeColumns() {
  if (columnsEnsured) return;
  const db = sql();
  // Idempotent — every column the About-Me form touches.
  await db`ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS address_street      TEXT`;
  await db`ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS address_city        TEXT`;
  await db`ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS address_state       TEXT`;
  await db`ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS address_zip         TEXT`;
  await db`ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS driver_license_num  TEXT`;
  await db`ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS driver_license_state TEXT`;
  await db`ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS ec_name             TEXT`;
  await db`ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS ec_relationship     TEXT`;
  await db`ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS ec_phone            TEXT`;
  await db`ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS ec2_name            TEXT`;
  await db`ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS ec2_relationship    TEXT`;
  await db`ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS ec2_phone           TEXT`;
  await db`ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS shirt_size          TEXT`;
  await db`ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS pant_size           TEXT`;
  await db`ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS jacket_size         TEXT`;
  await db`ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS allergies           TEXT`;
  await db`ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS medical_conditions  TEXT`;
  await db`ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS blood_type          TEXT`;
  await db`ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ`;
  await db`ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS phone_verified_at    TIMESTAMPTZ`;
  await db`ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS email_secondary      TEXT`;
  await db`ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS email_secondary_alerts BOOLEAN NOT NULL DEFAULT FALSE`;
  columnsEnsured = true;
}

export async function updateEmployee(
  id: string,
  input: UpdateEmployeeInput,
): Promise<AdminEmployeeRow | null> {
  const db = sql();
  await ensureAboutMeColumns();

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
    await db`UPDATE lounge_employees SET driver_license_num = ${protectSensitiveText(input.driverLicenseNum)}, updated_at = NOW() WHERE id = ${id}`;
  if (input.driverLicenseState !== undefined)
    await db`UPDATE lounge_employees SET driver_license_state = ${input.driverLicenseState}, updated_at = NOW() WHERE id = ${id}`;
  if (input.ecName !== undefined)
    await db`UPDATE lounge_employees SET ec_name = ${protectSensitiveText(input.ecName)}, updated_at = NOW() WHERE id = ${id}`;
  if (input.ecRelationship !== undefined)
    await db`UPDATE lounge_employees SET ec_relationship = ${input.ecRelationship}, updated_at = NOW() WHERE id = ${id}`;
  if (input.ecPhone !== undefined)
    await db`UPDATE lounge_employees SET ec_phone = ${protectSensitiveText(input.ecPhone)}, updated_at = NOW() WHERE id = ${id}`;
  if (input.ec2Name !== undefined)
    await db`UPDATE lounge_employees SET ec2_name = ${protectSensitiveText(input.ec2Name)}, updated_at = NOW() WHERE id = ${id}`;
  if (input.ec2Relationship !== undefined)
    await db`UPDATE lounge_employees SET ec2_relationship = ${input.ec2Relationship}, updated_at = NOW() WHERE id = ${id}`;
  if (input.ec2Phone !== undefined)
    await db`UPDATE lounge_employees SET ec2_phone = ${protectSensitiveText(input.ec2Phone)}, updated_at = NOW() WHERE id = ${id}`;
  if (input.shirtSize !== undefined)
    await db`UPDATE lounge_employees SET shirt_size = ${input.shirtSize}, updated_at = NOW() WHERE id = ${id}`;
  if (input.pantSize !== undefined)
    await db`UPDATE lounge_employees SET pant_size = ${input.pantSize}, updated_at = NOW() WHERE id = ${id}`;
  if (input.jacketSize !== undefined)
    await db`UPDATE lounge_employees SET jacket_size = ${input.jacketSize}, updated_at = NOW() WHERE id = ${id}`;
  if (input.allergies !== undefined)
    await db`UPDATE lounge_employees SET allergies = ${protectSensitiveText(input.allergies)}, updated_at = NOW() WHERE id = ${id}`;
  if (input.medicalConditions !== undefined)
    await db`UPDATE lounge_employees SET medical_conditions = ${protectSensitiveText(input.medicalConditions)}, updated_at = NOW() WHERE id = ${id}`;
  if (input.bloodType !== undefined)
    await db`UPDATE lounge_employees SET blood_type = ${protectSensitiveText(input.bloodType)}, updated_at = NOW() WHERE id = ${id}`;
  if (input.emailSecondary !== undefined)
    await db`UPDATE lounge_employees SET email_secondary = ${input.emailSecondary}, updated_at = NOW() WHERE id = ${id}`;
  if (input.emailSecondaryAlerts !== undefined)
    await db`UPDATE lounge_employees SET email_secondary_alerts = ${input.emailSecondaryAlerts}, updated_at = NOW() WHERE id = ${id}`;
  if (input.markProfileCompleted)
    await db`UPDATE lounge_employees SET profile_completed_at = NOW(), updated_at = NOW() WHERE id = ${id}`;

  return getEmployee(id);
}

/** Issue a random one-use setup credential and revoke every existing bypass. */
export async function resetEmployeePassword(
  id: string,
): Promise<{
  setupToken: string;
  setupTokenExpiresAt: string;
  revokedTrustedDevices: number;
  revokedPreauthChallenges: number;
} | null> {
  const setupToken = generateSetupToken();
  const expiresAt = setupTokenExpiresAt();
  const hash = hashPassword(setupToken);
  const tokenHash = setupTokenHash(setupToken);
  const db = sql();
  const rows = (await db`
    WITH updated AS (
      UPDATE lounge_employees
      SET password_hash = ${hash},
          must_change_password = TRUE,
          setup_token_hash = ${tokenHash},
          setup_token_expires_at = ${expiresAt},
          setup_token_used_at = NULL,
          sms_login_code_hash = NULL,
          sms_login_code_expires_at = NULL,
          sms_login_code_attempts = 0,
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING id
    ), revoked_challenges AS (
      UPDATE lounge_preauth_challenges challenge
      SET revoked_at = COALESCE(challenge.revoked_at, NOW())
      FROM updated
      WHERE challenge.employee_id = updated.id
        AND challenge.used_at IS NULL
        AND challenge.revoked_at IS NULL
      RETURNING challenge.nonce_hash
    ), deleted_devices AS (
      DELETE FROM lounge_trusted_devices device
      USING updated
      WHERE device.employee_id = updated.id
      RETURNING device.id
    )
    SELECT updated.id,
           (SELECT COUNT(*)::int FROM revoked_challenges) AS revoked_challenges,
           (SELECT COUNT(*)::int FROM deleted_devices) AS deleted_devices
    FROM updated
  `) as unknown as Array<{ id: string; revoked_challenges: number; deleted_devices: number }>;
  if (!rows.length) return null;
  return {
    setupToken,
    setupTokenExpiresAt: expiresAt,
    revokedTrustedDevices: Number(rows[0].deleted_devices),
    revokedPreauthChallenges: Number(rows[0].revoked_challenges),
  };
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
    fileUrl: privateLoungeBlobUrl(row.file_url) ?? row.file_url,
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
  return url ? privateBlobDeleteTarget(url) : null;
}
