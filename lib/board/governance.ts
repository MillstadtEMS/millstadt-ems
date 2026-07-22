/**
 * Board Portal — governance layer: EMS meetings, attendance, public minutes,
 * shared calendar items, fire-board attendance requests, and pre-meeting
 * questions.
 *
 * Design notes / honesty rules (from the master prompt):
 *  - Planned attendance (a member's RSVP) is NOT the official record. The
 *    secretary confirms actual attendance separately; only confirmed attendance
 *    counts toward statistics.
 *  - Quorum numbers are an EMS Board portal function. Fire Board users can
 *    submit attendance requests, but the portal does not expose a Fire Board
 *    quorum calendar.
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

export const CONFIRMED_STATUSES = ["Present", "Present Remotely", "Absent", "Excused", "Unexcused", "Late Arrival", "Left Early", "Recused"] as const;

export const QUESTION_CATEGORIES = ["Question", "Concern", "Comment", "Requested Agenda Item", "Financial Question", "Levy Question", "Proposal Question", "Contract Question", "Invoice Question", "Operations Question", "Personnel Question", "Policy Question", "Legal Concern", "Meeting-Minutes Question", "Unfinished Business", "Other"] as const;

export const VISIBILITIES = ["board", "leadership", "confidential"] as const;
export type Visibility = (typeof VISIBILITIES)[number];
export const VISIBILITY_LABEL: Record<Visibility, string> = {
  board: "Board",
  leadership: "Leadership",
  confidential: "Confidential Review",
};

export const QUESTION_STATUSES = ["New", "Assigned", "Under Review", "Answered", "Partially Answered", "Waiting for Information", "Needs Discussion at Meeting", "Added to Agenda", "Confidential Review", "Closed"] as const;

export const CALENDAR_REMINDER_AUDIENCES = ["ems_board", "ems_and_admins", "creator"] as const;
export type CalendarReminderAudience = (typeof CALENDAR_REMINDER_AUDIENCES)[number];
export const CALENDAR_REMINDER_REPEATS = ["none", "daily", "weekly"] as const;
export type CalendarReminderRepeat = (typeof CALENDAR_REMINDER_REPEATS)[number];

export const FIRE_BOARD_ACCESS_LEVELS = ["requests", "meetings", "budget", "meetings_budget"] as const;
export type FireBoardAccessLevel = (typeof FIRE_BOARD_ACCESS_LEVELS)[number];
export type FireBoardAccessArea = "meetings" | "budget";

export const FIRE_BOARD_BUDGET_SECTIONS = [
  {
    value: "overview",
    label: "Budget workbook",
    navLabel: "Budget",
    href: "/board/referendum",
    summary: "Shared read-only spreadsheet view selected by Kenneth James and Joe Wagner.",
  },
] as const;
export type FireBoardBudgetSection = (typeof FIRE_BOARD_BUDGET_SECTIONS)[number]["value"];
export const FIRE_BOARD_BUDGET_SECTION_VALUES = FIRE_BOARD_BUDGET_SECTIONS.map((section) => section.value) as FireBoardBudgetSection[];

export const FIRE_BOARD_ACCESS_OPTIONS: Array<{
  value: FireBoardAccessLevel;
  label: string;
  summary: string;
  allowed: string[];
  blocked: string[];
}> = [
  {
    value: "requests",
    label: "Requests only",
    summary: "Fire Board members can ask for EMS Board attendance. EMS records stay hidden.",
    allowed: ["Submit Fire Board meeting requests"],
    blocked: ["EMS meetings", "Budget", "Documents"],
  },
  {
    value: "meetings",
    label: "Requests + EMS meetings",
    summary: "Fire Board members can see EMS meeting dates and permitted meeting records.",
    allowed: ["Submit Fire Board meeting requests", "View EMS meeting list", "Open permitted EMS meeting records"],
    blocked: ["Budget", "Documents", "EMS quorum and attendance controls"],
  },
  {
    value: "budget",
    label: "Requests + Budget",
    summary: "Fire Board members can see the Budget workbook, without EMS meeting access.",
    allowed: ["Submit Fire Board meeting requests", "View Budget workbook", "View Documents"],
    blocked: ["EMS meetings", "EMS quorum and attendance controls"],
  },
  {
    value: "meetings_budget",
    label: "Requests + Meetings + Budget",
    summary: "Fire Board members can see the permitted EMS meeting view plus the Budget workbook.",
    allowed: ["Submit Fire Board meeting requests", "View EMS meeting list", "Open permitted EMS meeting records", "View Budget workbook", "View Documents"],
    blocked: ["EMS quorum and attendance controls"],
  },
];

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
function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return ymd(d);
}
function daysBetween(startIso: string, endIso: string): number {
  const start = new Date(`${startIso}T00:00:00Z`).getTime();
  const end = new Date(`${endIso}T00:00:00Z`).getTime();
  return Math.round((end - start) / 86_400_000);
}
function chicagoNowParts(now = new Date()): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
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
    minutes_text TEXT,
    minutes_public BOOLEAN NOT NULL DEFAULT FALSE,
    minutes_raw_transcript TEXT,
    minutes_draft_text TEXT,
    minutes_updated_by TEXT,
    minutes_updated_at TIMESTAMPTZ,
    minutes_signed_by TEXT,
    minutes_signed_title TEXT,
    minutes_signed_at TIMESTAMPTZ,
    minutes_signature_data_url TEXT,
    minutes_signature_ip TEXT,
    minutes_signature_user_agent TEXT,
    quorum_override INTEGER,
    details_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    is_recurring BOOLEAN NOT NULL DEFAULT TRUE,
    series_key TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await db`ALTER TABLE board_meetings ADD COLUMN IF NOT EXISTS minutes_text TEXT`;
  await db`ALTER TABLE board_meetings ADD COLUMN IF NOT EXISTS minutes_public BOOLEAN NOT NULL DEFAULT FALSE`;
  await db`ALTER TABLE board_meetings ADD COLUMN IF NOT EXISTS minutes_raw_transcript TEXT`;
  await db`ALTER TABLE board_meetings ADD COLUMN IF NOT EXISTS minutes_draft_text TEXT`;
  await db`ALTER TABLE board_meetings ADD COLUMN IF NOT EXISTS minutes_updated_by TEXT`;
  await db`ALTER TABLE board_meetings ADD COLUMN IF NOT EXISTS minutes_updated_at TIMESTAMPTZ`;
  await db`ALTER TABLE board_meetings ADD COLUMN IF NOT EXISTS minutes_signed_by TEXT`;
  await db`ALTER TABLE board_meetings ADD COLUMN IF NOT EXISTS minutes_signed_title TEXT`;
  await db`ALTER TABLE board_meetings ADD COLUMN IF NOT EXISTS minutes_signed_at TIMESTAMPTZ`;
  await db`ALTER TABLE board_meetings ADD COLUMN IF NOT EXISTS minutes_signature_data_url TEXT`;
  await db`ALTER TABLE board_meetings ADD COLUMN IF NOT EXISTS minutes_signature_ip TEXT`;
  await db`ALTER TABLE board_meetings ADD COLUMN IF NOT EXISTS minutes_signature_user_agent TEXT`;
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
    VALUES ('ems', 3, 'board-approved-default')
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
  await db`CREATE TABLE IF NOT EXISTS board_calendar_items (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    item_type TEXT NOT NULL DEFAULT 'Event',
    item_date DATE NOT NULL,
    start_time TEXT,
    end_time TEXT,
    description TEXT,
    created_by UUID,
    created_by_name TEXT,
    email_reminders_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    reminder_audience TEXT NOT NULL DEFAULT 'ems_board',
    reminder_first_offset_days INTEGER NOT NULL DEFAULT 7,
    reminder_repeat TEXT NOT NULL DEFAULT 'none',
    reminder_max_sends INTEGER NOT NULL DEFAULT 1,
    reminder_preferred_time TEXT NOT NULL DEFAULT '08:00',
    reminder_send_count INTEGER NOT NULL DEFAULT 0,
    reminder_last_sent_at TIMESTAMPTZ,
    reminder_last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await db`ALTER TABLE board_calendar_items ADD COLUMN IF NOT EXISTS email_reminders_enabled BOOLEAN NOT NULL DEFAULT FALSE`;
  await db`ALTER TABLE board_calendar_items ADD COLUMN IF NOT EXISTS reminder_audience TEXT NOT NULL DEFAULT 'ems_board'`;
  await db`ALTER TABLE board_calendar_items ADD COLUMN IF NOT EXISTS reminder_first_offset_days INTEGER NOT NULL DEFAULT 7`;
  await db`ALTER TABLE board_calendar_items ADD COLUMN IF NOT EXISTS reminder_repeat TEXT NOT NULL DEFAULT 'none'`;
  await db`ALTER TABLE board_calendar_items ADD COLUMN IF NOT EXISTS reminder_max_sends INTEGER NOT NULL DEFAULT 1`;
  await db`ALTER TABLE board_calendar_items ADD COLUMN IF NOT EXISTS reminder_preferred_time TEXT NOT NULL DEFAULT '08:00'`;
  await db`ALTER TABLE board_calendar_items ADD COLUMN IF NOT EXISTS reminder_send_count INTEGER NOT NULL DEFAULT 0`;
  await db`ALTER TABLE board_calendar_items ADD COLUMN IF NOT EXISTS reminder_last_sent_at TIMESTAMPTZ`;
  await db`ALTER TABLE board_calendar_items ADD COLUMN IF NOT EXISTS reminder_last_error TEXT`;
  await db`CREATE TABLE IF NOT EXISTS board_fire_meeting_requests (
    id BIGSERIAL PRIMARY KEY,
    requester_user_id UUID,
    requester_name TEXT NOT NULL,
    meeting_title TEXT NOT NULL,
    meeting_date DATE,
    start_time TEXT,
    location TEXT,
    requested_scope TEXT NOT NULL DEFAULT 'specific',
    requested_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Requested',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await db`CREATE TABLE IF NOT EXISTS board_fire_access_settings (
    setting_key TEXT PRIMARY KEY,
    access_level TEXT NOT NULL DEFAULT 'requests',
    budget_sections JSONB NOT NULL DEFAULT '["overview"]'::jsonb,
    updated_by UUID,
    updated_by_name TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await db`ALTER TABLE board_fire_access_settings ADD COLUMN IF NOT EXISTS budget_sections JSONB NOT NULL DEFAULT '["overview"]'::jsonb`;
  await db`
    UPDATE board_fire_access_settings
    SET budget_sections = '["overview"]'::jsonb
    WHERE budget_sections IS NULL
  `;
  await db`
    INSERT INTO board_fire_access_settings (setting_key, access_level, updated_by_name)
    VALUES ('fire_board', 'requests', 'system-default')
    ON CONFLICT (setting_key) DO NOTHING
  `;
  govReady = true;
}

// ── Role / eligibility helpers ──────────────────────────────────────────────
const EMS_ROLES = new Set(["ems_board", "ems_president"]);
function normalizeFireBoardAccessLevel(value: unknown): FireBoardAccessLevel {
  return FIRE_BOARD_ACCESS_LEVELS.includes(value as FireBoardAccessLevel) ? value as FireBoardAccessLevel : "requests";
}
export function normalizeFireBoardBudgetSections(value: unknown): FireBoardBudgetSection[] {
  let raw: unknown = value;
  if (typeof raw === "string") {
    const rawString = raw;
    try {
      raw = JSON.parse(rawString);
    } catch {
      raw = rawString.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }
  if (!Array.isArray(raw)) return [...FIRE_BOARD_BUDGET_SECTION_VALUES];
  const seen = new Set<FireBoardBudgetSection>();
  const normalized: FireBoardBudgetSection[] = [];
  for (const item of raw) {
    if (!FIRE_BOARD_BUDGET_SECTION_VALUES.includes(item as FireBoardBudgetSection)) continue;
    const section = item as FireBoardBudgetSection;
    if (seen.has(section)) continue;
    seen.add(section);
    normalized.push(section);
  }
  return normalized;
}
export function fireBoardAccessAllows(level: FireBoardAccessLevel, area: FireBoardAccessArea): boolean {
  if (area === "meetings") return level === "meetings" || level === "meetings_budget";
  return level === "budget" || level === "meetings_budget";
}
export async function getFireBoardAccessLevel(): Promise<FireBoardAccessLevel> {
  await ensureGovernanceSchema();
  const db = sql();
  const rows = (await db`
    SELECT access_level FROM board_fire_access_settings
    WHERE setting_key = 'fire_board'
    LIMIT 1`) as Record<string, unknown>[];
  return normalizeFireBoardAccessLevel(rows[0]?.access_level);
}
export async function setFireBoardAccessLevel(level: FireBoardAccessLevel, updatedBy: BoardUser, budgetSections?: FireBoardBudgetSection[]): Promise<void> {
  await ensureGovernanceSchema();
  const normalized = normalizeFireBoardAccessLevel(level);
  const normalizedBudgetSections = normalizeFireBoardBudgetSections(budgetSections);
  const db = sql();
  await db`
    INSERT INTO board_fire_access_settings (setting_key, access_level, budget_sections, updated_by, updated_by_name, updated_at)
    VALUES ('fire_board', ${normalized}, ${JSON.stringify(normalizedBudgetSections)}::jsonb, ${updatedBy.id}, ${`${updatedBy.firstName} ${updatedBy.lastName}`}, NOW())
    ON CONFLICT (setting_key) DO UPDATE SET
      access_level = EXCLUDED.access_level,
      budget_sections = EXCLUDED.budget_sections,
      updated_by = EXCLUDED.updated_by,
      updated_by_name = EXCLUDED.updated_by_name,
      updated_at = NOW()
  `;
}
export interface FireBoardAccessStatus {
  level: FireBoardAccessLevel;
  budgetSections: FireBoardBudgetSection[];
  label: string;
  summary: string;
  updatedByName: string | null;
  updatedAt: string | null;
}
export async function getFireBoardAccessStatus(): Promise<FireBoardAccessStatus> {
  await ensureGovernanceSchema();
  const db = sql();
  const rows = (await db`
    SELECT access_level, budget_sections, updated_by_name, updated_at
    FROM board_fire_access_settings
    WHERE setting_key = 'fire_board'
    LIMIT 1`) as Record<string, unknown>[];
  const level = normalizeFireBoardAccessLevel(rows[0]?.access_level);
  const option = FIRE_BOARD_ACCESS_OPTIONS.find((item) => item.value === level) ?? FIRE_BOARD_ACCESS_OPTIONS[0];
  const updatedAt = rows[0]?.updated_at instanceof Date ? rows[0].updated_at.toISOString() : (rows[0]?.updated_at ? String(rows[0].updated_at) : null);
  return {
    level,
    budgetSections: normalizeFireBoardBudgetSections(rows[0]?.budget_sections),
    label: option.label,
    summary: option.summary,
    updatedByName: rows[0]?.updated_by_name ? String(rows[0].updated_by_name) : null,
    updatedAt,
  };
}
export interface FireBoardUserSummary {
  id: string;
  username: string;
  name: string;
  officerTitle: string | null;
}
export async function getFireBoardUsers(): Promise<FireBoardUserSummary[]> {
  await ensureGovernanceSchema();
  const db = sql();
  const rows = (await db`
    SELECT id, username, first_name, last_name, officer_title
    FROM board_users
    WHERE role = 'fire_board'
      AND is_active = TRUE
      AND COALESCE(is_dev_login, FALSE) = FALSE
    ORDER BY last_name ASC, first_name ASC`) as Record<string, unknown>[];
  return rows.map((row) => ({
    id: String(row.id),
    username: String(row.username),
    name: `${row.first_name} ${row.last_name}`,
    officerTitle: row.officer_title ? String(row.officer_title) : null,
  }));
}
/**
 * Which board's meetings a user participates in. The portal is EMS-board-first:
 * Fire Board users submit attendance requests instead of getting a Fire Board
 * quorum calendar.
 */
