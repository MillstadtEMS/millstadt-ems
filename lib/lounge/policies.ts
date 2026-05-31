/**
 * Policies & SOPs.
 *
 * Admin uploads a document (PDF/doc) tied to a title, summary, category, and
 * optional version. Crew browse and can "save" a policy to find it later.
 *
 * `document` is JSONB shaped: { url, name, mime, size }. `saved_by` is a
 * TEXT[] of employee ids who bookmarked it (kept inline — small set).
 */
import { randomUUID } from "crypto";
import { sql } from "./db";

export const POLICY_CATEGORIES = [
  "Operations",
  "Clinical",
  "HR",
  "Safety",
  "Equipment",
  "Administrative",
  "General",
] as const;
export type PolicyCategory = (typeof POLICY_CATEGORIES)[number];

export interface PolicyDocument {
  url: string;
  name: string;
  mime: string;
  size: number;
}

export interface PolicyAuthor {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Policy {
  id: string;
  title: string;
  summary: string;
  category: PolicyCategory;
  tags: string[];
  document: PolicyDocument | null;
  version: string | null;
  createdBy: PolicyAuthor;
  updatedBy: PolicyAuthor | null;
  savedByMe: boolean;
  savedCount: number;
  createdAt: string;
  updatedAt: string;
}

interface DbRow {
  id: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  document: unknown;
  version: string | null;
  created_by: string;
  updated_by: string | null;
  saved_by: string[];
  created_at: string;
  updated_at: string;
  creator_first_name: string;
  creator_last_name: string;
  updater_first_name: string | null;
  updater_last_name: string | null;
}

function rowToPolicy(r: DbRow, viewerId: string): Policy {
  const doc = r.document && typeof r.document === "object"
    ? (r.document as PolicyDocument)
    : null;
  const savedBy = Array.isArray(r.saved_by) ? r.saved_by : [];
  return {
    id: r.id,
    title: r.title,
    summary: r.summary,
    category: (POLICY_CATEGORIES.includes(r.category as PolicyCategory)
      ? (r.category as PolicyCategory)
      : "General"),
    tags: Array.isArray(r.tags) ? r.tags : [],
    document: doc && doc.url ? doc : null,
    version: r.version,
    createdBy: {
      id: r.created_by,
      firstName: r.creator_first_name,
      lastName: r.creator_last_name,
    },
    updatedBy: r.updated_by && r.updater_first_name && r.updater_last_name
      ? {
          id: r.updated_by,
          firstName: r.updater_first_name,
          lastName: r.updater_last_name,
        }
      : null,
    savedByMe: savedBy.includes(viewerId),
    savedCount: savedBy.length,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listPolicies(viewerId: string): Promise<Policy[]> {
  const db = sql();
  const rows = (await db`
    SELECT p.id, p.title, p.summary, p.category, p.tags, p.document, p.version,
           p.created_by, p.updated_by, p.saved_by, p.created_at, p.updated_at,
           c.first_name AS creator_first_name, c.last_name AS creator_last_name,
           u.first_name AS updater_first_name, u.last_name AS updater_last_name
    FROM lounge_policies p
    JOIN lounge_employees c ON c.id = p.created_by
    LEFT JOIN lounge_employees u ON u.id = p.updated_by
    ORDER BY p.updated_at DESC
  `) as unknown as DbRow[];
  return rows.map((r) => rowToPolicy(r, viewerId));
}

export async function getPolicy(id: string, viewerId: string): Promise<Policy | null> {
  const db = sql();
  const rows = (await db`
    SELECT p.id, p.title, p.summary, p.category, p.tags, p.document, p.version,
           p.created_by, p.updated_by, p.saved_by, p.created_at, p.updated_at,
           c.first_name AS creator_first_name, c.last_name AS creator_last_name,
           u.first_name AS updater_first_name, u.last_name AS updater_last_name
    FROM lounge_policies p
    JOIN lounge_employees c ON c.id = p.created_by
    LEFT JOIN lounge_employees u ON u.id = p.updated_by
    WHERE p.id = ${id} LIMIT 1
  `) as unknown as DbRow[];
  return rows[0] ? rowToPolicy(rows[0], viewerId) : null;
}

export interface CreatePolicyInput {
  authorId: string;
  title: string;
  summary: string;
  category: PolicyCategory;
  tags: string[];
  document: PolicyDocument | null;
  version?: string | null;
}

export async function createPolicy(input: CreatePolicyInput): Promise<Policy> {
  const id = randomUUID();
  const db = sql();
  await db`
    INSERT INTO lounge_policies
      (id, title, summary, category, tags, document, version, created_by)
    VALUES
      (${id},
       ${input.title.trim()},
       ${input.summary.trim()},
       ${input.category},
       ${input.tags},
       ${input.document ? JSON.stringify(input.document) : null}::jsonb,
       ${input.version ?? null},
       ${input.authorId})
  `;
  return (await getPolicy(id, input.authorId))!;
}

export interface UpdatePolicyInput {
  id: string;
  editorId: string;
  title?: string;
  summary?: string;
  category?: PolicyCategory;
  tags?: string[];
  document?: PolicyDocument | null;
  version?: string | null;
}

export async function updatePolicy(input: UpdatePolicyInput): Promise<void> {
  const db = sql();
  await db`
    UPDATE lounge_policies
    SET title    = COALESCE(${input.title ?? null}, title),
        summary  = COALESCE(${input.summary ?? null}, summary),
        category = COALESCE(${input.category ?? null}, category),
        tags     = COALESCE(${input.tags ?? null}, tags),
        document = CASE
          WHEN ${input.document !== undefined} THEN ${input.document ? JSON.stringify(input.document) : null}::jsonb
          ELSE document
        END,
        version    = COALESCE(${input.version ?? null}, version),
        updated_by = ${input.editorId},
        updated_at = NOW()
    WHERE id = ${input.id}
  `;
}

export async function deletePolicy(id: string): Promise<string | null> {
  // Returns the blob URL (if any) so the caller can clean up storage.
  const db = sql();
  const rows = (await db`
    DELETE FROM lounge_policies WHERE id = ${id}
    RETURNING document
  `) as unknown as { document: unknown }[];
  const doc = rows[0]?.document;
  if (doc && typeof doc === "object" && "url" in doc) {
    return (doc as PolicyDocument).url ?? null;
  }
  return null;
}

export async function toggleSavePolicy(input: {
  policyId: string;
  userId: string;
}): Promise<{ savedByMe: boolean; savedCount: number }> {
  const db = sql();
  // Two-step: read then write. Race-tolerant — the saved_by set is
  // idempotent and small; double-save still results in one membership.
  const rows = (await db`
    SELECT saved_by FROM lounge_policies WHERE id = ${input.policyId} LIMIT 1
  `) as unknown as { saved_by: string[] }[];
  const current = rows[0]?.saved_by ?? [];
  const has = current.includes(input.userId);
  const next = has
    ? current.filter((u) => u !== input.userId)
    : [...current, input.userId];
  await db`
    UPDATE lounge_policies
    SET saved_by = ${next}, updated_at = updated_at
    WHERE id = ${input.policyId}
  `;
  return { savedByMe: !has, savedCount: next.length };
}
