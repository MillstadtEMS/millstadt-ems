import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(process.cwd());
const fixture = mkdtempSync(join(tmpdir(), "millstadt-public-form-guard-"));
const protectedFiles = [
  ".github/workflows/protected-public-forms.yml",
  "app/api/apply/route.ts",
  "app/api/contact/route.ts",
  "app/api/form-security/route.ts",
  "app/careers/apply/ApplicationForm.tsx",
  "app/admin/submissions/[id]/page.tsx",
  "app/forms/education-request/page.tsx",
  "app/forms/equipment-request/page.tsx",
  "app/forms/event-request/page.tsx",
  "app/forms/ride-along/page.tsx",
  "app/forms/birthday/BirthdayClient.tsx",
  "app/forms/birthday-station/BirthdayStationClient.tsx",
  "app/forms/employment/page.tsx",
  "app/globals.css",
  "app/testimonials/actions.ts",
  "app/testimonials/SubmitForm.tsx",
  "components/ContactFormWrapper.tsx",
  "components/PublicFormSecurityCheck.tsx",
  "components/forms/SubmissionFailureFallback.tsx",
  "lib/security/http.ts",
  "lib/public-form-client.ts",
  "lib/employment-application-options.ts",
  "lib/security/public-form-schemas.ts",
  "lib/security/employment-application-schema.ts",
  "lib/security/form-validation-messages.ts",
  "scripts/protect-public-form-contract.mjs",
];

function copyFixture() {
  for (const path of protectedFiles) {
    const destination = join(fixture, path);
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(join(root, path), destination);
  }
}

function guardStatus() {
  return spawnSync(
    process.execPath,
    [join(fixture, "scripts/protect-public-form-contract.mjs"), fixture],
    { encoding: "utf8" },
  );
}

const mutations = [
  {
    name: "broken contact handler path",
    path: "components/ContactFormWrapper.tsx",
    from: 'endpoint: "/api/contact"',
    to: 'endpoint: "/api/contact-broken"',
  },
  {
    name: "removed employment no-lockout protection",
    path: "app/api/apply/route.ts",
    from: "export async function POST(req: NextRequest) {",
    to: "export async function POST(req: NextRequest) {\n  void checkRateLimit;",
  },
  {
    name: "restored short employment rate limiting",
    path: "app/api/contact/route.ts",
    from: 'if (formType !== "Employment Application") {',
    to: "if (true) {",
  },
  {
    name: "restored undersized hours-available limit",
    path: "lib/security/employment-application-schema.ts",
    from: "hours_available: text(joinedCheckboxValueMaximum(EMPLOYMENT_HOURS_AVAILABLE_OPTIONS))",
    to: "hours_available: text(120)",
  },
  {
    name: "removed drawn signature from employment PDF",
    path: "app/admin/submissions/[id]/page.tsx",
    from: '<img class="signature-image"',
    to: '<div class="signature-value"',
  },
  {
    name: "removed first-party checkbox",
    path: "components/PublicFormSecurityCheck.tsx",
    from: 'type="checkbox"',
    to: 'type="text"',
  },
  {
    name: "weakened server token comparison",
    path: "lib/security/http.ts",
    from: "timingSafeEqual(cookieBytes, submittedBytes)",
    to: "cookieToken === submittedToken",
  },
  {
    name: "generic missing-field message",
    path: "lib/security/form-validation-messages.ts",
    from: 'return `Please complete “${label}”.`',
    to: 'return "Please complete the form."',
  },
  {
    name: "removed failed-submission download",
    path: "components/forms/SubmissionFailureFallback.tsx",
    from: "new Blob",
    to: "Blob",
  },
  {
    name: "restored oversized Lounge hover",
    path: "app/globals.css",
    from: ".lounge-hover-expand {",
    to: ".lounge-hover-expand:hover { transform: scale(4); }\n.lounge-hover-expand {",
  },
];

try {
  copyFixture();
  const baseline = guardStatus();
  if (baseline.status !== 0) {
    throw new Error(`Guard fixture did not pass its baseline:\n${baseline.stderr || baseline.stdout}`);
  }

  for (const mutation of mutations) {
    const path = join(fixture, mutation.path);
    const original = readFileSync(path, "utf8");
    if (!original.includes(mutation.from)) {
      throw new Error(`Mutation sentinel is missing for ${mutation.name}`);
    }
    writeFileSync(path, original.replace(mutation.from, mutation.to));
    const result = guardStatus();
    writeFileSync(path, original);
    if (result.status === 0) {
      throw new Error(`Guard did not reject: ${mutation.name}`);
    }
  }

  console.log(`Protected public-form guard rejected ${mutations.length} representative regressions.`);

  // Prove the ticker-style fingerprints catch edits outside text sentinels.
  const manifest = JSON.parse(readFileSync(join(root, "scripts/public-form-protected-files.json"), "utf8"));
  for (const path of [...Object.keys(manifest.files), "scripts/public-form-protected-files.json"]) {
    mkdirSync(dirname(join(fixture, path)), { recursive: true });
    cpSync(join(root, path), join(fixture, path));
  }
  const fingerprintStatus = () => spawnSync(process.execPath,
    [join(fixture, "scripts/protect-public-form-files.mjs"), fixture], { encoding: "utf8" });
  if (fingerprintStatus().status !== 0) throw new Error("Fingerprint baseline did not pass");
  const client = join(fixture, "lib/public-form-client.ts");
  writeFileSync(client, readFileSync(client, "utf8") + "\n// Unreviewed form change\n");
  if (fingerprintStatus().status === 0) throw new Error("Fingerprints allowed an unreviewed form change");
  console.log("Public-form fingerprints rejected an unreviewed change.");
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
