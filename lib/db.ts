/**
 * General site database — Neon Postgres.
 * Tables: testimonials, bulletin_posts, announcements
 */

import { neon } from "@neondatabase/serverless";

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  return neon(url);
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ── Schema ─────────────────────────────────────────────────────────────────

export async function ensureSiteSchema() {
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS testimonials (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      role        TEXT NOT NULL DEFAULT '',
      quote       TEXT NOT NULL,
      rating      INTEGER NOT NULL DEFAULT 5,
      approved    BOOLEAN NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS bulletin_posts (
      id          TEXT PRIMARY KEY,
      author      TEXT NOT NULL,
      title       TEXT NOT NULL,
      body        TEXT NOT NULL,
      category    TEXT NOT NULL DEFAULT 'General',
      approved    BOOLEAN NOT NULL DEFAULT false,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS announcements (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      body        TEXT NOT NULL,
      severity    TEXT NOT NULL DEFAULT 'info',
      active      BOOLEAN NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS form_submissions (
      id           TEXT PRIMARY KEY,
      form_type    TEXT NOT NULL,
      fields       JSONB NOT NULL,
      submitted_at TIMESTAMPTZ DEFAULT NOW(),
      read_at      TIMESTAMPTZ
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS managed_images (
      id          TEXT PRIMARY KEY,
      key         TEXT NOT NULL UNIQUE,
      url         TEXT NOT NULL DEFAULT '',
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS gallery_images (
      id          TEXT PRIMARY KEY,
      collection  TEXT NOT NULL,
      url         TEXT NOT NULL,
      alt_text    TEXT NOT NULL DEFAULT '',
      brightness  REAL NOT NULL DEFAULT 0.45,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS site_content (
      key         TEXT PRIMARY KEY,
      live_value  TEXT NOT NULL DEFAULT '',
      draft_value TEXT,
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS change_log (
      id          TEXT PRIMARY KEY,
      action      TEXT NOT NULL,
      section     TEXT NOT NULL,
      detail      TEXT NOT NULL DEFAULT '',
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS sms_pending (
      id          TEXT PRIMARY KEY,
      call_id     TEXT NOT NULL,
      call_nature TEXT NOT NULL,
      replied     BOOLEAN NOT NULL DEFAULT FALSE,
      sent_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  rating: number;
  approved: boolean;
  createdAt: string;
}

export interface BulletinPost {
  id: string;
  author: string;
  title: string;
  body: string;
  category: string;
  approved: boolean;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  active: boolean;
  createdAt: string;
}

// ── Row mappers ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toTestimonial(r: any): Testimonial {
  return { id: r.id, name: r.name, role: r.role, quote: r.quote, rating: Number(r.rating), approved: Boolean(r.approved), createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at) };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toBulletin(r: any): BulletinPost {
  return { id: r.id, author: r.author, title: r.title, body: r.body, category: r.category, approved: Boolean(r.approved), createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at) };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toAnnouncement(r: any): Announcement {
  return { id: r.id, title: r.title, body: r.body, severity: r.severity, active: Boolean(r.active), createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at) };
}

// ── Testimonials ───────────────────────────────────────────────────────────

export async function getTestimonials(all = false): Promise<Testimonial[]> {
  await ensureSiteSchema();
  const db = sql();
  const rows = all
    ? await db`SELECT * FROM testimonials ORDER BY created_at DESC`
    : await db`SELECT * FROM testimonials WHERE approved = true ORDER BY created_at DESC`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (rows as any[]).map(toTestimonial);
}

export async function createTestimonial(data: Omit<Testimonial, "id" | "createdAt">): Promise<Testimonial> {
  await ensureSiteSchema();
  const db = sql();
  const id = uid();
  await db`INSERT INTO testimonials (id, name, role, quote, rating, approved) VALUES (${id}, ${data.name}, ${data.role}, ${data.quote}, ${data.rating}, ${data.approved})`;
  const rows = await db`SELECT * FROM testimonials WHERE id = ${id}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return toTestimonial((rows as any[])[0]);
}

export async function updateTestimonial(id: string, data: Partial<Omit<Testimonial, "id" | "createdAt">>): Promise<void> {
  await ensureSiteSchema();
  const db = sql();
  if (data.approved !== undefined) await db`UPDATE testimonials SET approved = ${data.approved} WHERE id = ${id}`;
  if (data.name)  await db`UPDATE testimonials SET name  = ${data.name}  WHERE id = ${id}`;
  if (data.role !== undefined)  await db`UPDATE testimonials SET role  = ${data.role}  WHERE id = ${id}`;
  if (data.quote) await db`UPDATE testimonials SET quote = ${data.quote} WHERE id = ${id}`;
  if (data.rating) await db`UPDATE testimonials SET rating = ${data.rating} WHERE id = ${id}`;
}

export async function deleteTestimonial(id: string): Promise<void> {
  await ensureSiteSchema();
  const db = sql();
  await db`DELETE FROM testimonials WHERE id = ${id}`;
}

// ── Bulletin posts ─────────────────────────────────────────────────────────

export async function getBulletinPosts(all = false): Promise<BulletinPost[]> {
  await ensureSiteSchema();
  const db = sql();
  const rows = all
    ? await db`SELECT * FROM bulletin_posts ORDER BY created_at DESC`
    : await db`SELECT * FROM bulletin_posts WHERE approved = true ORDER BY created_at DESC`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (rows as any[]).map(toBulletin);
}

export async function createBulletinPost(data: Omit<BulletinPost, "id" | "createdAt">): Promise<BulletinPost> {
  await ensureSiteSchema();
  const db = sql();
  const id = uid();
  await db`INSERT INTO bulletin_posts (id, author, title, body, category, approved) VALUES (${id}, ${data.author}, ${data.title}, ${data.body}, ${data.category}, ${data.approved})`;
  const rows = await db`SELECT * FROM bulletin_posts WHERE id = ${id}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return toBulletin((rows as any[])[0]);
}

export async function updateBulletinPost(id: string, data: Partial<Omit<BulletinPost, "id" | "createdAt">>): Promise<void> {
  await ensureSiteSchema();
  const db = sql();
  if (data.approved !== undefined) await db`UPDATE bulletin_posts SET approved = ${data.approved} WHERE id = ${id}`;
  if (data.title)    await db`UPDATE bulletin_posts SET title    = ${data.title}    WHERE id = ${id}`;
  if (data.body)     await db`UPDATE bulletin_posts SET body     = ${data.body}     WHERE id = ${id}`;
  if (data.category) await db`UPDATE bulletin_posts SET category = ${data.category} WHERE id = ${id}`;
}

export async function deleteBulletinPost(id: string): Promise<void> {
  await ensureSiteSchema();
  const db = sql();
  await db`DELETE FROM bulletin_posts WHERE id = ${id}`;
}

// ── Announcements ──────────────────────────────────────────────────────────

export async function getAnnouncements(all = false): Promise<Announcement[]> {
  await ensureSiteSchema();
  const db = sql();
  const rows = all
    ? await db`SELECT * FROM announcements ORDER BY created_at DESC`
    : await db`SELECT * FROM announcements WHERE active = true ORDER BY created_at DESC`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (rows as any[]).map(toAnnouncement);
}

export async function createAnnouncement(data: Omit<Announcement, "id" | "createdAt">): Promise<Announcement> {
  await ensureSiteSchema();
  const db = sql();
  const id = uid();
  await db`INSERT INTO announcements (id, title, body, severity, active) VALUES (${id}, ${data.title}, ${data.body}, ${data.severity}, ${data.active})`;
  const rows = await db`SELECT * FROM announcements WHERE id = ${id}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return toAnnouncement((rows as any[])[0]);
}

export async function updateAnnouncement(id: string, data: Partial<Omit<Announcement, "id" | "createdAt">>): Promise<void> {
  await ensureSiteSchema();
  const db = sql();
  if (data.active !== undefined) await db`UPDATE announcements SET active = ${data.active} WHERE id = ${id}`;
  if (data.title)    await db`UPDATE announcements SET title    = ${data.title}    WHERE id = ${id}`;
  if (data.body)     await db`UPDATE announcements SET body     = ${data.body}     WHERE id = ${id}`;
  if (data.severity) await db`UPDATE announcements SET severity = ${data.severity} WHERE id = ${id}`;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await ensureSiteSchema();
  const db = sql();
  await db`DELETE FROM announcements WHERE id = ${id}`;
}

// ── Form Submissions ───────────────────────────────────────────────────────

export interface FormSubmission {
  id: string;
  formType: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fields: Record<string, any>;
  submittedAt: string;
  readAt: string | null;
}

export interface SubmissionCategory {
  formType: string;
  total: number;
  unread: number;
  latest: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSubmission(r: any): FormSubmission {
  return {
    id: r.id,
    formType: r.form_type,
    fields: r.fields,
    submittedAt: r.submitted_at instanceof Date ? r.submitted_at.toISOString() : String(r.submitted_at),
    readAt: r.read_at ? (r.read_at instanceof Date ? r.read_at.toISOString() : String(r.read_at)) : null,
  };
}

export async function createFormSubmission(
  formType: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fields: Record<string, any>,
): Promise<FormSubmission> {
  await ensureSiteSchema();
  const db = sql();
  const id = uid();
  await db`INSERT INTO form_submissions (id, form_type, fields) VALUES (${id}, ${formType}, ${JSON.stringify(fields)})`;
  const rows = await db`SELECT * FROM form_submissions WHERE id = ${id}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return toSubmission((rows as any[])[0]);
}

export async function getFormSubmissions(formType?: string): Promise<FormSubmission[]> {
  await ensureSiteSchema();
  const db = sql();
  const rows = formType
    ? await db`SELECT * FROM form_submissions WHERE form_type = ${formType} ORDER BY submitted_at DESC`
    : await db`SELECT * FROM form_submissions ORDER BY submitted_at DESC`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (rows as any[]).map(toSubmission);
}

export async function getFormSubmission(id: string): Promise<FormSubmission | null> {
  await ensureSiteSchema();
  const db = sql();
  const rows = await db`SELECT * FROM form_submissions WHERE id = ${id}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(rows as any[]).length) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return toSubmission((rows as any[])[0]);
}

export async function markSubmissionRead(id: string): Promise<void> {
  await ensureSiteSchema();
  const db = sql();
  await db`UPDATE form_submissions SET read_at = NOW() WHERE id = ${id} AND read_at IS NULL`;
}

export async function deleteFormSubmission(id: string): Promise<void> {
  await ensureSiteSchema();
  const db = sql();
  await db`DELETE FROM form_submissions WHERE id = ${id}`;
}

// ── Change Log ────────────────────────────────────────────────────────────

export interface ChangeLogEntry {
  id: string;
  action: string;
  section: string;
  detail: string;
  createdAt: string;
}

export async function logChange(action: string, section: string, detail = ""): Promise<void> {
  try {
    await ensureSiteSchema();
    const db = sql();
    const id = uid();
    await db`INSERT INTO change_log (id, action, section, detail) VALUES (${id}, ${action}, ${section}, ${detail})`;
  } catch { /* non-fatal */ }
}

// ── SMS Pending ────────────────────────────────────────────────────────────

export async function createSmsPending(callId: string, callNature: string): Promise<void> {
  await ensureSiteSchema();
  const db = sql();
  const id = uid();
  await db`INSERT INTO sms_pending (id, call_id, call_nature) VALUES (${id}, ${callId}, ${callNature})`;
}

export async function getLatestUnrepliedSms(): Promise<{ id: string; callId: string; callNature: string } | null> {
  await ensureSiteSchema();
  const db = sql();
  const rows = await db`SELECT * FROM sms_pending WHERE replied = FALSE ORDER BY sent_at DESC LIMIT 1`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = (rows as any[])[0];
  if (!r) return null;
  return { id: r.id, callId: r.call_id, callNature: r.call_nature };
}

export async function markSmsReplied(id: string): Promise<void> {
  await ensureSiteSchema();
  const db = sql();
  await db`UPDATE sms_pending SET replied = TRUE WHERE id = ${id}`;
}

export async function getChangeLog(limit = 100): Promise<ChangeLogEntry[]> {
  await ensureSiteSchema();
  const db = sql();
  const rows = await db`SELECT * FROM change_log ORDER BY created_at DESC LIMIT ${limit}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (rows as any[]).map(r => ({
    id: r.id,
    action: r.action,
    section: r.section,
    detail: r.detail,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  }));
}

// ── Site Content (Visual Editor) ──────────────────────────────────────────

/** Get a content value — returns draft if previewMode=true, else live. Falls back to fallback string. */
export async function getContent(key: string, fallback: string, previewMode = false): Promise<string> {
  await ensureSiteSchema();
  const db = sql();
  const rows = await db`SELECT live_value, draft_value FROM site_content WHERE key = ${key}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = (rows as any[])[0];
  if (!row) return fallback;
  if (previewMode && row.draft_value !== null) return row.draft_value;
  return row.live_value || fallback;
}

export async function getAllContent(): Promise<{ key: string; liveValue: string; draftValue: string | null }[]> {
  await ensureSiteSchema();
  const db = sql();
  const rows = await db`SELECT key, live_value, draft_value FROM site_content ORDER BY key`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (rows as any[]).map(r => ({ key: r.key, liveValue: r.live_value, draftValue: r.draft_value }));
}

export async function saveDraft(key: string, value: string): Promise<void> {
  await ensureSiteSchema();
  const db = sql();
  await db`
    INSERT INTO site_content (key, live_value, draft_value, updated_at)
    VALUES (${key}, '', ${value}, NOW())
    ON CONFLICT (key) DO UPDATE SET draft_value = ${value}, updated_at = NOW()
  `;
}

export async function publishContent(keys: string[]): Promise<void> {
  await ensureSiteSchema();
  const db = sql();
  for (const key of keys) {
    await db`
      UPDATE site_content
      SET live_value = COALESCE(draft_value, live_value), draft_value = NULL, updated_at = NOW()
      WHERE key = ${key}
    `;
  }
}

export async function publishAllDrafts(): Promise<void> {
  await ensureSiteSchema();
  const db = sql();
  await db`
    UPDATE site_content
    SET live_value = COALESCE(draft_value, live_value), draft_value = NULL, updated_at = NOW()
    WHERE draft_value IS NOT NULL
  `;
}

// ── Managed Images (named slots) ──────────────────────────────────────────

export async function getManagedImage(key: string): Promise<string> {
  await ensureSiteSchema();
  const db = sql();
  const rows = await db`SELECT url FROM managed_images WHERE key = ${key}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (rows as any[])[0]?.url ?? "";
}

export async function setManagedImage(key: string, url: string): Promise<void> {
  await ensureSiteSchema();
  const db = sql();
  const id = uid();
  await db`
    INSERT INTO managed_images (id, key, url) VALUES (${id}, ${key}, ${url})
    ON CONFLICT (key) DO UPDATE SET url = ${url}
  `;
}

export async function deleteManagedImage(key: string): Promise<void> {
  await ensureSiteSchema();
  const db = sql();
  await db`UPDATE managed_images SET url = '' WHERE key = ${key}`;
}

export async function getAllManagedImages(): Promise<{ key: string; url: string }[]> {
  await ensureSiteSchema();
  const db = sql();
  const rows = await db`SELECT key, url FROM managed_images ORDER BY key`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (rows as any[]).map(r => ({ key: r.key, url: r.url }));
}

// ── Gallery Images (collections) ──────────────────────────────────────────

export interface GalleryImage {
  id: string;
  collection: string;
  url: string;
  altText: string;
  brightness: number;
  sortOrder: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toGalleryImage(r: any): GalleryImage {
  return { id: r.id, collection: r.collection, url: r.url, altText: r.alt_text, brightness: Number(r.brightness), sortOrder: Number(r.sort_order) };
}

export async function getGalleryImages(collection: string): Promise<GalleryImage[]> {
  await ensureSiteSchema();
  const db = sql();
  const rows = await db`SELECT * FROM gallery_images WHERE collection = ${collection} ORDER BY sort_order ASC, created_at ASC`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (rows as any[]).map(toGalleryImage);
}

export async function addGalleryImage(collection: string, url: string, altText = "", brightness = 0.45): Promise<GalleryImage> {
  await ensureSiteSchema();
  const db = sql();
  const id = uid();
  const maxRows = await db`SELECT COALESCE(MAX(sort_order), -1) AS m FROM gallery_images WHERE collection = ${collection}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sortOrder = Number((maxRows as any[])[0].m) + 1;
  await db`INSERT INTO gallery_images (id, collection, url, alt_text, brightness, sort_order) VALUES (${id}, ${collection}, ${url}, ${altText}, ${brightness}, ${sortOrder})`;
  const rows = await db`SELECT * FROM gallery_images WHERE id = ${id}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return toGalleryImage((rows as any[])[0]);
}

export async function deleteGalleryImage(id: string): Promise<void> {
  await ensureSiteSchema();
  const db = sql();
  await db`DELETE FROM gallery_images WHERE id = ${id}`;
}

export async function getSubmissionCategories(): Promise<SubmissionCategory[]> {
  await ensureSiteSchema();
  const db = sql();
  const rows = await db`
    SELECT
      form_type,
      COUNT(*)::int            AS total,
      COUNT(*) FILTER (WHERE read_at IS NULL)::int AS unread,
      MAX(submitted_at)        AS latest
    FROM form_submissions
    GROUP BY form_type
    ORDER BY MAX(submitted_at) DESC
  `;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (rows as any[]).map(r => ({
    formType: r.form_type,
    total: r.total,
    unread: r.unread,
    latest: r.latest ? (r.latest instanceof Date ? r.latest.toISOString() : String(r.latest)) : null,
  }));
}
