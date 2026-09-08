import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.argv[2] ?? process.cwd());
const failures = [];
let checks = 0;

function source(path) {
  try {
    return readFileSync(resolve(root, path), "utf8");
  } catch (error) {
    failures.push(`${path}: could not be read (${error instanceof Error ? error.message : "unknown error"})`);
    return "";
  }
}

function requireText(path, text, reason) {
  checks += 1;
  if (!source(path).includes(text)) failures.push(`${path}: ${reason}`);
}

function forbidText(path, text, reason) {
  checks += 1;
  if (source(path).includes(text)) failures.push(`${path}: ${reason}`);
}

function requireCount(path, text, expected, reason) {
  checks += 1;
  const count = source(path).split(text).length - 1;
  if (count !== expected) failures.push(`${path}: ${reason} (expected ${expected}, found ${count})`);
}

function requireOrder(path, first, second, reason) {
  checks += 1;
  const contents = source(path);
  const firstIndex = contents.indexOf(first);
  const secondIndex = contents.indexOf(second);
  if (firstIndex < 0 || secondIndex < 0 || firstIndex >= secondIndex) failures.push(`${path}: ${reason}`);
}

const securityCheck = "components/PublicFormSecurityCheck.tsx";
requireText(securityCheck, "/api/form-security", "the built-in security endpoint must remain connected");
requireText(securityCheck, 'type="checkbox"', "the visible human-confirmation checkbox must remain available");
requireText(securityCheck, 'name="securityCheckToken"', "the security token must be submitted with the form");
requireText(securityCheck, "I’m not a robot", "the checkbox must clearly explain the human confirmation");
forbidText(securityCheck, "challenges.cloudflare.com", "external security widgets must not block public forms");
forbidText(securityCheck, "turnstile.render", "Cloudflare Turnstile must not become a form dependency again");

const securityRoute = "app/api/form-security/route.ts";
for (const action of ["contact_form", "employment_application", "testimonial"]) {
  requireText(securityRoute, `"${action}"`, `the ${action} security action must remain enabled`);
}

const securityHelpers = "lib/security/http.ts";
requireText(securityHelpers, "randomBytes(32)", "form security tokens must remain unpredictable");
requireText(securityHelpers, "formSecurityCookieName(action)", "form security tokens must remain bound to a same-action cookie");
requireText(securityHelpers, "httpOnly: true", "form security cookies must remain inaccessible to browser scripts");
requireText(securityHelpers, 'sameSite: "strict"', "form security cookies must remain same-site only");
requireText(securityHelpers, "isSameOriginRequest(req)", "server verification must reject cross-origin form submissions");
requireText(securityHelpers, "timingSafeEqual(cookieBytes, submittedBytes)", "server verification must compare the submitted token safely");

const contactForm = "components/ContactFormWrapper.tsx";
requireText(contactForm, "PublicFormSecurityCheck", "all general public forms must keep the security checkbox");
requireText(contactForm, "SubmissionFailureFallback", "all general public forms must keep download/print fallback options");
requireText(contactForm, "noValidate", "custom missing-field explanations must remain enabled");
requireText(contactForm, 'disabled={status === "sending"}', "the submit button may only lock while a request is sending");
requireCount(contactForm, 'fetch("/api/contact",', 2, "both contact initialization and submission must remain connected to the handler");
requireText(contactForm, 'method: "POST"', "general public forms must submit with POST");

const sharedForms = [
  ["app/forms/education-request/page.tsx", "Education Request"],
  ["app/forms/equipment-request/page.tsx", "Equipment Request"],
  ["app/forms/event-request/page.tsx", "Event Appearance Request"],
  ["app/forms/ride-along/page.tsx", "Ride Along Request"],
  ["app/forms/birthday/BirthdayClient.tsx", "Birthday Party Appearance Request"],
  ["app/forms/birthday-station/BirthdayStationClient.tsx", "Birthday Party at Station Request"],
  ["app/forms/employment/page.tsx", "Employment Application"],
];
const sharedSchema = "lib/security/public-form-schemas.ts";
for (const [path, formType] of sharedForms) {
  requireText(path, "ContactFormWrapper", `${formType} must keep the shared submission client`);
  requireText(path, `formType="${formType}"`, `${formType} must keep its exact handler contract`);
  requireText(sharedSchema, `"${formType}"`, `${formType} must remain accepted by the server schema`);
}

const applicationForm = "app/careers/apply/ApplicationForm.tsx";
requireText(applicationForm, "PublicFormSecurityCheck", "the employment application must keep the security checkbox");
requireText(applicationForm, "SubmissionFailureFallback", "the employment application must keep download/print fallback options");
requireText(applicationForm, "noValidate", "the application must keep its custom missing-field explanations");
requireText(applicationForm, 'disabled={status === "sending"}', "the application button may only lock while it is sending");
requireCount(applicationForm, 'fetch("/api/apply",', 2, "both application initialization and submission must remain connected to the handler");
requireText(applicationForm, 'method: "POST"', "the employment application must submit with POST");
requireText(applicationForm, "EMPLOYMENT_HOURS_AVAILABLE_OPTIONS", "the application hours checkboxes must share their limits with the server schema");