export function userBoards(u: BoardUser, fireAccessLevel: FireBoardAccessLevel = "requests"): Board[] {
  if (u.role === "fire_board") return fireBoardAccessAllows(fireAccessLevel, "meetings") ? ["ems"] : [];
  return ["ems"];
}
/** Is this user a voting/eligible member counted toward the board's quorum? */
export function isEligibleMember(u: { role: string }, board: Board): boolean {
  return board === "ems" ? EMS_ROLES.has(u.role) : u.role === "fire_board";
}
export function canRecordAttendance(u: BoardUser, board: Board): boolean {
  return !u.isDevLogin && isEligibleMember(u, board);
}
export function canManageCalendar(u: BoardUser): boolean {
  return u.role === "admin" || u.role === "submitter" || u.role === "ems_board" || u.role === "ems_president";
}
export function isLeadership(u: BoardUser): boolean {
  if (u.role === "admin" || u.role === "submitter" || u.role === "ems_president") return true;
  return ["President", "Vice President", "Secretary", "Treasurer"].includes(u.officerTitle ?? "");
}
export function isSecretary(u: BoardUser): boolean {
  return u.role === "admin" || u.officerTitle === "Secretary";
}
export function canEditMinutes(u: BoardUser): boolean {
  return u.role === "admin" || u.role === "ems_president" || u.officerTitle === "Secretary";
}
export function canSubmitFireMeetingRequest(u: BoardUser): boolean {
  return u.role === "fire_board";
}
export function canReviewFireMeetingRequests(u: BoardUser): boolean {
  return u.role === "admin" || u.role === "ems_president" || u.officerTitle === "President";
}
export function canManageFireBoardAccess(u: BoardUser): boolean {
  return u.role === "admin" || u.role === "ems_president" || u.officerTitle === "President";
}
function canViewInternalBudgetWorkbook(u: BoardUser): boolean {
  return u.role === "admin" || u.role === "submitter" || u.role === "ems_board" || u.role === "ems_president" || u.role === "audit_reviewer";
}
export function canViewBudgetWorkbook(
  u: BoardUser,
  fireAccessLevel: FireBoardAccessLevel = "requests",
  budgetSections: FireBoardBudgetSection[] = FIRE_BOARD_BUDGET_SECTION_VALUES,
): boolean {
  if (u.role === "fire_board") {
    return fireBoardAccessAllows(fireAccessLevel, "budget") && normalizeFireBoardBudgetSections(budgetSections).length > 0;
  }
  return canViewInternalBudgetWorkbook(u);
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
  minutesText: string | null; minutesPublic: boolean; minutesUpdatedBy: string | null; minutesUpdatedAt: string | null;
  minutesRawTranscript: string | null; minutesDraftText: string | null;
  minutesSignedBy: string | null; minutesSignedTitle: string | null; minutesSignedAt: string | null;
  minutesSignatureDataUrl: string | null;
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
    minutesText: r.minutes_text ? String(r.minutes_text) : null,
    minutesPublic: r.minutes_public === true,
    minutesRawTranscript: r.minutes_raw_transcript ? String(r.minutes_raw_transcript) : null,
    minutesDraftText: r.minutes_draft_text ? String(r.minutes_draft_text) : null,
    minutesUpdatedBy: r.minutes_updated_by ? String(r.minutes_updated_by) : null,
    minutesUpdatedAt: r.minutes_updated_at instanceof Date ? r.minutes_updated_at.toISOString() : (r.minutes_updated_at ? String(r.minutes_updated_at) : null),
    minutesSignedBy: r.minutes_signed_by ? String(r.minutes_signed_by) : null,
    minutesSignedTitle: r.minutes_signed_title ? String(r.minutes_signed_title) : null,
    minutesSignedAt: r.minutes_signed_at instanceof Date ? r.minutes_signed_at.toISOString() : (r.minutes_signed_at ? String(r.minutes_signed_at) : null),
    minutesSignatureDataUrl: r.minutes_signature_data_url ? String(r.minutes_signature_data_url) : null,
    quorumOverride: r.quorum_override != null ? Number(r.quorum_override) : null,
    detailsConfirmed: r.details_confirmed === true, isRecurring: r.is_recurring === true,
  };
}

