/**
 * Wall / shift-to-shift feed.
 *
 * Posts have:
 *   - body text (markdown not supported yet; plain text + line breaks)
 *   - optional media (Vercel Blob URLs)
 *   - reactions (one per user × post; "kind" is just an emoji/string)
 *   - threaded comments (single level; parent_id can nest but UI is flat for now)
 *   - pinned / highlighted flags (admin only)
 *   - saved_by[] for bookmarks (any user can save)
 */
import { randomUUID } from "crypto";
import { sql } from "./db";
import { createNotifications, type CreateNotification } from "./notifications";

export interface FeedAuthor {
  id: string;
  firstName: string;
  lastName: string;
  certification: string | null;
  position: string | null;
  photoUrl: string | null;
  isAdmin: boolean;
}
export interface FeedReaction {
  userId: string;
  kind: string;
  firstName: string;
  lastName: string;
}
export interface FeedComment {
  id: string;
  postId: string;
  author: FeedAuthor;
  body: string;
  createdAt: string;
}
export const WALL_SUBJECT_TAGS = [
  "Agency announcements",
  "New hires",
  "Promotions",
  "Clinical saves",
  "Training photos",
  "Community event photos",
  "Equipment updates",
  "Message from the Chief",
  "Shift highlights",
  "Recognition posts",
] as const;
export type WallSubjectTag = (typeof WALL_SUBJECT_TAGS)[number];

export interface FeedMention { id: string; firstName: string; lastName: string }

