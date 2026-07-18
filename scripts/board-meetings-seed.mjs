/**
 * Board Portal — seed recurring meetings.
 *
 *   node scripts/board-meetings-seed.mjs [monthsAhead]
 *
 * Creates the governance tables and generates the recurring EMS Board meeting:
 *   EMS  = 2nd Wednesday of each month
 * The Fire Protection District Board are view-only guests of the referendum
 * model — they are not managed here, so no Fire meetings are generated.
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
function lastWeekday(y, m0, weekday) {
  const last = new Date(Date.UTC(y, m0 + 1, 0));
  const shift = (last.getUTCDay() - weekday + 7) % 7;
  return new Date(Date.UTC(y, m0 + 1, 0 - shift));
}
const recurring = (board, y, m0) => (board === "ems" ? nthWeekday(y, m0, 3, 2) : lastWeekday(y, m0, 4));
const ymd = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
const DEFAULTS = {
  ems: { time: "7:00 PM", end: "8:30 PM", location: "Millstadt EMS Station" },
  fire: { time: "7:00 PM", end: "8:30 PM", location: "Millstadt Fire Protection District" },
};

await sql`CREATE TABLE IF NOT EXISTS board_meetings (
  id BIGSERIAL PRIMARY KEY, board TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'Regular',
  status TEXT NOT NULL DEFAULT 'Scheduled', title TEXT, meeting_date DATE NOT NULL,
  start_time TEXT, end_time TEXT, location TEXT, virtual_link TEXT, description TEXT,
  quorum_override INTEGER, details_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  is_recurring BOOLEAN NOT NULL DEFAULT TRUE, series_key TEXT, created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS board_meetings_series ON board_meetings (board, meeting_date) WHERE is_recurring`;

const now = new Date();
const todayFloor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
let created = 0;
for (let i = 0; i <= monthsAhead; i++) {
  const m = now.getUTCMonth() + i;
  const y = now.getUTCFullYear() + Math.floor(m / 12);
  const m0 = ((m % 12) + 12) % 12;
  for (const board of ["ems"]) { // EMS Board only — Fire Board are guests
    const d = recurring(board, y, m0);
    if (d < todayFloor) continue;
    const def = DEFAULTS[board];
    const res = await sql`
      INSERT INTO board_meetings (board, type, status, meeting_date, start_time, end_time, location, is_recurring, series_key, created_by)
      VALUES (${board}, 'Regular', 'Scheduled', ${ymd(d)}, ${def.time}, ${def.end}, ${def.location}, TRUE, ${board + "-monthly"}, 'system')
      ON CONFLICT (board, meeting_date) WHERE is_recurring DO NOTHING RETURNING id`;
    if (res.length) { created++; console.log(`  + ${board.toUpperCase().padEnd(4)} ${ymd(d)}`); }
  }
}
console.log(`Seeded ${created} recurring meetings (${monthsAhead} months ahead).`);