// ── Recurring generation ────────────────────────────────────────────────────
/** Ensure recurring EMS Board meetings exist for the next `monthsAhead` months. Idempotent. */
export async function generateRecurring(monthsAhead = 6, now = new Date()): Promise<number> {
  await ensureGovernanceSchema();
  const db = sql();
  let created = 0;
  for (let i = 0; i <= monthsAhead; i++) {
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth() + i;
    for (const board of ["ems"] as Board[]) {
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
export async function getNextMeeting(u: BoardUser, fireAccessLevel: FireBoardAccessLevel = "requests"): Promise<Meeting | null> {
  const list = await getUpcomingMeetings(userBoards(u, fireAccessLevel), 10);
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
    WHERE u.is_active = TRUE AND COALESCE(u.is_dev_login, FALSE) = FALSE
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

export interface EmsBoardRecipient {
  id: string; name: string; username: string; officerTitle: string | null; role: string;
}
export async function getActiveEmsBoardRecipients(): Promise<EmsBoardRecipient[]> {
  await ensureGovernanceSchema();
  const db = sql();
  const rows = (await db`
    SELECT id, username, first_name, last_name, officer_title, role
    FROM board_users
    WHERE is_active = TRUE
      AND COALESCE(is_dev_login, FALSE) = FALSE
      AND role IN ('ems_board', 'ems_president')
    ORDER BY
      CASE WHEN role = 'ems_president' OR officer_title = 'President' THEN 0 ELSE 1 END,
      officer_title NULLS LAST,
      last_name ASC,
      first_name ASC`) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: String(r.id),
    username: String(r.username),
    name: `${r.first_name} ${r.last_name}`,
    officerTitle: r.officer_title ? String(r.officer_title) : null,
    role: String(r.role),
  }));
}

export interface CalendarItem {
  id: number; title: string; itemType: string; date: string; startTime: string | null;
  endTime: string | null; description: string | null; createdByName: string | null;
  emailRemindersEnabled: boolean; reminderAudience: CalendarReminderAudience;
  reminderFirstOffsetDays: number; reminderRepeat: CalendarReminderRepeat;
  reminderMaxSends: number; reminderPreferredTime: string;
  reminderSendCount: number; reminderLastSentAt: string | null;
}
export async function getCalendarItems(limit = 80): Promise<CalendarItem[]> {
  await ensureGovernanceSchema();
  const db = sql();
  const rows = (await db`
    SELECT * FROM board_calendar_items
    WHERE item_date >= CURRENT_DATE - INTERVAL '30 days'
    ORDER BY item_date ASC, start_time ASC NULLS LAST, id ASC
    LIMIT ${limit}`) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: Number(r.id),
    title: String(r.title),
    itemType: String(r.item_type),
    date: r.item_date instanceof Date ? ymd(r.item_date) : String(r.item_date),
    startTime: r.start_time ? String(r.start_time) : null,
    endTime: r.end_time ? String(r.end_time) : null,
    description: r.description ? String(r.description) : null,
    createdByName: r.created_by_name ? String(r.created_by_name) : null,
    emailRemindersEnabled: r.email_reminders_enabled === true,
    reminderAudience: CALENDAR_REMINDER_AUDIENCES.includes(String(r.reminder_audience) as CalendarReminderAudience)
      ? String(r.reminder_audience) as CalendarReminderAudience : "ems_board",
    reminderFirstOffsetDays: Number(r.reminder_first_offset_days ?? 7),
    reminderRepeat: CALENDAR_REMINDER_REPEATS.includes(String(r.reminder_repeat) as CalendarReminderRepeat)
      ? String(r.reminder_repeat) as CalendarReminderRepeat : "none",
    reminderMaxSends: Number(r.reminder_max_sends ?? 1),
    reminderPreferredTime: String(r.reminder_preferred_time ?? "08:00"),
    reminderSendCount: Number(r.reminder_send_count ?? 0),
    reminderLastSentAt: r.reminder_last_sent_at
      ? (r.reminder_last_sent_at instanceof Date ? r.reminder_last_sent_at.toISOString() : String(r.reminder_last_sent_at))
      : null,
  }));
}

