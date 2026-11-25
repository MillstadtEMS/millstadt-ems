// Full-detail parser for the CAD Gmail's messages, for the station TV only. The public ticker keeps
// its own parser (lib/cad/parser.ts), which deliberately throws the address and units away; this one
// keeps what the crew needs on the TV (type, address, cross streets, units, status times, location)
// and drops callers, patients and narrative.
//
// There are no real samples in the repo, so everything is tolerant: labels in many spellings, values
// on the next line, HTML tables (flattened by stripHtml or by htmlToText), forwarded wrappers, quoted
// replies and missing fields. Pure: no I/O, safe to unit test.

import { formatNature } from "@/lib/cad/parser";
import type { CallPhase } from "./types";
import { withinServiceArea } from "./geo";
import { combineDateAndTime, parseCadDateTime } from "./time";

export type MessageKind = "dispatch" | "status" | "closeout" | "notification" | "unknown";
export type MessageSource = "chief360" | "cencom" | "other";
export type PhaseOrClosed = CallPhase | "closed";

export interface CadEmailInput {
  from: string;
  subject: string;
  /** text/plain body, flattened HTML, or raw HTML (detected and flattened here). */
  body: string;
  receivedAt: Date | number;
}

export interface ParsedCadMessage {
  kind: MessageKind;
  source: MessageSource;
  /** Canonical event number (e.g. "2026-40118"), or null. */
  eventNumber: string | null;
  /** Category as the email prints it, e.g. "MEDICAL-FIRST RESPONDER". */
  natureRaw: string | null;
  /** The TV's call type, formatted like the ticker's (e.g. "Medical"). */
  nature: string | null;
  /** Problem / chief complaint when the email has one beyond the category. */
  detail: string | null;
  address: string | null;
  city: string | null;
  place: string | null;
  crossStreets: string | null;
  units: string[];
  /** The status this message reports (status updates, and Dispatched for dispatches). */
  status: CallPhase | null;
  statusRaw: string | null;
  cancelled: boolean;
  /** When that status happened (epoch ms): the body's time when trustworthy, else the arrival time. */
  statusAt: number | null;
  /** Labeled phase times (closeouts, or a status time printed in the body), epoch ms. */
  times: Partial<Record<PhaseOrClosed, number>>;
  /** Per-unit phase times from closeout tables or unit-prefixed lines. */
  unitTimes: Record<string, Partial<Record<PhaseOrClosed, number>>>;
  location: { lat: number; lon: number } | null;
  receivedAt: number;
}

// ── Text normalization ────────────────────────────────────────────────────────────────────────────

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "-", mdash: "-", hellip: "..." };

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : "";
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

/** HTML to text that keeps table structure: a tab between cells, a line per row. */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(head|style|script|title)[\s\S]*?<\/\1>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h[1-6]|li|tr|table|thead|tbody|blockquote|pre|section|article|header|footer)>/gi, "\n")
      .replace(/<(p|div|tr|table|li|h[1-6])(\s[^>]*)?>/gi, "\n")
      .replace(/<\/(td|th)>/gi, "\t")
      .replace(/<[^>]+>/g, ""),
  );
}

function looksLikeHtml(text: string): boolean {
  return /<(html|body|table|td|tr|div|p|br|span|font)\b[^>]*>/i.test(text);
}

/** One tidy line list: no quote markers, no zero-width junk, single spaces, tabs kept as cell breaks. */
function normalizeLines(body: string): string[] {
  const text = (looksLikeHtml(body) ? htmlToText(body) : decodeEntities(body))
    .replace(/\r\n?/g, "\n")
    .replace(/[\u200b-\u200d\ufeff\u00ad]/g, "")
    .replace(/[\u00a0\u2007\u202f]/g, " ")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...");
  return text.split("\n").map((raw) => raw
    .replace(/^(?:\s*>)+\s?/, "")
    .replace(/\*\*?|__/g, "")
    .replace(/ *\t */g, "\t")
    .replace(/ {2,}/g, "  ")
    .replace(/^[\t ]+|[\t ]+$/g, ""));
}

// ── Forwarded and replied wrappers ────────────────────────────────────────────────────────────────

const HEADER_LINE = /^(from|sent|date|to|cc|bcc|subject|reply-to)\s*:\s*(.*)$/i;
const WRAPPER_LINE = /^(?:-{2,}\s*(?:forwarded message|original message)\s*-{2,}|begin forwarded message:?|_{8,}|on .{6,80} wrote:)$/i;

interface Unwrapped { lines: string[]; from: string | null; subject: string | null }

/** Strip forwarding banners and the quoted header blocks under them, keeping the innermost
 *  original sender and subject (a forwarded closeout is classified by what it was, not by Fwd:). */
function unwrapForwards(lines: string[]): Unwrapped {
  const out: string[] = [];
  let from: string | null = null;
  let subject: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (WRAPPER_LINE.test(line)) continue;
    const header = line.match(HEADER_LINE);
    if (header) {
      // A header block is several consecutive header lines with a From among them.
      let j = i;
      const block: Array<[string, string]> = [];
      while (j < lines.length && j - i < 9) {
        const h = lines[j].match(HEADER_LINE);
        if (!h) break;
        block.push([h[1].toLowerCase(), h[2]]);
        j++;
      }
      const keys = new Set(block.map(([k]) => k));
      if (block.length >= 2 && keys.has("from") && (keys.has("subject") || keys.has("sent") || keys.has("date") || keys.has("to"))) {
        for (const [k, v] of block) {
          if (k === "from" && v) from = v;
          if (k === "subject" && v) subject = v;
        }
        i = j - 1;
        continue;
      }
    }
    out.push(line);
  }
  return { lines: out, from, subject };
}

function stripSubjectPrefixes(subject: string): string {
  let s = subject.trim();
  for (let i = 0; i < 5; i++) {
    const next = s.replace(/^\s*(?:fwd?|fw|re|aw|tr)\s*(?:\[\d+\])?\s*:\s*/i, "");
    if (next === s) break;
    s = next;
  }
  return s.trim();
}

// ── Labels ────────────────────────────────────────────────────────────────────────────────────────

type FieldKey =
  | "nature" | "detail" | "address" | "place" | "city" | "state" | "zip" | "cross" | "units" | "unit"
  | "eventNumber" | "eventish" | "status" | "statusTime" | "date" | "time" | "datetime"
  | "lat" | "lon" | "latlon" | "x" | "y" | "free" | "narrative"
  | "t_received" | "t_dispatched" | "t_enroute" | "t_onscene" | "t_transport" | "t_athospital" | "t_clear" | "t_closed";

