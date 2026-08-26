import { chicagoLocalTimeToUtc } from "@/lib/community/reliability";

// Only split an explicit shared sport heading, never a mention of another sport
// elsewhere in an event (for example a fundraiser or an opponent's name).
const COMBINED_SPORTS_PATTERN = /^(baseball|softball)\s*(?:\/|&|\+|and\b|\s)\s*(baseball|softball)\b(.*)$/i;
const DATE_PATTERN = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/;
const TIME_PATTERN = /^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?(?=$|\s|[-–—])/i;
const TIME_RANGE_PATTERN = /^(\d{1,2})(?::(\d{2}))?\s*[-–—]\s*\d{1,2}(?::\d{2})?\s*([ap])\.?m\.?$/i;

export type McsScheduleArticle = {
  id: string;
  title: string;
  publishedAt: string;
  content: string;
};

export type McsScheduleEvent = {
  id: string;
  dateKey: string;
  label: string;
  timeLabel: string | null;
  startsAt: string;
};

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function cellText(value: string) {
  return decodeHtmlEntities(
    value
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/p>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function articleCalendarParts(publishedAt: string) {
  const published = new Date(publishedAt);
  if (Number.isNaN(published.getTime())) {
    const now = new Date();
    return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "numeric",
  }).formatToParts(published);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((item) => item.type === type)?.value ?? 0);

  return { year: part("year"), month: part("month") };
}

function eventDateKey(value: string, article: McsScheduleArticle) {
  const match = DATE_PATTERN.exec(value.trim());
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const published = articleCalendarParts(article.publishedAt);
  let year = published.year;

  if (match[3]) {
    year = Number(match[3]);
    if (year < 100) year += 2000;
  } else if (published.month >= 7 && month <= 6) {
    year += 1;
  }

  const probe = new Date(Date.UTC(year, month - 1, day, 12));
  if (
    probe.getUTCFullYear() !== year
    || probe.getUTCMonth() + 1 !== month
    || probe.getUTCDate() !== day
  ) return null;

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function eventTime(dateKey: string, value: string) {
  const text = value.trim();
  const timeLabel = !text || /^(?:t\.?b\.?a\.?|n\/?a)$/i.test(text) ? null : text;
  // Keep the source's full time range or instructions ("See flyer", "All day")
  // in the hover entry. A fallback timestamp is only for sorting, not display.
  const fallback = { startsAt: chicagoLocalTimeToUtc(dateKey, 7).toISOString(), timeLabel };
  const match = TIME_PATTERN.exec(text) ?? TIME_RANGE_PATTERN.exec(text);
  if (!match) {
    return fallback;
  }

  const sourceHour = Number(match[1]);
  let hour = Number(match[1]) % 12;
  if (match[3].toLowerCase() === "p") hour += 12;
  const minute = Number(match[2] ?? 0);
  if (sourceHour < 1 || sourceHour > 12 || minute > 59) {
    return fallback;
  }

  return {
    startsAt: chicagoLocalTimeToUtc(dateKey, hour, minute).toISOString(),
    timeLabel,
  };
}

function eventSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function eventId(dateKey: string, label: string, startsAt: string, timeLabel: string | null) {
  // Sport, full event description, and start time all participate in identity:
  // simultaneous games and multiple performances must not overwrite each other.
  return `${dateKey}-${eventSlug(label)}-${startsAt}-${eventSlug(timeLabel?.replace(/\s+/g, "") ?? "tba")}`;
}

export function expandMcsScheduleEvents(events: McsScheduleEvent[]): McsScheduleEvent[] {
  const expanded = events.flatMap((event) => {
    const combined = COMBINED_SPORTS_PATTERN.exec(event.label);
    if (!combined || combined[1].toLowerCase() === combined[2].toLowerCase()) return [event];

    return [combined[1], combined[2]].map((sport) => {
      const name = sport.toLowerCase() === "baseball" ? "Baseball" : "Softball";
      const label = `${name}${combined[3]}`;
      return { ...event, label, id: eventId(event.dateKey, label, event.startsAt, event.timeLabel) };
    });
  });

  return [...new Map(expanded.map((event) => [eventId(event.dateKey, event.label, event.startsAt, event.timeLabel), event])).values()]
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
}

export function parseMcsScheduleArticle(article: McsScheduleArticle): McsScheduleEvent[] {
  const tables = article.content.match(/<table\b[\s\S]*?<\/table>/gi) ?? [];
  const events: McsScheduleEvent[] = [];

  for (const table of tables) {
    const rows = table.match(/<tr\b[\s\S]*?<\/tr>/gi) ?? [];
    let currentDateKey: string | null = null;

    for (const row of rows) {
      const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => cellText(match[1]));
      if (cells.length < 2) continue;

      if (cells[0]) currentDateKey = eventDateKey(cells[0], article);
      const label = cells[1]?.trim() ?? "";
      // The dated schedule is authoritative for all school activities, not just
      // athletics: concerts, plays, meetings, assemblies, and school notices.
      if (!currentDateKey || !label) continue;

      const time = eventTime(currentDateKey, cells[2] ?? "");
      const id = eventId(currentDateKey, label, time.startsAt, time.timeLabel);

      events.push({
        id,
        dateKey: currentDateKey,
        label,
        timeLabel: time.timeLabel,
        startsAt: time.startsAt,
      });
    }
  }

  return expandMcsScheduleEvents(events);
}
