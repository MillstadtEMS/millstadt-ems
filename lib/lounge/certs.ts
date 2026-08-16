/**
 * Classes + certifications + alert math.
 *
 * Alert thresholds are stored per cert_type as a JSON array of day-numbers
 * (default [120, 90, 60, 30]). Two implicit behaviors:
 *   - Final 7 days: alert fires daily.
 *   - Expired (days <= 0): alert fires daily until renewed.
 *
 * Use `currentAlertThreshold(daysUntil, thresholds)` to map a number of
 * days-until-expiry into one of:
 *   { value: number, kind: 'scheduled' | 'final_7' | 'expired' } | null
 *
 * The cron uses `last_alerted_threshold` to decide whether today's threshold
 * differs from last time we sent — that prevents the 120-day email firing
 * 30 days in a row.
 */
import { randomUUID } from "crypto";
import { sql } from "./db";
import { privateBlobDeleteTarget, privateLoungeBlobUrl } from "./private-blobs";

export type AlertKind = "scheduled" | "final_7" | "expired";

export interface AlertState {
  /** Threshold value (120/90/60/30/7/0). 0 means already expired. */
  value: number;
  kind: AlertKind;
  /** Friendly text used in banners + email subjects. */
  label: string;
}

export function daysUntil(expiresOn: Date | string, now: Date = new Date()): number {
  const exp = typeof expiresOn === "string" ? new Date(expiresOn) : expiresOn;
  const msPerDay = 24 * 60 * 60 * 1000;
  // Use start-of-day in UTC for both to avoid TZ off-by-ones.
  const a = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const b = Date.UTC(exp.getUTCFullYear(), exp.getUTCMonth(), exp.getUTCDate());
  return Math.round((b - a) / msPerDay);
}

