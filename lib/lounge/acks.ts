/**
 * Acknowledgments — "eyes-on" notices. Admin posts; every active employee
 * must mark them viewed (and acknowledged, when `requires_acknowledgment`).
 * Compliance roll-up lets admins see who's outstanding.
 *
 * Targeting: by default an ack is global (every active employee sees it).
 * Set `target_employee_id` to a specific employee to scope visibility —
 * used by the dev-tools "push test ack" flow so a dummy ack only shows
 * up in the @testuser inbox.
 */
import { randomUUID } from "crypto";
import { sql } from "./db";

let targetingSchemaEnsured = false;
async function ensureAckTargetingSchema() {
  if (targetingSchemaEnsured) return;
  const db = sql();
  await db`ALTER TABLE lounge_acks ADD COLUMN IF NOT EXISTS target_employee_id TEXT REFERENCES lounge_employees(id) ON DELETE CASCADE`;
  await db`CREATE INDEX IF NOT EXISTS lounge_acks_target_idx ON lounge_acks (target_employee_id) WHERE target_employee_id IS NOT NULL`;
  targetingSchemaEnsured = true;
}

export interface AckAuthor {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
}
export interface Ack {
  id: string;
  title: string;
  body: string;
  category: string;
  createdBy: AckAuthor;
  requiresAcknowledgment: boolean;
  attachment: { uri: string | null; name: string | null; type: string | null };
  createdAt: string;
  updatedAt: string;
  // Per-viewer state, only set when fetched in user context:
  viewedAt?: string | null;
  acknowledgedAt?: string | null;
  // Per-ack roll-up, only set in admin context:
  totalEmployees?: number;
  viewedCount?: number;
  acknowledgedCount?: number;
}

interface DbAckRow {
  id: string;
  title: string;
  body: string;
  category: string;
  created_by: string;
  requires_acknowledgment: boolean;
  attachment_uri: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  created_at: string;
  updated_at: string;
  author_first_name: string;
  author_last_name: string;
  author_photo_url: string | null;
}

function rowToAck(r: DbAckRow): Ack {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    category: r.category,
    createdBy: {
      id: r.created_by,
      firstName: r.author_first_name,
      lastName: r.author_last_name,
      photoUrl: r.author_photo_url,
    },
    requiresAcknowledgment: r.requires_acknowledgment,
    attachment: {
      uri: r.attachment_uri,
      name: r.attachment_name,
      type: r.attachment_type,
    },
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listAcksForViewer(viewerId: string): Promise<Ack[]> {
  await ensureAckTargetingSchema();
  const db = sql();
  const rows = (await db`
    SELECT a.id, a.title, a.body, a.category, a.created_by,
           a.requires_acknowledgment, a.attachment_uri, a.attachment_name, a.attachment_type,
           a.created_at, a.updated_at,
           e.first_name AS author_first_name,
           e.last_name AS author_last_name,
           e.photo_url AS author_photo_url
    FROM lounge_acks a
    JOIN lounge_employees e ON e.id = a.created_by
    WHERE a.target_employee_id IS NULL OR a.target_employee_id = ${viewerId}
    ORDER BY a.created_at DESC
  `) as unknown as DbAckRow[];

  if (rows.length === 0) return [];

  const stateRows = (await db`
    SELECT ack_id, viewed_at, acknowledged_at
    FROM lounge_ack_states
    WHERE user_id = ${viewerId} AND ack_id = ANY(${rows.map((r) => r.id)}::text[])
  `) as unknown as { ack_id: string; viewed_at: string | null; acknowledged_at: string | null }[];
  const stateById = new Map(stateRows.map((s) => [s.ack_id, s]));

  return rows.map((r) => {
    const ack = rowToAck(r);
    const s = stateById.get(r.id);
    ack.viewedAt = s?.viewed_at ?? null;
    ack.acknowledgedAt = s?.acknowledged_at ?? null;
    return ack;
  });
}

export async function listAcksAdminRollup(): Promise<Ack[]> {
  await ensureAckTargetingSchema();
  const db = sql();
  const rows = (await db`
    SELECT a.id, a.title, a.body, a.category, a.created_by,
           a.requires_acknowledgment, a.attachment_uri, a.attachment_name, a.attachment_type,
           a.created_at, a.updated_at,
           e.first_name AS author_first_name,
           e.last_name AS author_last_name,
           e.photo_url AS author_photo_url,
           (SELECT COUNT(*)::int FROM lounge_employees WHERE is_active = TRUE) AS total_employees,
           (SELECT COUNT(*)::int FROM lounge_ack_states WHERE ack_id = a.id AND viewed_at IS NOT NULL) AS viewed_count,
           (SELECT COUNT(*)::int FROM lounge_ack_states WHERE ack_id = a.id AND acknowledged_at IS NOT NULL) AS acknowledged_count
    FROM lounge_acks a
    JOIN lounge_employees e ON e.id = a.created_by
    WHERE a.target_employee_id IS NULL
    ORDER BY a.created_at DESC
  `) as unknown as (DbAckRow & { total_employees: number; viewed_count: number; acknowledged_count: number })[];

  return rows.map((r) => {
    const ack = rowToAck(r);
    ack.totalEmployees = r.total_employees;
    ack.viewedCount = r.viewed_count;
    ack.acknowledgedCount = r.acknowledged_count;
    return ack;
  });
}

export async function createAck(input: {
  authorId: string;
  title: string;
  body: string;
  category: string;
  requiresAcknowledgment: boolean;
  attachmentUri?: string;
  attachmentName?: string;
  attachmentType?: string;
  targetEmployeeId?: string | null;
}): Promise<Ack> {
  await ensureAckTargetingSchema();
  const id = randomUUID();
  const db = sql();
  await db`
    INSERT INTO lounge_acks
      (id, title, body, category, created_by, requires_acknowledgment,
       attachment_uri, attachment_name, attachment_type, target_employee_id)
    VALUES
      (${id}, ${input.title.trim()}, ${input.body}, ${input.category},
       ${input.authorId}, ${input.requiresAcknowledgment},
       ${input.attachmentUri ?? null}, ${input.attachmentName ?? null},
       ${input.attachmentType ?? null}, ${input.targetEmployeeId ?? null})
  `;
  const rows = (await db`
    SELECT a.id, a.title, a.body, a.category, a.created_by,
           a.requires_acknowledgment, a.attachment_uri, a.attachment_name, a.attachment_type,
           a.created_at, a.updated_at,
           e.first_name AS author_first_name,
           e.last_name AS author_last_name,
           e.photo_url AS author_photo_url
    FROM lounge_acks a
    JOIN lounge_employees e ON e.id = a.created_by
    WHERE a.id = ${id} LIMIT 1
  `) as unknown as DbAckRow[];
  return rowToAck(rows[0]);
}

export async function getAckForUser(ackId: string, userId: string): Promise<Ack | null> {
  void userId;
  const db = sql();
  const rows = (await db`
    SELECT a.id, a.title, a.body, a.category, a.created_by,
           a.requires_acknowledgment, a.attachment_uri, a.attachment_name, a.attachment_type,
           a.created_at, a.updated_at,
           e.first_name AS author_first_name, e.last_name AS author_last_name,
           e.photo_url AS author_photo_url
    FROM lounge_acks a
    JOIN lounge_employees e ON e.id = a.created_by
    WHERE a.id = ${ackId}
    LIMIT 1
  `) as unknown as DbAckRow[];
  return rows[0] ? rowToAck(rows[0]) : null;
}

export async function markViewed(ackId: string, userId: string): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO lounge_ack_states (ack_id, user_id, viewed_at)
    VALUES (${ackId}, ${userId}, NOW())
    ON CONFLICT (ack_id, user_id) DO UPDATE
      SET viewed_at = COALESCE(lounge_ack_states.viewed_at, NOW())
  `;
}

export async function markAcknowledged(input: {
  ackId: string;
  userId: string;
  signatureDataUrl?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO lounge_ack_states (ack_id, user_id, viewed_at, acknowledged_at,
                                   signature_data_url, signature_ip, signature_ua)
    VALUES (${input.ackId}, ${input.userId}, NOW(), NOW(),
            ${input.signatureDataUrl ?? null}, ${input.ip ?? null}, ${input.userAgent ?? null})
    ON CONFLICT (ack_id, user_id) DO UPDATE
      SET viewed_at = COALESCE(lounge_ack_states.viewed_at, NOW()),
          acknowledged_at = NOW(),
          signature_data_url = COALESCE(EXCLUDED.signature_data_url, lounge_ack_states.signature_data_url),
          signature_ip = COALESCE(EXCLUDED.signature_ip, lounge_ack_states.signature_ip),
          signature_ua = COALESCE(EXCLUDED.signature_ua, lounge_ack_states.signature_ua)
  `;
}

