/**
 * Build readable, filesystem-safe PDF filenames for every report we send.
 *
 * The output is plain ASCII so Gmail mobile, Safari downloads, and
 * Windows Explorer all show the same name without escaping.
 *
 * Example:
 *   buildReportFilename({ type: "Incident Report", unit: "m3926", date: "2026-05-29" })
 *   → "Millstadt_EMS_Incident_Report_m3926_2026-05-29.pdf"
 */

const SMART_DASH_RE = /[–—−]/g;
const SMART_QUOTE_RE = /[‘’“”]/g;

export function safeFilenameToken(s: string): string {
  return s
    .replace(SMART_DASH_RE, "-")
    .replace(SMART_QUOTE_RE, "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")  // strip combining marks
    .replace(/[^A-Za-z0-9._-]+/g, "_") // anything else → underscore
    .replace(/_+/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "");
}

export function buildReportFilename(parts: {
  /** e.g. "Incident Report", "Memorandum", "Truck Check". */
  type: string;
  unit?: string | null;
  /** YYYY-MM-DD. */
  date?: string | null;
  /** Optional extra qualifier (e.g. report id slug). */
  extra?: string | null;
  /** Defaults to ".pdf". */
  ext?: string;
}): string {
  const segs: string[] = ["Millstadt_EMS", safeFilenameToken(parts.type)];
  if (parts.unit) segs.push(safeFilenameToken(parts.unit));
  if (parts.date) segs.push(safeFilenameToken(parts.date));
  if (parts.extra) segs.push(safeFilenameToken(parts.extra));
  const stem = segs.filter(Boolean).join("_");
  const ext = (parts.ext ?? ".pdf").replace(/^\.?/, ".");
  return stem + ext;
}
