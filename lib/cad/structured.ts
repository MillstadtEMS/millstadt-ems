/**
 * Structured data layer for the call ticker.
 *
 * The existing ticker pipeline (Nav.tsx → /api/cad/log → cad_calls table)
 * is fragile and intentionally left alone. We extend cad_calls with a
 * handful of NULLABLE columns and a sibling cad_categories table so the
 * new structured editor can:
 *   1. Save units, mutual-aid status, HEMS status, category, and notes
 *      as discrete fields for reporting.
 *   2. Still write the same `dispatch_nature` text the live ticker reads,
 *      so the public-facing display continues to work unchanged.
 *   3. Backfill historical rows by parsing dispatch_nature text.
 *
 * The migration is idempotent (CREATE / ADD COLUMN IF NOT EXISTS) so
 * calling ensureCadStructuredSchema() multiple times is safe.
 */

import { sql } from "@/lib/neon";

// ── Canonical lists ────────────────────────────────────────────────────

export const MILLSTADT_UNITS = ["M3925", "M3926", "M3935"] as const;
export type MillstadtUnit = typeof MILLSTADT_UNITS[number];

export const MUTUAL_AID_AGENCIES = [
  "Columbia EMS",
  "Monroe County EMS",
  "Dupo EMS",
  "Medstar EMS",
  "Abbott EMS",
  "Mascoutah EMS",
  "New Baden EMS",
  "O'Fallon EMS",
] as const;
export type MutualAidAgency = typeof MUTUAL_AID_AGENCIES[number];

export type HemsOutcome = "handoff" | "disregarded";

// ── Tone palette for unit + agency chips (used by editor + reports) ────
// Tasteful, distinct, not garish. Keeps to the navy/gold palette family.

export const UNIT_TONES: Record<MillstadtUnit, { bg: string; fg: string; border: string }> = {
  M3925: { bg: "rgba(240,180,41,0.16)",  fg: "#f0b429", border: "rgba(240,180,41,0.40)" },
  M3926: { bg: "rgba(125,211,252,0.16)", fg: "#7dd3fc", border: "rgba(125,211,252,0.40)" },
  M3935: { bg: "rgba(167,139,250,0.16)", fg: "#c4b5fd", border: "rgba(167,139,250,0.40)" },
};

export const MUTUAL_AID_TONES: Record<MutualAidAgency, { bg: string; fg: string; border: string }> = {
  "Columbia EMS":      { bg: "rgba(34,197,94,0.16)",   fg: "#86efac", border: "rgba(34,197,94,0.40)" },
  "Monroe County EMS": { bg: "rgba(56,189,248,0.14)",  fg: "#7dd3fc", border: "rgba(56,189,248,0.36)" },
  "Dupo EMS":          { bg: "rgba(244,114,182,0.14)", fg: "#f9a8d4", border: "rgba(244,114,182,0.36)" },
  "Medstar EMS":       { bg: "rgba(251,113,133,0.14)", fg: "#fda4af", border: "rgba(251,113,133,0.36)" },
  "Abbott EMS":        { bg: "rgba(192,132,252,0.14)", fg: "#d8b4fe", border: "rgba(192,132,252,0.36)" },
  "Mascoutah EMS":     { bg: "rgba(45,212,191,0.14)",  fg: "#5eead4", border: "rgba(45,212,191,0.36)" },
  "New Baden EMS":     { bg: "rgba(250,204,21,0.14)",  fg: "#fde047", border: "rgba(250,204,21,0.36)" },
  "O'Fallon EMS":      { bg: "rgba(248,113,113,0.14)", fg: "#fca5a5", border: "rgba(248,113,113,0.36)" },
};

// ── Parsing helpers ────────────────────────────────────────────────────

/**
 * Pull the bracket-prefix groups from a dispatch_nature string.
 *
 * Examples (real production data):
 *   "[3935] Fall"                              → ["3935"]
 *   "[3926] [3935] Accident w/ Injuries"       → ["3926", "3935"]
 *   "[Columbia EMS] Mutual Aid"                → ["Columbia EMS"]
 *   "Just text"                                → []
 */
export function extractBrackets(text: string): string[] {
  if (!text) return [];
  const out: string[] = [];
  const re = /\[([^\]]+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push(m[1].trim());
  }
  return out;
}

/**
 * Strip every leading "[…]" group plus their trailing whitespace, then
 * return the remaining text. That residue is the body of the entry —
 * which we further split into category + parenthetical notes below.
 */
export function stripLeadingBrackets(text: string): string {
  if (!text) return "";
  return text.replace(/^(?:\s*\[[^\]]+\]\s*)+/, "").trim();
}

/** Returns the body's parenthetical note (last (...) group) and the
 * category-only text (everything outside the trailing parens). */
export function splitCategoryNotes(body: string): { category: string; notes: string | null } {
  const trimmed = body.trim();
  if (!trimmed) return { category: "", notes: null };
  // Match the LAST parenthetical group at the end (allowing nested
  // characters except parens themselves).
  const m = trimmed.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
  if (m) return { category: m[1].trim(), notes: m[2].trim() };
  return { category: trimmed, notes: null };
}

