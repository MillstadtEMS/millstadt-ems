/**
 * Board Portal — governance layer: meetings, attendance, quorum, and
 * pre-meeting questions.
 *
 * Design notes / honesty rules (from the master prompt):
 *  - Planned attendance (a member's RSVP) is NOT the official record. The
 *    secretary confirms actual attendance separately; only confirmed attendance
 *    counts toward statistics.
 *  - Quorum numbers live in board_quorum_rules. The approved EMS Board value is
 *    seeded there as 3 and can be changed by an authorized administrator.
 *  - Confidential submissions never appear in the general board view.
 *  - Nothing here invents a legal/policy rule; anything uncertain is surfaced,
 *    not decided.
 */
import { ensureBoardSchema, sql, type BoardUser } from "./db";

// ── Vocabulary (plain-language, per the spec) ───────────────────────────────
export type Board = "ems" | "fire";
export const BOARD_LABEL: Record<Board, string> = {
  ems: "Millstadt EMS Board",
  fire: "Millstadt Fire Protection District Board",
};

export const MEETING_TYPES = ["Regular", "Special", "Emergency", "Committee", "Joint Board", "Public Hearing", "Executive Session", "Other"] as const;
export const MEETING_STATUSES = ["Scheduled", "Attendance Requested", "Agenda Open", "Briefing Being Prepared", "Briefing Distributed", "In Progress", "Completed", "Canceled", "Rescheduled", "Archived"] as const;

export const RESPONSES = ["Attending", "Attending Remotely", "Tentative", "Not Attending", "Excused Absence Requested", "No Response"] as const;
export type Response = (typeof RESPONSES)[number];

export const CONFIRMED_STATUSES = ["Present", "Present Remotely", "Absent", "Excused", "Unexcused", "Late Arrival", "Left Early", "Recused", "Not Eligible"] as const;

export const QUESTION_CATEGORIES = ["Question", "Concern", "Comment", "Requested Agenda Item", "Financial Question", "Levy Question", "Proposal Question", "Contract Question", "Invoice Question", "Operations Question", "Personnel Question", "Policy Question", "Legal Concern", "Meeting-Minutes Question", "Unfinished Business", "Other"] as const;

export const VISIBILITIES = ["board", "leadership", "confidential"] as const;
export type Visibility = (typeof VISIBILITIES)[number];
export const VISIBILITY_LABEL: Record<Visibility, string> = {
  board: "Board",
  leadership: "Leadership",
  confidential: "Confidential Review",
};

export const QUESTION_STATUSES = ["New", "Assigned", "Under Review", "Answered", "Partially Answered", "Waiting for Information", "Needs Discussion at Meeting", "Added to Agenda", "Confidential Review", "Closed"] as const;

// ── Recurring date math (UTC to avoid timezone drift) ───────────────────────
/** nth (1-based) weekday of a month. weekday: 0=Sun..6=Sat. */
export function nthWeekdayOfMonth(year: number, month0: number, weekday: number, nth: number): Date {
  const first = new Date(Date.UTC(year, month0, 1));
  const shift = (weekday - first.getUTCDay() + 7) % 7;
  return new Date(Date.UTC(year, month0, 1 + shift + (nth - 1) * 7));
}
/** Last given weekday of a month. */
export function lastWeekdayOfMonth(year: number, month0: number, weekday: number): Date {
  const last = new Date(Date.UTC(year, month0 + 1, 0));
  const shift = (last.getUTCDay() - weekday + 7) % 7;
  return new Date(Date.UTC(year, month0 + 1, 0 - shift));
}
/** The recurring meeting date for a board in a given month. EMS = 2nd Wed, Fire = last Thu. */
export function recurringDate(board: Board, year: number, month0: number): Date {
  return board === "ems" ? nthWeekdayOfMonth(year, month0, 3, 2) : lastWeekdayOfMonth(year, month0, 4);
}
function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

