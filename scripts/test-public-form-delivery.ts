import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildPublicFormPayload } from "../lib/public-form-submission";
import { parseEmploymentApplication } from "../lib/security/employment-application-schema";
import { parsePublicFormSubmission } from "../lib/security/public-form-schemas";

test("public request payload includes the completed built-in security-check token", () => {
  const payload = buildPublicFormPayload(
    "Ride Along Request",
    { first_name: "Test", last_name: "Requester" },
    "verified-browser-token",
  );

  assert.equal(payload.securityCheckToken, "verified-browser-token");
  assert.equal(payload.formType, "Ride Along Request");
});

test("the shared public form uses the built-in check and offers a printable fallback", async () => {
  const source = await readFile(new URL("../components/ContactFormWrapper.tsx", import.meta.url), "utf8");
  assert.match(source, /buildPublicFormPayload\(formType, fields, securityCheckToken\)/);
  assert.match(source, /PublicFormSecurityCheck/);
  assert.match(source, /SubmissionFailureFallback/);
  assert.match(source, /noValidate/);
});

test("the security check is a first-party checkbox with no external widget dependency", async () => {
  const source = await readFile(new URL("../components/PublicFormSecurityCheck.tsx", import.meta.url), "utf8");
  assert.match(source, /I’m not a robot/);
  assert.match(source, /\/api\/form-security/);
  assert.doesNotMatch(source, /challenges\.cloudflare\.com|NEXT_PUBLIC_TURNSTILE_SITE_KEY/);
});

test("public request validation names the missing field", () => {
  const result = parsePublicFormSubmission({
    formType: "Ride Along Request",
    last_name: "Requester",
    phone: "618-555-0100",
    email: "requester@example.com",
    dob: "2000-01-01",
    purpose: "Civilian Observation / Interest",
  });

  assert.deepEqual(result, { ok: false, error: "Please complete “First name”." });
});

test("employment validation names the missing field", () => {
  const result = parseEmploymentApplication({});
  assert.deepEqual(result, { ok: false, error: "Please complete “Position”." });
});
