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

const contactForm = "components/ContactFormWrapper.tsx";
requireText(contactForm, "PublicFormSecurityCheck", "all general public forms must keep the security checkbox");
requireText(contactForm, "SubmissionFailureFallback", "all general public forms must keep download/print fallback options");
requireText(contactForm, "noValidate", "custom missing-field explanations must remain enabled");
requireText(contactForm, 'disabled={status === "sending"}', "the submit button may only lock while a request is sending");

const applicationForm = "app/careers/apply/ApplicationForm.tsx";
requireText(applicationForm, "PublicFormSecurityCheck", "the employment application must keep the security checkbox");
requireText(applicationForm, "SubmissionFailureFallback", "the employment application must keep download/print fallback options");
requireText(applicationForm, "noValidate", "the application must keep its custom missing-field explanations");
requireText(applicationForm, 'disabled={status === "sending"}', "the application button may only lock while it is sending");

const testimonialForm = "app/testimonials/SubmitForm.tsx";
requireText(testimonialForm, "PublicFormSecurityCheck", "the testimonial form must keep the security checkbox");
requireText(testimonialForm, "disabled={pending}", "the testimonial button may only lock while it is sending");

const fallback = "components/forms/SubmissionFailureFallback.tsx";
requireText(fallback, "new Blob", "failed submissions must remain downloadable");
requireText(fallback, "download={fileName}", "failed submissions must keep the download action");
requireText(fallback, "Open / print form", "failed submissions must keep the print action");
requireText(fallback, "millstadtems@gmail.com", "failed-submission email instructions must remain available");
requireText(fallback, "100 E Laurel St, Millstadt, IL 62260", "failed-submission mail instructions must remain available");
requireText(fallback, "Online form submission failed", "failed-submission email wording must remain professional and clear");

const contactRoute = "app/api/contact/route.ts";
requireText(contactRoute, "hasValidFormSecurityToken", "general public forms must keep server-side security verification");
requireOrder(contactRoute, "parsePublicFormSubmission(submissionBody)", "checkRateLimit(req", "missing-field validation must happen before rate limiting");

const applicationRoute = "app/api/apply/route.ts";
requireText(applicationRoute, "hasValidFormSecurityToken", "employment applications must keep server-side security verification");
requireText(applicationRoute, "parseEmploymentApplication(rawFields)", "employment applications must keep exact missing-field validation");
forbidText(applicationRoute, "checkRateLimit", "employment applications must never be blocked by an application rate limit");
forbidText(applicationRoute, "Too many applications", "the application lockout message must not return");
forbidText(applicationRoute, "An application was already received recently", "repeat applicants must not be locked out");

const testimonialAction = "app/testimonials/actions.ts";
requireText(testimonialAction, "hasValidFormSecurityToken", "testimonials must keep server-side security verification");
requireOrder(testimonialAction, "if (!message || message.length < 15)", "checkRateLimit(request", "testimonial field validation must happen before rate limiting");

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