export async function createCalendarItem(input: {
  title: string; itemType: string; date: string; startTime: string | null; endTime: string | null;
  description: string | null; createdBy: BoardUser; emailRemindersEnabled: boolean;
  reminderAudience: CalendarReminderAudience; reminderFirstOffsetDays: number;
  reminderRepeat: CalendarReminderRepeat; reminderMaxSends: number; reminderPreferredTime: string;
}): Promise<number> {
  await ensureGovernanceSchema();
  const db = sql();
  const rows = (await db`
    INSERT INTO board_calendar_items (
      title, item_type, item_date, start_time, end_time, description, created_by, created_by_name,
      email_reminders_enabled, reminder_audience, reminder_first_offset_days, reminder_repeat,
      reminder_max_sends, reminder_preferred_time
    )
    VALUES (
      ${input.title}, ${input.itemType}, ${input.date}, ${input.startTime}, ${input.endTime}, ${input.description},
      ${input.createdBy.id}, ${`${input.createdBy.firstName} ${input.createdBy.lastName}`},
      ${input.emailRemindersEnabled}, ${input.reminderAudience}, ${input.reminderFirstOffsetDays}, ${input.reminderRepeat},
      ${input.reminderMaxSends}, ${input.reminderPreferredTime}
    )
    RETURNING id`) as Record<string, unknown>[];
  return Number(rows[0].id);
}

