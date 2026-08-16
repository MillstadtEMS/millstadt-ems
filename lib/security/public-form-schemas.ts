import { z } from "zod";

const requiredText = (maximum = 160) => z.string().trim().min(1).max(maximum);
const optionalText = (maximum = 500) => z.string().trim().max(maximum).optional().default("");
const email = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const phone = z.string().trim().min(7).max(24).regex(/^[0-9+().\-\s]+$/);
const optionalDate = z.string().trim().regex(/^$|^\d{4}-\d{2}-\d{2}$/).optional().default("");
const requiredDate = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/);
const optionalNumber = z.string().trim().regex(/^$|^\d{1,6}$/).optional().default("");

const requester = {
  first_name: requiredText(80),
  last_name: requiredText(80),
  phone,
  email,
};

const schemas = {
  "Education Request": z.object({
    ...requester,
    organization: optionalText(160),
    program: requiredText(160),
    audience: requiredText(160),
    preferred_date: optionalDate,
    preferred_time: optionalText(40),
    class_size: optionalNumber,
    age_range: optionalText(80),
    location: optionalText(240),
    details: optionalText(4_000),
    acknowledgment: requiredText(200),
  }).strict(),
  "Equipment Request": z.object({
    ...requester,
    organization: optionalText(160),
    item: requiredText(200),
    purpose: requiredText(500),
    date_needed: optionalDate,
    return_date: optionalDate,
    quantity: optionalNumber,
    location: optionalText(240),
    details: optionalText(4_000),
    acknowledgment: requiredText(200),
  }).strict(),
  "Event Appearance Request": z.object({
    ...requester,
    organization: optionalText(160),
    event_type: requiredText(160),
    event_date: requiredDate,
    event_time: optionalText(40),
    location: requiredText(240),
    attendance: optionalNumber,
    details: optionalText(4_000),
    acknowledgment: requiredText(200),
  }).strict(),
  "Ride Along Request": z.object({
    ...requester,
    dob: requiredDate,
    school: optionalText(160),
    purpose: requiredText(200),
    preferred_date: optionalDate,
    hours: optionalNumber,
    notes: optionalText(4_000),
  }).strict(),
  "Birthday Party Appearance Request": z.object({
    ...requester,
    child_name: requiredText(80),
    age: optionalNumber,
    party_date: requiredDate,
    party_time: optionalText(40),
    address: requiredText(240),
    num_kids: optionalNumber,
    notes: optionalText(2_000),
  }).strict(),
  "Birthday Party at Station Request": z.object({
    ...requester,
    child_name: requiredText(80),
    age: optionalNumber,
    party_date: requiredDate,
    party_time: optionalText(40),
    num_guests: optionalNumber,
    notes: optionalText(2_000),
  }).strict(),
  "Employment Application": z.object({
    ...requester,
    address: optionalText(240),
    position: requiredText(160),
    il_license: optionalText(80),
    il_license_expiry: optionalDate,
    bls_expiry: optionalDate,
    acls_expiry: optionalDate,
    itls_expiry: optionalDate,
    pals_expiry: optionalDate,
    certification: optionalText(160),
    years_experience: optionalNumber,
    notes: optionalText(4_000),
    availability: z.union([
      requiredText(80),
      z.array(requiredText(80)).min(1).max(12),
    ]).optional().default([]),
  }).strict(),
} satisfies Record<string, z.ZodType>;

export type PublicFormFields = Record<string, string | string[]>;

export type PublicFormParseResult =
  | { ok: true; formType: keyof typeof schemas; fields: PublicFormFields }
  | { ok: false; error: string };

export function parsePublicFormSubmission(input: unknown): PublicFormParseResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Invalid form submission." };
  }
  const body = input as Record<string, unknown>;
  const formType = typeof body.formType === "string" ? body.formType.trim() : "";
  if (!(formType in schemas)) return { ok: false, error: "Unknown form type." };

  const { formType: _discard, ...rawFields } = body;
  void _discard;
  const result = schemas[formType as keyof typeof schemas].safeParse(rawFields);
  if (!result.success) return { ok: false, error: "Check the required fields and try again." };

  const fields = Object.fromEntries(
    Object.entries(result.data as Record<string, unknown>).filter(([, value]) => value !== undefined),
  ) as PublicFormFields;
  return { ok: true, formType: formType as keyof typeof schemas, fields };
}

export const PUBLIC_FORM_TYPES = Object.freeze(Object.keys(schemas));
