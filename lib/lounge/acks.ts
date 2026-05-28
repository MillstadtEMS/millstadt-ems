/**
 * Acknowledgments — "eyes-on" notices. Admin posts; every active employee
 * must mark them viewed (and acknowledged, when `requires_acknowledgment`).
 * Compliance roll-up lets admins see who's outstanding.
 */
import { randomUUID } from "crypto";
import { sql } from "./db";

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
}): Promise<Ack> {
  const id = randomUUID();
  const db = sql();
  await db`
    INSERT INTO lounge_acks
      (id, title, body, category, created_by, requires_acknowledgment,
       attachment_uri, attachment_name, attachment_type)
    VALUES
      (${id}, ${input.title.trim()}, ${input.body}, ${input.category},
       ${input.authorId}, ${input.requiresAcknowledgment},
       ${input.attachmentUri ?? null}, ${input.attachmentName ?? null},
       ${input.attachmentType ?? null})
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

export async function markViewed(ackId: string, userId: string): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO lounge_ack_states (ack_id, user_id, viewed_at)
    VALUES (${ackId}, ${userId}, NOW())
    ON CONFLICT (ack_id, user_id) DO UPDATE
      SET viewed_at = COALESCE(lounge_ack_states.viewed_at, NOW())
  `;
}

export async function markAcknowledged(ackId: string, userId: string): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO lounge_ack_states (ack_id, user_id, viewed_at, acknowledged_at)
    VALUES (${ackId}, ${userId}, NOW(), NOW())
    ON CONFLICT (ack_id, user_id) DO UPDATE
      SET viewed_at = COALESCE(lounge_ack_states.viewed_at, NOW()),
          acknowledged_at = NOW()
  `;
}

export async function deleteAck(ackId: string): Promise<void> {
  const db = sql();
  await db`DELETE FROM lounge_acks WHERE id = ${ackId}`;
}

/** Returns just the outstanding-acks count for badge display. */
export async function outstandingAckCount(viewerId: string): Promise<number> {
  const db = sql();
  const rows = (await db`
    SELECT COUNT(*)::int AS c
    FROM lounge_acks a
    LEFT JOIN lounge_ack_states s ON s.ack_id = a.id AND s.user_id = ${viewerId}
    WHERE a.requires_acknowledgment = TRUE
      AND s.acknowledged_at IS NULL
  `) as unknown as { c: number }[];
  return rows[0]?.c ?? 0;
}