const employmentSchema = "lib/security/employment-application-schema.ts";
requireText(employmentSchema, "joinedCheckboxValueMaximum(EMPLOYMENT_TYPE_OPTIONS)", "all employment types must fit when checked together");
requireText(employmentSchema, "joinedCheckboxValueMaximum(EMPLOYMENT_DAYS_AVAILABLE_OPTIONS)", "all available days must fit when checked together");
requireText(employmentSchema, "joinedCheckboxValueMaximum(EMPLOYMENT_HOURS_AVAILABLE_OPTIONS)", "all available hours must fit when checked together");
requireText(employmentSchema, "joinedCheckboxValueMaximum(EMPLOYMENT_CONSENT_OPTIONS)", "all consent choices must fit when checked together");

const submissionDetail = "app/admin/submissions/[id]/page.tsx";
requireText(submissionDetail, 'printablePngDataUrl(get("signature_data_url"))', "employment PDFs must load the validated drawn signature");
requireText(submissionDetail, '<img class="signature-image"', "employment PDFs must render the drawn signature image");
requireText(submissionDetail, 'k !== "signature_data_url"', "the raw signature data URL must not be printed as text");

const testimonialForm = "app/testimonials/SubmitForm.tsx";
requireText(testimonialForm, "PublicFormSecurityCheck", "the testimonial form must keep the security checkbox");
requireText(testimonialForm, "disabled={pending}", "the testimonial button may only lock while it is sending");
requireText(testimonialForm, "useActionState(submitTestimonial", "the testimonial form must remain connected to its server action");
requireText(testimonialForm, "<form action={action}>", "the testimonial form must submit through its server action");

const fallback = "components/forms/SubmissionFailureFallback.tsx";
requireText(fallback, "new Blob", "failed submissions must remain downloadable");
requireText(fallback, "download={fileName}", "failed submissions must keep the download action");
requireText(fallback, "Open / print form", "failed submissions must keep the print action");
requireText(fallback, "millstadtems@gmail.com", "failed-submission email instructions must remain available");
requireText(fallback, "100 E Laurel St, Millstadt, IL 62260", "failed-submission mail instructions must remain available");
requireText(fallback, "Online form submission failed", "failed-submission email wording must remain professional and clear");

const contactRoute = "app/api/contact/route.ts";
requireText(contactRoute, "hasValidFormSecurityToken", "general public forms must keep server-side security verification");
requireOrder(contactRoute, "hasValidFormSecurityToken", "parsePublicFormSubmission(submissionBody)", "server security verification must happen before form validation");
requireOrder(contactRoute, "parsePublicFormSubmission(submissionBody)", "checkRateLimit(req", "missing-field validation must happen before rate limiting");
requireOrder(contactRoute, "parsePublicFormSubmission(submissionBody)", "createFormSubmission(formType, fields)", "invalid public forms must never reach durable storage");
requireText(contactRoute, 'if (formType !== "Employment Application")', "the short employment form must never inherit the general contact rate limit");

const applicationRoute = "app/api/apply/route.ts";
requireText(applicationRoute, "hasValidFormSecurityToken", "employment applications must keep server-side security verification");
requireText(applicationRoute, "parseEmploymentApplication(rawFields)", "employment applications must keep exact missing-field validation");
requireOrder(applicationRoute, "hasValidFormSecurityToken", "parseEmploymentApplication(rawFields)", "application security verification must happen before field validation");
requireOrder(applicationRoute, "parseEmploymentApplication(rawFields)", 'createFormSubmission("Employment Application", fields)', "invalid applications must never reach durable storage");
forbidText(applicationRoute, "checkRateLimit", "employment applications must never be blocked by an application rate limit");
forbidText(applicationRoute, "Too many applications", "the application lockout message must not return");
forbidText(applicationRoute, "An application was already received recently", "repeat applicants must not be locked out");

const testimonialAction = "app/testimonials/actions.ts";
requireText(testimonialAction, "hasValidFormSecurityToken", "testimonials must keep server-side security verification");
requireOrder(testimonialAction, "hasValidFormSecurityToken", "if (!message || message.length < 15)", "testimonial security verification must happen before field validation");
requireOrder(testimonialAction, "if (!message || message.length < 15)", "checkRateLimit(request", "testimonial field validation must happen before rate limiting");

const validationMessages = "lib/security/form-validation-messages.ts";
requireText(validationMessages, 'return `Please complete “${label}”.`', "missing fields must remain specifically identified");
requireText(validationMessages, 'return "Enter a valid email address."', "invalid email fields must keep a clear message");

const globalStyles = "app/globals.css";
forbidText(globalStyles, ".lounge-hover-expand:hover", "the Employee Lounge button must not grow on hover");
forbidText(globalStyles, "scale(4)", "the former oversized Lounge hover transform must not return");

if (failures.length > 0) {
  console.error("Protected public-form contract failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error("\nFix these regressions before building or deploying.");
  process.exit(1);
}

console.log(`Protected public-form contract passed (${checks} checks).`);
