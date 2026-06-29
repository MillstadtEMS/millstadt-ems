/**
 * Canonical disclaimer copy for the call ticker + statistics surfaces.
 *
 * Dependency-free so it can be imported by client and server components
 * alike. Keep the wording here and reference it everywhere a call/stats
 * disclaimer is shown so the language stays consistent.
 */

/**
 * Platform-origin notice. The ticker + stats engine was built in-house in
 * the spring of 2026, so historical incidents are reconstructed from prior
 * dispatch records and may be incomplete (especially responding-unit
 * detail), while data captured going forward is structured and complete.
 * Worded to be accurate, concise, and limit liability.
 */
export const PLATFORM_ORIGIN_DISCLAIMER =
  "Unofficial CAD-derived informational summary only. Not an official record and not for legal, medical, insurance, billing, " +
  "investigative, emergency, or other official use. Entries and statistics may be edited, delayed, incomplete, inaccurate, " +
  "corrected, revised, or removed without notice. Pre–spring 2026 entries were reconstructed from prior records. Millstadt EMS " +
  "makes no warranty and disclaims liability for reliance on this information. In an emergency, call 911.";

/**
 * Short per-call notice for the hover info box. Attorney-style and
 * comprehensive despite its length: the entry is unofficial, may be edited
 * or incomplete, and may not be relied upon for any consequential purpose.
 */
export const CALL_INFO_DISCLAIMER =
  "This entry is unofficial and provided for general information only. It is derived from dispatch data, may be edited or " +
  "summarized, and may be incomplete, delayed, or inaccurate as to any detail. It is not an official record and may not be " +
  "relied upon for any legal, medical, insurance, or emergency purpose. Subject to change or correction without notice.";

/**
 * Per-unit disposition tracking start date. Statistics derived from
 * dispositions only count incidents from this date forward.
 */
export const DISPOSITION_DISCLAIMER =
  "Per-unit disposition tracking became available on June 28, 2026; disposition statistics reflect calls from that date forward only.";
