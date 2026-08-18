import { sql } from "@/lib/neon";

export type Testimonial = {
  id: string;
  name: string | null;
  anonymous: boolean;
  message: string;
  status: "pending" | "approved" | "denied";
  submittedAt: string;
  moderatedBy: string | null;
  moderatedAt: string | null;
};

export type TestimonialModerationResult = {
  outcome: "updated" | "unchanged" | "not-found";
  previousStatus: Testimonial["status"] | null;
  status: Testimonial["status"] | null;
};

export type TestimonialModerationAudit = {
  id: string;
  testimonialId: string;
  action: "approve" | "deny" | "delete";
  previousStatus: Testimonial["status"] | null;
  nextStatus: Testimonial["status"] | null;
  actorId: string;
  actorName: string;
  name: string | null;
  anonymous: boolean;
  message: string;
  createdAt: string;
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
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      moderated_by TEXT,
      moderated_at TIMESTAMPTZ
    )
  `;
  await db`ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS moderated_by TEXT`;
  await db`ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ`;
  await db`
    CREATE TABLE IF NOT EXISTS testimonial_moderation_audit (
      id              TEXT PRIMARY KEY,
      testimonial_id  TEXT NOT NULL,
      action          TEXT NOT NULL,
      previous_status TEXT,
      next_status     TEXT,
      actor_id        TEXT NOT NULL,
      actor_name      TEXT NOT NULL,
      name            TEXT,
      anonymous       BOOLEAN NOT NULL,
      message         TEXT NOT NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`
    CREATE INDEX IF NOT EXISTS testimonial_moderation_audit_created_idx
    ON testimonial_moderation_audit (created_at DESC)
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
    moderatedBy: row.moderated_by ? String(row.moderated_by) : null,
    moderatedAt: row.moderated_at instanceof Date
      ? row.moderated_at.toISOString()
      : row.moderated_at
        ? String(row.moderated_at)
        : null,
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
  status: "approved" | "denied",
  actorId: string,
  actorName: string,
): Promise<TestimonialModerationResult> {
  await ensureSchema();
  const db = sql();
  const auditId = crypto.randomUUID();
  const action = status === "approved" ? "approve" : "deny";
  const updated = (await db`
    WITH target AS (
      SELECT id, name, anonymous, message, status AS previous_status
      FROM testimonials
      WHERE id = ${id}
      FOR UPDATE
    ), updated AS (
      UPDATE testimonials AS testimonial
      SET status = ${status}, moderated_by = ${actorId}, moderated_at = NOW()
      FROM target
      WHERE testimonial.id = target.id
        AND target.previous_status <> ${status}
      RETURNING
        testimonial.id,
        testimonial.name,
        testimonial.anonymous,
        testimonial.message,
        target.previous_status,
        testimonial.status
    ), audited AS (
      INSERT INTO testimonial_moderation_audit (
        id, testimonial_id, action, previous_status, next_status,
        actor_id, actor_name, name, anonymous, message
      )
      SELECT
        ${auditId}, id, ${action}, previous_status, status,
        ${actorId}, ${actorName}, name, anonymous, message
      FROM updated
      RETURNING testimonial_id
    )
    SELECT updated.previous_status, updated.status
    FROM updated
    INNER JOIN audited ON audited.testimonial_id = updated.id
  `) as unknown as Array<{
    previous_status: Testimonial["status"];
    status: Testimonial["status"];
  }>;
  if (updated.length === 1) {
    return {
      outcome: "updated",
      previousStatus: updated[0].previous_status,
      status: updated[0].status,
    };
  }

  const existing = (await db`
    SELECT status FROM testimonials WHERE id = ${id} LIMIT 1
  `) as unknown as Array<{ status: Testimonial["status"] }>;
  if (!existing[0]) {
    return { outcome: "not-found", previousStatus: null, status: null };
  }
  return {
    outcome: "unchanged",
    previousStatus: existing[0].status,
    status: existing[0].status,
  };
}

export async function deleteTestimonial(
  id: string,
  actorId: string,
  actorName: string,
): Promise<"deleted" | "not-found"> {
  await ensureSchema();
  const db = sql();
  const auditId = crypto.randomUUID();
  const rows = (await db`
    WITH target AS (
      SELECT id, name, anonymous, message, status
      FROM testimonials
      WHERE id = ${id}
      FOR UPDATE
    ), audited AS (
      INSERT INTO testimonial_moderation_audit (
        id, testimonial_id, action, previous_status, next_status,
        actor_id, actor_name, name, anonymous, message
      )
      SELECT
        ${auditId}, id, 'delete', status, NULL,
        ${actorId}, ${actorName}, name, anonymous, message
      FROM target
      RETURNING testimonial_id
    ), deleted AS (
      DELETE FROM testimonials AS testimonial
      USING audited
      WHERE testimonial.id = audited.testimonial_id
      RETURNING testimonial.id
    )
    SELECT id FROM deleted
  `) as unknown as Array<{ id: string }>;
  return rows.length === 1 ? "deleted" : "not-found";
}

export async function getTestimonialModerationAudit(
  limit = 100,
): Promise<TestimonialModerationAudit[]> {
  await ensureSchema();
  const db = sql();
  const boundedLimit = Math.min(200, Math.max(1, Math.trunc(limit)));
  const rows = (await db`
    SELECT *
    FROM testimonial_moderation_audit
    ORDER BY created_at DESC
    LIMIT ${boundedLimit}
  `) as unknown as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: String(row.id),
    testimonialId: String(row.testimonial_id),
    action: String(row.action) as TestimonialModerationAudit["action"],
    previousStatus: row.previous_status
      ? String(row.previous_status) as Testimonial["status"]
      : null,
    nextStatus: row.next_status
      ? String(row.next_status) as Testimonial["status"]
      : null,
    actorId: String(row.actor_id),
    actorName: String(row.actor_name),
    name: row.name ? String(row.name) : null,
    anonymous: Boolean(row.anonymous),
    message: String(row.message),
    createdAt: row.created_at instanceof Date
      ? row.created_at.toISOString()
      : String(row.created_at),
  }));
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

export async function getAllTestimonials(): Promise<Testimonial[]> {
  await ensureSchema();
  const db = sql();
  const rows = await db`SELECT * FROM testimonials ORDER BY submitted_at DESC`;
  return (rows as Record<string, unknown>[]).map(rowToTestimonial);
}
