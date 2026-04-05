import { neon } from "@neondatabase/serverless";

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  return neon(url);
}

export type Testimonial = {
  id: string;
  name: string | null;
  anonymous: boolean;
  message: string;
  status: "pending" | "approved" | "denied";
  submittedAt: string;
};

async function ensureSchema() {
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS testimonials (
      id           TEXT PRIMARY KEY,
      name         TEXT DEFAULT NULL,
      anonymous    BOOLEAN NOT NULL DEFAULT FALSE,
      message      TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'pending',
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

function rowToTestimonial(row: Record<string, unknown>): Testimonial {
  return {
    id:          String(row.id),
    name:        row.name ? String(row.name) : null,
    anonymous:   Boolean(row.anonymous),
    message:     String(row.message),
    status:      String(row.status) as Testimonial["status"],
    submittedAt: row.submitted_at instanceof Date
      ? row.submitted_at.toISOString()
      : String(row.submitted_at),
  };
}

export async function addTestimonial(
  data: Pick<Testimonial, "name" | "anonymous" | "message">
): Promise<Testimonial> {
  await ensureSchema();
  const db = sql();
  const id = crypto.randomUUID();
  await db`
    INSERT INTO testimonials (id, name, anonymous, message, status)
    VALUES (${id}, ${data.name ?? null}, ${data.anonymous}, ${data.message}, 'pending')
  `;
  const rows = await db`SELECT * FROM testimonials WHERE id = ${id}`;
  return rowToTestimonial(rows[0] as Record<string, unknown>);
}

export async function setStatus(
  id: string,
  status: "approved" | "denied"
): Promise<boolean> {
  await ensureSchema();
  const db = sql();
  const r = await db`UPDATE testimonials SET status = ${status} WHERE id = ${id}`;
  return (r as unknown as { count: number }).count > 0;
}

export async function getApproved(): Promise<Testimonial[]> {
  await ensureSchema();
  const db = sql();
  const rows = await db`
    SELECT * FROM testimonials
    WHERE status = 'approved'
    ORDER BY submitted_at DESC
  `;
  return (rows as Record<string, unknown>[]).map(rowToTestimonial);
}
