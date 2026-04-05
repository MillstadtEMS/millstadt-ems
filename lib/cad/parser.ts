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

const MONTH_NAMES = "January|February|March|April|May|June|July|August|September|October|November|December";

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
    // Chief 360 Event Report: "Category: MEDICAL-FIRST RESPONDER"
    /^category\s*[:\-]\s*(.+)/im,
  ],

  // Date patterns
  // Examples: "Date: 04/04/2026"  "Dispatch Date: April 4, 2026"  "April 4,2026"
  date: [
    /^date\s*[:\-]\s*(\d{1,2}\/\d{1,2}\/\d{4})/im,
    /^dispatch\s*date\s*[:\-]\s*(\d{1,2}\/\d{1,2}\/\d{4})/im,
    /^date\s*[:\-]\s*(\d{4}-\d{2}-\d{2})/im,
    new RegExp(`((?:${MONTH_NAMES})\\s+\\d{1,2},?\\s*\\d{4})`, "im"),
  ],

  // Time patterns
  // Examples: "Time: 17:29:00"  "Dispatch Time: 5:29 PM"  "23:12 April 4,2026"
  time: [
    /^time\s*[:\-]\s*(\d{1,2}:\d{2})(?::\d{2})?/im,
    /^dispatch\s*time\s*[:\-]\s*(\d{1,2}:\d{2})/im,
    new RegExp(`^(\\d{1,2}:\\d{2})(?::\\d{2})?\\s+(?:${MONTH_NAMES})`, "im"),
    /\b(\d{1,2}:\d{2})\s*(?:AM|PM|hrs?)\b/i,
  ],

  // Subject line patterns — used as fallback if body parsing fails
  subject: [
    // Chief 360: "[39 EMS CAD] MEDICAL-FIRST RESPONDER -- 353 Shad Ln..."
    /^\[[\w\s]+EMS\s+CAD\]\s+([^-–]+)/i,
    /CAD\s*Alert\s*[:\-]\s*(.+)/i,
    /Dispatch\s*[:\-]\s*(.+)/i,
    /Incident\s*[:\-]\s*(.+)/i,
  ],

  // Dispatch status — used to skip non-new-call updates (e.g. Enroute)
  status: [
    /\bstatus\s*[:\-]\s*(\w+)/i,
  ],

  // Event / run number patterns
  // Examples: "Event No: 2026-40118"  "Event #: 2026-40118"  "Run #: 2026-843"
  eventNumber: [
    /^event\s*(?:no|number|#|num)\s*[:\-]?\s*(\S+)/im,
    /^run\s*(?:no|number|#|num)\s*[:\-]?\s*(\S+)/im,
    /^incident\s*(?:no|number|#|num)\s*[:\-]?\s*(\S+)/im,
    /^complaint\s*(?:no|number|#|num)\s*[:\-]?\s*(\S+)/im,
    /\bevent\s+no\b[:\s]+(\S+)/i,
    /\brun\s+#\s*[:\s]*(\S+)/i,
  ],
};

// ── Result types ───────────────────────────────────────────────────────────

export interface ParsedCall {
  status: "ok" | "partial";
  eventNumber: string | null; // "2026-40118"
  dispatchStatus: string;     // "dispatched" | "enroute" | "unknown"
  dispatchDate: string;       // "04/04/2026"
  dispatchTime: string;       // "17:29"
  dispatchNature: string;     // "Medical First Responder"
  dispatchDatetime: string;   // ISO-8601 UTC
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

// Acronyms that should stay fully uppercase
const KEEP_UPPER = new Set([
  "MVA","MVC","CPR","ALS","BLS","EMS","DOA","CVA","GSW","AED","IV","MCI",
  "HAZMAT","STEMI","COPD","CHF","DNR","LUCAS","CO","OB","OD",
]);

// Nature strings that should be simplified
const NATURE_ALIASES: Record<string, string> = {
  "MEDICAL FIRST RESPONDER": "Medical",
  "MEDICAL-FIRST RESPONDER": "Medical",
  "MFR": "Medical",
  "MEDICAL": "Medical",
  "EMS CALL": "Medical",
  "MOTOR VEHICLE ACCIDENT": "MVA",
  "MOTOR VEHICLE CRASH": "MVA",
  "VEHICLE ACCIDENT": "MVA",
  "TRAFFIC ACCIDENT": "MVA",
};

/** Format a nature string in title case, preserving known acronyms */
export function formatNature(raw: string): string {
  const cleaned = raw
    .replace(/[-–]\s*\d+\s+\w.*$/, "") // strip trailing address
    .replace(/-/g, " ")                  // MEDICAL-FIRST → MEDICAL FIRST
    .replace(/\s{2,}/g, " ")
    .trim()
    .toUpperCase();

  // Check aliases first (e.g. MEDICAL FIRST RESPONDER → Medical)
  if (NATURE_ALIASES[cleaned]) return NATURE_ALIASES[cleaned];

  return cleaned
    .split(" ")
    .map(w => {
      if (KEEP_UPPER.has(w)) return w;
      return w.charAt(0) + w.slice(1).toLowerCase();
    })
    .join(" ");
}

/** Normalize a nature string — title case */
function normalizeNature(raw: string): string {
  return formatNature(raw);
}

const MONTH_MAP: Record<string, number> = {
  january:1,february:2,march:3,april:4,may:5,june:6,
  july:7,august:8,september:9,october:10,november:11,december:12,
};

/** Parse various date formats into a display date string and a Date */
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
  // "April 4,2026" or "April 4, 2026"
  const mon = raw.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(\d{4})$/i);
  if (mon) {
    const m = MONTH_MAP[mon[1].toLowerCase()];
    const d = Number(mon[2]);
    const y = Number(mon[3]);
    return {
      display: `${String(m).padStart(2,"0")}/${String(d).padStart(2,"0")}/${y}`,
      date: new Date(y, m - 1, d),
    };
  }
  return null;
}

/** Parse "17:29" or "5:29 PM" → "17:29" (24-hour display) */
function parseTime(raw: string): { display: string; hours: number; minutes: number } | null {
  // Strip trailing month name (e.g. "23:12 April 4,2026" → "23:12")
  const cleaned = raw.replace(/\s+(?:January|February|March|April|May|June|July|August|September|October|November|December).*/i, "").trim();

  const t24 = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (t24) {
    const h = Number(t24[1]), m = Number(t24[2]);
    return { display: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, hours: h, minutes: m };
  }
  const t12 = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
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
 */
function buildDatetime(date: Date, hours: number, minutes: number): { iso: string; year: number } {
  const localStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
  const dt = new Date(localStr);
  return {
    iso: dt.toISOString(),
    year: date.getFullYear(),
  };
}

/**
 * Freeform body parser — used when no labeled fields are found.
 * Looks at body lines and picks the first one that reads like a call nature
 * (not an address, not a date/time line, not a signature line).
 */
function extractFreeformNature(body: string): string | null {
  const ADDRESS_RE   = /^\d+\s+(?:\w+\s+)+(?:St|Street|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Rd|Road|Ln|Lane|Ct|Court|Way|Pl|Place|Hwy|Highway|Pkwy|Parkway)\b/i;
  const DATETIME_RE  = /^\d{1,2}:\d{2}|^\d{1,2}\/\d{1,2}\/\d{2,4}|^\d{4}-\d{2}-\d{2}|^(?:January|February|March|April|May|June|July|August|September|October|November|December)/i;
  const SIGNATURE_RE = /^(?:respectfully|sent from|regards|sincerely|thank|--|on \w+ \d)/i;
  // Email header lines that appear in forwarded messages
  const EMAIL_HDR_RE = /^(?:from|to|cc|bcc|subject|date|message-id|reply-to|delivered-to|received|mime-version|content-type|x-)\s*:/i;
  // Image placeholders from email clients / Gmail
  const IMAGE_RE     = /^\[image/i;
  // Forwarding / quoting separators
  const SEPARATOR_RE = /^[-=_]{3,}/;

  const lines = body.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (ADDRESS_RE.test(line))   continue;
    if (DATETIME_RE.test(line))  continue;
    if (SIGNATURE_RE.test(line)) continue;
    if (EMAIL_HDR_RE.test(line)) continue;
    if (IMAGE_RE.test(line))     continue;
    if (SEPARATOR_RE.test(line)) continue;
    if (line.length < 4)         continue;
    if (line.startsWith("*") || line.includes("CONFIDENTIALITY")) continue;
    // Skip lines that are just email addresses or contain angle-bracketed addresses
    if (line.includes("@") && line.includes("<"))  continue;
    return line;
  }
  return null;
}

// ── Main parse function ────────────────────────────────────────────────────

/**
 * Parse a dispatch email into public-safe call data.
 */
export function parseDispatchEmail(
  subject: string,
  body: string,
  received: Date
): ParseResult {
  const text = body + "\n" + subject; // search both

  // ── Extract nature ──────────────────────────────────────────────────────
  let rawNature = extractFirst(text, PATTERNS.nature);

  // Fallback: try subject line patterns (e.g. "Dispatch: CHEST PAIN")
  if (!rawNature) {
    rawNature = extractFirst(subject, PATTERNS.subject);
  }

  // Fallback: freeform body parsing
  if (!rawNature) {
    rawNature = extractFreeformNature(body);
  }

  if (!rawNature) {
    return { status: "failed", reason: "Could not extract dispatch nature from email" };
  }

  const dispatchNature = normalizeNature(rawNature);
  if (!dispatchNature || dispatchNature.length < 2) {
    return { status: "failed", reason: "Dispatch nature extracted but too short to be valid" };
  }
  // Reject nature strings that look like email metadata (From:, alert@cfmsg.co, [IMAGE:…], etc.)
  if (/^from\s*:/i.test(dispatchNature) || /^date\s*:/i.test(dispatchNature) ||
      dispatchNature.startsWith("[Image") || dispatchNature.includes("@cfmsg") ||
      dispatchNature.includes("@omnigo") || dispatchNature.includes("cencom")) {
    return { status: "failed", reason: "Extracted nature looks like email metadata, not a call type" };
  }

  // ── Extract dispatch status (Dispatched / Enroute / etc.) ──────────────
  const rawStatus = extractFirst(text, PATTERNS.status);
  const dispatchStatus = rawStatus ? rawStatus.toLowerCase() : "unknown";

  // ── Extract event number ────────────────────────────────────────────────
  const eventNumber = extractFirst(text, PATTERNS.eventNumber) ?? null;

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
      eventNumber,
      dispatchStatus,
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
    eventNumber,
    dispatchStatus,
    dispatchDate: parsedDate?.display ?? fallbackDate,
    dispatchTime: parsedTime?.display ?? fallbackTime,
    dispatchNature,
    dispatchDatetime: received.toISOString(),
    sourceYear: parsedDate?.date.getFullYear() ?? chicagoReceived.getFullYear(),
  };
}

// ── Closeout email detection & parsing ────────────────────────────────────

export interface ParsedCloseout {
  eventNumber: string | null;
  dispatchDate: string | null;
  dispatchTime: string | null;
  closedAt: string;
}

/** Returns true if this email is a St. Clair County closeout report */
export function isCloseoutEmail(subject: string, body: string): boolean {
  if (/event\s+closeout/i.test(subject)) return true;
  // Forwarded closeout: subject changed by Gmail but body still has "EVENT CLOSEOUT" or "Closed:" timestamp
  if (/fwd?:.*closeout/i.test(subject)) return true;
  if (/\bClosed\s*:\s*\d{1,2}\/\d{1,2}\/\d{4}/i.test(body)) return true;
  return false;
}

/**
 * Returns true if this is a cfmsg status update (Enroute, On Scene, etc.)
 * that should NOT create a new call record — it's not a new dispatch.
 */
export function isStatusUpdateEmail(subject: string, body: string): boolean {
  // cfmsg Event Report with Status: Enroute / On Scene / Cleared (not Dispatched)
  const statusMatch = body.match(/\bstatus\s*[:\-]\s*(\w+)/i);
  if (statusMatch) {
    const s = statusMatch[1].toLowerCase();
    if (s === "enroute" || s === "on scene" || s === "onscene" || s === "cleared" || s === "available") return true;
  }
  return false;
}

/**
 * Parse a closeout email from cencom@omnigo.com.
 * Extracts dispatch time (to match existing call) and closed time.
 *
 * Relevant lines in body:
 *   Dispatch:  04/04/2026 17:30:34
 *   Closed:    04/04/2026 18:37:35
 */
export function parseCloseoutEmail(subject: string, body: string): ParsedCloseout | null {
  const fullText = body + "\n" + subject;

  // Event number — primary match key
  const eventNumber = extractFirst(fullText, PATTERNS.eventNumber) ?? null;

  // Dispatch date/time — used as fallback match if no event number
  const dispatchMatch = body.match(/^dispatch(?:ed)?\s*(?:time)?\s*[:\-]?\s*(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}:\d{2})/im);

  // Closed time — any line with "closed" followed by a datetime
  const closedMatch =
    body.match(/^closed\s*[:\-]?\s*(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}:\d{2}(?::\d{2})?)/im) ||
    body.match(/closed[^\n]*?(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}:\d{2}(?::\d{2})?)/im);

  // Also scan for any date in the body so we can fallback-match by date
  const anyDateMatch = body.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/);

  // We need at least an event number OR a date to do any matching
  if (!eventNumber && !dispatchMatch && !anyDateMatch) return null;

  const dispatchDate = dispatchMatch?.[1] ?? anyDateMatch?.[1] ?? null;
  const dispatchTime = dispatchMatch?.[2] ?? null;

  let closedIso = new Date().toISOString();
  if (closedMatch) {
    const [, d, t] = closedMatch;
    const [mo, dy, yr] = d.split("/");
    const timeParts = t.split(":");
    const [hh, mm, ss] = [timeParts[0], timeParts[1], timeParts[2] ?? "00"];
    const dt = new Date(`${yr}-${mo.padStart(2,"0")}-${dy.padStart(2,"0")}T${hh.padStart(2,"0")}:${mm}:${ss}`);
    if (!isNaN(dt.getTime())) closedIso = dt.toISOString();
  }

  return { eventNumber, dispatchDate, dispatchTime, closedAt: closedIso };
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