export interface DueCalendarReminder extends CalendarItem {
  recipientEmails: string[];
}

async function getCalendarReminderRecipients(audience: CalendarReminderAudience, createdBy: string | null): Promise<string[]> {
  const db = sql();
  const rows = audience === "creator"
    ? (await db`
      SELECT email FROM board_users
      WHERE id = ${createdBy}
        AND is_active = TRUE
        AND email IS NOT NULL
        AND COALESCE(is_dev_login, FALSE) = FALSE`) as Record<string, unknown>[]
    : audience === "ems_and_admins"
      ? (await db`
        SELECT email FROM board_users
        WHERE is_active = TRUE
          AND email IS NOT NULL
          AND COALESCE(is_dev_login, FALSE) = FALSE
          AND role IN ('admin', 'submitter', 'ems_president', 'ems_board')
        ORDER BY role, last_name, first_name`) as Record<string, unknown>[]
      : (await db`
        SELECT email FROM board_users
        WHERE is_active = TRUE
          AND email IS NOT NULL
          AND COALESCE(is_dev_login, FALSE) = FALSE
          AND role IN ('ems_president', 'ems_board')
        ORDER BY role, last_name, first_name`) as Record<string, unknown>[];
  return Array.from(new Set(rows.map((r) => String(r.email).trim()).filter(Boolean)));
}