const LABELS: Array<[FieldKey, string[]]> = [
  ["eventNumber", [
    "event no", "event number", "event #", "event num", "event id", "incident no", "incident number", "incident #",
    "incident num", "incident id", "inc no", "inc #", "inc number", "cad no", "cad #", "cad number", "cad incident #",
    "cad incident no", "cad event #", "cad event no", "call no", "call #", "call number", "run no", "run #", "run number",
    "case no", "case #", "case number", "master incident #", "master incident no", "master incident number",
    "complaint no", "complaint #", "agency event #", "agency event no", "agency incident #", "event/incident #",
  ]],
  ["eventish", ["event", "incident", "inc"]],
  ["nature", [
    "category", "call category", "event category", "incident category", "nature", "nature of call", "call nature",
    "incident nature", "call type", "calltype", "incident type", "event type", "type of call", "dispatch type",
    "call reason", "type",
  ]],
  ["detail", [
    "problem", "problem description", "chief complaint", "complaint", "sub type", "subtype", "sub-type",
    "call description", "incident description", "event description", "description", "determinant",
  ]],
  ["address", [
    "location", "incident location", "event location", "location address", "incident address", "event address",
    "address", "addr", "loc", "street address", "scene", "scene address", "dispatch address", "call location",
    "location of incident", "address of incident", "address/location", "location/address", "street",
  ]],
  ["place", [
    "common name", "business", "business name", "place", "place name", "landmark", "location name", "premise",
    "premises", "premise name", "building", "venue", "facility",
  ]],
  ["city", ["city", "municipality", "muni", "town", "city/town", "jurisdiction", "community", "city name"]],
  ["state", ["state"]],
  ["zip", ["zip", "zip code", "zipcode", "postal code"]],
  ["cross", [
    "cross streets", "cross street", "cross st", "cross sts", "cross str", "x street", "x streets", "x st", "x sts",
    "x-st", "x-sts", "xst", "xsts", "xstreet", "xstreets", "cross", "cross roads", "crossroads", "cross road",
    "between", "btwn", "intersection", "nearest intersection", "nearest cross street", "nearest cross",
  ]],
  ["units", [
    "units", "unit(s)", "units assigned", "assigned units", "responding units", "apparatus", "resources",
    "vehicles", "units dispatched", "dispatched units", "units responding", "assigned",
  ]],
  ["unit", ["unit", "unit id", "unit #", "unit no", "assigned unit", "responding unit"]],
  ["status", ["status", "unit status", "call status", "event status", "current status", "incident status", "new status"]],
  ["statusTime", [
    "status time", "status date/time", "status date time", "time of status", "status changed", "status updated",
    "status change time", "timestamp", "time stamp",
  ]],
  ["date", [
    "date", "dispatch date", "call date", "incident date", "event date", "date of call", "reported date",
    "received date", "create date", "created date",
  ]],
  ["time", ["time", "call time", "incident time", "event time", "time of call", "reported time"]],
  ["datetime", [
    "date/time", "date time", "datetime", "date & time", "date and time", "call date/time", "incident date/time",
    "event date/time", "call date time",
  ]],
  ["t_received", [
    "call received", "received", "received time", "time received", "call created", "created", "create time",
    "entered", "call entered", "time reported", "reported", "opened", "event created", "incident created",
  ]],
  ["t_dispatched", [
    "dispatch", "dispatched", "dispatch time", "dispatched time", "time dispatched", "dispatch date/time",
    "dispatched at", "disp", "disp time", "first dispatch", "1st dispatch", "unit dispatched", "first unit dispatched",
    "alerted", "paged", "toned",
  ]],
  ["t_enroute", [
    "enroute", "en route", "en-route", "enroute time", "en route time", "time enroute", "responding", "resp", "enr",
    "first enroute", "1st enroute", "first unit enroute", "unit enroute",
  ]],
  ["t_onscene", [
    "on scene", "onscene", "on-scene", "on scene time", "at scene", "arrived", "arrival", "arrive", "arrived on scene",
    "on location", "first on scene", "1st on scene", "first arrival", "first unit on scene", "unit on scene",
    "time on scene", "time arrived", "arrived at scene",
  ]],
  ["t_transport", [
    "transport", "transporting", "transported", "transport time", "enroute to hospital", "en route to hospital",
    "enroute hospital", "enroute to destination", "en route to destination", "enroute dest", "depart scene",
    "departed scene", "left scene", "leave scene", "leaving scene", "to hospital", "transport start",
    "begin transport", "transport begin",
  ]],
  ["t_athospital", [
    "at hospital", "arrived hospital", "arrived at hospital", "hospital arrival", "at destination", "at dest",
    "arrived destination", "arrived at destination", "destination arrival", "at hosp", "arrive hospital",
    "arrive destination", "arrived dest",
  ]],
  ["t_clear", [
    "available", "avail", "clear", "cleared", "clear time", "cleared time", "time cleared", "available time",
    "time available", "in service", "back in service", "in quarters", "aiq", "available in quarters",
    "available on radio", "unit cleared", "unit available", "last unit cleared", "all units clear", "all clear",
    "return to service", "returned to service", "in svc",
  ]],
  ["t_closed", [
    "closed", "close", "close time", "closed time", "time closed", "event closed", "call closed", "incident closed",
    "closed date/time", "closed at", "closing time", "completed", "complete", "close date",
  ]],
  ["lat", ["lat", "latitude", "lat.", "y coord", "y coordinate"]],
  ["lon", ["lon", "long", "lng", "longitude", "x coord", "x coordinate"]],
  ["latlon", [
    "lat/lon", "lat/long", "lat lon", "lat long", "latlon", "lat/lng", "lat-lon", "gps", "coordinates", "coords",
    "gps coordinates", "location coordinates", "geo", "geolocation",
  ]],
  ["x", ["x"]],
  ["y", ["y"]],
  // Narrative can run over several lines; nothing in it is read.
  ["narrative", [
    "notes", "note", "narrative", "comments", "comment", "remarks", "remark", "additional info",
    "additional information", "info", "details", "cad comments", "event comments", "incident comments", "message",
    "call notes", "event notes", "incident notes",
  ]],
  // Single-line fields the TV never shows (callers, patients, agency codes).
  ["free", [
    "caller", "caller name", "caller phone", "caller address", "caller location", "phone", "phone number",
    "callback", "call back", "call back number", "callback number", "reporting party", "rp", "rp name", "rp phone",
    "patient", "patient name", "age", "sex", "gender", "ani", "ali", "ani/ali", "dispatcher", "operator", "alarm",
    "alarm level", "map", "map page", "map link", "grid", "beat", "zone", "district", "esz", "response area",
    "station", "first due", "box", "agency", "agencies", "disposition", "dispo", "nature code", "call source",
    "source", "priority", "pri", "response priority", "response level", "level", "destination", "hospital",
    "transport destination", "sent", "to", "from", "subject", "cc",
  ]],
];

