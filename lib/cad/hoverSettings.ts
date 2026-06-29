/**
 * Which fields are allowed to show in the PUBLIC call hover info box.
 * Dependency-free so it can be imported by client (ticker, admin form)
 * and server (APIs) alike. Admin toggles these; the ticker respects them.
 * Date/Units header and disclaimers always show — these gate the body rows.
 */

export interface HoverFieldSettings {
  closed: boolean;        // "Closed" time row
  totalTime: boolean;     // "Total time" row
  units: boolean;         // Units (EMS / PD / Fire)
  disposition: boolean;   // per-unit disposition appended to each EMS unit
  emsMutualAid: boolean;  // EMS Mutual Aid row
  complaint: boolean;     // Dispatch complaint (category)
  category: boolean;      // Classification (Medical/Trauma)
  notes: boolean;         // Notes row
}

export const DEFAULT_HOVER_SETTINGS: HoverFieldSettings = {
  closed: true,
  totalTime: true,
  units: true,
  disposition: true,
  emsMutualAid: true,
  complaint: true,
  category: true,
  notes: true,
};

/** Display order + labels for the admin toggle panel. */
export const HOVER_FIELDS: { key: keyof HoverFieldSettings; label: string }[] = [
  { key: "units",        label: "Units (EMS / PD / Fire)" },
  { key: "disposition",  label: "Unit disposition" },
  { key: "complaint",    label: "Dispatch complaint" },
  { key: "category",     label: "Category (Medical / Trauma)" },
  { key: "notes",        label: "Notes" },
  { key: "emsMutualAid", label: "EMS mutual aid" },
  { key: "closed",       label: "Closed time" },
  { key: "totalTime",    label: "Total call time" },
];

/** Coerce arbitrary input into a valid settings object (defaults for any
 * missing/invalid keys). */
export function normalizeHoverSettings(raw: unknown): HoverFieldSettings {
  const r = (raw && typeof raw === "object") ? (raw as Record<string, unknown>) : {};
  const out: HoverFieldSettings = { ...DEFAULT_HOVER_SETTINGS };
  (Object.keys(DEFAULT_HOVER_SETTINGS) as (keyof HoverFieldSettings)[]).forEach((k) => {
    if (typeof r[k] === "boolean") out[k] = r[k] as boolean;
  });
  return out;
}
