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
