/**
 * Active employees whose birthday is today (America/Chicago). Returns
 * each as `{ id, firstName, lastName, photoUrl }`. The dob column is a
 * DATE so we ignore the year and match on MM-DD only.
 */
import { sql } from "./db";

export interface BirthdayPerson {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
}

function todayMonthDayChicago(): { month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return {
    month: Number(parts.find((p) => p.type === "month")?.value),
    day: Number(parts.find((p) => p.type === "day")?.value),
  };
}

export async function listTodaysBirthdays(): Promise<BirthdayPerson[]> {
  const { month, day } = todayMonthDayChicago();
  const db = sql();
  const rows = (await db`
    SELECT id, first_name, last_name, photo_url
    FROM lounge_employees
    WHERE is_active = TRUE
      AND dob IS NOT NULL
      AND EXTRACT(MONTH FROM dob) = ${month}
      AND EXTRACT(DAY FROM dob) = ${day}
    ORDER BY first_name ASC
  `) as unknown as { id: string; first_name: string; last_name: string; photo_url: string | null }[];
  return rows.map((r) => ({
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    photoUrl: r.photo_url,
  }));
}
