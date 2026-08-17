import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const cwd = process.cwd();
let checks = 0;

async function source(relativePath) {
  return readFile(path.join(cwd, relativePath), "utf8");
}

async function exists(relativePath) {
  try {
    await access(path.join(cwd, relativePath));
    return true;
  } catch {
    return false;
  }
}

function pass(label) {
  checks += 1;
  process.stdout.write(`PASS ${label}\n`);
}

const contact = await source("app/api/contact/route.ts");
assert.match(contact, /hasValidCsrfToken/);
assert.match(contact, /checkRateLimit/);
assert.match(contact, /parsePublicFormSubmission/);
assert.match(contact, /hasContentType/);
assert.match(contact, /contentLengthWithin/);
pass("public form API enforces CSRF, durable throttling, schema validation, and bounded JSON");

const contactClient = await source("components/ContactFormWrapper.tsx");
assert.match(contactClient, /X-CSRF-Token/);
assert.match(contactClient, /fetch\("\/api\/contact", \{ cache: "no-store" \}\)/);
pass("public form client obtains and returns same-origin CSRF state");

const application = await source("app/api/apply/route.ts");
assert.match(application, /parseEmploymentApplication/);
assert.match(application, /hasValidCsrfToken/);
assert.match(application, /createFormSubmission/);
assert.doesNotMatch(application, /socialSecurity|immunization|driverLicenseNumber/);
const submissionStore = await source("lib/db.ts");
assert.match(submissionStore, /encrypted:\s*ENCRYPTED_FIELDS_VERSION/);
assert.match(submissionStore, /ciphertext:\s*encrypt\(JSON\.stringify\(fields\)\)/);
pass("employment submissions are strict, encrypted, CSRF-protected, and exclude retired identity uploads");

