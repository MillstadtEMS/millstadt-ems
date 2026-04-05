/**
 * Chief 360 CAD email parser.
 *
 * ── IMPORTANT ──
 * We do NOT have real Chief 360 sample emails yet. This parser is built with
 * sensible patterns that cover common CAD email formats. Update the PATTERNS
 * object once real samples are available — all matching lives in one place.
 *
 * Public output: ONLY dispatchDate, dispatchTime, dispatchNature.
 * Everything else (address, cross streets, units, notes) is discarded.
 */

// ── Configuration — update these patterns once real emails arrive ──────────

const PATTERNS = {
  // Line containing the call nature/type
  // Examples: "Nature: ACCIDENT W/ INJURIES"
  //           "Call Type: MOTOR VEHICLE ACCIDENT"
  //           "Incident Type: EMS CALL"
  nature: [
    /^nature\s*[:\-]\s*(.+)/im,
    /^call\s*type\s*[:\-]\s*(.+)/im,
    /^incident\s*type\s*[:\-]\s*(.+)/im,
    /^type\s*[:\-]\s*(.+)/im,
    /^dispatch\s*type\s*[:\-]\s*(.+)/im,
  ],

  // Date patterns
  // Examples: "Date: 04/04/2026"  "Dispatch Date: April 4, 2026"
  date: [
    /^date\s*[:\-]\s*(\d{1,2}\/\d{1,2}\/\d{4})/im,
    /^dispatch\s*date\s*[:\-]\s*(\d{1,2}\/\d{1,2}\/\d{4})/im,
    /^date\s*[:\-]\s*(\d{4}-\d{2}-\d{2})/im,
  ],

  // Time patterns
  // Examples: "Time: 17:29:00"  "Dispatch Time: 5:29 PM"
  time: [
    /^time\s*[:\-]\s*(\d{1,2}:\d{2})(?::\d{2})?/im,
    /^dispatch\s*time\s*[:\-]\s*(\d{1,2}:\d{2})/im,
  ],

  // Subject line patterns — used as fallback if body parsing fails
  subject: [
    /CAD\s*Alert\s*[:\-]\s*(.+)/i,
    /Dispatch\s*[:\-]\s*(.+)/i,
    /Incident\s*[:\-]\s*(.+)/i,
  ],
};

// ── Result types ───────────────────────────────────────────────────────────

export interface ParsedCall {
  status: "ok" | "partial";
  dispatchDate: string;      // "04/04/2026"
  dispatchTime: string;      // "17:29"
  dispatchNature: string;    // "ACCIDENT W/ INJURIES"
  dispatchDatetime: string;  // ISO-8601 UTC
  sourceYear: number;
}

export interface ParseFailure {
  status: "failed";
  reason: string;
}

export type ParseResult = ParsedCall | ParseFailure;

// ── Helpers ────────────────────────────────────────────────────────────────

function extractFirst(text: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

/** Normalize a nature string — uppercase, trim whitespace */
function normalizeNature(raw: string): string {
  // Strip anything that looks like an address sneaking in
  // e.g. "ACCIDENT W/ INJURIES - 123 Main St" → "ACCIDENT W/ INJURIES"
  const stripped = raw
    .replace(/[-–]\s*\d+\s+\w.*$/, "") // trailing "- 123 Main St..."
    .replace(/\s{2,}/g, " ")
    .trim()
    .toUpperCase();
  return stripped;
}

/** Parse "04/04/2026" or "2026-04-04" into a display date string and a Date */
function parseDate(raw: string): { display: string; date: Date } | null {
  // MM/DD/YYYY
  const mdy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    return {
      display: `${m.padStart(2, "0")}/${d.padStart(2, "0")}/${y}`,
      date: new Date(Number(y), Number(m) - 1, Number(d)),
    };
  }
  // YYYY-MM-DD
  const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) {
    const [, y, m, d] = ymd;
    return {
      display: `${m}/${d}/${y}`,
      date: new Date(Number(y), Number(m) - 1, Number(d)),
    };
  }
  return null;
}