export function currentAlertThreshold(
  daysLeft: number,
  thresholds: number[] = [120, 90, 60, 30],
): AlertState | null {
  if (daysLeft < 0) {
    return { value: 0, kind: "expired", label: "Expired" };
  }
  if (daysLeft <= 7) {
    return {
      value: daysLeft, // unique daily value so the cron re-emails each day
      kind: "final_7",
      label: daysLeft === 0 ? "Expires today" : `Expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
    };
  }
  // Find the smallest threshold we've crossed into.
  const sorted = [...thresholds].sort((a, b) => a - b);
  for (const t of sorted) {
    if (daysLeft <= t) {
      return {
        value: t,
        kind: "scheduled",
        label: `Expires in ${daysLeft} days (${t}-day notice)`,
      };
    }
  }
  return null;
}

// ── Types ───────────────────────────────────────────────────────────────

export interface LoungeClass {
  id: string;
  name: string;
  description: string | null;
  memberCount?: number;
  requiredCertTypeIds?: string[];
}

export interface CertType {
  id: string;
  name: string;
  slug: string;
  requiresExpiration: boolean;
  alertThresholds: number[];
  isBuiltIn: boolean;
}

export interface EmployeeCert {
  id: string;
  employeeId: string;
  certTypeId: string;
  certTypeName: string;
  certTypeSlug: string;
  certRequiresExpiration: boolean;
  fileUrl: string;
  fileMime: string | null;
  fileName: string | null;
  issuedOn: string | null;
  expiresOn: string | null;
  uploadedAt: string;
  /** Computed status for UI: 'good' | '120' | '90' | '60' | '30' | 'final_7' | 'expired' | 'no_expiration' */
  status: CertStatus;
  /** Days until expiry (negative when expired). null when no expiration. */
  daysLeft: number | null;
}

export type CertStatus =
  | "good"
  | "no_expiration"
  | "120"
  | "90"
  | "60"
  | "30"
  | "final_7"
  | "expired";

// ── Class CRUD ──────────────────────────────────────────────────────────

interface DbClassRow {
  id: string;
  name: string;
  description: string | null;
}

export async function listClasses(): Promise<LoungeClass[]> {
  const db = sql();
  const rows = (await db`
    SELECT c.id, c.name, c.description,
           COUNT(DISTINCT ec.employee_id)::int AS member_count
    FROM lounge_classes c
    LEFT JOIN lounge_employee_classes ec ON ec.class_id = c.id
    GROUP BY c.id, c.name, c.description
    ORDER BY c.name ASC
  `) as unknown as (DbClassRow & { member_count: number })[];

  // For each, pull required cert type IDs.
  const reqRows = (await db`
    SELECT class_id, cert_type_id FROM lounge_class_requirements
  `) as unknown as { class_id: string; cert_type_id: string }[];
  const reqByClass = new Map<string, string[]>();
  for (const r of reqRows) {
    if (!reqByClass.has(r.class_id)) reqByClass.set(r.class_id, []);
    reqByClass.get(r.class_id)!.push(r.cert_type_id);
  }

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    memberCount: r.member_count,
    requiredCertTypeIds: reqByClass.get(r.id) ?? [],
  }));
}

export async function getClass(id: string): Promise<LoungeClass | null> {
  const db = sql();
  const rows = (await db`
    SELECT id, name, description FROM lounge_classes WHERE id = ${id} LIMIT 1
  `) as unknown as DbClassRow[];
  if (!rows[0]) return null;
  const reqs = (await db`
    SELECT cert_type_id FROM lounge_class_requirements WHERE class_id = ${id}
  `) as unknown as { cert_type_id: string }[];
  return {
    id: rows[0].id,
    name: rows[0].name,
    description: rows[0].description,
    requiredCertTypeIds: reqs.map((r) => r.cert_type_id),
  };
}

export async function createClass(input: {
  name: string;
  description?: string;
}): Promise<LoungeClass> {
  const id = randomUUID();
  const db = sql();
  await db`
    INSERT INTO lounge_classes (id, name, description)
    VALUES (${id}, ${input.name.trim()}, ${input.description?.trim() ?? null})
  `;
  return (await getClass(id))!;
}

export async function updateClass(
  id: string,
  input: { name?: string; description?: string | null },
): Promise<LoungeClass | null> {
  const db = sql();
  if (input.name !== undefined)
    await db`UPDATE lounge_classes SET name = ${input.name}, updated_at = NOW() WHERE id = ${id}`;
  if (input.description !== undefined)
    await db`UPDATE lounge_classes SET description = ${input.description}, updated_at = NOW() WHERE id = ${id}`;
  return getClass(id);
}

export async function deleteClass(id: string): Promise<void> {
  const db = sql();
  await db`DELETE FROM lounge_classes WHERE id = ${id}`;
}

export async function setClassRequirements(
  classId: string,
  certTypeIds: string[],
): Promise<void> {
  const db = sql();
  await db`DELETE FROM lounge_class_requirements WHERE class_id = ${classId}`;
  for (const certTypeId of certTypeIds) {
    await db`
      INSERT INTO lounge_class_requirements (class_id, cert_type_id)
      VALUES (${classId}, ${certTypeId})
      ON CONFLICT DO NOTHING
    `;
  }
}

export async function setEmployeeClasses(
  employeeId: string,
  classIds: string[],
  assignedBy: string,
): Promise<void> {
  const db = sql();
  await db`DELETE FROM lounge_employee_classes WHERE employee_id = ${employeeId}`;
  for (const classId of classIds) {
    await db`
      INSERT INTO lounge_employee_classes (employee_id, class_id, assigned_by)
      VALUES (${employeeId}, ${classId}, ${assignedBy})
      ON CONFLICT DO NOTHING
    `;
  }
}

export async function getEmployeeClasses(employeeId: string): Promise<LoungeClass[]> {
  const db = sql();
  const rows = (await db`
    SELECT c.id, c.name, c.description
    FROM lounge_employee_classes ec
    JOIN lounge_classes c ON c.id = ec.class_id
    WHERE ec.employee_id = ${employeeId}
    ORDER BY c.name ASC
  `) as unknown as DbClassRow[];
  return rows.map((r) => ({ id: r.id, name: r.name, description: r.description }));
}

// ── Cert types ──────────────────────────────────────────────────────────

interface DbCertTypeRow {
  id: string;
  name: string;
  slug: string;
  requires_expiration: boolean;
  alert_thresholds: number[];
  is_built_in: boolean;
}

function toCertType(r: DbCertTypeRow): CertType {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    requiresExpiration: r.requires_expiration,
    alertThresholds: Array.isArray(r.alert_thresholds) ? r.alert_thresholds : [120, 90, 60, 30],
    isBuiltIn: r.is_built_in,
  };
}

export async function listCertTypes(): Promise<CertType[]> {
  const db = sql();
  const rows = (await db`
    SELECT id, name, slug, requires_expiration, alert_thresholds, is_built_in
    FROM lounge_cert_types
    ORDER BY is_built_in DESC, name ASC
  `) as unknown as DbCertTypeRow[];
  return rows.map(toCertType);
}

export async function getCertType(id: string): Promise<CertType | null> {
  const db = sql();
  const rows = (await db`
    SELECT id, name, slug, requires_expiration, alert_thresholds, is_built_in
    FROM lounge_cert_types WHERE id = ${id} LIMIT 1
  `) as unknown as DbCertTypeRow[];
  return rows[0] ? toCertType(rows[0]) : null;
}

export async function createCertType(input: {
  name: string;
  slug?: string;
  requiresExpiration: boolean;
  alertThresholds?: number[];
  createdBy: string;
}): Promise<CertType> {
  const id = randomUUID();
  const slug =
    (input.slug ?? input.name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  const thresholds = input.alertThresholds && input.alertThresholds.length > 0
    ? input.alertThresholds
    : [120, 90, 60, 30];
  const db = sql();
  await db`
    INSERT INTO lounge_cert_types
      (id, name, slug, requires_expiration, alert_thresholds, is_built_in, created_by)
    VALUES
      (${id}, ${input.name.trim()}, ${slug}, ${input.requiresExpiration},
       ${JSON.stringify(thresholds)}::jsonb, FALSE, ${input.createdBy})
  `;
  return (await getCertType(id))!;
}

export async function updateCertType(
  id: string,
  input: {
    name?: string;
    requiresExpiration?: boolean;
    alertThresholds?: number[];
  },
): Promise<CertType | null> {
  const db = sql();
  if (input.name !== undefined)
    await db`UPDATE lounge_cert_types SET name = ${input.name}, updated_at = NOW() WHERE id = ${id}`;
  if (input.requiresExpiration !== undefined)
    await db`UPDATE lounge_cert_types SET requires_expiration = ${input.requiresExpiration}, updated_at = NOW() WHERE id = ${id}`;
  if (input.alertThresholds !== undefined)
    await db`UPDATE lounge_cert_types SET alert_thresholds = ${JSON.stringify(input.alertThresholds)}::jsonb, updated_at = NOW() WHERE id = ${id}`;
  return getCertType(id);
}

export async function deleteCertType(id: string): Promise<{ ok: boolean; error?: string }> {
  const db = sql();
  const t = await getCertType(id);
  if (!t) return { ok: false, error: "Not found" };
  if (t.isBuiltIn) return { ok: false, error: "Cannot delete a built-in cert type" };
  await db`DELETE FROM lounge_cert_types WHERE id = ${id}`;
  return { ok: true };
}

// ── Employee certs ──────────────────────────────────────────────────────

interface DbEmpCertRow {
  id: string;
  employee_id: string;
  cert_type_id: string;
  cert_type_name: string;
  cert_type_slug: string;
  cert_requires_expiration: boolean;
  file_url: string;
  file_mime: string | null;
  file_name: string | null;
  issued_on: string | null;
  expires_on: string | null;
  uploaded_at: string;
}

function statusFromDays(days: number | null, requiresExpiration: boolean): CertStatus {
  if (!requiresExpiration || days === null) return "no_expiration";
  if (days < 0) return "expired";
  if (days <= 7) return "final_7";
  if (days <= 30) return "30";
  if (days <= 60) return "60";
  if (days <= 90) return "90";
  if (days <= 120) return "120";
  return "good";
}

function toEmployeeCert(r: DbEmpCertRow): EmployeeCert {
  const days = r.expires_on ? daysUntil(r.expires_on) : null;
  return {
    id: r.id,
    employeeId: r.employee_id,
    certTypeId: r.cert_type_id,
    certTypeName: r.cert_type_name,
    certTypeSlug: r.cert_type_slug,
    certRequiresExpiration: r.cert_requires_expiration,
    fileUrl: privateLoungeBlobUrl(r.file_url) ?? r.file_url,
    fileMime: r.file_mime,
    fileName: r.file_name,
    issuedOn: r.issued_on,
    expiresOn: r.expires_on,
    uploadedAt: r.uploaded_at,
    daysLeft: days,
    status: statusFromDays(days, r.cert_requires_expiration),
  };
}

export async function listEmployeeCerts(employeeId: string): Promise<EmployeeCert[]> {
  const db = sql();
  const rows = (await db`
    SELECT ec.id, ec.employee_id, ec.cert_type_id,
           ct.name AS cert_type_name, ct.slug AS cert_type_slug,
           ct.requires_expiration AS cert_requires_expiration,
           ec.file_url, ec.file_mime, ec.file_name,
           ec.issued_on, ec.expires_on, ec.uploaded_at
    FROM lounge_employee_certs ec
    JOIN lounge_cert_types ct ON ct.id = ec.cert_type_id
    WHERE ec.employee_id = ${employeeId}
    ORDER BY ct.name ASC, ec.uploaded_at DESC
  `) as unknown as DbEmpCertRow[];
  return rows.map(toEmployeeCert);
}

export async function addEmployeeCert(input: {
  employeeId: string;
  certTypeId: string;
  fileUrl: string;
  fileMime?: string;
  fileName?: string;
  issuedOn?: string;
  expiresOn?: string;
  uploadedBy: string;
}): Promise<EmployeeCert> {
  const id = randomUUID();
  const db = sql();
  await db`
    INSERT INTO lounge_employee_certs
      (id, employee_id, cert_type_id, file_url, file_mime, file_name,
       issued_on, expires_on, uploaded_by)
    VALUES
      (${id}, ${input.employeeId}, ${input.certTypeId}, ${input.fileUrl},
       ${input.fileMime ?? null}, ${input.fileName ?? null},
       ${input.issuedOn ?? null}, ${input.expiresOn ?? null}, ${input.uploadedBy})
  `;
  const rows = (await db`
    SELECT ec.id, ec.employee_id, ec.cert_type_id,
           ct.name AS cert_type_name, ct.slug AS cert_type_slug,
           ct.requires_expiration AS cert_requires_expiration,
           ec.file_url, ec.file_mime, ec.file_name,
           ec.issued_on, ec.expires_on, ec.uploaded_at
    FROM lounge_employee_certs ec
    JOIN lounge_cert_types ct ON ct.id = ec.cert_type_id
    WHERE ec.id = ${id} LIMIT 1
  `) as unknown as DbEmpCertRow[];
  return toEmployeeCert(rows[0]);
}

export async function deleteEmployeeCert(certId: string): Promise<string | null> {
  const db = sql();
  const rows = (await db`
    SELECT file_url FROM lounge_employee_certs WHERE id = ${certId} LIMIT 1
  `) as unknown as { file_url: string }[];
  const url = rows[0]?.file_url ?? null;
  await db`DELETE FROM lounge_employee_certs WHERE id = ${certId}`;
  return url ? privateBlobDeleteTarget(url) : null;
}

// ── Cert status views ───────────────────────────────────────────────────

export interface CertStatusForEmployee {
  certType: CertType;
  /** Most recent upload of this cert type, if any. */
  cert: EmployeeCert | null;
  /** True when the employee belongs to a class that requires this cert type. */
  required: boolean;
}

/**
 * Returns one row per cert type that's either required by one of the
 * employee's classes, or already uploaded. Used to drive the /lounge/certs
 * page and the dashboard alert banner.
 */
export async function certStatusForEmployee(
  employeeId: string,
): Promise<CertStatusForEmployee[]> {
  const db = sql();
  const [certTypes, employeeCerts, requiredRows] = await Promise.all([
    listCertTypes(),
    listEmployeeCerts(employeeId),
    db`
      SELECT DISTINCT cr.cert_type_id
      FROM lounge_employee_classes ec
      JOIN lounge_class_requirements cr ON cr.class_id = ec.class_id
      WHERE ec.employee_id = ${employeeId}
    ` as unknown as Promise<{ cert_type_id: string }[]>,
  ]);
  const required = new Set((await requiredRows).map((r) => r.cert_type_id));
  const mostRecent = new Map<string, EmployeeCert>();
  for (const c of employeeCerts) {
    if (!mostRecent.has(c.certTypeId)) mostRecent.set(c.certTypeId, c);
  }
  return certTypes
    .filter((t) => required.has(t.id) || mostRecent.has(t.id))
    .map((t) => ({
      certType: t,
      cert: mostRecent.get(t.id) ?? null,
      required: required.has(t.id),
    }));
}

/** Returns only certs that are expiring soon or expired. For dashboard banners. */
export async function expiringCertsForEmployee(employeeId: string): Promise<EmployeeCert[]> {
  const all = await listEmployeeCerts(employeeId);
  return all.filter(
    (c) =>
      c.status === "expired" ||
      c.status === "final_7" ||
      c.status === "30" ||
      c.status === "60" ||
      c.status === "90" ||
      c.status === "120",
  );
}

// ── Cron support ────────────────────────────────────────────────────────

export interface CronCertHit {
  cert: EmployeeCert;
  threshold: number;       // 120/90/60/30/7/0
  kind: AlertKind;
  alreadySentThisLevel: boolean;
}

/**
 * Walks every cert with an expiration set and returns the ones whose
 * current threshold differs from `last_alerted_threshold` (or whose
 * "final 7" / "expired" state means we re-email daily).
 */
export async function findCertsNeedingAlert(now: Date = new Date()): Promise<CronCertHit[]> {
  const db = sql();
  const rows = (await db`
    SELECT ec.id, ec.employee_id, ec.cert_type_id,
           ct.name AS cert_type_name, ct.slug AS cert_type_slug,
           ct.requires_expiration AS cert_requires_expiration,
           ct.alert_thresholds,
           ec.file_url, ec.file_mime, ec.file_name,
           ec.issued_on, ec.expires_on, ec.uploaded_at,
           ec.last_alerted_threshold, ec.last_alerted_at
    FROM lounge_employee_certs ec
    JOIN lounge_cert_types ct ON ct.id = ec.cert_type_id
    JOIN lounge_employees e ON e.id = ec.employee_id
    WHERE ec.expires_on IS NOT NULL
      AND ct.requires_expiration = TRUE
      AND e.is_active = TRUE
  `) as unknown as (DbEmpCertRow & {
    alert_thresholds: number[];
    last_alerted_threshold: number | null;
    last_alerted_at: string | null;
  })[];

  const hits: CronCertHit[] = [];
  for (const r of rows) {
    if (!r.expires_on) continue;
    const days = daysUntil(r.expires_on, now);
    const thresholds = Array.isArray(r.alert_thresholds) ? r.alert_thresholds : [120, 90, 60, 30];
    const state = currentAlertThreshold(days, thresholds);
    if (!state) continue;

    // Decide whether today's state warrants a fresh send.
    const lastT = r.last_alerted_threshold;
    const lastAt = r.last_alerted_at ? new Date(r.last_alerted_at) : null;
    const sameDayAsLastSend =
      lastAt && lastAt.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);

    let shouldSend = false;
    if (state.kind === "scheduled") {
      // One-time per threshold transition (e.g. crossing from 91 → 90).
      shouldSend = lastT !== state.value;
    } else if (state.kind === "final_7" || state.kind === "expired") {
      // Daily during last week + after expiration.
      shouldSend = !sameDayAsLastSend || lastT !== state.value;
    }

    hits.push({
      cert: toEmployeeCert(r),
      threshold: state.value,
      kind: state.kind,
      alreadySentThisLevel: !shouldSend,
    });
  }

  return hits.filter((h) => !h.alreadySentThisLevel);
}

export async function recordAlertSent(
  certId: string,
  threshold: number,
  employeeId: string,
  audience: "employee" | "admin_digest",
  sentTo: string,
  success: boolean,
  error?: string,
): Promise<void> {
  const db = sql();
  if (audience === "employee" && success) {
    await db`
      UPDATE lounge_employee_certs
      SET last_alerted_threshold = ${threshold}, last_alerted_at = NOW()
      WHERE id = ${certId}
    `;
  }
  await db`
    INSERT INTO lounge_cert_alert_log
      (cert_id, employee_id, threshold, audience, sent_to, success, error)
    VALUES
      (${certId}, ${employeeId}, ${threshold}, ${audience}, ${sentTo}, ${success}, ${error ?? null})
  `;
}

/** True if a Monday admin digest has already been sent today. */
export async function adminDigestSentToday(now: Date = new Date()): Promise<boolean> {
  const db = sql();
  const todayUtc = now.toISOString().slice(0, 10);
  const rows = (await db`
    SELECT 1 FROM lounge_cert_alert_log
    WHERE audience = 'admin_digest' AND DATE(sent_at) = ${todayUtc}::date
    LIMIT 1
  `) as unknown as { "?column?": number }[];
  return rows.length > 0;
}
