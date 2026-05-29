/**
 * Lounge notifications — a single inbox for things the user should know
 * about. Posts on the Wall, @-mentions, and direct messages all funnel
 * here. UI surfaces:
 *
 *   - a sidebar tab with an unread badge
 *   - a "Notifications" page that lists the feed
 *   - a bottom-right toast when a fresh one arrives
 */
import { randomUUID } from "crypto";
import { sql } from "./db";

export type NotificationKind = "post" | "mention" | "message" | "comment";

export interface NotificationRow {
  id: string;
  recipientId: string;
  kind: NotificationKind;
  title: string;
  bodyPreview: string;
  linkUrl: string;
  sourceId: string | null;
  actor: { id: string; firstName: string; lastName: string; photoUrl: string | null } | null;
  readAt: string | null;
  createdAt: string;
}

let schemaEnsured = false;
async function ensureSchema() {
  if (schemaEnsured) return;
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS lounge_notifications (
      id           TEXT PRIMARY KEY,
      recipient_id TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
      kind         TEXT NOT NULL,
      title        TEXT NOT NULL,
      body_preview TEXT NOT NULL DEFAULT '',
      link_url     TEXT NOT NULL,
      source_id    TEXT,
      actor_id     TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
      read_at      TIMESTAMPTZ,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS lounge_notifications_recipient_idx ON lounge_notifications (recipient_id, created_at DESC)`;
  await db`CREATE INDEX IF NOT EXISTS lounge_notifications_unread_idx ON lounge_notifications (recipient_id) WHERE read_at IS NULL`;
  schemaEnsured = true;
}

export interface CreateNotification {
  recipientId: string;
  kind: NotificationKind;
  title: string;
  bodyPreview?: string;
  linkUrl: string;
  sourceId?: string | null;
  actorId?: string | null;
}

export async function createNotifications(items: CreateNotification[]): Promise<void> {
  if (items.length === 0) return;
  await ensureSchema();
  const db = sql();
  for (const n of items) {
    if (n.recipientId === n.actorId) continue; // never notify yourself about your own action

    // Message-kind dedupe. When the same actor sends multiple messages in
    // the same conversation, collapse them into one unread notification
    // that updates in place — so a flurry of 8 DMs from one person shows
    // up as a single "X messaged you" row, not eight stacked entries.
    // We only collapse against rows that are still UNREAD; once read, a
    // brand new message creates a fresh row again.
    if (n.kind === "message" && n.sourceId) {
      const existing = (await db`
        SELECT id FROM lounge_notifications
        WHERE recipient_id = ${n.recipientId}
          AND kind = 'message'
          AND source_id = ${n.sourceId}
          AND actor_id = ${n.actorId ?? null}
          AND read_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
      `) as unknown as { id: string }[];
      if (existing[0]) {
        await db`
          UPDATE lounge_notifications
          SET title = ${n.title},
              body_preview = ${n.bodyPreview ?? ""},
              link_url = ${n.linkUrl},
              created_at = NOW()
          WHERE id = ${existing[0].id}
        `;
        continue;
      }
    }

    await db`
      INSERT INTO lounge_notifications
        (id, recipient_id, kind, title, body_preview, link_url, source_id, actor_id)
      VALUES
        (${randomUUID()}, ${n.recipientId}, ${n.kind}, ${n.title},
         ${n.bodyPreview ?? ""}, ${n.linkUrl}, ${n.sourceId ?? null}, ${n.actorId ?? null})
    `;
  }
}

export async function listNotifications(recipientId: string, opts?: { limit?: number; onlyUnread?: boolean }): Promise<NotificationRow[]> {
  await ensureSchema();
  const limit = Math.min(200, Math.max(1, opts?.limit ?? 60));
  const db = sql();
  const rows = opts?.onlyUnread
    ? (await db`
        SELECT n.*, a.first_name AS actor_first_name, a.last_name AS actor_last_name, a.photo_url AS actor_photo_url
        FROM lounge_notifications n
        LEFT JOIN lounge_employees a ON a.id = n.actor_id
        WHERE n.recipient_id = ${recipientId} AND n.read_at IS NULL
        ORDER BY n.created_at DESC
        LIMIT ${limit}
      `) as unknown as DbRow[]
    : (await db`
        SELECT n.*, a.first_name AS actor_first_name, a.last_name AS actor_last_name, a.photo_url AS actor_photo_url
        FROM lounge_notifications n
        LEFT JOIN lounge_employees a ON a.id = n.actor_id
        WHERE n.recipient_id = ${recipientId}
        ORDER BY n.created_at DESC
        LIMIT ${limit}
      `) as unknown as DbRow[];
  return rows.map(rowToNotification);
}

interface DbRow {
  id: string;
  recipient_id: string;
  kind: NotificationKind;
  title: string;
  body_preview: string;
  link_url: string;
  source_id: string | null;
  actor_id: string | null;
  read_at: string | null;
  created_at: string;
  actor_first_name: string | null;
  actor_last_name: string | null;
  actor_photo_url: string | null;
}

function rowToNotification(r: DbRow): NotificationRow {
  return {
    id: r.id,
    recipientId: r.recipient_id,
    kind: r.kind,
    title: r.title,
    bodyPreview: r.body_preview,
    linkUrl: r.link_url,
    sourceId: r.source_id,
    actor: r.actor_id ? {
      id: r.actor_id,
      firstName: r.actor_first_name ?? "",
      lastName: r.actor_last_name ?? "",
      photoUrl: r.actor_photo_url,
    } : null,
    readAt: r.read_at,
    createdAt: r.created_at,
  };
}

export async function countUnread(recipientId: string): Promise<number> {
  await ensureSchema();
  const db = sql();
  const rows = (await db`
    SELECT COUNT(*)::int AS c FROM lounge_notifications WHERE recipient_id = ${recipientId} AND read_at IS NULL
  `) as unknown as { c: number }[];
  return rows[0]?.c ?? 0;
}

export async function markAllRead(recipientId: string): Promise<void> {
  await ensureSchema();
  const db = sql();
  await db`UPDATE lounge_notifications SET read_at = NOW() WHERE recipient_id = ${recipientId} AND read_at IS NULL`;
}

export async function markRead(notificationId: string, recipientId: string): Promise<void> {
  await ensureSchema();
  const db = sql();
  await db`UPDATE lounge_notifications SET read_at = NOW() WHERE id = ${notificationId} AND recipient_id = ${recipientId}`;
}
