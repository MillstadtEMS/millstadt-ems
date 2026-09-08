export const EMPLOYMENT_TYPE_OPTIONS = [
  "Full-Time",
  "Part-Time",
  "PRN",
  "Volunteer",
] as const;

export const EMPLOYMENT_DAYS_AVAILABLE_OPTIONS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const EMPLOYMENT_HOURS_AVAILABLE_OPTIONS = [
  "Days (911) 0600 – 1800",
  "Nights (911) 1800 – 0600",
  "24-Hour (911) 0600 – 0600",
  "Transfer Truck (variable hours)",
  "Standby / Event Coverage",
  "On-Call",
  "Any / All shifts",
] as const;

export const EMPLOYMENT_CONSENT_OPTIONS = [
  "Background Check",
  "Drug Screening",
  "Driving Record Check",
] as const;

export function joinedCheckboxValueMaximum(options: readonly string[]) {
  return options.join(", ").length;
}
