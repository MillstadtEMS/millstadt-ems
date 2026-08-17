import { z } from "zod";

const text = (maximum = 240) => z.string().trim().max(maximum).optional().default("");
const required = (maximum = 240) => z.string().trim().min(1).max(maximum);
const date = z.string().trim().regex(/^$|^\d{4}-\d{2}-\d{2}$/).optional().default("");
const email = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const phone = z.string().trim().min(7).max(24).regex(/^[0-9+().\-\s]+$/);

const schema = z.object({
  position: required(160),
  employment_type: required(80),
  days_available: text(200),
  hours_available: text(120),
  preferred_shift: text(120),
  first_name: required(80),
  middle_name: text(80),
  last_name: required(80),
  dob: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  phone,
  email,
  address: text(240),
  city_state_zip: text(160),
  dl_state: text(2),
  dl_expiry: date,
  authorized_us: required(40),
  felony: required(40),
  excluded_medicare: required(40),
  license_suspended: required(40),
  background_explain: text(4_000),
  consents: text(1_000),
  hs_name: text(160),
  hs_grad: z.string().trim().regex(/^$|^\d{4}$/).optional().default(""),
  college_education: text(8_000),
  primary_license_type: text(120),
  primary_license_state: text(40),
  primary_license_number: text(120),
  primary_license_expiry: date,
  add_license_type: text(120),
  add_license_state: text(40),
  add_license_number: text(120),
  add_license_expiry: date,
  nremt_level: text(80),
  nremt_number: text(120),
  nremt_expiry: date,
  dea_number: text(120),
  dea_expiry: date,
  additional_certs: text(12_000),
  work_history: text(20_000),
  years_ems: text(8),
  years_als: text(8),
  years_cc: text(8),
  valid_dl: required(40),
  cdl: text(40),
  accidents: text(40),
  violations: text(40),
  dl_suspension: text(40),
  driving_explain: text(4_000),
  availability: text(500),
  references: text(8_000),
  why_millstadt: text(4_000),
  five_year_goals: text(4_000),
  certified: required(120),
  signature_data_url: required(750_000),
  applicant_signed_at: text(120),
}).strict();

export type EmploymentApplicationFields = z.infer<typeof schema>;

export function parseEmploymentApplication(input: Record<string, string>) {
  const result = schema.safeParse(input);
  if (!result.success) {
    return { ok: false as const, error: "Check the required application fields and try again." };
  }
  const signature = validatePngDataUrl(result.data.signature_data_url);
  if (!signature) return { ok: false as const, error: "Please provide a valid signature." };
  return {
    ok: true as const,
    fields: {
      ...result.data,
      signature_data_url: signature,
      applicant_signed_at: new Date().toISOString(),
    },
  };
}

function validatePngDataUrl(value: string) {
  const prefix = "data:image/png;base64,";
  if (!value.startsWith(prefix)) return null;
  try {
    const bytes = Buffer.from(value.slice(prefix.length), "base64");
    if (bytes.length < 32 || bytes.length > 512 * 1024) return null;
    const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (!bytes.subarray(0, pngMagic.length).equals(pngMagic)) return null;
    return `${prefix}${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}
