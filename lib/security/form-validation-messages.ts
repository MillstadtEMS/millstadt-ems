import type { ZodError } from "zod";

const FIELD_LABELS: Record<string, string> = {
  position: "Position",
  employment_type: "Employment type",
  first_name: "First name",
  middle_name: "Middle name",
  last_name: "Last name",
  phone: "Phone number",
  email: "Email address",
  dob: "Date of birth",
  organization: "Organization or school",
  program: "Type of program",
  audience: "Audience",
  preferred_date: "Preferred date",
  preferred_time: "Preferred time",
  class_size: "Expected class size",
  age_range: "Age range",
  location: "Location or address",
  details: "Additional details",
  acknowledgment: "Acknowledgment checkbox",
  item: "Item requested",
  purpose: "Purpose",
  date_needed: "Date needed",
  return_date: "Return date",
  quantity: "Quantity",
  event_type: "Type of event",
  event_date: "Event date",
  event_time: "Event time",
  attendance: "Expected attendance",
  school: "School or organization",
  hours: "Hours needed",
  notes: "Additional information",
  child_name: "Birthday child's name",
  age: "Age",
  party_date: "Party date",
  party_time: "Party time",
  address: "Address",
  num_kids: "Number of children",
  num_guests: "Number of guests",
  availability: "Availability",
  authorized_us: "Authorization to work in the United States",
  felony: "Felony history question",
  excluded_medicare: "Medicare or Medicaid exclusion question",
  license_suspended: "Professional license suspension question",
  valid_dl: "Valid driver's license question",
  certified: "Certification checkbox",
  signature_data_url: "Signature",
};

const DATE_FIELDS = new Set([
  "dob",
  "preferred_date",
  "date_needed",
  "return_date",
  "event_date",
  "party_date",
  "il_license_expiry",
  "bls_expiry",
  "acls_expiry",
  "itls_expiry",
  "pals_expiry",
  "dl_expiry",
  "primary_license_expiry",
  "add_license_expiry",
  "nremt_expiry",
]);

const NUMBER_FIELDS = new Set([
  "class_size",
  "quantity",
  "attendance",
  "hours",
  "age",
  "num_kids",
  "num_guests",
  "years_experience",
]);

export function formFieldLabel(fieldName: string) {
  return FIELD_LABELS[fieldName]
    ?? fieldName.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formValidationMessage(error: ZodError) {
  const issue = error.issues[0];
  if (!issue) return "Check the form fields and try again.";

  const fieldName = typeof issue.path[0] === "string" ? issue.path[0] : "form field";
  const label = formFieldLabel(fieldName);
  const minimum = "minimum" in issue ? Number(issue.minimum) : Number.NaN;
  const missing = issue.code === "invalid_type" || (issue.code === "too_small" && minimum === 1);

  if (missing) return `Please complete “${label}”.`;
  if (fieldName === "email") return "Enter a valid email address.";
  if (fieldName === "phone") return "Enter a valid phone number.";
  if (DATE_FIELDS.has(fieldName)) return `Enter a valid date for “${label}”.`;
  if (NUMBER_FIELDS.has(fieldName)) return `Enter a valid number for “${label}”.`;
  return `Please check “${label}” and try again.`;
}