const applicationClient = await source("app/careers/apply/ApplicationForm.tsx");
assert.doesNotMatch(applicationClient, /name="(?:ssn|driverLicenseNumber|immunization)/i);
assert.match(applicationClient, /X-CSRF-Token/);
pass("employment form no longer asks the browser for SSN, license number, or immunization files");

const runNumber = await source("app/billing/run-number/page.tsx");
assert.doesNotMatch(runNumber, /<input|<textarea|<form/i);
assert.match(runNumber, /618\D+476\D+1201/);
pass("run-number page keeps patient identifiers out of the general website pipeline");

const formSchemas = await source("lib/security/public-form-schemas.ts");
assert.doesNotMatch(formSchemas, /Run Number Request/);
assert.match(formSchemas, /\.strict\(\)/);
pass("allowlisted public form schemas reject unknown fields and the retired run-number submission");

const incidentRoute = await source("app/api/lounge/incidents/route.ts");
const incidentPhoto = await source("app/api/lounge/incidents/photo/route.ts");
assert.doesNotMatch(incidentRoute, /access:\s*"public"|sendIncidentReportEmail/);
assert.doesNotMatch(incidentPhoto, /access:\s*"public"/);
assert.match(incidentRoute, /privateBlobReference/);
assert.match(incidentPhoto, /privateBlobReference/);
pass("new incident PDFs and photos are private and are not emailed");

const incidents = await source("lib/lounge/incidents.ts");
assert.match(incidents, /incident-aes-256-gcm-v1/);
assert.match(incidents, /incident-text-v1:/);
pass("new incident narratives and media metadata are encrypted at the application layer");

const employees = await source("lib/lounge/employees.ts");
for (const field of ["driver_license_num", "allergies", "medical_conditions", "blood_type"]) {
  assert.match(employees, new RegExp(field));
}
assert.match(employees, /employee-sensitive-v1:/);
pass("new employee medical and sensitive profile values use encrypted envelopes");

const profileChanges = await source("lib/lounge/profile-change-requests.ts");
assert.match(profileChanges, /profile-change-v1:/);
pass("new profile-change values, comments, and decision notes use encrypted envelopes");

const highRiskUploadRoutes = [
  "app/api/admin/personnel-records/[id]/attachments/route.ts",
  "app/api/admin/employees/[id]/files/route.ts",
  "app/api/admin/employees/[id]/certs/route.ts",
  "app/api/lounge/certs/route.ts",
  "app/api/lounge/profile-change-requests/route.ts",
  "app/api/admin/onboarding/records/[id]/upload/route.ts",
  "app/api/admin/onboarding/records/[id]/finalize/route.ts",
  "app/api/admin/forms/[id]/finalize/route.ts",
  "app/api/admin/writeups/[id]/finalize/route.ts",
  "app/api/lounge/acks/[id]/ack/route.ts",
];
for (const route of highRiskUploadRoutes) {
  const text = await source(route);
  assert.doesNotMatch(text, /access:\s*["']public["']/);
  assert.match(text, /access:\s*["']private["']/);
  assert.match(text, /privateBlobReference/);
}
pass("new HR, certification, onboarding, form, write-up, and acknowledgment files use private blobs");

const uploadInspection = await source("lib/security/upload-inspection.ts");
assert.match(uploadInspection, /%PDF-/);
assert.match(uploadInspection, /0x89, 0x50, 0x4e, 0x47/);
assert.match(uploadInspection, /0xd0, 0xcf, 0x11, 0xe0/);
for (const route of highRiskUploadRoutes.slice(0, 7).filter((route) => !route.includes("finalize"))) {
  assert.match(await source(route), /inspectUploadedFile/);
}
pass("user-supplied private documents are checked by byte signature, not extension alone");

const privateFiles = await source("app/api/lounge/files/route.ts");
assert.match(privateFiles, /currentEmployee/);
assert.match(privateFiles, /visibility_level = 'employee'/);
assert.match(privateFiles, /employee_visible = TRUE/);
assert.match(privateFiles, /status <> 'archived'/);
assert.match(privateFiles, /recordSecurityAudit/);
assert.match(privateFiles, /Cache-Control.*no-store, private/s);
pass("private Lounge file reads enforce identity, visibility, lifecycle, audit, and no-store controls");

const adminAuth = await source("lib/admin/auth.ts");
const adminLogin = await source("app/api/admin/login/route.ts");
assert.doesNotMatch(adminAuth, /ADMIN_PASSWORD|mas_admin/);
assert.match(adminAuth, /currentEmployee/);
assert.match(adminLogin, /status:\s*404/);
pass("legacy shared administrator authentication is retired");

const loungeAuth = await source("lib/lounge/auth.ts");
assert.match(loungeAuth, /timingSafeEqual/);
assert.match(loungeAuth, /LOUNGE_SESSION_SECRET/);
assert.match(loungeAuth, /const MAX_AGE = 60 \* 15/);
assert.match(loungeAuth, /maxAge:\s*MAX_AGE/);
pass("Lounge sessions use dedicated signing material, constant-time verification, and short expiry");

const loungeEmployees = await source("lib/lounge/employees.ts");
const loungePasswordChange = await source("app/api/lounge/change-password/route.ts");
assert.match(loungeEmployees, /defaultInitialPassword\(username: string\)/);
assert.match(loungeEmployees, /return username\.trim\(\)\.toLowerCase\(\)/);
assert.doesNotMatch(loungeEmployees, /initialPassword\?:/);
assert.match(loungePasswordChange, /permanentPasswordError/);
assert.match(loungePasswordChange, /expirationScheduled: false/);
assert.match(loungePasswordChange, /updatePassword\(emp\.id, emp\.passwordHash, newPassword\)/);
pass("Lounge bootstrap passwords consistently use username once and permanent passwords do not receive scheduled expiration");

const loungeLogin = await source("app/api/lounge/login/route.ts");
const boardLogin = await source("app/api/board/login/route.ts");
assert.match(loungeLogin, /checkRateLimit/);
assert.match(boardLogin, /checkRateLimit/);
assert.doesNotMatch(loungeLogin, /95723935/);
pass("Lounge and Board login handlers use durable throttling without the retired development PIN");

const loungeLoginPage = await source("app/lounge/login/page.tsx");
const devToolsPage = await source("app/admin/dev-tools/page.tsx");
const environmentDocs = await source("ENVIRONMENT_VARIABLES.md");
assert.equal(await exists("app/api/lounge/dev-login/route.ts"), false);
assert.doesNotMatch(loungeLoginPage, /DevShortcut|LOUNGE_DEV_LOGIN|\/api\/lounge\/dev-login/);
assert.doesNotMatch(devToolsPage, /LOUNGE_DEV_LOGIN|dev-login PIN|Dev Shortcut/);
assert.doesNotMatch(environmentDocs, /LOUNGE_DEV_LOGIN/);
pass("development PIN route, UI, and environment switches are removed");

const webauthn = await source("lib/lounge/webauthn.ts");
const passkeyStart = await source("app/api/lounge/webauthn/assert-start/route.ts");
const passkeyFinish = await source("app/api/lounge/webauthn/assert-finish/route.ts");
assert.match(webauthn, /residentKey: "required"/);
assert.match(webauthn, /requireResidentKey: true/);
assert.match(webauthn, /popped\.employeeId !== row\.employee_id/);
assert.match(passkeyStart, /findEmployeeByUsername/);
assert.match(passkeyFinish, /emp\.mustChangePassword/);
assert.match(loungeLoginPage, /username: username\.trim\(\) \|\| undefined/);
pass("passkeys use discoverable credentials, bind username hints to the credential owner, and cannot bypass a forced first-login password change");

const trustedDevices = await source("lib/lounge/trusted-devices.ts");
assert.match(trustedDevices, /TRUST_TTL_DAYS = 30/);
assert.doesNotMatch(trustedDevices, /TRUST_TTL_DAYS = 365/);
assert.match(trustedDevices, /rotateTrustedDevice/);
assert.match(loungeLogin, /rotateTrustedDevice/);
pass("trusted-device bypass is limited to 30 days and rotates after use");

const boardAuth = await source("lib/board/auth.ts");
assert.match(boardAuth, /BOARD_SESSION_SECRET/);
assert.doesNotMatch(boardAuth, /DATABASE_URL.*\?\?/s);
pass("Board session signing no longer falls back to a database URL");

const proxy = await source("proxy.ts");
assert.match(proxy, /Content-Security-Policy/);
assert.match(proxy, /X-Robots-Tag/);
assert.match(proxy, /verifySessionToken/);
assert.match(proxy, /\/api\/admin\/calls/);
assert.match(proxy, /\/api\/admin\/cad-poll/);
pass("global headers and named admin checks preserve explicit ticker-editor route exceptions");

const nextConfig = await source("next.config.ts");
assert.match(nextConfig, /poweredByHeader:\s*false/);
assert.match(nextConfig, /Strict-Transport-Security/);
pass("framework disclosure is disabled and HSTS remains configured");

const layout = await source("app/layout.tsx");
const ticker = await source("components/cad/CallTicker.tsx");
const nav = await source("components/Nav.tsx");
const cad = await source("app/api/cad/latest/route.ts");
assert.match(layout, /CallTicker/);
assert.match(ticker, /\/api\/cad\/latest/);
assert.match(ticker, /onMouseLeave=\{closeInfo\}/);
assert.match(ticker, /usePathname/);
assert.match(ticker, /setExpanded\(false\)/);
assert.match(nav, /useState<string \| null>/);
assert.match(nav, /current === group\.heading \? null : group\.heading/);
assert.match(cad, /export async function GET/);
pass("site shell preserves the ticker, clears transient call details, and allows mobile menu groups to collapse");

const dependencies = JSON.parse(await source("package.json"));
assert.equal(dependencies.dependencies["pdfjs-dist"], "5.5.207");
assert.ok(dependencies.dependencies.zod);
assert.equal(dependencies.scripts["test:security"], "node scripts/test-security-hardening.mjs");
assert.equal(dependencies.scripts["lounge:initialize-passwords"], "node scripts/initialize-lounge-passwords.mjs");
const dependabot = await source(".github/dependabot.yml");
assert.match(dependabot, /package-ecosystem: npm/);
assert.match(dependabot, /dependency-name: pdfjs-dist/);
pass("dependency scanning is automated and the reviewed PDF engine is pinned");

process.stdout.write(`\n${checks} security hardening checks passed.\n`);
