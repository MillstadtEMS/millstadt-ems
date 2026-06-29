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
  "This dispatch ticker and the statistics derived from it were developed in-house and are provided strictly for general " +
  "informational purposes. They do not constitute an official record of any incident, dispatch, response, patient encounter, " +
  "or outcome, and may not be relied upon for any legal, medical, insurance, billing, investigative, or emergency purpose. " +
  "All entries originate from computer-aided dispatch data and may be edited, summarized, delayed, incomplete, or inaccurate " +
  "as to any detail — including, without limitation, the responding unit(s), nature or complaint, category, location, times, " +
  "and disposition — regardless of the date of the incident; entries predating the platform's spring 2026 launch are " +
  "reconstructed from prior records and may be further limited. All information is unofficial and is subject to correction, " +
  "revision, or removal at any time without notice. Millstadt EMS makes no representation or warranty, express or implied, as " +
  "to the accuracy, completeness, timeliness, or reliability of any information shown, and, to the fullest extent permitted by " +
  "law, disclaims all liability for any loss or damage arising from its use or from reliance upon it. In an emergency, call 911.";

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