/** Normalize a raw bracket value into either a Millstadt unit or a
 * mutual-aid agency. Returns the kind + canonical value. */
export function classifyBracket(raw: string): {
  kind: "millstadt" | "mutualAid" | "unknown";
  value: string;
} {
  if (!raw) return { kind: "unknown", value: raw };
  const norm = raw.trim();
  // Strip an optional leading "M" so we accept "[3935]" or "[M3935]".
  const digits = norm.replace(/^M/i, "").trim();
  if (/^\d{4}$/.test(digits)) {
    const canonical = `M${digits}` as string;
    if ((MILLSTADT_UNITS as readonly string[]).includes(canonical)) {
      return { kind: "millstadt", value: canonical };
    }
    return { kind: "unknown", value: canonical };
  }
  // Loose agency match — case-insensitive, allow trailing "EMS" toggle.
  const candidate = norm.replace(/^["']|["']$/g, "");
  const lc = candidate.toLowerCase();
  const matched = MUTUAL_AID_AGENCIES.find((a) => a.toLowerCase() === lc);
  if (matched) return { kind: "mutualAid", value: matched };
  // Try " EMS" suffix variations.
  for (const a of MUTUAL_AID_AGENCIES) {
    if (a.toLowerCase().replace(/ ems$/i, "") === lc.replace(/ ems$/i, "")) {
      return { kind: "mutualAid", value: a };
    }
  }
  return { kind: "unknown", value: candidate };
}

/** Detect HEMS hints in any free-text fragment. Very conservative —
 * only flags if the words actually appear. Returns null when nothing
 * is detected so backfill leaves the row as "unknown". */
export function detectHems(text: string): { requested: boolean; outcome: HemsOutcome | null } {
  const t = (text ?? "").toLowerCase();
  const requested = /\barch\s+requested\b|\bhems\b|\bhelicopter\b|\bair\s*evac\b|\barch\b/i.test(text ?? "");
  if (!requested) return { requested: false, outcome: null };
  if (/disregard|cancel|cancelled|stand[\s-]?down/i.test(t)) return { requested: true, outcome: "disregarded" };
  if (/handoff|hand[\s-]?off|transfer|patient\s+to/i.test(t)) return { requested: true, outcome: "handoff" };
  return { requested: true, outcome: null };
}

// ── Structured-record assembler ───────────────────────────────────────

export interface CallStructured {
  units: MillstadtUnit[];
  category: string;
  notes: string | null;
  mutualAidReceived: boolean;
  mutualAidReceivedAgency: MutualAidAgency | null;
  mutualAidGiven: boolean;
  hemsRequested: boolean;
  hemsOutcome: HemsOutcome | null;
}

/**
 * Build the canonical dispatch_nature string the ticker reads.
 *
 *   [M3935] Fall
 *   [M3926] [M3935] Accident w/ Injuries (Arch Requested)
 *   [Columbia EMS] Mutual Aid Received
 */
export function formatDispatchNature(input: CallStructured): string {
  const brackets: string[] = [];
  // Millstadt units first, deduped, in M-number order.
  const units = Array.from(new Set(input.units));
  units.sort();
  for (const u of units) brackets.push(`[${u}]`);
  // If outside agency came IN to help us, surface the agency tag too.
  if (input.mutualAidReceived && input.mutualAidReceivedAgency) {
    brackets.push(`[${input.mutualAidReceivedAgency}]`);
  }
  let prefix = brackets.join(" ");
  if (prefix) prefix += " ";
  const cat = (input.category || "").trim();
  const notes = (input.notes || "").trim();
  const body = notes ? `${cat} (${notes})` : cat;
  return `${prefix}${body}`.trim();
}

/**
 * Parse an existing dispatch_nature string into the structured shape.
 * Used by the backfill script — and as a runtime fallback when an
 * older row hasn't been re-saved through the structured editor yet.
 */
export function parseDispatchNature(text: string): CallStructured {
  const brackets = extractBrackets(text);
  const body = stripLeadingBrackets(text);
  const { category, notes } = splitCategoryNotes(body);

  const units: MillstadtUnit[] = [];
  let mutualAidReceivedAgency: MutualAidAgency | null = null;
  for (const b of brackets) {
    const c = classifyBracket(b);
    if (c.kind === "millstadt") {
      units.push(c.value as MillstadtUnit);
    } else if (c.kind === "mutualAid") {
      mutualAidReceivedAgency = c.value as MutualAidAgency;
    }
  }

  const fullText = `${category} ${notes ?? ""}`;
  const hems = detectHems(fullText);

  return {
    units: Array.from(new Set(units)),
    category,
    notes,
    mutualAidReceived: !!mutualAidReceivedAgency,
    mutualAidReceivedAgency,
    mutualAidGiven: false,           // can't reliably detect from text — admin tags in editor
    hemsRequested: hems.requested,
    hemsOutcome: hems.outcome,
  };
}

// ── Schema migration + categories table ────────────────────────────────

let schemaReady = false;

export async function ensureCadStructuredSchema(): Promise<void> {
  if (schemaReady) return;
  const db = sql();

  await db`ALTER TABLE cad_calls ADD COLUMN IF NOT EXISTS units                       JSONB`;
  await db`ALTER TABLE cad_calls ADD COLUMN IF NOT EXISTS category                    TEXT`;
  await db`ALTER TABLE cad_calls ADD COLUMN IF NOT EXISTS notes                       TEXT`;
  await db`ALTER TABLE cad_calls ADD COLUMN IF NOT EXISTS mutual_aid_received         BOOLEAN NOT NULL DEFAULT FALSE`;
  await db`ALTER TABLE cad_calls ADD COLUMN IF NOT EXISTS mutual_aid_received_agency  TEXT`;
  await db`ALTER TABLE cad_calls ADD COLUMN IF NOT EXISTS mutual_aid_given            BOOLEAN NOT NULL DEFAULT FALSE`;
  await db`ALTER TABLE cad_calls ADD COLUMN IF NOT EXISTS hems_requested              BOOLEAN NOT NULL DEFAULT FALSE`;
  await db`ALTER TABLE cad_calls ADD COLUMN IF NOT EXISTS hems_outcome                TEXT`;

  await db`CREATE INDEX IF NOT EXISTS cad_calls_category_idx ON cad_calls (category)`;
  await db`CREATE INDEX IF NOT EXISTS cad_calls_year_month_idx ON cad_calls (source_year, dispatch_datetime)`;

  await db`
    CREATE TABLE IF NOT EXISTS cad_categories (
      name        TEXT PRIMARY KEY,
      active      BOOLEAN NOT NULL DEFAULT TRUE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  schemaReady = true;
}

// ── Categories master list ────────────────────────────────────────────

export async function listCategories(includeInactive = false): Promise<string[]> {
  await ensureCadStructuredSchema();
  const db = sql();
  const rows = includeInactive
    ? (await db`SELECT name FROM cad_categories ORDER BY name`) as unknown as { name: string }[]
    : (await db`SELECT name FROM cad_categories WHERE active = TRUE ORDER BY name`) as unknown as { name: string }[];
  return rows.map((r) => r.name);
}

export async function addCategory(name: string): Promise<void> {
  await ensureCadStructuredSchema();
  const db = sql();
  const trimmed = name.trim();
  if (!trimmed) return;
  await db`
    INSERT INTO cad_categories (name) VALUES (${trimmed})
    ON CONFLICT (name) DO UPDATE SET active = TRUE
  `;
}

export async function deactivateCategory(name: string): Promise<void> {
  await ensureCadStructuredSchema();
  const db = sql();
  await db`UPDATE cad_categories SET active = FALSE WHERE name = ${name}`;
}

/**
 * Seed the cad_categories table from the distinct categories already
 * present in production. Safe to run repeatedly — it INSERT ... ON
 * CONFLICT DO NOTHINGs every row.
 */
export async function seedCategoriesFromExisting(): Promise<{ inserted: number; total: number }> {
  await ensureCadStructuredSchema();
  const db = sql();
  // Pull every dispatch_nature, parse, collect distinct non-empty
  // categories. We can't do this in pure SQL because the category
  // extraction lives in JS.
  const rows = (await db`SELECT dispatch_nature FROM cad_calls`) as unknown as { dispatch_nature: string }[];
  const seen = new Set<string>();
  for (const r of rows) {
    const cat = parseDispatchNature(r.dispatch_nature).category;
    if (cat) seen.add(cat);
  }
  let inserted = 0;
  for (const c of seen) {
    const res = (await db`
      INSERT INTO cad_categories (name) VALUES (${c})
      ON CONFLICT (name) DO NOTHING
      RETURNING name
    `) as unknown as { name: string }[];
    if (res.length) inserted++;
  }
  return { inserted, total: seen.size };
}

// ── Backfill (parse existing rows into structured columns) ────────────

export async function backfillStructuredFields(): Promise<{ updated: number; total: number }> {
  await ensureCadStructuredSchema();
  const db = sql();
  const rows = (await db`
    SELECT id, dispatch_nature
    FROM cad_calls
    WHERE category IS NULL OR units IS NULL
  `) as unknown as { id: string; dispatch_nature: string }[];
  let updated = 0;
  for (const r of rows) {
    const parsed = parseDispatchNature(r.dispatch_nature);
    await db`
      UPDATE cad_calls SET
        units                       = ${JSON.stringify(parsed.units)}::jsonb,
        category                    = ${parsed.category || null},
        notes                       = ${parsed.notes},
        mutual_aid_received         = ${parsed.mutualAidReceived},
        mutual_aid_received_agency  = ${parsed.mutualAidReceivedAgency},
        mutual_aid_given            = ${parsed.mutualAidGiven},
        hems_requested              = ${parsed.hemsRequested},
        hems_outcome                = ${parsed.hemsOutcome}
      WHERE id = ${r.id}
    `;
    updated++;
  }
  return { updated, total: rows.length };
}