// Generated defaults are placeholders until an admin confirms them (spec: times
// and locations "must remain editable because those details may change").
const DEFAULTS: Record<Board, { time: string; end: string; location: string }> = {
  ems: { time: "7:00 PM", end: "8:30 PM", location: "100 East Laurel Street, Millstadt, Illinois" },
  fire: { time: "7:00 PM", end: "8:30 PM", location: "100 East Laurel Street, Millstadt, Illinois" },
};

// ── Schema ──────────────────────────────────────────────────────────────────
let govReady = false;
export async function ensureGovernanceSchema(): Promise<void> {
  if (govReady) return;
  await ensureBoardSchema();
  const db = sql();
  await db`CREATE TABLE IF NOT EXISTS board_meetings (
    id BIGSERIAL PRIMARY KEY,
    board TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Regular',
    status TEXT NOT NULL DEFAULT 'Scheduled',
    title TEXT,
    meeting_date DATE NOT NULL,
    start_time TEXT,
    end_time TEXT,
    location TEXT,
    virtual_link TEXT,
    description TEXT,
    quorum_override INTEGER,
    details_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    is_recurring BOOLEAN NOT NULL DEFAULT TRUE,
    series_key TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await db`CREATE UNIQUE INDEX IF NOT EXISTS board_meetings_series ON board_meetings (board, meeting_date) WHERE is_recurring`;
  await db`CREATE TABLE IF NOT EXISTS board_attendance (
    id BIGSERIAL PRIMARY KEY,
    meeting_id BIGINT NOT NULL REFERENCES board_meetings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    response TEXT NOT NULL DEFAULT 'No Response',
    note TEXT,
    responded_at TIMESTAMPTZ,
    confirmed_status TEXT,
    arrival_time TEXT,
    departure_time TEXT,
    confirmed_by TEXT,
    confirmed_at TIMESTAMPTZ,
    UNIQUE (meeting_id, user_id)
  )`;
  await db`CREATE TABLE IF NOT EXISTS board_quorum_rules (
    board TEXT PRIMARY KEY,
    required INTEGER NOT NULL,
    updated_by TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await db`
    INSERT INTO board_quorum_rules (board, required, updated_by)
    VALUES ('ems', 3, 'codex-approved-default')
    ON CONFLICT (board) DO NOTHING
  `;
  await db`CREATE TABLE IF NOT EXISTS board_questions (
    id BIGSERIAL PRIMARY KEY,
    meeting_id BIGINT NOT NULL REFERENCES board_meetings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    author_name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General Comment',
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'board',
    related_ref TEXT,
    status TEXT NOT NULL DEFAULT 'New',
    urgent BOOLEAN NOT NULL DEFAULT FALSE,
    urgent_reason TEXT,
    response_body TEXT,
    response_by TEXT,
    responded_at TIMESTAMPTZ,
    after_deadline BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  govReady = true;
}

// ── Role / eligibility helpers ──────────────────────────────────────────────
const EMS_ROLES = new Set(["ems_board", "ems_president"]);
/**
 * Which board's meetings a user participates in. Fire Board members have their
 * own meeting calendar and attendance/quorum functions; EMS financial access
 * remains separately permissioned.
 */
export function userBoards(u: BoardUser): Board[] {
  if (u.role === "admin" || u.role === "audit_reviewer" || u.role === "ems_president") return ["ems", "fire"];
  if (u.role === "fire_board") return ["fire"];
  return ["ems"];
}
/** Is this user a voting/eligible member counted toward the board's quorum? */
export function isEligibleMember(u: { role: string }, board: Board): boolean {
  return board === "ems" ? EMS_ROLES.has(u.role) : u.role === "fire_board";
}
export function isLeadership(u: BoardUser): boolean {
  if (u.role === "admin" || u.role === "submitter" || u.role === "ems_president") return true;
  return ["President", "Vice President", "Secretary", "Treasurer"].includes(u.officerTitle ?? "");
}
export function isSecretary(u: BoardUser): boolean {
  return u.role === "admin" || u.officerTitle === "Secretary";
}
export function canSeeConfidential(u: BoardUser): boolean {
  return u.role === "admin" || u.role === "ems_president" || u.officerTitle === "President";
}
/** Can this user see a given question, honoring its visibility setting? */
export function canSeeQuestion(u: BoardUser, q: { visibility: string; userId: string }): boolean {
  if (q.userId === u.id) return true; // always see your own
  if (q.visibility === "confidential") return canSeeConfidential(u);
  if (q.visibility === "leadership") return isLeadership(u);
  return true; // board-wide
}

// ── Types ───────────────────────────────────────────────────────────────────
export interface Meeting {
  id: number; board: Board; type: string; status: string; title: string | null;
  date: string; startTime: string | null; endTime: string | null; location: string | null;
  virtualLink: string | null; description: string | null; quorumOverride: number | null;
  detailsConfirmed: boolean; isRecurring: boolean;
}
export interface Quorum {
  eligible: number; required: number; requiredIsDefault: boolean;
  attending: number; remote: number; tentative: number; notAttending: number; noResponse: number;
  status: "Quorum Confirmed" | "Quorum Expected" | "Quorum at Risk" | "Quorum Not Expected" | "Quorum Not Yet Known";
}

function rowToMeeting(r: Record<string, unknown>): Meeting {
  return {
    id: Number(r.id), board: String(r.board) as Board, type: String(r.type), status: String(r.status),
    title: r.title ? String(r.title) : null,
    date: r.meeting_date instanceof Date ? ymd(r.meeting_date) : String(r.meeting_date),
    startTime: r.start_time ? String(r.start_time) : null, endTime: r.end_time ? String(r.end_time) : null,
    location: r.location ? String(r.location) : null, virtualLink: r.virtual_link ? String(r.virtual_link) : null,
    description: r.description ? String(r.description) : null,
    quorumOverride: r.quorum_override != null ? Number(r.quorum_override) : null,
    detailsConfirmed: r.details_confirmed === true, isRecurring: r.is_recurring === true,
  };
}

// ── Recurring generation ────────────────────────────────────────────────────
/** Ensure recurring EMS and Fire Board meetings exist for the next `monthsAhead` months. Idempotent. */
export async function generateRecurring(monthsAhead = 6, now = new Date()): Promise<number> {
  await ensureGovernanceSchema();
  const db = sql();
  let created = 0;
  for (let i = 0; i <= monthsAhead; i++) {
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth() + i;
    for (const board of ["ems", "fire"] as Board[]) {
      const d = recurringDate(board, y + Math.floor(m / 12), ((m % 12) + 12) % 12);
      if (d < new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))) continue;
      const def = DEFAULTS[board];
      const res = await db`
        INSERT INTO board_meetings (board, type, status, meeting_date, start_time, end_time, location, details_confirmed, is_recurring, series_key, created_by)
        VALUES (${board}, 'Regular', 'Scheduled', ${ymd(d)}, ${def.time}, ${def.end}, ${def.location}, TRUE, TRUE, ${board + "-monthly"}, 'system')
        ON CONFLICT (board, meeting_date) WHERE is_recurring DO UPDATE SET
          start_time = CASE WHEN board_meetings.details_confirmed THEN board_meetings.start_time ELSE EXCLUDED.start_time END,
          end_time = CASE WHEN board_meetings.details_confirmed THEN board_meetings.end_time ELSE EXCLUDED.end_time END,
          location = CASE WHEN board_meetings.details_confirmed THEN board_meetings.location ELSE EXCLUDED.location END,
          details_confirmed = TRUE,
          updated_at = NOW()
        RETURNING id`;
      if ((res as unknown[]).length) created++;
    }
  }
  return created;
}

// ── Reads ───────────────────────────────────────────────────────────────────
export async function getUpcomingMeetings(boards?: Board[], limit = 40): Promise<Meeting[]> {
  await ensureGovernanceSchema();
  const db = sql();
  const rows = (await db`
    SELECT * FROM board_meetings
    WHERE meeting_date >= CURRENT_DATE - INTERVAL '1 day' AND status <> 'Archived'
    ORDER BY meeting_date ASC, board ASC LIMIT ${limit}`) as Record<string, unknown>[];
  const all = rows.map(rowToMeeting);
  return boards ? all.filter((m) => boards.includes(m.board)) : all;
}
export async function getMeeting(id: number): Promise<Meeting | null> {
  await ensureGovernanceSchema();
  const db = sql();
  const rows = (await db`SELECT * FROM board_meetings WHERE id = ${id} LIMIT 1`) as Record<string, unknown>[];
  return rows.length ? rowToMeeting(rows[0]) : null;
}
/** The next upcoming meeting for a user's board(s). */
export async function getNextMeeting(u: BoardUser): Promise<Meeting | null> {
  const list = await getUpcomingMeetings(userBoards(u), 10);
  return list.find((m) => !["Canceled", "Completed"].includes(m.status)) ?? null;
}

export interface AttendanceRow {
  userId: string; name: string; officerTitle: string | null; response: Response;
  note: string | null; confirmedStatus: string | null;
}
export async function getAttendance(meetingId: number, board: Board): Promise<AttendanceRow[]> {
  await ensureGovernanceSchema();
  const db = sql();
  // Left join every eligible member so non-responders show as "No Response".
  const rows = (await db`
    SELECT u.id, u.first_name, u.last_name, u.officer_title, u.role,
           a.response, a.note, a.confirmed_status
    FROM board_users u
    LEFT JOIN board_attendance a ON a.user_id = u.id AND a.meeting_id = ${meetingId}
    WHERE u.is_active = TRUE
    ORDER BY u.officer_title NULLS LAST, u.last_name ASC`) as Record<string, unknown>[];
  return rows
    .filter((r) => isEligibleMember({ role: String(r.role) }, board))
    .map((r) => ({
      userId: String(r.id), name: `${r.first_name} ${r.last_name}`,
      officerTitle: r.officer_title ? String(r.officer_title) : null,
      response: (r.response ? String(r.response) : "No Response") as Response,
      note: r.note ? String(r.note) : null,
      confirmedStatus: r.confirmed_status ? String(r.confirmed_status) : null,
    }));
}

export async function getQuorumRequired(board: Board, eligible: number): Promise<{ required: number; isDefault: boolean }> {
  const db = sql();
  const rows = (await db`SELECT required FROM board_quorum_rules WHERE board = ${board} LIMIT 1`) as Record<string, unknown>[];
  if (rows.length) return { required: Number(rows[0].required), isDefault: false };
  if (board === "ems") return { required: 3, isDefault: true };
  return { required: Math.floor(eligible / 2) + 1, isDefault: true }; // simple-majority default until bylaws confirmed
}

export function computeQuorum(att: AttendanceRow[], required: number, requiredIsDefault: boolean): Quorum {
  const attending = att.filter((a) => a.response === "Attending").length;
  const remote = att.filter((a) => a.response === "Attending Remotely").length;
  const tentative = att.filter((a) => a.response === "Tentative").length;
  const notAttending = att.filter((a) => a.response === "Not Attending" || a.response === "Excused Absence Requested").length;
  const noResponse = att.filter((a) => a.response === "No Response").length;
  const firm = attending + remote;
  let status: Quorum["status"];
  if (noResponse === att.length) status = "Quorum Not Yet Known";
  else if (firm >= required) status = "Quorum Confirmed";
  else if (firm + tentative >= required) status = "Quorum Expected";
  else if (att.length - notAttending >= required) status = "Quorum at Risk";
  else status = "Quorum Not Expected";
  return { eligible: att.length, required, requiredIsDefault, attending, remote, tentative, notAttending, noResponse, status };
}

export interface QuestionRow {
  id: number; userId: string; authorName: string; category: string; subject: string; body: string;
  visibility: Visibility; relatedRef: string | null; status: string; urgent: boolean;
  responseBody: string | null; responseBy: string | null; afterDeadline: boolean; createdAt: string;
}
export async function getQuestions(meetingId: number): Promise<QuestionRow[]> {
  await ensureGovernanceSchema();
  const db = sql();
  const rows = (await db`SELECT * FROM board_questions WHERE meeting_id = ${meetingId} ORDER BY urgent DESC, created_at ASC`) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: Number(r.id), userId: String(r.user_id), authorName: String(r.author_name), category: String(r.category),
    subject: String(r.subject), body: String(r.body), visibility: String(r.visibility) as Visibility,
    relatedRef: r.related_ref ? String(r.related_ref) : null, status: String(r.status), urgent: r.urgent === true,
    responseBody: r.response_body ? String(r.response_body) : null, responseBy: r.response_by ? String(r.response_by) : null,
    afterDeadline: r.after_deadline === true,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  }));
}

// ── Writes ──────────────────────────────────────────────────────────────────
export async function setAttendance(meetingId: number, userId: string, response: Response, note: string | null): Promise<void> {
  await ensureGovernanceSchema();
  const db = sql();
  await db`
    INSERT INTO board_attendance (meeting_id, user_id, response, note, responded_at)
    VALUES (${meetingId}, ${userId}, ${response}, ${note}, NOW())
    ON CONFLICT (meeting_id, user_id) DO UPDATE SET response = EXCLUDED.response, note = EXCLUDED.note, responded_at = NOW()`;
}

/** Secretary confirms the OFFICIAL attendance record (distinct from planned RSVP). */
export async function confirmAttendance(meetingId: number, userId: string, status: string, by: string, arrival: string | null, departure: string | null): Promise<void> {
  await ensureGovernanceSchema();
  const db = sql();
  await db`
    INSERT INTO board_attendance (meeting_id, user_id, response, confirmed_status, arrival_time, departure_time, confirmed_by, confirmed_at)
    VALUES (${meetingId}, ${userId}, 'No Response', ${status}, ${arrival}, ${departure}, ${by}, NOW())
    ON CONFLICT (meeting_id, user_id) DO UPDATE SET confirmed_status = EXCLUDED.confirmed_status,
      arrival_time = EXCLUDED.arrival_time, departure_time = EXCLUDED.departure_time,
      confirmed_by = EXCLUDED.confirmed_by, confirmed_at = NOW()`;
}

/** 48-hour briefing deadline (spec §13): questions after it are still saved but flagged. */
export function isAfterDeadline(meetingDate: string, now = new Date()): boolean {
  const meet = new Date(`${meetingDate}T00:00:00Z`).getTime();
  return now.getTime() > meet - 48 * 3600 * 1000;
}

export async function submitQuestion(input: {
  meetingId: number; userId: string; authorName: string; category: string; subject: string;
  body: string; visibility: Visibility; relatedRef: string | null; urgent: boolean; urgentReason: string | null;
  afterDeadline: boolean;
}): Promise<number> {
  await ensureGovernanceSchema();
  const db = sql();
  const rows = (await db`
    INSERT INTO board_questions (meeting_id, user_id, author_name, category, subject, body, visibility, related_ref, urgent, urgent_reason, after_deadline, status)
    VALUES (${input.meetingId}, ${input.userId}, ${input.authorName}, ${input.category}, ${input.subject}, ${input.body},
            ${input.visibility}, ${input.relatedRef}, ${input.urgent}, ${input.urgentReason}, ${input.afterDeadline}, 'New')
    RETURNING id`) as Record<string, unknown>[];
  return Number(rows[0].id);
}
