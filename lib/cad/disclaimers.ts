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
  "This ticker was built in-house in spring 2026. Older calls are rebuilt from past dispatch records and may be missing " +
  "details like which units responded; newer calls are logged in full. All figures are unofficial and may change.";

/**
 * Short per-call notice for the hover info box.
 */
export const CALL_INFO_DISCLAIMER =
  "Details are kept as accurate as possible. Some calls may not reflect complete information due to limited dispatch data available at the time.";

/**
 * Per-unit disposition tracking start date. Statistics derived from
 * dispositions only count incidents from this date forward.
 */
export const DISPOSITION_DISCLAIMER =
  "Per-unit disposition tracking became available on June 28, 2026; disposition statistics reflect calls from that date forward only.";
