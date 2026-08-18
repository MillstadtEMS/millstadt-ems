/**
 * Shared flag-for-review detection for employment applications.
 * Used by /api/apply (when generating the flag PDF on submit) AND
 * /admin/submissions/[id] (when displaying flags on the admin page).
 */

export type ApplicationFields = Record<string, string | string[]>;

function parseCerts(text: string): Record<string, { hasIt: boolean; raw: string }> {
  const map: Record<string, { hasIt: boolean; raw: string }> = {};
  if (!text) return map;
  for (const line of text.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx <= 0) continue;
    const name = line.substring(0, colonIdx).trim();
    const rest = line.substring(colonIdx + 1).trim();
    let hasIt = false;
    if (rest === "Completed") hasIt = true;
    else if (rest.match(/^NOT COMPLETED/i)) hasIt = false;
    else {
      const m = rest.match(/^#(\S+)/);
      if (m && m[1].length > 0) hasIt = true;
    }
    map[name] = { hasIt, raw: rest };
  }
  return map;
}

function asString(v: string | string[] | undefined): string {
  if (!v) return "";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

export function buildApplicationFlags(fields: ApplicationFields): string[] {
  const flags: string[] = [];
  const get = (key: string) => asString(fields[key]);

  // ── Eligibility / background concerns ──
  if (get("authorized_us") === "No") flags.push("NOT authorized to work in the United States");
  if (get("felony") === "Yes") flags.push("Reports a felony conviction");
  if (get("excluded_medicare") === "Yes") flags.push("Has been excluded from Medicare / Medicaid");
  if (get("license_suspended") === "Yes") flags.push("Has had a professional license suspended or revoked");

  // ── Consent checks ──
  const consents = get("consents").toLowerCase();
  if (!consents.includes("background check")) flags.push("Did NOT consent to Background Check");
  if (!consents.includes("drug screening")) flags.push("Did NOT consent to Drug Screening");
  if (!consents.includes("driving record check")) flags.push("Did NOT consent to Driving Record Check");

  // ── Driver's license info ──
  if (
    !get("dl_state").trim() &&
    !get("dl_number").trim() &&
    !get("dl_expiry").trim()
  ) {
    flags.push("Driver's License information NOT provided");
  }

  // ── Primary professional license info ──
  if (
    !get("primary_license_type").trim() &&
    !get("primary_license_number").trim()
  ) {
    flags.push("Primary professional license information NOT provided");
  }

  // ── Expired license / certification checks ──
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function isExpired(dateStr: string): boolean {
    if (!dateStr || !dateStr.trim()) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    return d < today;
  }

  if (isExpired(get("dl_expiry"))) {
    flags.push(`Driver's License is EXPIRED (${get("dl_expiry")})`);
  }
  if (isExpired(get("primary_license_expiry"))) {
    flags.push(`Primary professional license is EXPIRED (${get("primary_license_type") || "license"} — ${get("primary_license_expiry")})`);
  }
  if (isExpired(get("add_license_expiry"))) {
    flags.push(`Additional license is EXPIRED (${get("add_license_type") || "license"} — ${get("add_license_expiry")})`);
  }
  if (isExpired(get("nremt_expiry"))) {
    flags.push(`NREMT certification is EXPIRED (${get("nremt_expiry")})`);
  }
  // Each cert in additional_certs (BLS, ACLS, etc.)
  for (const line of get("additional_certs").split("\n")) {
    const m = line.match(/^([^:]+):\s*#[^\s]*\s*Exp:\s*(\S+)/);
    if (m) {
      const name = m[1].trim();
      const expDate = m[2].trim();
      if (isExpired(expDate)) {
        flags.push(`${name} certification is EXPIRED (${expDate})`);
      }
    }
  }

  // ── Required cert checks (position-aware) ──
  const position = get("position").toLowerCase();
  const isEMT = position.startsWith("emt");

  const certMap = parseCerts(get("additional_certs"));
  const required: string[] = isEMT
    ? ["BLS", "FEMA NIMS IS-100", "FEMA NIMS IS-200", "FEMA NIMS IS-700", "FEMA NIMS IS-800", "HazMat Awareness/Ops"]
    : ["BLS", "ACLS", "PALS", "ITLS / PHTLS", "FEMA NIMS IS-100", "FEMA NIMS IS-200", "FEMA NIMS IS-700", "FEMA NIMS IS-800", "HazMat Awareness/Ops"];

  // Only run cert-required checks if a position was specified
  if (position) {
    for (const cert of required) {
      if (!certMap[cert]?.hasIt) {
        flags.push(`Missing required certification: ${cert} (${isEMT ? "EMT" : "ALS"} applicant)`);
      }
    }
  }

  // ── Driving history concerns ──
  if (get("valid_dl") === "No") flags.push("Does NOT have a valid driver's license");
  if (get("accidents") === "Yes") flags.push("Reports accidents in the past 5 years");
  if (get("violations") === "Yes") flags.push("Reports traffic violations in the past 5 years");
  if (get("dl_suspension") === "Yes") flags.push("Reports license suspension in the past 5 years");

  return flags;
}