function rowToCalendarItem(r: Record<string, unknown>): CalendarItem {
  return {
    id: Number(r.id),
    title: String(r.title),
    itemType: String(r.item_type),
    date: r.item_date instanceof Date ? ymd(r.item_date) : String(r.item_date),
    startTime: r.start_time ? String(r.start_time) : null,
    endTime: r.end_time ? String(r.end_time) : null,
    description: r.description ? String(r.description) : null,
    createdByName: r.created_by_name ? String(r.created_by_name) : null,
    emailRemindersEnabled: r.email_reminders_enabled === true,
    reminderAudience: CALENDAR_REMINDER_AUDIENCES.includes(String(r.reminder_audience) as CalendarReminderAudience)
      ? String(r.reminder_audience) as CalendarReminderAudience : "ems_board",
    reminderFirstOffsetDays: Number(r.reminder_first_offset_days ?? 7),
    reminderRepeat: CALENDAR_REMINDER_REPEATS.includes(String(r.reminder_repeat) as CalendarReminderRepeat)
      ? String(r.reminder_repeat) as CalendarReminderRepeat : "none",
    reminderMaxSends: Number(r.reminder_max_sends ?? 1),
    reminderPreferredTime: String(r.reminder_preferred_time ?? "08:00"),
    reminderSendCount: Number(r.reminder_send_count ?? 0),
    reminderLastSentAt: r.reminder_last_sent_at
      ? (r.reminder_last_sent_at instanceof Date ? r.reminder_last_sent_at.toISOString() : String(r.reminder_last_sent_at))
      : null,
  };
}