export interface FeedPost {
  id: string;
  author: FeedAuthor;
  body: string;
  subject: WallSubjectTag | null;
  mentions: FeedMention[];
  media: { url: string; kind: "image" | "video" | "file"; name?: string }[];
  pinned: boolean;
  highlighted: boolean;
  savedByMe: boolean;
  reactions: FeedReaction[];
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

interface DbPostRow {
  id: string;
  author_id: string;
  body: string;
  subject: string | null;
  mentioned_ids: string[] | null;
  media: unknown;
  pinned: boolean;
  highlighted: boolean;
  saved_by: string[];
  created_at: string;
  updated_at: string;
  author_first_name: string;
  author_last_name: string;
  author_certification: string | null;
  author_position: string | null;
  author_photo_url: string | null;
  author_is_admin: boolean;
}

function parseMedia(v: unknown): FeedPost["media"] {
  if (!v) return [];
  if (Array.isArray(v)) {
    return v.filter((m) => m && typeof m === "object" && "url" in m).map((m) => {
      const k = (m as { kind?: string }).kind;
      const kind: "image" | "video" | "file" =
        k === "video" ? "video" : k === "file" ? "file" : "image";
      return {
        url: String((m as { url: unknown }).url ?? ""),
        kind,
        name: (m as { name?: string }).name,
      };
    });
  }
  return [];
}

function rowToPost(
  r: DbPostRow,
  viewerId: string,
  reactions: FeedReaction[],
  commentCount: number,
  mentions: FeedMention[],
): FeedPost {
  return {
    id: r.id,
    author: {
      id: r.author_id,
      firstName: r.author_first_name,
      lastName: r.author_last_name,
      certification: r.author_certification,
      position: r.author_position,
      photoUrl: r.author_photo_url,
      isAdmin: r.author_is_admin,
    },
    body: r.body,
    subject: (r.subject as WallSubjectTag | null) ?? null,
    mentions,
    media: parseMedia(r.media),
    pinned: r.pinned,
    highlighted: r.highlighted,
    savedByMe: Array.isArray(r.saved_by) && r.saved_by.includes(viewerId),
    reactions,
    commentCount,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

async function loadMentionMap(ids: string[]): Promise<Map<string, FeedMention>> {
  if (ids.length === 0) return new Map();
  const db = sql();
  const rows = (await db`
    SELECT id, first_name, last_name FROM lounge_employees WHERE id = ANY(${ids}::text[])
  `) as unknown as { id: string; first_name: string; last_name: string }[];
  const m = new Map<string, FeedMention>();
  for (const r of rows) m.set(r.id, { id: r.id, firstName: r.first_name, lastName: r.last_name });
  return m;
}

// ── Posts ──────────────────────────────────────────────────────────────

export async function listFeed(viewerId: string, limit = 50): Promise<FeedPost[]> {
  const db = sql();
  const rows = (await db`
    SELECT p.id, p.author_id, p.body, p.media, p.pinned, p.highlighted,
           p.saved_by, p.created_at, p.updated_at, p.subject, p.mentioned_ids,
           e.first_name AS author_first_name,
           e.last_name AS author_last_name,
           e.certification AS author_certification,
           e.position AS author_position,
           e.photo_url AS author_photo_url,
           e.is_admin AS author_is_admin
    FROM lounge_feed_posts p
    JOIN lounge_employees e ON e.id = p.author_id
    ORDER BY p.pinned DESC, p.created_at DESC
    LIMIT ${limit}
  `) as unknown as DbPostRow[];

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const [rxRows, cmtRows] = await Promise.all([
    db`
      SELECT r.post_id, r.user_id, r.kind, e.first_name, e.last_name
      FROM lounge_feed_post_reactions r
      JOIN lounge_employees e ON e.id = r.user_id
      WHERE r.post_id = ANY(${ids}::text[])
    ` as unknown as Promise<
      { post_id: string; user_id: string; kind: string; first_name: string; last_name: string }[]
    >,
    db`
      SELECT post_id, COUNT(*)::int AS c
      FROM lounge_feed_post_comments
      WHERE post_id = ANY(${ids}::text[])
      GROUP BY post_id
    ` as unknown as Promise<{ post_id: string; c: number }[]>,
  ]);

  const rxByPost = new Map<string, FeedReaction[]>();
  for (const r of await rxRows) {
    const list = rxByPost.get(r.post_id) ?? [];
    list.push({ userId: r.user_id, kind: r.kind, firstName: r.first_name, lastName: r.last_name });
    rxByPost.set(r.post_id, list);
  }
  const cByPost = new Map<string, number>();
  for (const r of await cmtRows) cByPost.set(r.post_id, r.c);

  const allMentionIds = Array.from(new Set(rows.flatMap((r) => r.mentioned_ids ?? [])));
  const mentionMap = await loadMentionMap(allMentionIds);

  return rows.map((r) =>
    rowToPost(
      r,
      viewerId,
      rxByPost.get(r.id) ?? [],
      cByPost.get(r.id) ?? 0,
      (r.mentioned_ids ?? []).map((mid) => mentionMap.get(mid)).filter((m): m is FeedMention => !!m),
    ),
  );
}

export async function getPost(
  postId: string,
  viewerId: string,
): Promise<FeedPost | null> {
  const db = sql();
  const rows = (await db`
    SELECT p.id, p.author_id, p.body, p.media, p.pinned, p.highlighted,
           p.saved_by, p.created_at, p.updated_at, p.subject, p.mentioned_ids,
           e.first_name AS author_first_name,
           e.last_name AS author_last_name,
           e.certification AS author_certification,
           e.position AS author_position,
           e.photo_url AS author_photo_url,
           e.is_admin AS author_is_admin
    FROM lounge_feed_posts p
    JOIN lounge_employees e ON e.id = p.author_id
    WHERE p.id = ${postId}
    LIMIT 1
  `) as unknown as DbPostRow[];
  if (!rows[0]) return null;

  const [rxRows, cmtRows] = await Promise.all([
    db`
      SELECT r.user_id, r.kind, e.first_name, e.last_name
      FROM lounge_feed_post_reactions r
      JOIN lounge_employees e ON e.id = r.user_id
      WHERE r.post_id = ${postId}
    ` as unknown as Promise<
      { user_id: string; kind: string; first_name: string; last_name: string }[]
    >,
    db`SELECT COUNT(*)::int AS c FROM lounge_feed_post_comments WHERE post_id = ${postId}` as unknown as Promise<{ c: number }[]>,
  ]);
  const reactions: FeedReaction[] = (await rxRows).map((r) => ({
    userId: r.user_id,
    kind: r.kind,
    firstName: r.first_name,
    lastName: r.last_name,
  }));
  const count = (await cmtRows)[0]?.c ?? 0;
  const mentionIds = rows[0].mentioned_ids ?? [];
  const mentionMap = await loadMentionMap(mentionIds);
  const mentions = mentionIds.map((mid) => mentionMap.get(mid)).filter((m): m is FeedMention => !!m);
  return rowToPost(rows[0], viewerId, reactions, count, mentions);
}

let columnsEnsured = false;
async function ensurePostColumns() {
  if (columnsEnsured) return;
  const db = sql();
  await db`ALTER TABLE lounge_feed_posts ADD COLUMN IF NOT EXISTS subject TEXT`;
  await db`ALTER TABLE lounge_feed_posts ADD COLUMN IF NOT EXISTS mentioned_ids TEXT[]`;
  await db`CREATE INDEX IF NOT EXISTS lounge_feed_posts_subject_idx ON lounge_feed_posts (subject)`;
  columnsEnsured = true;
}

export async function createPost(input: {
  authorId: string;
  body: string;
  subject?: WallSubjectTag | null;
  mentions?: string[];
  media?: { url: string; kind: "image" | "video" | "file"; name?: string }[];
}): Promise<FeedPost> {
  await ensurePostColumns();
  const id = randomUUID();
  const db = sql();
  const subject = input.subject && (WALL_SUBJECT_TAGS as readonly string[]).includes(input.subject)
    ? input.subject
    : null;
  const mentionedIds = Array.isArray(input.mentions)
    ? Array.from(new Set(input.mentions.filter((m) => typeof m === "string" && m.length > 0)))
    : [];
  await db`
    INSERT INTO lounge_feed_posts (id, author_id, body, subject, mentioned_ids, media)
    VALUES (${id}, ${input.authorId}, ${input.body}, ${subject},
            ${mentionedIds}::text[],
            ${input.media ? JSON.stringify(input.media) : null}::jsonb)
  `;
  const post = await getPost(id, input.authorId);
  if (!post) throw new Error("Post not found after create");

  // ─ Notifications fan-out ────────────────────────────────────────────
  // 1. Every active employee except the author gets a "new post" item.
  // 2. Anyone the author tagged via @mention gets a louder "mention"
  //    item — both render together, the mention overrides the post one.
  try {
    const employees = (await db`
      SELECT id FROM lounge_employees WHERE is_active = TRUE AND id <> ${input.authorId}
    `) as unknown as { id: string }[];
    const mentioned = new Set(mentionedIds);
    const preview = (input.body || "").slice(0, 180);
    const author = (await db`
      SELECT first_name, last_name FROM lounge_employees WHERE id = ${input.authorId} LIMIT 1
    `) as unknown as { first_name: string; last_name: string }[];
    const authorName = author[0] ? `${author[0].first_name} ${author[0].last_name}` : "Someone";
    const items: CreateNotification[] = [];
    for (const e of employees) {
      const isMention = mentioned.has(e.id);
      items.push({
        recipientId: e.id,
        kind: isMention ? "mention" : "post",
        title: isMention ? `${authorName} mentioned you on the Wall` : `${authorName} posted on the Wall`,
        bodyPreview: preview,
        linkUrl: "/lounge",
        sourceId: post.id,
        actorId: input.authorId,
      });
    }
    await createNotifications(items);
  } catch (e) {
    console.error("[feed] notify fanout failed:", e instanceof Error ? e.message : e);
  }

  return post;
}

export async function deletePost(postId: string): Promise<void> {
  const db = sql();
  await db`DELETE FROM lounge_feed_posts WHERE id = ${postId}`;
}

export async function setPinned(postId: string, pinned: boolean): Promise<void> {
  const db = sql();
  await db`UPDATE lounge_feed_posts SET pinned = ${pinned}, updated_at = NOW() WHERE id = ${postId}`;
}

export async function toggleSaved(postId: string, userId: string): Promise<boolean> {
  const db = sql();
  const rows = (await db`
    SELECT saved_by FROM lounge_feed_posts WHERE id = ${postId} LIMIT 1
  `) as unknown as { saved_by: string[] }[];
  if (!rows[0]) return false;
  const current = rows[0].saved_by ?? [];
  const has = current.includes(userId);
  const next = has ? current.filter((u) => u !== userId) : [...current, userId];
  await db`UPDATE lounge_feed_posts SET saved_by = ${next}::text[], updated_at = NOW() WHERE id = ${postId}`;
  return !has;
}

// ── Reactions ───────────────────────────────────────────────────────────

export async function setReaction(
  postId: string,
  userId: string,
  kind: string | null,
): Promise<void> {
  const db = sql();
  if (kind === null) {
    await db`DELETE FROM lounge_feed_post_reactions WHERE post_id = ${postId} AND user_id = ${userId}`;
    return;
  }
  await db`
    INSERT INTO lounge_feed_post_reactions (post_id, user_id, kind)
    VALUES (${postId}, ${userId}, ${kind})
    ON CONFLICT (post_id, user_id) DO UPDATE SET kind = ${kind}, created_at = NOW()
  `;
}

// ── Comments ────────────────────────────────────────────────────────────

interface DbCommentRow {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  first_name: string;
  last_name: string;
  certification: string | null;
  position: string | null;
  photo_url: string | null;
  is_admin: boolean;
}

function rowToComment(r: DbCommentRow): FeedComment {
  return {
    id: r.id,
    postId: r.post_id,
    author: {
      id: r.author_id,
      firstName: r.first_name,
      lastName: r.last_name,
      certification: r.certification,
      position: r.position,
      photoUrl: r.photo_url,
      isAdmin: r.is_admin,
    },
    body: r.body,
    createdAt: r.created_at,
  };
}

export async function listComments(postId: string): Promise<FeedComment[]> {
  const db = sql();
  const rows = (await db`
    SELECT c.id, c.post_id, c.author_id, c.body, c.created_at,
           e.first_name, e.last_name, e.certification, e.position, e.photo_url, e.is_admin
    FROM lounge_feed_post_comments c
    JOIN lounge_employees e ON e.id = c.author_id
    WHERE c.post_id = ${postId}
    ORDER BY c.created_at ASC
  `) as unknown as DbCommentRow[];
  return rows.map(rowToComment);
}

export async function addComment(input: {
  postId: string;
  authorId: string;
  body: string;
  mentions?: string[];
}): Promise<FeedComment> {
  const id = randomUUID();
  const db = sql();
  await db`
    INSERT INTO lounge_feed_post_comments (id, post_id, author_id, body)
    VALUES (${id}, ${input.postId}, ${input.authorId}, ${input.body})
  `;
  const rows = (await db`
    SELECT c.id, c.post_id, c.author_id, c.body, c.created_at,
           e.first_name, e.last_name, e.certification, e.position, e.photo_url, e.is_admin
    FROM lounge_feed_post_comments c
    JOIN lounge_employees e ON e.id = c.author_id
    WHERE c.id = ${id} LIMIT 1
  `) as unknown as DbCommentRow[];
  const comment = rowToComment(rows[0]);

  // ─ Notifications ─────────────────────────────────────────────────────
  // Original post author + any @-mentioned users get a comment ping.
  try {
    const post = (await db`
      SELECT author_id, body FROM lounge_feed_posts WHERE id = ${input.postId} LIMIT 1
    `) as unknown as { author_id: string; body: string }[];
    if (post[0]) {
      const recipients = new Set<string>();
      if (post[0].author_id !== input.authorId) recipients.add(post[0].author_id);
      for (const m of input.mentions ?? []) if (m !== input.authorId) recipients.add(m);
      if (recipients.size > 0) {
        const author = (await db`
          SELECT first_name, last_name FROM lounge_employees WHERE id = ${input.authorId} LIMIT 1
        `) as unknown as { first_name: string; last_name: string }[];
        const authorName = author[0] ? `${author[0].first_name} ${author[0].last_name}` : "Someone";
        const items: CreateNotification[] = Array.from(recipients).map((rid) => ({
          recipientId: rid,
          kind: (input.mentions ?? []).includes(rid) ? "mention" : "comment",
          title: (input.mentions ?? []).includes(rid)
            ? `${authorName} mentioned you in a comment`
            : `${authorName} commented on your post`,
          bodyPreview: input.body.slice(0, 180),
          linkUrl: "/lounge",
          sourceId: input.postId,
          actorId: input.authorId,
        }));
        await createNotifications(items);
      }
    }
  } catch (e) {
    console.error("[feed] comment notify failed:", e instanceof Error ? e.message : e);
  }

  return comment;
}

export async function deleteComment(commentId: string): Promise<void> {
  const db = sql();
  await db`DELETE FROM lounge_feed_post_comments WHERE id = ${commentId}`;
}

export async function getCommentAuthor(commentId: string): Promise<string | null> {
  const db = sql();
  const rows = (await db`
    SELECT author_id FROM lounge_feed_post_comments WHERE id = ${commentId} LIMIT 1
  `) as unknown as { author_id: string }[];
  return rows[0]?.author_id ?? null;
}