const FREE_TEXT: ReadonlySet<FieldKey> = new Set<FieldKey>(["free", "narrative"]);
const SHORT_LABELS = new Set(["x", "y", "rp", "lat.", "inc", "loc", "enr", "pri"]);

const labelIndex = new Map<string, FieldKey>();
for (const [key, variants] of LABELS) for (const v of variants) if (!labelIndex.has(v)) labelIndex.set(v, key);

function labelPattern(variant: string): string {
  return variant
    .split("")
    .map((ch) => {
      if (ch === " ") return "[\\s._-]*";
      if (ch === "-" || ch === "/") return "[\\s/-]*";
      if (ch === ".") return "\\.?";
      return ch.replace(/[\\^$*+?()[\]{}|#&]/g, (c) => `\\${c}`);
    })
    .join("");
}

const sortedVariants = [...labelIndex.keys()].sort((a, b) => b.length - a.length);
const ALTERNATION = sortedVariants.map(labelPattern).join("|");
/** A label at the start of a line, then a separator (colon, equals, tab, " - " or a bare hash). */
const LEAD_LABEL = new RegExp(`^(${ALTERNATION})\\s*(?:[:：=]|\\t|\\s-\\s|\\|)\\s*`, "i");
/** A label later in the line, after whitespace and before a colon. */
const MID_LABEL = new RegExp(`(?:^|\\t|\\s)(${ALTERNATION})\\s*[:：]`, "gi");

function canonicalLabel(raw: string): FieldKey | null {
  const cleaned = raw.toLowerCase().replace(/[\s._]+/g, " ").replace(/\s*([/-])\s*/g, "$1").trim();
  const candidates = [cleaned, cleaned.replace(/\.$/, ""), cleaned.replace(/-/g, " "), cleaned.replace(/[-\s]/g, "")];
  for (const c of candidates) {
    const key = labelIndex.get(c);
    if (key) return key;
  }
  // Fall back to matching the regex variant by variant (rare spellings like "Cross-Streets").
  for (const v of sortedVariants) {
    if (new RegExp(`^(?:${labelPattern(v)})$`, "i").test(raw.trim())) return labelIndex.get(v) ?? null;
  }
  return null;
}

type Fields = Map<FieldKey, string[]>;

function addField(fields: Fields, key: FieldKey, value: string) {
  const v = value.replace(/\t+/g, " ").replace(/\s{2,}/g, " ").trim().replace(/^[:\-–|]\s*/, "");
  if (!v) return;
  const list = fields.get(key);
  if (list) list.push(v);
  else fields.set(key, [v]);
}

function first(fields: Fields, key: FieldKey): string | null {
  return fields.get(key)?.[0] ?? null;
}

/** Where a structured run-on line really starts ("EVENT CLOSEOUT Event #: 2026-40121 Dispatched: ..."):
 *  the first of two or more labeled fields, or -1. A lone "label:" inside prose is not enough. */
function runOnStart(line: string): number {
  MID_LABEL.lastIndex = 0;
  const starts: number[] = [];
  for (let m = MID_LABEL.exec(line); m && starts.length < 2; m = MID_LABEL.exec(line)) {
    const key = canonicalLabel(m[1]);
    if (!key || FREE_TEXT.has(key) || SHORT_LABELS.has(m[1].toLowerCase())) continue;
    starts.push(m.index + m[0].indexOf(m[1]));
  }
  return starts.length >= 2 ? starts[0] : -1;
}

/** Split one line into label/value pairs. */
function lineFields(line: string): Array<[FieldKey, string]> | null {
  let lead = line.match(LEAD_LABEL);
  if (!lead) {
    const start = runOnStart(line);
    if (start <= 0) return null;
    line = line.slice(start);
    lead = line.match(LEAD_LABEL);
    if (!lead) return null;
  }
  const key = canonicalLabel(lead[1]);
  if (!key) return null;
  const rest = line.slice(lead[0].length);
  if (FREE_TEXT.has(key)) return [[key, rest]];
  // Further labels on the same line ("Event No: 2026-40118  Status: Dispatched").
  const pairs: Array<[FieldKey, string]> = [];
  let currentKey: FieldKey = key;
  let cursor = 0;
  MID_LABEL.lastIndex = 0;
  for (let m = MID_LABEL.exec(rest); m; m = MID_LABEL.exec(rest)) {
    const label = m[1];
    const nextKey = canonicalLabel(label);
    if (!nextKey || SHORT_LABELS.has(label.toLowerCase())) continue;
    const labelStart = m.index + m[0].indexOf(label);
    // A time value contains colons ("17:30:34"); don't split inside "Enroute: 17:31 On Scene: 17:38" wrongly.
    pairs.push([currentKey, rest.slice(cursor, labelStart)]);
    currentKey = nextKey;
    cursor = m.index + m[0].length;
    if (FREE_TEXT.has(nextKey)) break;
  }
  pairs.push([currentKey, FREE_TEXT.has(currentKey) ? rest.slice(cursor) : rest.slice(cursor)]);
  return pairs;
}

/** Labels without a separator ("Location 353 SHAD LN" from stripHtml'd tables), for key fields only. */
const BARE_LABELS: Array<[FieldKey, RegExp, (v: string) => boolean]> = [
  ["address", /^(?:incident\s+)?(?:location|address)\s+(.+)$/i, (v) => /^\d+\s+\S/.test(v) || /\s(?:&|and|\/)\s/.test(v)],
  ["cross", /^(?:cross\s*(?:streets?|sts?\.?)|x-?\s?sts?\.?)\s+(.+)$/i, () => true],
  ["city", /^city\s+([A-Za-z.' -]{3,40})$/i, () => true],
  ["eventNumber", /^(?:event|incident|cad)\s*(?:no\.?|number|#)\s*([A-Z0-9-]{4,})$/i, () => true],
  ["status", /^status\s+(.+)$/i, (v) => mapStatus(v) !== null],
  ["units", /^units?\s+(.+)$/i, (v) => /\d/.test(v)],
  ["nature", /^(?:category|nature|call\s+type|incident\s+type)\s+(.+)$/i, () => true],
];

const PHASE_WORDS: Array<[Exclude<FieldKey, "free">, RegExp]> = [
  ["t_athospital", /^(?:at\s*-?\s*(?:hospital|hosp|dest(?:ination)?)|arr(?:ived?)?\.?\s+(?:at\s+)?(?:hospital|hosp|dest(?:ination)?)|hosp(?:ital)?(?:\s+arrival)?)$/i],
  ["t_transport", /^(?:transport(?:ing|ed)?|trans(?:p)?\.?|trnsp|en\s*-?route\s+to\s+(?:hospital|hosp|dest(?:ination)?)|depart(?:ed)?\s+scene|left\s+scene)$/i],
  ["t_onscene", /^(?:on\s*-?\s*sc(?:e?ne?|n)|onscn|at\s+scene|arrived|arrival|arr\.?)$/i],
  ["t_enroute", /^(?:en\s*-?\s*route|enrt|enr\.?|responding|resp\.?)$/i],
  ["t_dispatched", /^(?:dispatch(?:ed)?|disp\.?|dsp)$/i],
  ["t_clear", /^(?:available|avail\.?|avl|clear(?:ed)?|clr|in\s+service|aiq)$/i],
  ["t_closed", /^(?:closed?|cls)$/i],
];

function extractFields(lines: string[]): Fields {
  const fields: Fields = new Map();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const pairs = lineFields(line);
    if (pairs) {
      for (const [key, rawValue] of pairs) {
        let value = rawValue.trim();
        // "Location:" alone: the value is on the next non-blank line (HTML tables, wrapped text).
        if (!value && !FREE_TEXT.has(key) && pairs.length === 1) {
          let next = i + 1;
          while (next < lines.length && next <= i + 2 && !lines[next]) next++;
          if (next < lines.length && lines[next] && !lineFields(lines[next])) {
            value = lines[next].trim();
            i = next;
          }
        }
        addField(fields, key, value);
      }
      continue;
    }
    // Phase words without a colon: "Enroute 17:31:10", "On Scene\t04/04/2026 17:38".
    const bare = line.match(/^([A-Za-z][A-Za-z -]{2,30}?)\s*(?:\t|\s)\s*(\d{1,2}[:/].*)$/);
    if (bare) {
      const phase = PHASE_WORDS.find(([, re]) => re.test(bare[1].trim()));
      if (phase) { addField(fields, phase[0], bare[2]); continue; }
    }
    for (const [key, re, ok] of BARE_LABELS) {
      const m = line.match(re);
      if (m && ok(m[1].trim()) && !fields.has(key)) { addField(fields, key, m[1]); break; }
    }
  }
  return fields;
}

// ── Values ────────────────────────────────────────────────────────────────────────────────────────

/** Map a status word to a phase. Returns null for anything unrecognised. */
export function mapStatus(raw: string | null | undefined): CallPhase | null {
  if (!raw) return null;
  const s = raw.toLowerCase().replace(/[^a-z ]+/g, " ").replace(/\s+/g, " ").trim();
  if (!s) return null;
  if (/\b(cancel+ed|cancel|disregard(ed)?|stand ?down|recalled|abort(ed)?)\b/.test(s)) return "clear";
  if (/\b(at|arrived?( at)?|arrive) (hospital|hosp|dest|destination|er)\b|\bhospital arrival\b|\bat destination\b/.test(s)) return "athospital";
  if (/\btransport|\ben ?route to (hospital|hosp|dest|destination)\b|\bdepart(ed)? scene\b|\bleft scene\b|\bleaving scene\b|\bto hospital\b/.test(s)) return "transport";
  if (/\b(on ?scene|at scene|arrived|arrival|on location|onscene)\b/.test(s)) return "onscene";
  if (/\b(en ?route|enrt|enr|responding|resp)\b/.test(s)) return "enroute";
  if (/\b(clear(ed)?|avail(able)?|in service|back in service|in quarters|aiq|returning|return(ed)? to (quarters|station|service)|closed?|complete(d)?|in svc)\b/.test(s)) return "clear";
  if (/\b(dispatch(ed)?|disp|assigned|alert(ed)?|paged|toned|new|pending|active|open|created|received|notified)\b/.test(s)) return "dispatched";
  return null;
}

function isCancelled(raw: string | null | undefined): boolean {
  return !!raw && /\b(cancel+ed|cancel|disregard(ed)?|stand ?down|recalled|abort(ed)?)\b/i.test(raw);
}

/** "2026-40118", "26-40118", "#2026-40118", "E2026-0040118" → "2026-40118"; other shapes uppercased. */
export function canonicalEventNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const token = raw.trim().replace(/^[#:\s]+/, "").split(/[\s,;]+/)[0]?.replace(/[.,;:)\]]+$/, "") ?? "";
  if (!token || token.length < 3 || token.length > 24 || !/\d{3,}/.test(token)) return null;
  const m = token.match(/^[A-Z]{0,4}[-#]?((?:19|20)?\d{2})-?(\d{3,8})$/i);
  if (m && (m[1].length === 4 || token.includes("-"))) {
    const year = m[1].length === 2 ? `20${m[1]}` : m[1];
    return `${year}-${String(Number(m[2]))}`;
  }
  return token.toUpperCase();
}

/** The trailing number of an event number, for loose matching ("40118"). */
export function eventSuffix(eventNumber: string | null): string | null {
  const m = eventNumber?.match(/(\d{3,})$/);
  return m ? String(Number(m[1])) : null;
}

const KNOWN_CITIES = [
  "Millstadt", "Belleville", "Smithton", "Freeburg", "Columbia", "Waterloo", "Dupo", "Cahokia Heights", "Cahokia",
  "East Carondelet", "Swansea", "O'Fallon", "Fairview Heights", "Mascoutah", "New Athens", "Marissa", "Lenzburg",
  "Fayetteville", "Hecker", "Red Bud", "Valmeyer", "Maeystown", "Fults", "Shiloh", "Lebanon", "Summerfield",
  "Caseyville", "Collinsville", "East St. Louis", "East Saint Louis", "Centreville", "Sauget", "St. Libory",
  "New Baden", "Darmstadt", "Paderborn", "Prairie du Long", "Floraville", "Imbs", "Stookey", "Signal Hill",
];
const CITY_RE = new RegExp(`(?:^|[\\s,])(${KNOWN_CITIES.map((c) => c.replace(/[.']/g, (ch) => (ch === "." ? "\\.?" : "'?")).replace(/ /g, "\\s+")).join("|")})(?:\\s+(?:IL|Illinois))?(?:\\s+\\d{5}(?:-\\d{4})?)?\\s*$`, "i");

const SMALL_WORDS = new Set(["of", "and", "the", "at", "on", "du", "de", "la"]);
const UPPER_WORDS = new Set(["N", "S", "E", "W", "NE", "NW", "SE", "SW", "NB", "SB", "EB", "WB", "IL", "US", "MO", "II", "III", "IV", "PO", "EMS", "VFW", "YMCA", "ER", "MM"]);

/** Medical and road shorthand that stays upper case in a detail line. */
const DETAIL_UPPER = new Set([
  "MVA", "MVC", "CPR", "ALS", "BLS", "EMS", "DOA", "CVA", "TIA", "GSW", "AED", "IV", "MCI", "HAZMAT", "STEMI", "COPD", "CHF",
  "DNR", "POLST", "CO", "OB", "OD", "ETOH", "LOC", "SOB", "PT", "YOM", "YOF", "NB", "SB", "EB", "WB", "ATV", "UTV", "PD", "FD",
  "LZ", "HEMS", "DUI", "ER", "ICU", "OK", "II", "III",
]);

/** "FALL - POSSIBLE HIP INJURY" → "Fall - Possible Hip Injury": title case that keeps the punctuation. */
export function formatDetail(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .trim()
    .split(/(\s+|\/|-|\(|\)|,)/)
    .map((word) => {
      if (!/[a-z]/i.test(word)) return word;
      const up = word.toUpperCase();
      if (DETAIL_UPPER.has(up) || /^\d+[A-Z]?$/.test(up)) return up;
      return up.charAt(0) + up.slice(1).toLowerCase();
    })
    .join("");
}

/** "353 SHAD LN" → "353 Shad Ln"; keeps directionals, route numbers and ordinals readable. */
export function titleCaseAddress(raw: string): string {
  return raw
    .toLowerCase()
    .split(/(\s+|\/|&|-)/)
    .map((word, index) => {
      if (!word.trim() || /^(\s+|\/|&|-)$/.test(word)) return word;
      const up = word.toUpperCase();
      if (UPPER_WORDS.has(up.replace(/[.,]/g, ""))) return up;
      if (/^\d+(st|nd|rd|th)$/i.test(word)) return word.toLowerCase();
      if (/^[a-z]{1,3}\d+[a-z]?$/i.test(word) || /^\d+[a-z]$/i.test(word)) return up; // I64, 158A, M3925
      if (index > 0 && SMALL_WORDS.has(word)) return word;
      if (/^mc[a-z]/.test(word)) return `Mc${word.charAt(2).toUpperCase()}${word.slice(3)}`;
      if (/^o'[a-z]/.test(word)) return `O'${word.charAt(2).toUpperCase()}${word.slice(3)}`;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join("");
}

function cleanValue(raw: string | null): string | null {
  if (!raw) return null;
  const v = raw
    .replace(/\s*(?:\.{3,}|…)\s*$/, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s,;:-]+|[\s,;:-]+$/g, "")
    .trim();
  if (!v || /^(n\/?a|none|unknown|unk|null|-+|\?+|not available|no cross streets?)$/i.test(v)) return null;
  return v;
}

function looksLikeStreet(text: string): boolean {
  return /^\d+[A-Z]?\s+\S/i.test(text) ||
    /\b(st|street|ave|avenue|rd|road|dr|drive|ln|lane|ct|court|way|pl|place|blvd|hwy|highway|pkwy|parkway|cir|circle|ter|terrace|trl|trail|route|rte|rt|il|us|interstate|i)\b\.?/i.test(text) ||
    /\s(?:&|and|\/)\s/.test(text);
}

interface AddressParts { address: string | null; city: string | null; place: string | null; cross: string | null }

/** Split a CAD location into street, city, place name and cross streets. */
export function splitLocation(raw: string | null): AddressParts {
  const out: AddressParts = { address: null, city: null, place: null, cross: null };
  let text = cleanValue(raw);
  if (!text) return out;
  // Coordinates alone are not an address.
  if (/^-?\d{1,3}\.\d{3,}\s*[, ]\s*-?\d{1,3}\.\d{3,}$/.test(text)) return out;
  // "Between X and Y" / "X/Y" tails inside the location.
  const between = text.match(/^(.*?)\s*(?:\(|,|;)?\s*\b(?:btwn|between|x-?sts?\b:?|cross(?:\s*sts?)?:)\s*(.+?)\)?$/i);
  if (between && between[1]) { text = between[1]; out.cross = cleanValue(between[2]); }
  // Business @ address, or address @ cross street.
  const at = text.split(/\s+@\s+|\s+at\s+(?=\d)/i);
  if (at.length >= 2) {
    const [left, right] = [at[0].trim(), at.slice(1).join(" ").trim()];
    if (/^\d/.test(left)) { text = left; out.cross ??= cleanValue(right); }
    else if (/^\d/.test(right)) { out.place = cleanValue(left); text = right; }
    else { text = `${left} & ${right}`; }
  }
  // Trailing state and zip.
  text = text.replace(/,?\s+(?:IL|Illinois)\.?(?:\s+\d{5}(?:-\d{4})?)?\s*$/i, "").replace(/,?\s+\d{5}(?:-\d{4})?\s*$/, "");
  const parts = text.split(/\s*[,;]\s*/).filter(Boolean);
  if (parts.length > 1) {
    const street = parts.findIndex((p) => looksLikeStreet(p));
    const streetIndex = street >= 0 ? street : 0;
    if (streetIndex > 0 && !out.place) out.place = parts.slice(0, streetIndex).join(", ");
    text = parts[streetIndex];
    const tail = parts.slice(streetIndex + 1);
    for (const piece of tail) {
      if (/^(?:apt|unit|lot|ste|suite|rm|room|bldg|building|fl|floor|#)\b/i.test(piece)) { text = `${text} ${piece}`; continue; }
      if (!out.city && /^[A-Za-z.' -]{3,30}$/.test(piece) && !/county|twp|township/i.test(piece)) out.city = piece;
    }
  }
  if (!out.city) {
    const city = text.match(CITY_RE);
    if (city && city.index !== undefined && city.index > 0 && looksLikeStreet(text.slice(0, city.index))) {
      out.city = city[1];
      text = text.slice(0, city.index);
    }
  }
  out.address = cleanValue(text);
  return out;
}

function cleanCity(raw: string | null): string | null {
  const v = cleanValue(raw);
  if (!v) return null;
  const s = v.replace(/,?\s+(?:IL|Illinois)\.?(?:\s+\d{5})?$/i, "").replace(/\s+\d{5}$/, "").trim();
  if (/^(uninc(orporated)?|county|st\.? clair( county)?|monroe( county)?|unknown)$/i.test(s)) return null;
  return s ? titleCaseAddress(s) : null;
}

function cleanCross(raw: string | null): string | null {
  const v = cleanValue(raw);
  if (!v) return null;
  return titleCaseAddress(
    v.replace(/^(?:btwn|between)\s+/i, "")
      .replace(/\s+(?:and|&)\s+/gi, " / ")
      .replace(/\s*[\/|]\s*/g, " / ")
      .replace(/\s*;\s*/g, " / "),
  );
}

const UNIT_TOKEN = /^(?:[A-Z]{1,6}-?\d{1,5}[A-Z]?|\d{3,5})$/;

function splitUnits(raw: string): string[] {
  return raw
    .toUpperCase()
    .replace(/\b(MEDIC|MED|AMB|AMBULANCE)\s*-?\s*(\d{4})\b/g, (_m, _p, n: string) => (n.startsWith("39") ? `M${n}` : `${_p}${n}`))
    .split(/[\s,;/|+&]+/)
    .map((t) => t.replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/g, ""))
    .filter((t) => t.length >= 2 && t.length <= 10 && UNIT_TOKEN.test(t) && /\d/.test(t) && !/^(19|20)\d{2}$/.test(t));
}

function normalizeUnit(token: string): string {
  const t = token.toUpperCase().replace(/[\s-]+/g, "");
  if (/^39\d{2}$/.test(t)) return `M${t}`;
  return t;
}

// ── Coordinates ───────────────────────────────────────────────────────────────────────────────────

function toCoordinate(latRaw: string, lonRaw: string): { lat: number; lon: number } | null {
  const num = (s: string) => {
    const hemi = s.match(/[NSEW]/i)?.[0]?.toUpperCase();
    let n = Number(s.replace(/[^\d.+-]/g, ""));
    if (!Number.isFinite(n)) return NaN;
    if (Math.abs(n) > 1000 && Number.isInteger(n)) n /= 1e6; // micro-degrees
    if (hemi === "S" || hemi === "W") n = -Math.abs(n);
    return n;
  };
  let lat = num(latRaw), lon = num(lonRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  // Swapped, or a western longitude printed without its minus sign.
  if (Math.abs(lat) > 80 && Math.abs(lon) < 80) [lat, lon] = [lon, lat];
  if (lon > 80 && lon < 100) lon = -lon;
  const point = { lat: Math.round(lat * 1e6) / 1e6, lon: Math.round(lon * 1e6) / 1e6 };
  return withinServiceArea(point) ? point : null;
}

const NUM = String.raw`[NSEW]?\s*[-+]?\d{1,3}\.\d{3,}\s*[NSEW]?`;
/** Micro-degrees as some CAD exports print them ("38440020, -90082270"), only inside labeled fields. */
const MICRO = String.raw`[-+]?\d{7,9}`;
const MAP_LINK_PATTERNS: RegExp[] = [
  new RegExp(String.raw`[?&](?:q|query|ll|sll|daddr|destination|center|saddr|loc|where1)=(?:loc:)?(-?\d{1,3}\.\d{3,})(?:,|%2C|\+|%20|\s)+(-?\d{1,3}\.\d{3,})`, "i"),
  /\bcp=(-?\d{1,3}\.\d{3,})~(-?\d{1,3}\.\d{3,})/i,
  /\/@(-?\d{1,3}\.\d{3,}),(-?\d{1,3}\.\d{3,})/,
  /!3d(-?\d{1,3}\.\d{3,})!4d(-?\d{1,3}\.\d{3,})/,
  /[?&]mlat=(-?\d{1,3}\.\d{3,})&mlon=(-?\d{1,3}\.\d{3,})/i,
  /#map=\d+\/(-?\d{1,3}\.\d{3,})\/(-?\d{1,3}\.\d{3,})/,
  /\bgeo:(-?\d{1,3}\.\d{3,}),(-?\d{1,3}\.\d{3,})/i,
  /waze\.com\/ul\?[^\s"]*?\bll=(-?\d{1,3}\.\d{3,})(?:,|%2C)(-?\d{1,3}\.\d{3,})/i,
];

function findCoordinates(fields: Fields, text: string): { lat: number; lon: number } | null {
  const lat = first(fields, "lat"), lon = first(fields, "lon");
  if (lat && lon) {
    const p = toCoordinate(lat, lon);
    if (p) return p;
  }
  for (const value of [...(fields.get("latlon") ?? []), ...(fields.get("address") ?? [])]) {
    const m = value.match(new RegExp(`(${NUM})\\s*(?:,|/|\\s)\\s*(${NUM})`, "i"));
    if (m) {
      const p = toCoordinate(m[1], m[2]);
      if (p) return p;
    }
  }
  for (const value of fields.get("latlon") ?? []) {
    const m = value.match(new RegExp(`(${MICRO})\\s*(?:,|/|\\s)\\s*(${MICRO})`));
    if (m) {
      const p = toCoordinate(m[1], m[2]);
      if (p) return p;
    }
  }
  const x = first(fields, "x"), y = first(fields, "y");
  if (x && y) {
    const p = toCoordinate(y, x);
    if (p) return p;
  }
  for (const re of MAP_LINK_PATTERNS) {
    const m = text.match(re);
    if (m) {
      const p = toCoordinate(m[1], m[2]);
      if (p) return p;
    }
  }
  // "Lat: 38.45892 Lon: -90.09035" written inline in free text.
  const inline = text.match(/\blat(?:itude)?\s*[:=]?\s*(-?\d{1,3}\.\d{3,})[\s,;/]+(?:lon|long|lng|longitude)\s*[:=]?\s*(-?\d{1,3}\.\d{3,})/i);
  if (inline) return toCoordinate(inline[1], inline[2]);
  return null;
}

// ── Subjects ──────────────────────────────────────────────────────────────────────────────────────

interface SubjectParts { nature: string | null; location: string | null; status: string | null }

function parseSubject(subject: string): SubjectParts {
  const s = subject.trim();
  // Chief 360: "[39 EMS CAD] MEDICAL-FIRST RESPONDER -- 353 Shad Ln..."
  const chief = s.match(/^\[[^\]]*\]\s*(.+?)(?:\s+-{2,}\s+(.+?))?(?:\s+-{2,}\s+(.+))?$/);
  if (chief) {
    const nature = chief[1].trim();
    return {
      nature: /^(event\s+)?close\s*-?out/i.test(nature) ? null : nature,
      location: chief[2]?.trim() ?? null,
      status: chief[3] ? chief[3].trim() : null,
    };
  }
  const generic = s.match(/(?:cad\s*alert|dispatch|incident|new\s+call|call)\s*[:\-]\s*(.+)$/i);
  if (generic) {
    const [nature, location] = generic[1].split(/\s+-{1,2}\s+|\s+@\s+/);
    return { nature: nature?.trim() || null, location: location?.trim() || null, status: null };
  }
  return { nature: null, location: null, status: null };
}

// ── Times ─────────────────────────────────────────────────────────────────────────────────────────

const PHASE_FIELDS: Array<[PhaseOrClosed, FieldKey]> = [
  ["dispatched", "t_dispatched"], ["enroute", "t_enroute"], ["onscene", "t_onscene"], ["transport", "t_transport"],
  ["athospital", "t_athospital"], ["clear", "t_clear"], ["closed", "t_closed"],
];

/** Lines that are just a date and time ("23:12 April 4,2026"): Chief 360 prints its time that way. */
function standaloneDateTime(lines: string[], referenceMs: number): number | null {
  for (const line of lines) {
    if (line.length > 48 || !/\d{1,2}:\d{2}/.test(line) || /[a-z]{3,}\s*:/i.test(line.replace(/\d{1,2}:\d{2}(:\d{2})?/g, ""))) continue;
    if (!/(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{4}-\d{2}-\d{2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(line)) continue;
    const ms = parseCadDateTime(line, { referenceMs });
    if (ms !== null) return ms;
  }
  return null;
}

/** Table cells: tab-separated rows keep their empty cells (so columns stay aligned); rows spaced with
 *  runs of spaces can't show an empty cell, so blanks are dropped there. */
function tableCells(line: string): string[] {
  if (line.includes("\t")) {
    const cells = line.split("\t").map((c) => c.trim());
    while (cells.length && !cells[cells.length - 1]) cells.pop();
    return cells;
  }
  return line.split(/ {2,}/).map((c) => c.trim()).filter(Boolean);
}

/** A per-unit table: a header with three or more phase columns, then rows that begin with a unit. */
function parseUnitTable(lines: string[], referenceMs: number): Record<string, Partial<Record<PhaseOrClosed, number>>> {
  const out: Record<string, Partial<Record<PhaseOrClosed, number>>> = {};
  for (let i = 0; i < lines.length; i++) {
    const header = tableCells(lines[i]);
    const columns = header.map((cell) => PHASE_WORDS.find(([, re]) => re.test(cell))?.[0] ?? null);
    if (columns.filter(Boolean).length < 3) continue;
    for (let j = i + 1; j < lines.length && j <= i + 12; j++) {
      const cells = tableCells(lines[j]);
      if (!cells.length) continue;
      const unit = cells[0].toUpperCase().replace(/\s+/g, "");
      if (!UNIT_TOKEN.test(unit) || !/\d/.test(unit)) break;
      // The header either has a leading "Unit" column (cells line up one to one) or starts with the
      // first phase (shift by one). A short row (trailing blanks dropped) still lines up from the left.
      const values = cells.slice(1);
      const phaseCols = columns.map((c, idx) => [c, idx] as const).filter(([c]) => c);
      const offset = columns[0] === null ? 1 : 0;
      if (values.length > header.length - offset) continue;
      const times: Partial<Record<PhaseOrClosed, number>> = {};
      for (const [col, idx] of phaseCols) {
        const value = values[idx - offset];
        if (!value || !col) continue;
        const ms = parseCadDateTime(value, { referenceMs, mode: "nearest", allowMilitary: true });
        if (ms !== null) times[col.slice(2) as PhaseOrClosed] = ms;
      }
      if (Object.keys(times).length) out[normalizeUnit(unit)] = times;
    }
  }
  return out;
}

/** "M3925 Enroute 17:31:10" or "M3925 - On Scene: 04/04/2026 17:38:22". */
function parseUnitLines(lines: string[], referenceMs: number): Record<string, Partial<Record<PhaseOrClosed, number>>> {
  const out: Record<string, Partial<Record<PhaseOrClosed, number>>> = {};
  for (const line of lines) {
    const m = line.match(/^([A-Z]{1,6}-?\d{2,5}[A-Z]?)\s*[-:|\t]?\s*([A-Za-z][A-Za-z -]{2,30}?)\s*[:\t-]?\s*(\d{1,2}[:/][\d:/ APMapm.-]+)$/);
    if (!m) continue;
    const phase = PHASE_WORDS.find(([, re]) => re.test(m[2].trim()))?.[0];
    if (!phase) continue;
    const ms = parseCadDateTime(m[3], { referenceMs, mode: "nearest" });
    if (ms === null) continue;
    const unit = normalizeUnit(m[1]);
    (out[unit] ??= {})[phase.slice(2) as PhaseOrClosed] = ms;
  }
  return out;
}

// ── Classification ────────────────────────────────────────────────────────────────────────────────

function sourceOf(from: string, subject: string, text: string): MessageSource {
  if (/cfmsg|chief\s*360|chief360/i.test(from) || /\bEMS\s+CAD\b/i.test(subject)) return "chief360";
  if (/cencom|omnigo/i.test(from)) return "cencom";
  if (/\bEVENT\s+CLOSE\s*-?OUT\b/i.test(subject) || /\bEVENT\s+CLOSE\s*-?OUT\b/i.test(text)) return "cencom";
  return "other";
}

function isCloseout(subject: string, text: string, fields: Fields, referenceMs: number): boolean {
  if (/close\s*-?\s*out|\bclosed?\s+(?:event|incident|call)\b|\b(?:event|incident|call)\s+closed?\b|disposition\s+report|incident\s+summary/i.test(subject)) return true;
  if (/^\s*(?:event|incident|call)\s+close\s*-?out\b/im.test(text)) return true;
  const closed = fields.get("t_closed") ?? [];
  return closed.some((v) => parseCadDateTime(v, { referenceMs }) !== null);
}

// ── Main ──────────────────────────────────────────────────────────────────────────────────────────

const TWO_MINUTES = 2 * 60_000;

export function parseCadMessage(input: CadEmailInput): ParsedCadMessage {
  const receivedAt = typeof input.receivedAt === "number" ? input.receivedAt : input.receivedAt.getTime();
  const unwrapped = unwrapForwards(normalizeLines(input.body ?? ""));
  const lines = unwrapped.lines;
  const text = lines.join("\n");
  const subject = stripSubjectPrefixes(unwrapped.subject ?? stripSubjectPrefixes(input.subject ?? ""));
  const from = (unwrapped.from ?? input.from ?? "").toLowerCase();
  const fields = extractFields(lines);
  const subjectParts = parseSubject(subject);
  const source = sourceOf(`${from} ${(input.from ?? "").toLowerCase()}`, subject, text);

  // Event number: labeled first, then "Event: 2026-40118"-style, then a number in the subject or body.
  let eventRaw = first(fields, "eventNumber");
  const eventish = fields.get("eventish") ?? [];
  if (!eventRaw) eventRaw = eventish.find((v) => /^[A-Z]{0,4}[-#]?\d{2,4}-?\d{3,}/i.test(v)) ?? null;
  if (!eventRaw) eventRaw = subject.match(/\b((?:19|20)\d{2}-\d{3,8})\b/)?.[1] ?? text.match(/\b((?:19|20)\d{2}-\d{4,8})\b/)?.[1] ?? null;
  const eventNumber = canonicalEventNumber(eventRaw);

  // Call type and a detail line.
  const natureField = first(fields, "nature") ?? eventish.find((v) => !/\d{3,}/.test(v)) ?? null;
  const natureRaw = cleanValue(natureField ?? subjectParts.nature);
  const nature = natureRaw ? formatNature(natureRaw) || null : null;
  const detailRaw = cleanValue(first(fields, "detail"));
  const detail = detailRaw && detailRaw.toUpperCase() !== (natureRaw ?? "").toUpperCase() ? formatDetail(detailRaw) : null;

  // Location: the labeled address, else the subject's "-- 353 Shad Ln" part.
  const labeled = splitLocation(first(fields, "address"));
  const fromSubject = splitLocation(subjectParts.location);
  const addressRaw = labeled.address ?? fromSubject.address;
  const address = addressRaw ? titleCaseAddress(addressRaw) : null;
  const city = cleanCity(first(fields, "city")) ?? cleanCity(labeled.city) ?? cleanCity(fromSubject.city);
  const placeRaw = cleanValue(first(fields, "place")) ?? labeled.place ?? fromSubject.place;
  const place = placeRaw ? titleCaseAddress(placeRaw) : null;
  const crossStreets = cleanCross(first(fields, "cross")) ?? cleanCross(labeled.cross) ?? cleanCross(fromSubject.cross);

  // Units: the units fields plus any Millstadt unit (M39xx) named anywhere.
  const unitSet: string[] = [];
  const addUnit = (u: string) => { const n = normalizeUnit(u); if (!unitSet.includes(n)) unitSet.push(n); };
  for (const value of [...(fields.get("units") ?? []), ...(fields.get("unit") ?? [])]) splitUnits(value).forEach(addUnit);
  for (const m of text.matchAll(/\b(?:M|MEDIC\s?|MED\s?)-?(39\d{2})\b/gi)) addUnit(`M${m[1]}`);

  // Status.
  const statusRaw = cleanValue(first(fields, "status") ?? subjectParts.status);
  const status = mapStatus(statusRaw);
  const cancelled = isCancelled(statusRaw);

  // Times. The dispatch time anchors bare times of day in closeouts.
  const dispatchedLabeled = parseCadDateTime(first(fields, "t_dispatched"), { referenceMs: receivedAt, allowMilitary: true });
  const anchor = dispatchedLabeled ?? receivedAt;
  const times: Partial<Record<PhaseOrClosed, number>> = {};
  for (const [phase, key] of PHASE_FIELDS) {
    for (const value of fields.get(key) ?? []) {
      const ms = parseCadDateTime(value, { referenceMs: anchor, mode: phase === "dispatched" ? "nearest" : dispatchedLabeled ? "after" : "nearest", allowMilitary: true });
      if (ms !== null && (times[phase] === undefined || ms < times[phase]!)) times[phase] = ms;
    }
  }
  const unitTimes = { ...parseUnitTable(lines, anchor), ...parseUnitLines(lines, anchor) };
  for (const perUnit of Object.values(unitTimes)) {
    for (const [phase, ms] of Object.entries(perUnit) as Array<[PhaseOrClosed, number]>) {
      if (times[phase] === undefined || ms < times[phase]!) times[phase] = ms;
    }
  }
  for (const unit of Object.keys(unitTimes)) addUnit(unit);

  const generic =
    parseCadDateTime(first(fields, "statusTime"), { referenceMs: receivedAt }) ??
    parseCadDateTime(first(fields, "datetime"), { referenceMs: receivedAt }) ??
    combineDateAndTime(first(fields, "date"), first(fields, "time"), receivedAt) ??
    parseCadDateTime(first(fields, "date"), { referenceMs: receivedAt }) ??
    standaloneDateTime(lines, receivedAt);

  let kind: MessageKind;
  if (isCloseout(subject, text, fields, receivedAt)) kind = "closeout";
  else if (source === "cencom") kind = "notification";
  else if (status && status !== "dispatched") kind = "status";
  else if (natureRaw || address || eventNumber) kind = source === "other" && !eventNumber && !natureRaw ? "unknown" : "dispatch";
  else kind = "unknown";

  // When did this status happen? A labeled time for this phase wins; a generic body time is trusted
  // only when it sits near the email's arrival (status emails may repeat the event's creation time).
  let statusAt: number | null = null;
  const reported: CallPhase | null = kind === "dispatch" ? "dispatched" : kind === "status" ? status : null;
  if (reported) {
    const labeledTime = times[reported] ?? (fields.get("t_received") && reported === "dispatched"
      ? parseCadDateTime(first(fields, "t_received"), { referenceMs: receivedAt }) : null);
    const earliest = reported === "dispatched" ? receivedAt - 30 * 60_000 : receivedAt - TWO_MINUTES;
    if (labeledTime !== undefined && labeledTime !== null) statusAt = labeledTime;
    else if (generic !== null && generic >= earliest && generic <= receivedAt + TWO_MINUTES) statusAt = generic;
    else statusAt = receivedAt;
  }
  if (kind === "closeout" && times.dispatched === undefined && generic !== null && generic <= receivedAt) {
    // Some closeouts print only the event's own date/time line; it is the dispatch time.
    times.dispatched = generic;
  }

  return {
    kind,
    source,
    eventNumber,
    natureRaw,
    nature,
    detail,
    address,
    city,
    place,
    crossStreets,
    units: unitSet,
    status: reported,
    statusRaw,
    cancelled,
    statusAt,
    times,
    unitTimes,
    // The raw body too: map links live in HTML hrefs, which the text version drops.
    location: findCoordinates(fields, `${text}\n${decodeEntities(input.body ?? "")}`),
    receivedAt,
  };
}

/** For tests and diagnostics: the plain text the parser actually reads. */
export function debugText(body: string): string {
  return unwrapForwards(normalizeLines(body)).lines.join("\n");
}