function isCalendarReminderDue(item: CalendarItem, now = new Date()): boolean {
  if (!item.emailRemindersEnabled) return false;
  if (item.reminderSendCount >= item.reminderMaxSends) return false;
  const current = chicagoNowParts(now);
  if (current.time < item.reminderPreferredTime) return false;
  if (item.reminderLastSentAt && chicagoNowParts(new Date(item.reminderLastSentAt)).date === current.date) return false;

  const firstDueDate = addDays(item.date, -item.reminderFirstOffsetDays);
  if (current.date < firstDueDate || current.date > item.date) return false;
  if (item.reminderRepeat === "daily") return true;
  if (item.reminderRepeat === "weekly") return daysBetween(firstDueDate, current.date) % 7 === 0 || current.date === item.date;
  return item.reminderSendCount === 0;
}

export async function getDueCalendarEmailReminders(now = new Date()): Promise<DueCalendarReminder[]> {
  await ensureGovernanceSchema();
  const db = sql();
  const rows = (await db`
    SELECT * FROM board_calendar_items
    WHERE email_reminders_enabled = TRUE
      AND item_date >= CURRENT_DATE - INTERVAL '1 day'
      AND reminder_send_count < reminder_max_sends
    ORDER BY item_date ASC, id ASC
    LIMIT 100`) as Record<string, unknown>[];
  const due: DueCalendarReminder[] = [];
  for (const row of rows) {
    const item = rowToCalendarItem(row);
    if (!isCalendarReminderDue(item, now)) continue;
    const recipients = await getCalendarReminderRecipients(item.reminderAudience, row.created_by ? String(row.created_by) : null);
    if (recipients.length === 0) continue;
    due.push({ ...item, recipientEmails: recipients });
  }
  return due;
}

export async function markCalendarReminderSent(id: number): Promise<void> {
  await ensureGovernanceSchema();
  const db = sql();
  await db`
    UPDATE board_calendar_items
    SET reminder_send_count = reminder_send_count + 1,
        reminder_last_sent_at = NOW(),
        reminder_last_error = NULL,
        updated_at = NOW()
    WHERE id = ${id}`;
}

export async function markCalendarReminderError(id: number, error: string): Promise<void> {
  await ensureGovernanceSchema();
  const db = sql();
  await db`
    UPDATE board_calendar_items
    SET reminder_last_error = ${error.slice(0, 500)},
        updated_at = NOW()
    WHERE id = ${id}`;
}

export interface FireMeetingRequest {
  id: number; requesterName: string; meetingTitle: string; date: string | null; startTime: string | null;
  location: string | null; requestedScope: string; requestedUserIds: string[]; reason: string;
  status: string; createdAt: string;
}
function parseRequestedUserIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch { return []; }
  }
  return [];
}
function rowToFireMeetingRequest(r: Record<string, unknown>): FireMeetingRequest {
  return {
    id: Number(r.id),
    requesterName: String(r.requester_name),
    meetingTitle: String(r.meeting_title),
    date: r.meeting_date instanceof Date ? ymd(r.meeting_date) : (r.meeting_date ? String(r.meeting_date) : null),
    startTime: r.start_time ? String(r.start_time) : null,
    location: r.location ? String(r.location) : null,
    requestedScope: String(r.requested_scope),
    requestedUserIds: parseRequestedUserIds(r.requested_user_ids),
    reason: String(r.reason),
    status: String(r.status),
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  };
}
export async function getFireMeetingRequests(u: BoardUser): Promise<FireMeetingRequest[]> {
  await ensureGovernanceSchema();
  const db = sql();
  const rows = canReviewFireMeetingRequests(u)
    ? await db`SELECT * FROM board_fire_meeting_requests ORDER BY created_at DESC LIMIT 80`
    : await db`SELECT * FROM board_fire_meeting_requests WHERE requester_user_id = ${u.id} ORDER BY created_at DESC LIMIT 40`;
  return (rows as Record<string, unknown>[]).map(rowToFireMeetingRequest);
}
export async function createFireMeetingRequest(input: {
  requester: BoardUser; meetingTitle: string; date: string | null; startTime: string | null;
  location: string | null; requestedScope: string; requestedUserIds: string[]; reason: string;
}): Promise<number> {
  await ensureGovernanceSchema();
  const db = sql();
  const rows = (await db`
    INSERT INTO board_fire_meeting_requests (
      requester_user_id, requester_name, meeting_title, meeting_date, start_time, location,
      requested_scope, requested_user_ids, reason
    )
    VALUES (
      ${input.requester.id}, ${`${input.requester.firstName} ${input.requester.lastName}`},
      ${input.meetingTitle}, ${input.date}, ${input.startTime}, ${input.location},
      ${input.requestedScope}, ${JSON.stringify(input.requestedUserIds)}::jsonb, ${input.reason}
    )
    RETURNING id`) as Record<string, unknown>[];
  return Number(rows[0].id);
}

