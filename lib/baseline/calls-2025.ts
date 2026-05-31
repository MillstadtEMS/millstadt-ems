/**
 * Previous-year baseline for the homepage call-volume comparison.
 *
 * Source of truth: monthly ESO "911 Call Volume" reports stored on
 * KJ's Desktop ("2025 Call reports" folder), Jan – Dec 2025. Numbers
 * below are transcribed straight from the "RECORDS" / monthly Total
 * tile on each report. Update this file every January when the new
 * full-year baseline is finalized.
 *
 * The compare panel in CallStatsExtras reads these values to render
 * the "Previous Year Actual vs Current Year Projected" rows. Nothing
 * touches the live ticker pipeline or the existing projection math.
 */

export const BASELINE_YEAR = 2025;

/** 12 monthly call totals, January (index 0) through December (index 11). */
export const CALLS_2025_MONTHLY: readonly number[] = [
  66, // January
  71, // February
  72, // March
  81, // April
  65, // May
  80, // June
  90, // July
  50, // August
  78, // September
  82, // October
  64, // November
  80, // December
];

/** Sum of all 12 months. Pre-computed so consumers don't have to re-add. */
export const CALLS_2025_ANNUAL: number = CALLS_2025_MONTHLY.reduce((a, b) => a + b, 0);

/** 879 / 365 ≈ 2.41 calls per day in 2025. */
export const CALLS_2025_AVG_PER_DAY: number = CALLS_2025_ANNUAL / 365;

/**
 * Percent change wrapper that matches the formula the user specified
 * in the spec — defends against zero / NaN / missing previous-year
 * values by returning "N/A" instead of crashing.
 */
export function formatPercentChange(previousYearActual: number, currentYearProjected: number): string {
  const previous = Number(previousYearActual);
  const projected = Number(currentYearProjected);
  if (!previous || Number.isNaN(previous) || Number.isNaN(projected)) return "N/A";
  const change = ((projected - previous) / previous) * 100;
  const sign = change > 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}%`;
}

/**
 * Signed numeric percent change. Returns null when the previous value
 * is zero / invalid so callers can decide how to render the missing
 * comparison (e.g. dim the row rather than print a bogus number).
 */
export function percentChange(previousYearActual: number, currentYearProjected: number): number | null {
  const previous = Number(previousYearActual);
  const projected = Number(currentYearProjected);
  if (!previous || Number.isNaN(previous) || Number.isNaN(projected)) return null;
  return ((projected - previous) / previous) * 100;
}
