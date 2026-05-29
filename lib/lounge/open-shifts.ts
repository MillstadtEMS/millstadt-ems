/**
 * Open shifts: admin posts a shift that needs coverage, crew responds
 * Available / Unavailable, admin awards it to a single responder.
 */
import { randomUUID } from "crypto";
import { sql } from "./db";

export interface ShiftResponse {
  userId: string;
  firstName: string;
  lastName: string;
  certification: string | null;
  response: "available" | "unavailable" | "bid";
  note: string | null;
  createdAt: string;
}
export interface OpenShift {
  id: string;
  title: string;
  body: string;
  target: string;
  createdBy: { id: string; firstName: string; lastName: string };
  status: "open" | "awarded" | "canceled";
  awardedTo: { id: string; firstName: string; lastName: string } | null;
  awardedAt: string | null;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
  responses: ShiftResponse[];
  myResponse: ShiftResponse | null;
}

interface DbShiftRow {
  id: string;
  title: string;
  body: string;
  target: string;
  created_by: string;
  status: string;
  awarded_to: string | null;
  awarded_at: string | null;
  awarded_by: string | null;
  canceled_at: string | null;
  canceled_by: string | null;
  created_at: string;
  updated_at: string;
  creator_first_name: string;
  creator_last_name: string;
  awarded_first_name: string | null;
  awarded_last_name: string | null;
}

async function loadResponses(shiftIds: string[]) {
  if (shiftIds.length === 0) return new Map<string, ShiftResponse[]>();
  const db = sql();
  const rows = (await db`
    SELECT r.shift_id, r.user_id, r.response, r.note, r.created_at,
           e.first_name, e.last_name, e.certification
    FROM lounge_open_shift_responses r
    JOIN lounge_employees e ON e.id = r.user_id
    WHERE r.shift_id = ANY(${shiftIds}::text[])
    ORDER BY r.created_at ASC
  `) as unknown as {
    shift_id: string;
    user_id: string;
    response: "available" | "unavailable" | "bid";
    note: string | null;
    created_at: string;
    first_name: string;
    last_name: string;
    certification: string | null;
  }[];
  const map = new Map<string, ShiftResponse[]>();
  for (const r of rows) {
    const list = map.get(r.shift_id) ?? [];
    list.push({
      userId: r.user_id,
      firstName: r.first_name,
      lastName: r.last_name,
      certification: r.certification,
      response: r.response,
      note: r.note,
      createdAt: r.created_at,
    });
    map.set(r.shift_id, list);
  }
  return map;
}

function rowToShift(r: DbShiftRow, responses: ShiftResponse[], myId: string): OpenShift {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    target: r.target,
    createdBy: { id: r.created_by, firstName: r.creator_first_name, lastName: r.creator_last_name },
    status: (r.status as OpenShift["status"]) ?? "open",
    awardedTo: r.awarded_to ? {
      id: r.awarded_to,
      firstName: r.awarded_first_name ?? "",
      lastName: r.awarded_last_name ?? "",
    } : null,
    awardedAt: r.awarded_at,
    canceledAt: r.canceled_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    responses,
    myResponse: responses.find((x) => x.userId === myId) ?? null,
  };
}

export async function listOpenShifts(viewerId: string): Promise<OpenShift[]> {
  const db = sql();
  const rows = (await db`
    SELECT s.id, s.title, s.body, s.target, s.created_by, s.status,
           s.awarded_to, s.awarded_at, s.awarded_by,
           s.canceled_at, s.canceled_by,
           s.created_at, s.updated_at,
           c.first_name AS creator_first_name, c.last_name AS creator_last_name,
           aw.first_name AS awarded_first_name, aw.last_name AS awarded_last_name
    FROM lounge_open_shifts s
    JOIN lounge_employees c ON c.id = s.created_by
    LEFT JOIN lounge_employees aw ON aw.id = s.awarded_to
    ORDER BY
      CASE s.status WHEN 'open' THEN 0 WHEN 'awarded' THEN 1 ELSE 2 END,
      s.created_at DESC
  `) as unknown as DbShiftRow[];
  const responses = await loadResponses(rows.map((r) => r.id));
  return rows.map((r) => rowToShift(r, responses.get(r.id) ?? [], viewerId));
}

export async function getOpenShift(id: string, viewerId: string): Promise<OpenShift | null> {
  const db = sql();
  const rows = (await db`
    SELECT s.id, s.title, s.body, s.target, s.created_by, s.status,
           s.awarded_to, s.awarded_at, s.awarded_by,
           s.canceled_at, s.canceled_by,
           s.created_at, s.updated_at,
           c.first_name AS creator_first_name, c.last_name AS creator_last_name,
           aw.first_name AS awarded_first_name, aw.last_name AS awarded_last_name
    FROM lounge_open_shifts s
    JOIN lounge_employees c ON c.id = s.created_by
    LEFT JOIN lounge_employees aw ON aw.id = s.awarded_to
    WHERE s.id = ${id} LIMIT 1
  `) as unknown as DbShiftRow[];
  if (!rows[0]) return null;
  const responses = await loadResponses([id]);
  return rowToShift(rows[0], responses.get(id) ?? [], viewerId);
}

export async function createOpenShift(input: {
  authorId: string;
  title: string;
  body: string;
  target: string;
}): Promise<OpenShift> {
  const id = randomUUID();
  const db = sql();
  await db`
    INSERT INTO lounge_open_shifts (id, title, body, target, created_by)
    VALUES (${id}, ${input.title.trim()}, ${input.body}, ${input.target}, ${input.authorId})
  `;
  return (await getOpenShift(id, input.authorId))!;
}

export async function respondToShift(input: {
  shiftId: string;
  userId: string;
  response: "available" | "unavailable" | "bid";
  note?: string;
}): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO lounge_open_shift_responses (shift_id, user_id, response, note)
    VALUES (${input.shiftId}, ${input.userId}, ${input.response}, ${input.note ?? null})
    ON CONFLICT (shift_id, user_id) DO UPDATE
      SET response = ${input.response}, note = ${input.note ?? null}, created_at = NOW()
  `;
}

export async function awardShift(input: {
  shiftId: string;
  awardedTo: string;
  awardedBy: string;
}): Promise<void> {
  const db = sql();
  await db`
    UPDATE lounge_open_shifts
    SET status = 'awarded',
        awarded_to = ${input.awardedTo},
        awarded_at = NOW(),
        awarded_by = ${input.awardedBy},
        updated_at = NOW()
    WHERE id = ${input.shiftId}
  `;
}

export async function cancelShift(input: {
  shiftId: string;
  canceledBy: string;
}): Promise<void> {
  const db = sql();
  await db`
    UPDATE lounge_open_shifts
    SET status = 'canceled',
        canceled_at = NOW(),
        canceled_by = ${input.canceledBy},
        updated_at = NOW()
    WHERE id = ${input.shiftId}
  `;
}

export async function deleteShift(shiftId: string): Promise<void> {
  const db = sql();
  await db`DELETE FROM lounge_open_shifts WHERE id = ${shiftId}`;
}