export interface PublicMinutes {
  id: number; title: string | null; date: string; startTime: string | null; minutesText: string;
}
export async function getPublicMinutes(): Promise<PublicMinutes[]> {
  await ensureGovernanceSchema();
  const db = sql();
  const rows = (await db`
    SELECT id, title, meeting_date, start_time, minutes_text
    FROM board_meetings
    WHERE board = 'ems'
      AND minutes_public = TRUE
      AND minutes_signed_at IS NOT NULL
      AND COALESCE(NULLIF(TRIM(minutes_text), ''), NULL) IS NOT NULL
    ORDER BY meeting_date DESC, id DESC`) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: Number(r.id),
    title: r.title ? String(r.title) : null,
    date: r.meeting_date instanceof Date ? ymd(r.meeting_date) : String(r.meeting_date),
    startTime: r.start_time ? String(r.start_time) : null,
    minutesText: String(r.minutes_text),
  }));
}
export async function hasPublicMinutes(): Promise<boolean> {
  await ensureGovernanceSchema();
  const db = sql();
  const rows = (await db`
    SELECT 1 FROM board_meetings
    WHERE board = 'ems'
      AND minutes_public = TRUE
      AND minutes_signed_at IS NOT NULL
      AND COALESCE(NULLIF(TRIM(minutes_text), ''), NULL) IS NOT NULL
    LIMIT 1`) as Record<string, unknown>[];
  return rows.length > 0;
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

export async function updateMeetingMinutes(input: {
  meetingId: number; minutesText: string | null; minutesPublic: boolean; updatedBy: string;
}): Promise<void> {
  await ensureGovernanceSchema();
  const db = sql();
  await db`
    UPDATE board_meetings
    SET minutes_text = ${input.minutesText}, minutes_public = ${input.minutesPublic},
        minutes_updated_by = ${input.updatedBy}, minutes_updated_at = NOW(),
        minutes_signed_by = NULL, minutes_signed_title = NULL, minutes_signed_at = NULL,
        minutes_signature_data_url = NULL, minutes_signature_ip = NULL, minutes_signature_user_agent = NULL,
        updated_at = NOW()
    WHERE id = ${input.meetingId}`;
}

export async function updateMeetingMinutesDraft(input: {
  meetingId: number; rawTranscript: string; draftText: string; updatedBy: string;
}): Promise<void> {
  await ensureGovernanceSchema();
  const db = sql();
  await db`
    UPDATE board_meetings
    SET minutes_raw_transcript = ${input.rawTranscript},
        minutes_draft_text = ${input.draftText},
        minutes_text = ${input.draftText},
        minutes_updated_by = ${input.updatedBy},
        minutes_updated_at = NOW(),
        minutes_signed_by = NULL, minutes_signed_title = NULL, minutes_signed_at = NULL,
        minutes_signature_data_url = NULL, minutes_signature_ip = NULL, minutes_signature_user_agent = NULL,
        updated_at = NOW()
    WHERE id = ${input.meetingId}`;
}

export async function finalizeMeetingMinutes(input: {
  meetingId: number; minutesText: string; minutesPublic: boolean; signedBy: string; signedTitle: string;
  signatureDataUrl: string; signatureIp: string | null; signatureUserAgent: string | null;
}): Promise<void> {
  await ensureGovernanceSchema();
  const db = sql();
  await db`
    UPDATE board_meetings
    SET minutes_text = ${input.minutesText},
        minutes_draft_text = ${input.minutesText},
        minutes_public = ${input.minutesPublic},
        minutes_updated_by = ${input.signedBy},
        minutes_updated_at = NOW(),
        minutes_signed_by = ${input.signedBy},
        minutes_signed_title = ${input.signedTitle},
        minutes_signed_at = NOW(),
        minutes_signature_data_url = ${input.signatureDataUrl},
        minutes_signature_ip = ${input.signatureIp},
        minutes_signature_user_agent = ${input.signatureUserAgent},
        updated_at = NOW()
    WHERE id = ${input.meetingId}`;
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
