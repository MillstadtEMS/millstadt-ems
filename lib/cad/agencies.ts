/**
 * Responding-agency catalogs for the call ticker.
 *
 * IMPORTANT: this module is intentionally dependency-free (no server-only
 * imports such as @/lib/neon) so it can be imported from BOTH client
 * components (StructuredCallForm, CallTicker) and server routes without
 * dragging the database layer into the browser bundle.
 *
 * These agencies are captured for the per-call hover info box ONLY. They
 * are never written into the scrolling dispatch_nature text — that text is
 * still produced solely by formatDispatchNature() in lib/cad/structured.ts.
 */

// ── Fire districts (multi-select) ──────────────────────────────────────
export const FIRE_DISTRICTS = [
  "Millstadt Fire District",
  "Smithton Fire District",
  "Columbia Fire District",
  "Waterloo Fire District",
  "Dupo Fire District",
  "Hecker Fire District",
  "Belleville Fire District",
  "Northwest Fire District",
  "Villa Hills Fire District",
  "Cahokia Heights Fire District",
  "Signal Hill Fire District",
] as const;
export type FireDistrict = (typeof FIRE_DISTRICTS)[number];

/** The home department auto-included when "Fire responded" is toggled on
 * but no specific districts were picked. */
export const DEFAULT_FIRE_DISTRICT: FireDistrict = "Millstadt Fire District";

// ── Police / law-enforcement agencies (multi-select) ───────────────────
export const POLICE_AGENCIES = [
  "Millstadt Police",
  "Smithton Police",
  "Columbia Police",
  "Monroe County Sheriffs",
  "St. Clair County Sheriffs",
  "Cahokia Heights Police",
  "Belleville Police",
  "Illinois State Police",
  "FBI",
  "DEA",
  "Secret Service",
  "ILEAS SWAT Team",
] as const;
export type PoliceAgency = (typeof POLICE_AGENCIES)[number];

/** The home agency auto-included when "PD responded" is toggled on but no
 * specific agencies were picked. */
export const DEFAULT_POLICE_AGENCY: PoliceAgency = "Millstadt Police";

// ── Per-unit disposition (one per responding Millstadt unit) ───────────
export const UNIT_DISPOSITIONS = [
  "Transport",
  "Refusal",
  "Disregarded prior to arrival",
  "Disregarded on scene",
  "Support Only",
] as const;
export type UnitDisposition = (typeof UNIT_DISPOSITIONS)[number];

/** Clamp a {unit: disposition} map to known units + known dispositions. */
export function clampUnitDispositions(input: unknown, allowedUnits: readonly string[]): Record<string, string> {
  if (!input || typeof input !== "object") return {};
  const allowedD = new Set<string>(UNIT_DISPOSITIONS as readonly string[]);
  const allowedU = new Set<string>(allowedUnits);
  const out: Record<string, string> = {};
  for (const [unit, dispo] of Object.entries(input as Record<string, unknown>)) {
    if (allowedU.has(unit) && typeof dispo === "string" && allowedD.has(dispo)) out[unit] = dispo;
  }
  return out;
}

// ── Clamping helpers (used by the write APIs) ──────────────────────────
// The canonical lists above are the quick-pick chips, but the editor lets
// staff add custom departments, so we accept any sanitized string rather
// than restricting to the list. (These are display-only on the hover box.)
function sanitizeAgencies(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const a of input) {
    if (typeof a !== "string") continue;
    const v = a.replace(/\s+/g, " ").trim().slice(0, 60);
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
    if (out.length >= 25) break;
  }
  return out;
}

export function clampFireAgencies(input: unknown): string[] {
  return sanitizeAgencies(input);
}

export function clampPoliceAgencies(input: unknown): string[] {
  return sanitizeAgencies(input);
}
