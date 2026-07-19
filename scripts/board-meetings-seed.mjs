/**
 * Board Portal — seed recurring meetings.
 *
 *   node scripts/board-meetings-seed.mjs [monthsAhead]
 *
 * Creates the governance tables and generates recurring EMS Board meetings:
 *   EMS = 2nd Wednesday of each month
 * Idempotent — safe to re-run; existing meetings are left untouched. Reads
 * DATABASE_URL from .env.local. Contains no financial or personal data.
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const monthsAhead = Number(process.argv[2] ?? 6);
const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const url = env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
if (!url) { console.error("DATABASE_URL not found in .env.local"); process.exit(1); }
const sql = neon(url);

// Date math (mirrors lib/board/governance.ts).
function nthWeekday(y, m0, weekday, nth) {
  const first = new Date(Date.UTC(y, m0, 1));
  const shift = (weekday - first.getUTCDay() + 7) % 7;
  return new Date(Date.UTC(y, m0, 1 + shift + (nth - 1) * 7));
}
const recurring = (_board, y, m0) => nthWeekday(y, m0, 3, 2);
const ymd = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
const DEFAULTS = {
  ems: { time: "7:00 PM", end: "8:30 PM", location: "100 East Laurel Street, Millstadt, Illinois" },
};

await sql`CREATE TABLE IF NOT EXISTS board_meetings (
  id BIGSERIAL PRIMARY KEY, board TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'Regular',
  status TEXT NOT NULL DEFAULT 'Scheduled', title TEXT, meeting_date DATE NOT NULL,
  start_time TEXT, end_time TEXT, location TEXT, virtual_link TEXT, description TEXT,
  minutes_text TEXT, minutes_public BOOLEAN NOT NULL DEFAULT FALSE, minutes_updated_by TEXT, minutes_updated_at TIMESTAMPTZ,
  quorum_override INTEGER, details_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  is_recurring BOOLEAN NOT NULL DEFAULT TRUE, series_key TEXT, created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;
await sql`ALTER TABLE board_meetings ADD COLUMN IF NOT EXISTS minutes_text TEXT`;
await sql`ALTER TABLE board_meetings ADD COLUMN IF NOT EXISTS minutes_public BOOLEAN NOT NULL DEFAULT FALSE`;
await sql`ALTER TABLE board_meetings ADD COLUMN IF NOT EXISTS minutes_updated_by TEXT`;
await sql`ALTER TABLE board_meetings ADD COLUMN IF NOT EXISTS minutes_updated_at TIMESTAMPTZ`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS board_meetings_series ON board_meetings (board, meeting_date) WHERE is_recurring`;
await sql`CREATE TABLE IF NOT EXISTS board_quorum_rules (
  board TEXT PRIMARY KEY,
  required INTEGER NOT NULL,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;
await sql`
  INSERT INTO board_quorum_rules (board, required, updated_by)
  VALUES ('ems', 3, 'board-approved-default')
  ON CONFLICT (board) DO NOTHING
`;

const now = new Date();
const todayFloor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
let created = 0;
for (let i = 0; i <= monthsAhead; i++) {
  const m = now.getUTCMonth() + i;
  const y = now.getUTCFullYear() + Math.floor(m / 12);
  const m0 = ((m % 12) + 12) % 12;
  for (const board of ["ems"]) {
    const d = recurring(board, y, m0);
    if (d < todayFloor) continue;
    const def = DEFAULTS[board];
    const res = await sql`
      INSERT INTO board_meetings (board, type, status, meeting_date, start_time, end_time, location, details_confirmed, is_recurring, series_key, created_by)
      VALUES (${board}, 'Regular', 'Scheduled', ${ymd(d)}, ${def.time}, ${def.end}, ${def.location}, TRUE, TRUE, ${board + "-monthly"}, 'system')
      ON CONFLICT (board, meeting_date) WHERE is_recurring DO UPDATE SET
        start_time = CASE WHEN board_meetings.details_confirmed THEN board_meetings.start_time ELSE EXCLUDED.start_time END,
        end_time = CASE WHEN board_meetings.details_confirmed THEN board_meetings.end_time ELSE EXCLUDED.end_time END,
        location = CASE WHEN board_meetings.details_confirmed THEN board_meetings.location ELSE EXCLUDED.location END,
        details_confirmed = TRUE,
        updated_at = NOW()
      RETURNING id`;
    if (res.length) { created++; console.log(`  + ${board.toUpperCase().padEnd(4)} ${ymd(d)}`); }
  }
}
console.log(`Seeded ${created} recurring meetings (${monthsAhead} months ahead).`);
