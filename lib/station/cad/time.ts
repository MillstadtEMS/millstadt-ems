// Dispatch emails print local (America/Chicago) wall-clock times in many shapes. These helpers turn
// them into real instants, correctly across daylight-saving changes, whatever the server's timezone.

const ZONE = "America/Chicago";

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

let partsFormat: Intl.DateTimeFormat | null = null;
function zoneParts(ms: number) {
  partsFormat ??= new Intl.DateTimeFormat("en-US", {
    timeZone: ZONE, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const out: Record<string, number> = {};
  for (const part of partsFormat.formatToParts(new Date(ms))) {
    if (part.type !== "literal") out[part.type] = Number(part.value);
  }
  return { year: out.year, month: out.month, day: out.day, hour: out.hour % 24, minute: out.minute, second: out.second };
}

/** Minutes the zone is ahead of UTC at an instant (negative in Chicago). */
function offsetMinutes(ms: number): number {
  const p = zoneParts(ms);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000);
}

/** A Chicago wall-clock time as epoch milliseconds. */
export function chicagoToUtc(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): number {
  const guess = Date.UTC(year, month - 1, day, hour, minute, second);
  const first = offsetMinutes(guess);
  let utc = guess - first * 60000;
  const second2 = offsetMinutes(utc);
  if (second2 !== first) utc = guess - second2 * 60000;
  return utc;
}

/** The Chicago calendar date of an instant. */
export function chicagoDate(ms: number): { year: number; month: number; day: number } {
  const p = zoneParts(ms);
  return { year: p.year, month: p.month, day: p.day };
}

function validDate(year: number, month: number, day: number) {
  return year >= 2000 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

function to24(hour: number, meridiem: string | undefined): number | null {
  if (!meridiem) return hour <= 23 ? hour : null;
  if (hour < 1 || hour > 12) return null;
  const pm = /^p/i.test(meridiem);
  if (hour === 12) return pm ? 12 : 0;
  return pm ? hour + 12 : hour;
}

function fullYear(raw: string): number {
  const n = Number(raw);
  return raw.length <= 2 ? 2000 + n : n;
}

const TIME = String.raw`(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*([AaPp]\.?[Mm]\.?)?`;
const MDY = String.raw`(?<!\d)(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})(?!\d)`;
const YMD = String.raw`(?<!\d)(\d{4})-(\d{1,2})-(\d{1,2})(?!\d)`;
const MON = String.raw`(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sept?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?`;
const SEP = String.raw`(?:\s*,?\s*(?:at\s+|@\s*|T)?)`;

type Parts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function build(year: number, month: number, day: number, h: string, m: string, s: string | undefined, mer: string | undefined): Parts | null {
  const hour = to24(Number(h), mer);
  const minute = Number(m), second = Number(s ?? 0);
  if (hour === null || minute > 59 || second > 59 || !validDate(year, month, day)) return null;
  return { year, month, day, hour, minute, second };
}

function monthOf(name: string): number {
  return MONTHS[name.slice(0, 4).toLowerCase().replace(/\.$/, "")] ?? MONTHS[name.slice(0, 3).toLowerCase()] ?? 0;
}

const DATE_TIME_SHAPES: Array<[RegExp, (m: RegExpMatchArray) => Parts | null]> = [
  // 04/04/2026 17:30:34 · 4/4/26 5:30 PM · 04-04-2026 at 17:30
  [new RegExp(`${MDY}${SEP}\\s*${TIME}`), (m) => build(fullYear(m[3]), Number(m[1]), Number(m[2]), m[4], m[5], m[6], m[7])],
  // 2026-04-04 17:30:34 · 2026-04-04T17:30:34
  [new RegExp(`${YMD}${SEP}\\s*${TIME}`), (m) => build(Number(m[1]), Number(m[2]), Number(m[3]), m[4], m[5], m[6], m[7])],
  // 17:30:34 04/04/2026
  [new RegExp(`${TIME}\\s*,?\\s*(?:on\\s+)?${MDY}`), (m) => build(fullYear(m[7]), Number(m[5]), Number(m[6]), m[1], m[2], m[3], m[4])],
  // 23:12 April 4,2026 (Chief 360) · 5:29 PM Apr 4 2026
  [new RegExp(`${TIME}\\s*,?\\s*(?:on\\s+)?(?:[A-Za-z]{3,9},?\\s+)?${MON}\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s*(\\d{4})`),
    (m) => build(Number(m[7]), monthOf(m[5]), Number(m[6]), m[1], m[2], m[3], m[4])],
  // April 4, 2026 23:12 · Sat, Apr 4, 2026 at 6:38 PM
  [new RegExp(`${MON}\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s*(\\d{4})${SEP}\\s*${TIME}`),
    (m) => build(Number(m[3]), monthOf(m[1]), Number(m[2]), m[4], m[5], m[6], m[7])],
  // Sat, 04 Apr 2026 17:30:34 (RFC 2822 style)
  [new RegExp(`(\\d{1,2})\\s+${MON}\\s+(\\d{4})${SEP}\\s*${TIME}`), (m) => build(Number(m[3]), monthOf(m[2]), Number(m[1]), m[4], m[5], m[6], m[7])],
];

/** Parse a date with a time in the common CAD shapes. Returns null when either part is missing. */
function parseDateTimeParts(text: string): Parts | null {
  for (const [shape, read] of DATE_TIME_SHAPES) {
    const m = text.match(shape);
    const parts = m ? read(m) : null;
    if (parts) return parts;
  }
  return null;
}

/** A date on its own: 04/04/2026, 2026-04-04, April 4, 2026. */
export function parseDateOnly(text: string): { year: number; month: number; day: number } | null {
  let m: RegExpMatchArray | null;
  if ((m = text.match(new RegExp(MDY)))) {
    const out = { year: fullYear(m[3]), month: Number(m[1]), day: Number(m[2]) };
    return validDate(out.year, out.month, out.day) ? out : null;
  }
  if ((m = text.match(new RegExp(YMD)))) {
    const out = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
    return validDate(out.year, out.month, out.day) ? out : null;
  }
  if ((m = text.match(new RegExp(`${MON}\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s*(\\d{4})`)))) {
    const out = { year: Number(m[3]), month: monthOf(m[1]), day: Number(m[2]) };
    return validDate(out.year, out.month, out.day) ? out : null;
  }
  return null;
}

/** A time of day on its own: 17:30:34, 5:30 PM, or (when allowed) military 1730. */
export function parseTimeOnly(text: string, allowMilitary = false): { hour: number; minute: number; second: number } | null {
  const m = text.match(new RegExp(`(?:^|[^\\d:/.-])${TIME}`)) ?? text.match(new RegExp(`^${TIME}`));
  if (m) {
    const hour = to24(Number(m[1]), m[4]);
    const minute = Number(m[2]), second = Number(m[3] ?? 0);
    if (hour !== null && minute <= 59 && second <= 59) return { hour, minute, second };
  }
  if (allowMilitary) {
    const mil = text.trim().match(/^(\d{2})(\d{2})(?:(\d{2}))?(?:\s*hrs?)?$/i);
    if (mil) {
      const hour = Number(mil[1]), minute = Number(mil[2]), second = Number(mil[3] ?? 0);
      if (hour <= 23 && minute <= 59 && second <= 59) return { hour, minute, second };
    }
  }
  return null;
}

/** A time of day placed on the calendar near a reference instant: the candidate (previous, same or
 *  next Chicago day) closest to the reference, or with mode "after" the first one not before it
 *  (closeout times run forward from dispatch, across midnight). */
export function placeTimeOfDay(
  time: { hour: number; minute: number; second: number },
  referenceMs: number,
  mode: "nearest" | "after" = "nearest",
): number {
  const ref = chicagoDate(referenceMs);
  const base = Date.UTC(ref.year, ref.month - 1, ref.day);
  const candidates = [-1, 0, 1].map((shift) => {
    const d = new Date(base + shift * 86400000);
    return chicagoToUtc(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), time.hour, time.minute, time.second);
  });
  if (mode === "after") {
    // Allow a minute of slack: a closeout time can equal (or round just under) the dispatch time.
    return candidates.find((ms) => ms >= referenceMs - 60000) ?? candidates[2];
  }
  return candidates.reduce((best, ms) => (Math.abs(ms - referenceMs) < Math.abs(best - referenceMs) ? ms : best));
}

export interface ParseTimeOptions {
  /** Instant used to place a bare time of day on the calendar (the email's arrival, or the dispatch). */
  referenceMs: number;
  mode?: "nearest" | "after";
  allowMilitary?: boolean;
}

/** Parse any CAD date/time text to epoch milliseconds, or null when it holds no time of day. */
export function parseCadDateTime(text: string | null | undefined, options: ParseTimeOptions): number | null {
  if (!text) return null;
  const cleaned = text.replace(/\u00a0/g, " ").trim();
  if (!cleaned) return null;
  const utc = /\b(?:UTC|GMT|Z)\b\s*$/i.test(cleaned) || /\dZ\b/.test(cleaned);
  const full = parseDateTimeParts(cleaned);
  if (full) {
    if (utc) return Date.UTC(full.year, full.month - 1, full.day, full.hour, full.minute, full.second);
    return chicagoToUtc(full.year, full.month, full.day, full.hour, full.minute, full.second);
  }
  // A bare time with no date: only accept text that is essentially just the time.
  if (/\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}/.test(cleaned)) return null;
  const time = parseTimeOnly(cleaned, options.allowMilitary);
  if (!time) return null;
  return placeTimeOfDay(time, options.referenceMs, options.mode ?? "nearest");
}

/** Combine a separate date field and time field ("Date: 04/04/2026" + "Time: 17:29:00"). */
export function combineDateAndTime(dateText: string | null, timeText: string | null, referenceMs: number): number | null {
  if (!timeText) return null;
  const time = parseTimeOnly(timeText, true);
  if (!time) return parseCadDateTime(timeText, { referenceMs });
  const date = dateText ? parseDateOnly(dateText) : null;
  if (!date) return placeTimeOfDay(time, referenceMs);
  return chicagoToUtc(date.year, date.month, date.day, time.hour, time.minute, time.second);
}