/** Link an acknowledgment to a personnel record (the file row that holds it). */
export async function linkAckToPersonnelRecord(ackId: string, userId: string, personnelRecordId: string): Promise<void> {
  const db = sql();
  await db`
    UPDATE lounge_ack_states
    SET personnel_record_id = ${personnelRecordId}
    WHERE ack_id = ${ackId} AND user_id = ${userId}
  `;
}

/** Admin view: roster of every active employee with their ack state for this ack. */
export async function listAckRoster(ackId: string): Promise<{
  employeeId: string;
  firstName: string;
  lastName: string;
  certification: string | null;
  viewedAt: string | null;
  acknowledgedAt: string | null;
  signatureDataUrl: string | null;
}[]> {
  const db = sql();
  const rows = (await db`
    SELECT e.id AS employee_id, e.first_name, e.last_name, e.certification,
           s.viewed_at, s.acknowledged_at, s.signature_data_url
    FROM lounge_employees e
    LEFT JOIN lounge_ack_states s ON s.ack_id = ${ackId} AND s.user_id = e.id
    WHERE e.is_active = TRUE
    ORDER BY (s.acknowledged_at IS NULL) DESC,
             e.last_name ASC, e.first_name ASC
  `) as unknown as {
    employee_id: string;
    first_name: string;
    last_name: string;
    certification: string | null;
    viewed_at: string | null;
    acknowledged_at: string | null;
    signature_data_url: string | null;
  }[];
  return rows.map((r) => ({
    employeeId: r.employee_id,
    firstName: r.first_name,
    lastName: r.last_name,
    certification: r.certification,
    viewedAt: r.viewed_at,
    acknowledgedAt: r.acknowledged_at,
    signatureDataUrl: r.signature_data_url,
  }));
}

export async function deleteAck(ackId: string): Promise<void> {
  const db = sql();
  await db`DELETE FROM lounge_acks WHERE id = ${ackId}`;
}

/** Returns just the outstanding-acks count for badge display. */
export async function outstandingAckCount(viewerId: string): Promise<number> {
  await ensureAckTargetingSchema();
  const db = sql();
  const rows = (await db`
    SELECT COUNT(*)::int AS c
    FROM lounge_acks a
    LEFT JOIN lounge_ack_states s ON s.ack_id = a.id AND s.user_id = ${viewerId}
    WHERE a.requires_acknowledgment = TRUE
      AND (a.target_employee_id IS NULL OR a.target_employee_id = ${viewerId})
      AND s.acknowledged_at IS NULL
  `) as unknown as { c: number }[];
  return rows[0]?.c ?? 0;
}
