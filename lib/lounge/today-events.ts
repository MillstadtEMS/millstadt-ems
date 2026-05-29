/**
 * Server-side helper that pulls today's events from the public
 * Millstadt EMS Google Calendar (same feed the homepage embeds) and
 * returns just the items that fall in today's window in America/Chicago.
 *
 * Cached for 5 minutes in-process so a busy shift doesn't hammer
 * Google for every page load.
 *
 * node-ical is intentionally lazy-imported inside the function: it calls
 * BigInt() during module load, which throws inside Next.js's page-data
 * collection phase (Turbopack worker doesn't expose BigInt in that
 * sandbox) and breaks the Vercel build.
 */

const CALENDAR_ID =
  "10235a6f36b714b6c4670bc575e228e67be3024e97feb44585a33e4171fecc86@group.calendar.google.com";
const ICAL_URL = `https://calendar.google.com/calendar/ical/${encodeURIComponent(CALENDAR_ID)}/public/basic.ics`;
const CACHE_MS = 5 * 60 * 1000;

export interface TodayEvent {
  id: string;
  title: string;
  location: string | null;
  description: string | null;
  start: string;   // ISO
  end: string;     // ISO
  allDay: boolean;
  startLabel: string; // pre-formatted "2:30 PM" style for fast UI render
  endLabel: string;
}

interface CacheEntry { ts: number; events: TodayEvent[] }
let cache: CacheEntry | null = null;

function fmtTime(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit",
  });
}

function chicagoBoundsForToday(): { start: Date; end: Date } {
  // Build start-of-day and end-of-day in America/Chicago, then convert
  // back to absolute timestamps. Using Intl avoids hard-coding DST math.
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(now);
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  // Construct midnight local via a UTC offset trick: ask for midnight and
  // then re-anchor to absolute time by inverting the timezone offset for
  // that date.
  const localMidnight = new Date(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T00:00:00`);
  const tzMin = -new Date(localMidnight.toLocaleString("en-US", { timeZone: "America/Chicago" })).getTimezoneOffset();
  // Simpler: use noon to dodge DST 1am ambiguity, then snap.
  const noonUtc = Date.UTC(y, m - 1, d, 12, 0, 0);
  // Chicago is UTC-5 in summer, UTC-6 in winter — figure it out from this date.
  const tzString = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", timeZoneName: "shortOffset" })
    .formatToParts(new Date(noonUtc))
    .find((p) => p.type === "timeZoneName")?.value ?? "GMT-5";
  const offsetMatch = tzString.match(/GMT([+-]?\d+)/);
  const offsetHours = offsetMatch ? Number(offsetMatch[1]) : -5;
  // Local midnight at UTC = (midnight local) - offsetHours
  const startUtcMs = Date.UTC(y, m - 1, d, 0, 0, 0) - offsetHours * 3600 * 1000;
  const endUtcMs = startUtcMs + 24 * 3600 * 1000;
  void tzMin;
  return { start: new Date(startUtcMs), end: new Date(endUtcMs) };
}

function overlapsToday(s: Date, e: Date, dayStart: Date, dayEnd: Date): boolean {
  return s < dayEnd && e > dayStart;
}

interface VEventLike {
  type: string;
  uid: string;
  summary?: string | { val?: string };
  location?: string;
  description?: string;
  start: Date;
  end: Date;
  rrule?: { between: (start: Date, end: Date, inclusive: boolean) => Date[] };
  exdate?: Record<string, unknown>;
}

export async function getTodayEvents(): Promise<TodayEvent[]> {
  if (cache && Date.now() - cache.ts < CACHE_MS) return cache.events;
  try {
    // Lazy import — see comment above the file's top.
    const ical = (await import("node-ical")) as unknown as {
      async: { fromURL(url: string): Promise<Record<string, VEventLike>> };
    };
    const data = await ical.async.fromURL(ICAL_URL);
    const { start: dayStart, end: dayEnd } = chicagoBoundsForToday();
    const out: TodayEvent[] = [];

    for (const key of Object.keys(data)) {
      const item = data[key];
      if (!item || item.type !== "VEVENT") continue;

      // Handle recurring events by walking the rule across today's window.
      const occurrences: { start: Date; end: Date }[] = [];
      if (item.rrule) {
        // Pull every occurrence that touches today.
        const dates = item.rrule.between(dayStart, dayEnd, true);
        // RRULE quirks: also include occurrences whose duration spills into today.
        const lookback = new Date(dayStart.getTime() - 24 * 3600 * 1000);
        const extras = item.rrule.between(lookback, dayStart, true);
        for (const d of [...extras, ...dates]) {
          // Apply EXDATEs.
          const isoKey = d.toISOString();
          if (item.exdate && Object.keys(item.exdate).some((k) => new Date(k).toISOString() === isoKey)) continue;
          const len = (item.end as Date).getTime() - (item.start as Date).getTime();
          occurrences.push({ start: new Date(d), end: new Date(d.getTime() + len) });
        }
      } else {
        occurrences.push({ start: item.start as Date, end: item.end as Date });
      }

      for (const o of occurrences) {
        if (!overlapsToday(o.start, o.end, dayStart, dayEnd)) continue;
        // node-ical encodes all-day events as date-only with the same day for start/end+1
        // — detect by zero time component.
        const dayMs = 24 * 3600 * 1000;
        const allDay = o.start.getUTCHours() === 0 &&
                       o.start.getUTCMinutes() === 0 &&
                       (o.end.getTime() - o.start.getTime()) % dayMs === 0;
        out.push({
          id: `${item.uid}-${o.start.toISOString()}`,
          title: typeof item.summary === "string" ? item.summary : (item.summary as { val?: string } | undefined)?.val ?? "(no title)",
          location: typeof item.location === "string" ? item.location : null,
          description: typeof item.description === "string" ? item.description : null,
          start: o.start.toISOString(),
          end: o.end.toISOString(),
          allDay,
          startLabel: allDay ? "All day" : fmtTime(o.start),
          endLabel:   allDay ? "" : fmtTime(o.end),
        });
      }
    }

    out.sort((a, b) => {
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      return a.start.localeCompare(b.start);
    });
    cache = { ts: Date.now(), events: out };
    return out;
  } catch (e) {
    console.error("[today-events] iCal fetch failed:", e instanceof Error ? e.message : e);
    return cache?.events ?? [];
  }
}