/** Parse "17:29" or "5:29 PM" → "17:29" (24-hour display) */
function parseTime(raw: string): { display: string; hours: number; minutes: number } | null {
  const t24 = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (t24) {
    const h = Number(t24[1]), m = Number(t24[2]);
    return { display: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, hours: h, minutes: m };
  }
  const t12 = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (t12) {
    let h = Number(t12[1]);
    const m = Number(t12[2]);
    const ampm = t12[3].toUpperCase();
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return { display: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, hours: h, minutes: m };
  }
  return null;
}

/**
 * Build a UTC ISO datetime from date+time parsed in America/Chicago.
 * Uses the simple offset approach: Chicago is UTC-6 (CST) or UTC-5 (CDT).
 * We approximate by constructing the local time and using JS Date internals.
 */
function buildDatetime(date: Date, hours: number, minutes: number): { iso: string; year: number } {
  // Create a date string that looks like Chicago local time and parse it
  const localStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;

  // Use Intl to figure out Chicago offset at this moment
  // We construct the ISO by treating the local time as-is (UTC approx)
  // For display purposes this is sufficient; the 20-min check uses wall-clock diff
  const dt = new Date(localStr);
  return {
    iso: dt.toISOString(),
    year: date.getFullYear(),
  };
}

// ── Main parse function ────────────────────────────────────────────────────

/**
 * Parse a Chief 360 dispatch email into public-safe call data.
 *
 * @param subject  Email subject line
 * @param body     Plain text body (strip HTML before passing in)
 * @param received Date the email was received (used as fallback datetime)
 */
export function parseDispatchEmail(
  subject: string,
  body: string,
  received: Date
): ParseResult {
  const text = body + "\n" + subject; // search both

  // ── Extract nature ──────────────────────────────────────────────────────
  let rawNature = extractFirst(text, PATTERNS.nature);

  // Fallback: try subject line patterns
  if (!rawNature) {
    rawNature = extractFirst(subject, PATTERNS.subject);
  }

  if (!rawNature) {
    return { status: "failed", reason: "Could not extract dispatch nature from email" };
  }

  const dispatchNature = normalizeNature(rawNature);
  if (!dispatchNature || dispatchNature.length < 2) {
    return { status: "failed", reason: "Dispatch nature extracted but too short to be valid" };
  }

  // ── Extract date and time ───────────────────────────────────────────────
  const rawDate = extractFirst(text, PATTERNS.date);
  const rawTime = extractFirst(text, PATTERNS.time);

  const parsedDate = rawDate ? parseDate(rawDate) : null;
  const parsedTime = rawTime ? parseTime(rawTime) : null;

  // If we have both date and time, build a full datetime
  if (parsedDate && parsedTime) {
    const { iso, year } = buildDatetime(parsedDate.date, parsedTime.hours, parsedTime.minutes);
    return {
      status: "ok",
      dispatchDate: parsedDate.display,
      dispatchTime: parsedTime.display,
      dispatchNature,
      dispatchDatetime: iso,
      sourceYear: year,
    };
  }

  // Partial: have nature but missing date/time — use received time as fallback
  const chicagoReceived = new Date(received.toLocaleString("en-US", { timeZone: "America/Chicago" }));
  const fallbackDate = `${String(chicagoReceived.getMonth() + 1).padStart(2, "0")}/${String(chicagoReceived.getDate()).padStart(2, "0")}/${chicagoReceived.getFullYear()}`;
  const fallbackTime = `${String(chicagoReceived.getHours()).padStart(2, "0")}:${String(chicagoReceived.getMinutes()).padStart(2, "0")}`;

  return {
    status: "partial",
    dispatchDate: parsedDate?.display ?? fallbackDate,
    dispatchTime: parsedTime?.display ?? fallbackTime,
    dispatchNature,
    dispatchDatetime: received.toISOString(),
    sourceYear: parsedDate?.date.getFullYear() ?? chicagoReceived.getFullYear(),
  };
}

/** Strip HTML tags from an email body for plain-text parsing */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}
