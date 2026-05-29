/**
 * Lounge messenger — persistent 1:1 threads + group conversations.
 *
 * Key property: opening a chat with another employee returns the SAME
 * conversation every time. We don't create a new thread per message.
 */

import { randomUUID } from "crypto";
import { sql } from "./db";

export interface ConversationPreview {
  id: string;
  kind: "dm" | "group";
  title: string | null;
  participants: { id: string; firstName: string; lastName: string; photoUrl: string | null }[];
  lastMessage: { body: string; authorId: string; createdAt: string } | null;
  unreadCount: number;
  updatedAt: string;
}

export interface MessageRow {
  id: string;
  conversationId: string;
  authorId: string;
  authorFirstName: string;
  authorLastName: string;
  authorPhotoUrl: string | null;
  body: string;
  createdAt: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────

function sortedKey(ids: string[]): string {
  return [...ids].sort().join("|");
}

interface ConversationRow {
  id: string;
  kind: "dm" | "group";
  title: string | null;
  participant_ids: string[];
  read_by: Record<string, string>;
  updated_at: string;
}

interface ParticipantInfo {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
}

// ── Find or create the DM thread between two users ──────────────────────

export async function findOrCreateDm(meId: string, otherId: string): Promise<string> {
  if (meId === otherId) throw new Error("Cannot DM yourself");
  const db = sql();
  const key = sortedKey([meId, otherId]);

  // Try to find an existing DM by exact participant set (sorted match).
  const existing = (await db`
    SELECT id, participant_ids FROM lounge_conversations
    WHERE kind = 'dm'
      AND participant_ids @> ${[meId, otherId]}::text[]
      AND participant_ids <@ ${[meId, otherId]}::text[]
    LIMIT 1
  `) as unknown as { id: string; participant_ids: string[] }[];
  for (const row of existing) {
    if (sortedKey(row.participant_ids) === key) return row.id;
  }

  // Create a fresh one.
  const id = randomUUID();
  await db`
    INSERT INTO lounge_conversations (id, kind, participant_ids)
    VALUES (${id}, 'dm', ${[meId, otherId]}::text[])
  `;
  return id;
}

// ── List my conversations (with last message + unread count) ────────────

export async function listMyConversations(meId: string): Promise<ConversationPreview[]> {
  const db = sql();
  const rows = (await db`
    SELECT id, kind, title, participant_ids, read_by, updated_at
    FROM lounge_conversations
    WHERE ${meId} = ANY(participant_ids)
    ORDER BY updated_at DESC
    LIMIT 100
  `) as unknown as ConversationRow[];

  if (rows.length === 0) return [];

  // Fetch participant info in one shot
  const allIds = Array.from(new Set(rows.flatMap((r) => r.participant_ids)));
  const empRows = (await db`
    SELECT id, first_name, last_name, photo_url
    FROM lounge_employees
    WHERE id = ANY(${allIds}::text[])
  `) as unknown as { id: string; first_name: string; last_name: string; photo_url: string | null }[];
  const empMap = new Map<string, ParticipantInfo>();
  for (const e of empRows) {
    empMap.set(e.id, {
      id: e.id,
      firstName: e.first_name,
      lastName: e.last_name,
      photoUrl: e.photo_url,
    });
  }

  // Fetch the most recent message per conversation
  const ids = rows.map((r) => r.id);
  const lastMsgs = (await db`
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id, m.id, m.author_id, m.body, m.created_at
    FROM lounge_messages m
    WHERE m.conversation_id = ANY(${ids}::text[])
    ORDER BY m.conversation_id, m.created_at DESC
  `) as unknown as { conversation_id: string; id: string; author_id: string; body: string; created_at: string }[];
  const lastByConv = new Map<string, { id: string; author_id: string; body: string; created_at: string }>();
  for (const m of lastMsgs) lastByConv.set(m.conversation_id, m);

  // Per-conversation unread count
  const unreadRows = (await db`
    SELECT m.conversation_id,
           COUNT(*)::int AS unread
    FROM lounge_messages m
    JOIN lounge_conversations c ON c.id = m.conversation_id
    WHERE c.id = ANY(${ids}::text[])
      AND m.author_id <> ${meId}
      AND (c.read_by ->> ${meId} IS NULL OR m.created_at > (c.read_by ->> ${meId})::timestamptz)
    GROUP BY m.conversation_id
  `) as unknown as { conversation_id: string; unread: number }[];
  const unreadMap = new Map<string, number>();
  for (const u of unreadRows) unreadMap.set(u.conversation_id, u.unread);

  return rows.map((r) => {
    const participants = r.participant_ids
      .filter((id) => id !== meId)
      .map((id) => empMap.get(id))
      .filter((p): p is ParticipantInfo => !!p);
    const last = lastByConv.get(r.id);
    return {
      id: r.id,
      kind: r.kind,
      title: r.title,
      participants,
      lastMessage: last ? { body: last.body, authorId: last.author_id, createdAt: last.created_at } : null,
      unreadCount: unreadMap.get(r.id) ?? 0,
      updatedAt: r.updated_at,
    };
  });
}

// ── List messages in a thread ───────────────────────────────────────────

export async function listMessages(conversationId: string, meId: string, since?: string): Promise<MessageRow[]> {
  const db = sql();
  // gate: must be a participant
  const conv = (await db`
    SELECT participant_ids FROM lounge_conversations WHERE id = ${conversationId} LIMIT 1
  `) as unknown as { participant_ids: string[] }[];
  if (!conv[0] || !conv[0].participant_ids.includes(meId)) return [];

  const rows = since
    ? (await db`
        SELECT m.id, m.conversation_id, m.author_id, m.body, m.created_at,
               e.first_name AS author_first_name, e.last_name AS author_last_name,
               e.photo_url AS author_photo_url
        FROM lounge_messages m
        JOIN lounge_employees e ON e.id = m.author_id
        WHERE m.conversation_id = ${conversationId}
          AND m.created_at > ${since}::timestamptz
        ORDER BY m.created_at ASC
        LIMIT 500
      `) as unknown as {
        id: string; conversation_id: string; author_id: string;
        body: string; created_at: string;
        author_first_name: string; author_last_name: string; author_photo_url: string | null;
      }[]
    : (await db`
        SELECT m.id, m.conversation_id, m.author_id, m.body, m.created_at,
               e.first_name AS author_first_name, e.last_name AS author_last_name,
               e.photo_url AS author_photo_url
        FROM lounge_messages m
        JOIN lounge_employees e ON e.id = m.author_id
        WHERE m.conversation_id = ${conversationId}
        ORDER BY m.created_at ASC
        LIMIT 500
      `) as unknown as {
        id: string; conversation_id: string; author_id: string;
        body: string; created_at: string;
        author_first_name: string; author_last_name: string; author_photo_url: string | null;
      }[];

  return rows.map((r) => ({
    id: r.id,
    conversationId: r.conversation_id,
    authorId: r.author_id,
    authorFirstName: r.author_first_name,
    authorLastName: r.author_last_name,
    authorPhotoUrl: r.author_photo_url,
    body: r.body,
    createdAt: r.created_at,
  }));
}

// ── Send a message ──────────────────────────────────────────────────────

export async function sendMessage(input: {
  conversationId: string;
  authorId: string;
  body: string;
}): Promise<MessageRow | null> {
  const db = sql();
  const conv = (await db`
    SELECT participant_ids FROM lounge_conversations WHERE id = ${input.conversationId} LIMIT 1
  `) as unknown as { participant_ids: string[] }[];
  if (!conv[0] || !conv[0].participant_ids.includes(input.authorId)) return null;
  if (!input.body.trim()) return null;

  const id = randomUUID();
  await db`
    INSERT INTO lounge_messages (id, conversation_id, author_id, body)
    VALUES (${id}, ${input.conversationId}, ${input.authorId}, ${input.body.trim()})
  `;
  await db`
    UPDATE lounge_conversations
    SET updated_at = NOW(),
        read_by = read_by || jsonb_build_object(${input.authorId}::text, NOW()::text)
    WHERE id = ${input.conversationId}
  `;
  const list = await listMessages(input.conversationId, input.authorId, undefined);
  return list[list.length - 1] ?? null;
}

// ── Mark conversation as read for me ────────────────────────────────────

export async function markRead(conversationId: string, meId: string): Promise<void> {
  const db = sql();
  await db`
    UPDATE lounge_conversations
    SET read_by = read_by || jsonb_build_object(${meId}::text, NOW()::text)
    WHERE id = ${conversationId}
      AND ${meId} = ANY(participant_ids)
  `;
}
