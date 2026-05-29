/**
 * Admin polls / surveys.
 *
 * One poll = one question with a set of choices (single or multi-select)
 * and an optional free-text comment field. Each active employee gets
 * one response — the API rejects a second submission per (poll, user).
 * Admin sees the aggregate counts + per-employee responses.
 */
import { randomUUID } from "crypto";
import { sql } from "./db";

export type PollKind = "single_choice" | "multi_choice" | "free_text";

export interface PollOption { id: string; label: string }

export interface PollSummary {
  id: string;
  title: string;
  description: string | null;
  kind: PollKind;
  options: PollOption[];
  allowComment: boolean;
  open: boolean;
  createdBy: { id: string; firstName: string; lastName: string };
  createdAt: string;
  closedAt: string | null;
  responseCount: number;
  totalEligible: number;
}

export interface PollForViewer extends PollSummary {
  myResponse: PollResponse | null;
}

export interface PollResponse {
  pollId: string;
  userId: string;
  choiceIds: string[];
  comment: string | null;
  submittedAt: string;
}

let schemaEnsured = false;
async function ensureSchema() {
  if (schemaEnsured) return;
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS lounge_polls (
      id              TEXT PRIMARY KEY,
      created_by      TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
      title           TEXT NOT NULL,
      description     TEXT,
      kind            TEXT NOT NULL CHECK (kind IN ('single_choice','multi_choice','free_text')),
      options         JSONB NOT NULL DEFAULT '[]'::jsonb,
      allow_comment   BOOLEAN NOT NULL DEFAULT FALSE,
      open            BOOLEAN NOT NULL DEFAULT TRUE,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      closed_at       TIMESTAMPTZ
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS lounge_poll_responses (
      poll_id         TEXT NOT NULL REFERENCES lounge_polls(id) ON DELETE CASCADE,
      user_id         TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
      choice_ids      TEXT[] NOT NULL DEFAULT '{}'::text[],
      comment         TEXT,
      submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (poll_id, user_id)
    )
  `;
  schemaEnsured = true;
}

interface DbPollRow {
  id: string;
  created_by: string;
  title: string;
  description: string | null;
  kind: PollKind;
  options: PollOption[];
  allow_comment: boolean;
  open: boolean;
  created_at: string;
  closed_at: string | null;
  creator_first_name: string;
  creator_last_name: string;
}

async function activeEmployeeCount(): Promise<number> {
  const db = sql();
  const rows = (await db`SELECT COUNT(*)::int AS c FROM lounge_employees WHERE is_active = TRUE`) as unknown as { c: number }[];
  return rows[0]?.c ?? 0;
}

async function pollResponseCount(pollId: string): Promise<number> {
  const db = sql();
  const rows = (await db`SELECT COUNT(*)::int AS c FROM lounge_poll_responses WHERE poll_id = ${pollId}`) as unknown as { c: number }[];
  return rows[0]?.c ?? 0;
}

async function rowToPoll(r: DbPollRow, totalEligible: number): Promise<PollSummary> {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    kind: r.kind,
    options: Array.isArray(r.options) ? r.options : [],
    allowComment: r.allow_comment,
    open: r.open,
    createdBy: { id: r.created_by, firstName: r.creator_first_name, lastName: r.creator_last_name },
    createdAt: r.created_at,
    closedAt: r.closed_at,
    responseCount: await pollResponseCount(r.id),
    totalEligible,
  };
}

export interface CreatePollInput {
  createdBy: string;
  title: string;
  description?: string | null;
  kind: PollKind;
  options: { label: string }[];
  allowComment?: boolean;
}

export async function createPoll(input: CreatePollInput): Promise<PollSummary> {
  await ensureSchema();
  const db = sql();
  const id = randomUUID();
  const options: PollOption[] =
    input.kind === "free_text"
      ? []
      : input.options.map((o, i) => ({ id: `opt-${i + 1}-${randomUUID().slice(0, 6)}`, label: o.label }));
  await db`
    INSERT INTO lounge_polls (id, created_by, title, description, kind, options, allow_comment)
    VALUES (${id}, ${input.createdBy}, ${input.title}, ${input.description ?? null},
            ${input.kind}, ${JSON.stringify(options)}::jsonb, ${input.allowComment ?? false})
  `;
  const list = await listPolls();
  const fresh = list.find((p) => p.id === id);
  if (!fresh) throw new Error("Poll not found after create");
  return fresh;
}

export async function listPolls(): Promise<PollSummary[]> {
  await ensureSchema();
  const db = sql();
  const rows = (await db`
    SELECT p.*, e.first_name AS creator_first_name, e.last_name AS creator_last_name
    FROM lounge_polls p
    JOIN lounge_employees e ON e.id = p.created_by
    ORDER BY p.created_at DESC
  `) as unknown as DbPollRow[];
  const total = await activeEmployeeCount();
  return Promise.all(rows.map((r) => rowToPoll(r, total)));
}

export async function getPoll(id: string): Promise<PollSummary | null> {
  await ensureSchema();
  const db = sql();
  const rows = (await db`
    SELECT p.*, e.first_name AS creator_first_name, e.last_name AS creator_last_name
    FROM lounge_polls p
    JOIN lounge_employees e ON e.id = p.created_by
    WHERE p.id = ${id}
    LIMIT 1
  `) as unknown as DbPollRow[];
  if (!rows[0]) return null;
  const total = await activeEmployeeCount();
  return rowToPoll(rows[0], total);
}

export async function listPollsForViewer(viewerId: string): Promise<PollForViewer[]> {
  await ensureSchema();
  const polls = await listPolls();
  const db = sql();
  const rows = (await db`
    SELECT poll_id, choice_ids, comment, submitted_at
    FROM lounge_poll_responses
    WHERE user_id = ${viewerId}
  `) as unknown as { poll_id: string; choice_ids: string[]; comment: string | null; submitted_at: string }[];
  const byId = new Map(rows.map((r) => [r.poll_id, r]));
  return polls.map((p) => {
    const r = byId.get(p.id);
    return {
      ...p,
      myResponse: r
        ? { pollId: r.poll_id, userId: viewerId, choiceIds: r.choice_ids, comment: r.comment, submittedAt: r.submitted_at }
        : null,
    };
  });
}

export async function submitResponse(
  pollId: string,
  userId: string,
  input: { choiceIds: string[]; comment: string | null },
): Promise<{ ok: boolean; reason?: string }> {
  await ensureSchema();
  const db = sql();
  const polls = (await db`SELECT id, kind, options, allow_comment, open FROM lounge_polls WHERE id = ${pollId} LIMIT 1`) as unknown as
    { id: string; kind: PollKind; options: PollOption[]; allow_comment: boolean; open: boolean }[];
  const poll = polls[0];
  if (!poll) return { ok: false, reason: "Poll not found" };
  if (!poll.open) return { ok: false, reason: "Poll is closed" };

  // Validate the response shape against the poll kind.
  if (poll.kind === "free_text") {
    if (!input.comment || !input.comment.trim()) return { ok: false, reason: "Comment required" };
  } else {
    const allowed = new Set(poll.options.map((o) => o.id));
    const ids = input.choiceIds.filter((c) => allowed.has(c));
    if (poll.kind === "single_choice" && ids.length !== 1) return { ok: false, reason: "Pick one option" };
    if (poll.kind === "multi_choice" && ids.length < 1) return { ok: false, reason: "Pick at least one option" };
  }

  try {
    await db`
      INSERT INTO lounge_poll_responses (poll_id, user_id, choice_ids, comment)
      VALUES (${pollId}, ${userId}, ${input.choiceIds}::text[], ${input.comment ?? null})
    `;
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not save";
    if (msg.includes("duplicate") || msg.includes("unique")) return { ok: false, reason: "Already responded" };
    return { ok: false, reason: msg };
  }
}

export interface PollResponseDetail {
  user: { id: string; firstName: string; lastName: string };
  choiceIds: string[];
  comment: string | null;
  submittedAt: string;
}

export async function listPollResponses(pollId: string): Promise<PollResponseDetail[]> {
  await ensureSchema();
  const db = sql();
  const rows = (await db`
    SELECT r.user_id, r.choice_ids, r.comment, r.submitted_at,
           e.first_name, e.last_name
    FROM lounge_poll_responses r
    JOIN lounge_employees e ON e.id = r.user_id
    WHERE r.poll_id = ${pollId}
    ORDER BY r.submitted_at ASC
  `) as unknown as { user_id: string; choice_ids: string[]; comment: string | null; submitted_at: string; first_name: string; last_name: string }[];
  return rows.map((r) => ({
    user: { id: r.user_id, firstName: r.first_name, lastName: r.last_name },
    choiceIds: r.choice_ids,
    comment: r.comment,
    submittedAt: r.submitted_at,
  }));
}

export async function setPollOpen(pollId: string, open: boolean): Promise<void> {
  await ensureSchema();
  const db = sql();
  if (open) {
    await db`UPDATE lounge_polls SET open = TRUE, closed_at = NULL WHERE id = ${pollId}`;
  } else {
    await db`UPDATE lounge_polls SET open = FALSE, closed_at = NOW() WHERE id = ${pollId}`;
  }
}

export async function deletePoll(pollId: string): Promise<void> {
  await ensureSchema();
  const db = sql();
  await db`DELETE FROM lounge_polls WHERE id = ${pollId}`;
}
