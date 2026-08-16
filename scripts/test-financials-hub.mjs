import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PORT = 3031;
const ORIGIN = `http://localhost:${PORT}`;
const ADMIN_HEADERS = {
  "x-mems-dev-admin-code": "TEST-ADMIN",
};
const SAME_ORIGIN_HEADERS = {
  origin: ORIGIN,
  "sec-fetch-site": "same-origin",
};
const cwd = process.cwd();
const tsconfigPath = path.join(cwd, "tsconfig.json");
const originalTsconfig = await readFile(tsconfigPath, "utf8");
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "-p", String(PORT)],
  {
    cwd,
    env: {
      ...process.env,
      MILLSTADT_INFORMATION_HUB_ENV: "development",
      MILLSTADT_INFORMATION_HUB_ENABLED: "true",
      MILLSTADT_INFORMATION_HUB_ALLOW_REQUESTS: "true",
      MILLSTADT_INFORMATION_HUB_ALLOW_VIEWER: "true",
      MILLSTADT_INFORMATION_HUB_ALLOW_DOCUMENT_APIS: "true",
      MILLSTADT_INFORMATION_HUB_ALLOW_PUBLIC_990S: "true",
      MILLSTADT_INFORMATION_HUB_SYNTHETIC_DATA_ONLY: "true",
      MILLSTADT_INFORMATION_HUB_DEV_ADMIN_CODE: "TEST-ADMIN",
      MILLSTADT_INFORMATION_HUB_TEST_DELIVERY_ENABLED: "true",
      MILLSTADT_INFORMATION_HUB_TEST_SINK_DOMAIN: "example.test",
      MILLSTADT_INFORMATION_HUB_TEST_RECIPIENT_ALLOWLIST:
        "allowlisted-recipient@production.invalid",
      MILLSTADT_INFORMATION_HUB_TEST_ADMIN_EMAILS:
        "financials-test@example.test,blocked-recipient@production.invalid",
      LOUNGE_DEV_LOGIN_ENABLED: "false",
      LOUNGE_DEV_LOGIN_PIN: "",
      NEXT_PUBLIC_LOUNGE_DEV_LOGIN: "false",
      GMAIL_CLIENT_ID: "",
      GMAIL_CLIENT_SECRET: "",
      GMAIL_REFRESH_TOKEN: "",
      TWILIO_ACCOUNT_SID: "",
      TWILIO_AUTH_TOKEN: "",
      TWILIO_FROM_NUMBER: "",
      ANALYTICS_PRODUCTION_ENABLED: "false",
      ANALYTICS_DEVELOPMENT_ENABLED: "true",
      ANALYTICS_DEVELOPMENT_MEMORY_STORE: "true",
      ANALYTICS_PRIVACY_CONTACT: "privacy@example.test",
      ANALYTICS_JURISDICTIONS: "Illinois,United States",
      ANALYTICS_SYSTEM: "First-party synthetic integration store",
      ANALYTICS_DATA_CATEGORIES:
        "aggregate website usage,pseudonymous returning-browser estimates,broad geography",
      ANALYTICS_SUPERVISOR_EMPLOYEE_IDS: "TEST-SUPERVISOR",
      ANALYTICS_SERVICE_PROVIDER_CONTRACTS: "No external analytics provider in synthetic test",
      ANALYTICS_SECURITY_CONTROLS_REVIEWED: "true",
      ANALYTICS_BREACH_RESPONSE_CONTACTS: "Synthetic integration test procedure",
      ANALYTICS_CHILDREN_PRIVACY_SETTING: "Age survey disabled",
      ANALYTICS_HEALTH_INFORMATION_EXCLUSIONS_REVIEWED: "true",
      ANALYTICS_GEOLOCATION_SETTING: "Broad hosting headers only; precise disabled",
      ANALYTICS_AGE_RANGE_SETTING: "Disabled until child-directed separation is reviewed",
      ANALYTICS_CONSENT_SETTINGS_REVIEWED: "true",
      ANALYTICS_LEGAL_REVIEW_APPROVED: "true",
      ANALYTICS_ROLE_CONFIGURATION_REVIEWED: "true",
      ANALYTICS_RETENTION_DELETION_REVIEWED: "true",
      ANALYTICS_BACKUP_CONTROLS_REVIEWED: "true",
      ANALYTICS_INCIDENT_RESPONSE_DOCUMENTED: "true",
      ANALYTICS_HASH_KEY: "synthetic-analytics-hmac-key-not-for-production",
      ANALYTICS_SECURITY_ENCRYPTION_KEY: "synthetic-security-encryption-key-not-for-production",
      ANALYTICS_MINIMUM_GROUP_SIZE: "15",
      ANALYTICS_COMMUNITY_SURVEY_ENABLED: "true",
      ANALYTICS_RETENTION_SECURITY_DAYS: "30",
      ANALYTICS_RETENTION_EVENT_DAYS: "90",
      ANALYTICS_RETENTION_VISITOR_DAYS: "180",
      ANALYTICS_RETENTION_GEOGRAPHY_DAYS: "90",
      ANALYTICS_RETENTION_AGE_SURVEY_DAYS: "0",
      ANALYTICS_RETENTION_PRECISE_LOCATION_DAYS: "0",
      ANALYTICS_RETENTION_RESTRICTED_DOCUMENT_AUDIT_DAYS: "365",
      ANALYTICS_RETENTION_REQUEST_PDF_DAYS: "365",
      ANALYTICS_RETENTION_ADMIN_ACTION_DAYS: "365",
      ANALYTICS_RETENTION_INCIDENT_HOLD_DAYS: "30",
      ANALYTICS_RETENTION_CONSENT_DAYS: "365",
      NEXT_DIST_DIR: ".next-financials-test",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);

let serverLog = "";
server.stdout.on("data", (chunk) => {
  serverLog += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  serverLog += chunk.toString();
});

const results = [];
function pass(label) {
  results.push(label);
  process.stdout.write(`PASS ${label}\n`);
}

function pdfPageTexts(pdfPath) {
  const info = execFileSync("pdfinfo", [pdfPath], { encoding: "utf8" });
  const pageCount = Number(info.match(/^Pages:\s+(\d+)/m)?.[1] ?? 0);
  assert.ok(pageCount > 0);
  return Array.from({ length: pageCount }, (_, index) =>
    execFileSync(
      "pdftotext",
      ["-f", String(index + 1), "-l", String(index + 1), pdfPath, "-"],
      { encoding: "utf8" },
    )
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function assertReadableUniquePages(pdfPath) {
  const pages = pdfPageTexts(pdfPath);
  for (const page of pages) assert.ok(page.length >= 80, "PDF contains an unexpectedly blank page");
  assert.equal(new Set(pages).size, pages.length, "PDF contains a duplicate page");
  return pages;
}

function cookiePair(setCookie) {
  return (setCookie ?? "").split(";", 1)[0];
}

function responseCookieHeader(response) {
  const values = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie")].filter(Boolean);
  return values.map(cookiePair).join("; ");
}

async function json(response) {
  const body = await response.json();
  return { response, body };
}

async function waitForServer() {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Test server stopped early.\n${serverLog}`);
    try {
      const response = await fetch(`${ORIGIN}/api/financials/status`, { cache: "no-store" });
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Timed out waiting for test server.\n${serverLog}`);
}

try {
  await waitForServer();

  const privacyPage = await fetch(`${ORIGIN}/privacy`);
  assert.equal(privacyPage.status, 200);
  const privacyHtml = await privacyPage.text();
  assert.match(privacyHtml, /Website privacy and analytics/);
  assert.match(privacyHtml, /No sale or targeted advertising/);
  assert.match(privacyHtml, /Returning-visitor estimates/);
  assert.match(privacyHtml, /privacy@example\.test/);
  pass("privacy page publishes the configured notice and contact");

  const initialPreference = await json(await fetch(`${ORIGIN}/api/privacy/preferences`));
  assert.equal(initialPreference.response.status, 200);
  assert.equal(initialPreference.body.optionalAnalyticsEnabled, true);
  assert.equal(initialPreference.body.preference.status, "unknown");
  assert.equal(initialPreference.response.headers.get("set-cookie"), null);
  pass("optional analytics set no identifier before an affirmative choice");

  const crossSitePreference = await fetch(`${ORIGIN}/api/privacy/preferences`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://attacker.invalid",
      "sec-fetch-site": "cross-site",
    },
    body: JSON.stringify({ status: "allowed", categories: ["aggregate"] }),
  });
  assert.equal(crossSitePreference.status, 403);
  pass("privacy preference update rejects cross-site requests");

  const allowedPreference = await json(await fetch(`${ORIGIN}/api/privacy/preferences`, {
    method: "POST",
    headers: { "content-type": "application/json", ...SAME_ORIGIN_HEADERS },
    body: JSON.stringify({
      status: "allowed",
      categories: ["aggregate", "returning_visitor", "broad_geography"],
    }),
  }));
  assert.equal(allowedPreference.response.status, 200);
  const analyticsCookies = responseCookieHeader(allowedPreference.response);
  assert.match(analyticsCookies, /mas_analytics_consent=/);
  assert.match(analyticsCookies, /mas_analytics_browser=[A-Za-z0-9_-]{43}/);
  assert.match(analyticsCookies, /mas_analytics_session=[A-Za-z0-9_-]{43}/);
  assert.doesNotMatch(analyticsCookies, /127\.0\.0\.1|localhost/);
  pass("affirmative consent creates random first-party browser and session identifiers");

  const analyticsHeaders = {
    "content-type": "application/json",
    cookie: analyticsCookies,
    ...SAME_ORIGIN_HEADERS,
  };
  const aggregateEvent = await fetch(`${ORIGIN}/api/analytics/events`, {
    method: "POST",
    headers: analyticsHeaders,
    body: JSON.stringify({
      eventName: "page_view",
      path: "/privacy",
      occurredAt: new Date().toISOString(),
    }),
  });
  assert.equal(aggregateEvent.status, 202);
  const rejectedSensitivePayload = await fetch(`${ORIGIN}/api/analytics/events`, {
    method: "POST",
    headers: analyticsHeaders,
    body: JSON.stringify({
      eventName: "page_view",
      path: "/privacy",
      occurredAt: new Date().toISOString(),
      name: "This field must never enter analytics",
    }),
  });
  assert.equal(rejectedSensitivePayload.status, 400);
  pass("analytics accepts allowlisted aggregate events and rejects unexpected identity fields");

  const publicDocumentEvent = await fetch(`${ORIGIN}/api/analytics/events`, {
    method: "POST",
    headers: analyticsHeaders,
    body: JSON.stringify({
      eventName: "document_download",
      path: "/financials-information-hub",
      occurredAt: new Date().toISOString(),
      documentKind: "public_form_990",
      documentId: "SYN-990-2024-001",
    }),
  });
  assert.equal(publicDocumentEvent.status, 202);
  assert.equal(publicDocumentEvent.headers.get("set-cookie"), null);
  pass("public document events are accepted without refreshing visitor identifiers");

  const communitySurvey = await fetch(`${ORIGIN}/api/analytics/community-area`, {
    method: "POST",
    headers: { "content-type": "application/json", ...SAME_ORIGIN_HEADERS },
    body: JSON.stringify({ area: "prefer_not_to_say" }),
  });
  assert.equal(communitySurvey.status, 201);
  assert.equal(communitySurvey.headers.get("set-cookie"), null);
  pass("voluntary community survey stores an unlinked broad-area response");

  const deniedAnalyticsAdmin = await fetch(`${ORIGIN}/api/admin/analytics/summary`);
  assert.equal(deniedAnalyticsAdmin.status, 403);
  pass("website analytics API requires a named Supervisor session");

  const declinedPreference = await json(await fetch(`${ORIGIN}/api/privacy/preferences`, {
    method: "POST",
    headers: analyticsHeaders,
    body: JSON.stringify({ status: "withdrawn", categories: [] }),
  }));
  assert.equal(declinedPreference.response.status, 200);
  const declinedCookies = responseCookieHeader(declinedPreference.response);
  assert.match(declinedCookies, /mas_analytics_optout=1/);
  const afterWithdrawal = await fetch(`${ORIGIN}/api/analytics/events`, {
    method: "POST",
    headers: { ...analyticsHeaders, cookie: declinedCookies },
    body: JSON.stringify({ eventName: "page_view", path: "/privacy", occurredAt: new Date().toISOString() }),
  });
  assert.equal(afterWithdrawal.status, 403);
  pass("withdrawal clears optional identifiers and blocks later optional events");

  const analyticsSource = (
    await Promise.all([
      "components/analytics/AnalyticsTracker.tsx",
      "lib/analytics/validation.ts",
      "app/api/analytics/events/route.ts",
    ].map((filename) => readFile(path.join(cwd, filename), "utf8")))
  ).join("\n");
  assert.doesNotMatch(analyticsSource, /canvas\.toDataURL|hardwareConcurrency|deviceMemory|geolocation\.getCurrentPosition|AudioContext/);
  assert.match(analyticsSource, /documentEventsMustBeUnlinked\(parsed\.eventName\) \|\| Boolean\(parsed\.documentKind\)/);
  pass("analytics source excludes fingerprinting and precise-location collection and unlinks document events");

  const hubPage = await fetch(`${ORIGIN}/financials-information-hub`);
  assert.equal(hubPage.status, 200);
  // Next's development renderer intentionally replaces page cache headers with
  // `no-cache, must-revalidate`; the production smoke test verifies `no-store`.
  assert.match(hubPage.headers.get("cache-control") ?? "", /no-cache|no-store/);
  assert.match(hubPage.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
  assert.equal(hubPage.headers.get("x-frame-options"), "DENY");
  assert.equal(hubPage.headers.get("x-content-type-options"), "nosniff");
  assert.match(await hubPage.text(), /Financial Information/);
  pass("development hub is available with scoped security headers");

  const legacyDevLogin = await fetch(`${ORIGIN}/api/lounge/dev-login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pin: "95723935", role: "admin" }),
  });
  assert.equal(legacyDevLogin.status, 404);
  pass("legacy hardcoded lounge development login is disabled");

  const manifest = JSON.parse(await readFile(path.join(cwd, "public/financial-information.webmanifest"), "utf8"));
  assert.equal(manifest.start_url, "/financials-information-hub");
  const worker = await readFile(path.join(cwd, "public/sw.js"), "utf8");
  assert.doesNotMatch(worker, /addEventListener\(["']fetch["']/);
  assert.doesNotMatch(worker, /\bcaches\.(open|match|keys|delete)\b/);
  pass("PWA metadata exists without confidential offline caching");

  const privacySource = await readFile(
    path.join(cwd, "app/financials-information-hub/FinancialsPrivacyShield.tsx"),
    "utf8",
  );
  const privacyStyles = await readFile(
    path.join(cwd, "app/financials-information-hub/FinancialsPrivacyShield.module.css"),
    "utf8",
  );
  const privacyState = await import(
    pathToFileURL(path.join(cwd, "lib/financials-hub/privacy-shield-state.mjs")).href
  );
  let shield = privacyState.initialPrivacyShieldState;
  shield = privacyState.privacyShieldTransition(shield, "background");
  assert.deepEqual(shield, { shielded: true, canDismiss: false });
  shield = privacyState.privacyShieldTransition(shield, "foreground");
  assert.deepEqual(shield, { shielded: true, canDismiss: true });
  shield = privacyState.privacyShieldTransition(shield, "dismiss");
  assert.deepEqual(shield, { shielded: false, canDismiss: true });
  assert.match(privacySource, /visibilitychange/);
  assert.match(privacySource, /window\.addEventListener\("blur"/);
  assert.match(privacySource, /Sensitive content was hidden while this page was outside the foreground/);
  assert.match(privacyStyles, /background:\s*#000000/);
  pass("privacy shield hides background content and requires foreground dismissal");

  const catalogResult = await json(await fetch(`${ORIGIN}/api/financials/form-990/catalog`));
  assert.equal(catalogResult.response.status, 200);
  assert.equal(catalogResult.body.documents.length, 2);
  await mkdir(path.join(cwd, "work/test-evidence"), { recursive: true });
  for (const item of catalogResult.body.documents) {
    const pdfResponse = await fetch(`${ORIGIN}/api/financials/form-990/${item.id}/pdf`);
    assert.equal(pdfResponse.status, 200);
    const pdfPath = path.join(cwd, "work/test-evidence", `${item.id}.pdf`);
    await writeFile(pdfPath, Buffer.from(await pdfResponse.arrayBuffer()));
    const info = execFileSync("pdfinfo", [pdfPath], { encoding: "utf8" });
    assert.match(info, new RegExp(`Pages:\\s+${item.pageCount}\\b`));
    assert.equal(assertReadableUniquePages(pdfPath).length, item.pageCount);
  }
  pass("public Form 990 downloads match catalog page counts");

  const csrfPrep = await json(await fetch(`${ORIGIN}/api/financials/access-requests`));
  assert.equal(csrfPrep.response.status, 200);
  assert.ok(csrfPrep.body.csrfToken);
  const csrfCookie = cookiePair(csrfPrep.response.headers.get("set-cookie"));
  const idempotencyKey = crypto.randomUUID();
  const requestPayload = {
    idempotencyKey,
    fullLegalName: "Morgan Avery",
    verifiedEmail: "morgan.avery@example.test",
    mailingAddress: "100 Test Record Way",
    addressLine2: "",
    city: "Millstadt",
    state: "IL",
    postalCode: "62260",
    selectedDocIds: ["CALL-VOLUME-REQUESTS-2022-2026"],
    requestedInformationDescription: "",
    acceptedCheckboxText:
      "I have read and agree to the Request Terms and Release Notice. I certify that the information I have submitted is accurate to the best of my knowledge and that I have not knowingly provided materially false or misleading information. I understand that Millstadt may contact me for clarification and that submitting a request does not guarantee access unless applicable law requires disclosure.",
    acceptedButtonText: "Sign and submit request",
    termsAcknowledged: true,
    signatureFullName: "Morgan Avery",
    signatureMethod: "typed",
    signatureDataUrl: "",
    signatureTypedName: "Morgan Avery",
    finalSubmissionConfirmed: true,
    finalSubmissionConfirmationText:
      "I am submitting this request electronically under the name shown above, and I authorize Millstadt to include my electronic signature and acknowledged terms in the administrative request record.",
    sendSignedCopyToRequester: true,
  };

  const missingCsrf = await fetch(`${ORIGIN}/api/financials/access-requests`, {
    method: "POST",
    headers: { "content-type": "application/json", ...SAME_ORIGIN_HEADERS },
    body: JSON.stringify(requestPayload),
  });
  assert.equal(missingCsrf.status, 403);
  pass("access request rejects missing CSRF state");

  const crossSite = await fetch(`${ORIGIN}/api/financials/access-requests`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: csrfCookie,
      "x-csrf-token": csrfPrep.body.csrfToken,
      origin: "https://attacker.invalid",
      "sec-fetch-site": "cross-site",
    },
    body: JSON.stringify(requestPayload),
  });
  assert.equal(crossSite.status, 403);
  pass("access request rejects cross-site submission");

  const submitHeaders = {
    "content-type": "application/json",
    cookie: csrfCookie,
    "x-csrf-token": csrfPrep.body.csrfToken,
    ...SAME_ORIGIN_HEADERS,
  };
  const unsignedRequest = await fetch(`${ORIGIN}/api/financials/access-requests`, {
    method: "POST",
    headers: submitHeaders,
    body: JSON.stringify({
      ...requestPayload,
      idempotencyKey: crypto.randomUUID(),
      signatureTypedName: "",
    }),
  });
  assert.equal(unsignedRequest.status, 400);
  pass("access request rejects a missing electronic signature");

  const unacknowledgedRequest = await fetch(`${ORIGIN}/api/financials/access-requests`, {
    method: "POST",
    headers: submitHeaders,
    body: JSON.stringify({
      ...requestPayload,
      idempotencyKey: crypto.randomUUID(),
      termsAcknowledged: false,
    }),
  });
  assert.equal(unacknowledgedRequest.status, 400);
  pass("access request rejects missing affirmative terms acknowledgment");

  const unconfirmedRequest = await fetch(`${ORIGIN}/api/financials/access-requests`, {
    method: "POST",
    headers: submitHeaders,
    body: JSON.stringify({
      ...requestPayload,
      idempotencyKey: crypto.randomUUID(),
      finalSubmissionConfirmed: false,
    }),
  });
  assert.equal(unconfirmedRequest.status, 400);
  pass("access request rejects missing electronic-submission confirmation");

  const created = await json(
    await fetch(`${ORIGIN}/api/financials/access-requests`, {
      method: "POST",
      headers: submitHeaders,
      body: JSON.stringify(requestPayload),
    }),
  );
  assert.equal(created.response.status, 201);
  assert.equal(created.body.request.status, "pending");
  assert.equal(created.body.request.selectedDocumentVersions["CALL-VOLUME-REQUESTS-2022-2026"], "2026.08.16");
  assert.match(created.body.request.agreementHash, /^sha256:[a-f0-9]{64}$/);
  assert.equal(created.body.request.signedCopyRequested, true);
  assert.equal(created.body.request.termsAcknowledged, true);
  assert.equal(created.body.request.signatureFullName, "Morgan Avery");
  assert.equal(created.body.request.finalSubmissionConfirmationText, requestPayload.finalSubmissionConfirmationText);
  assert.equal("notifications" in created.body, false);
  const request = created.body.request;
  pass("signed access request is stored pending without exposing recipients");

  const duplicate = await json(
    await fetch(`${ORIGIN}/api/financials/access-requests`, {
      method: "POST",
      headers: submitHeaders,
      body: JSON.stringify(requestPayload),
    }),
  );
  assert.equal(duplicate.response.status, 200);
  assert.equal(duplicate.body.duplicate, true);
  assert.equal(duplicate.body.request.id, request.id);
  pass("access request retry is idempotent");

  const mismatchedRetry = await fetch(`${ORIGIN}/api/financials/access-requests`, {
    method: "POST",
    headers: submitHeaders,
    body: JSON.stringify({ ...requestPayload, city: "Different City" }),
  });
  assert.equal(mismatchedRetry.status, 409);
  pass("idempotency key cannot be reused with changed data");

  const pendingViewer = await fetch(`${ORIGIN}/api/financials/viewer-sessions`, {
    method: "POST",
    headers: { "content-type": "application/json", ...SAME_ORIGIN_HEADERS },
    body: JSON.stringify({
      requestId: request.id,
      documentId: "CALL-VOLUME-REQUESTS-2022-2026",
      userId: request.userId,
    }),
  });
  assert.equal(pendingViewer.status, 403);
  pass("pending request cannot open a restricted document");

  const agreementResponse = await fetch(
    `${ORIGIN}/api/admin/financials/access-requests/${request.id}/agreement`,
    { headers: ADMIN_HEADERS },
  );
  assert.equal(agreementResponse.status, 200);
  const agreementPath = path.join(cwd, "work/test-evidence/signed-access-request.pdf");
  await writeFile(agreementPath, Buffer.from(await agreementResponse.arrayBuffer()));
  const agreementText = execFileSync("pdftotext", [agreementPath, "-"], { encoding: "utf8" });
  const agreementPages = assertReadableUniquePages(agreementPath);
  assert.match(agreementText, new RegExp(request.id));
  assert.match(agreementText, /Administrative request record - not the released document/);
  assert.match(agreementText, /Request-record hash/);
  assert.match(agreementText, /Sign and submit request/);
  assert.match(agreementText, /Request Terms and Release Notice/);
  assert.match(agreementText, /AI-processing notice/);
  assert.match(agreementText, /Provenance and altered copies/);
  assert.match(agreementText, /I am submitting this request electronically/);
  assert.match(agreementText, /Page 1 of/);
  assert.ok(agreementPages.length <= 8);
  pass("signed access PDF contains the request, exact terms, signature, confirmation, and audit record");

  const adminList = await json(
    await fetch(`${ORIGIN}/api/admin/financials/access-requests`, { headers: ADMIN_HEADERS }),
  );
  assert.equal(adminList.response.status, 200);
  const adminRequest = adminList.body.requests.find((item) => item.id === request.id);
  assert.ok(adminRequest);

  const approvalBody = {
    approvedDocIds: ["CALL-VOLUME-REQUESTS-2022-2026"],
    expirationAtUtc: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    reviewReason: "Synthetic integration approval.",
    expectedStatus: adminRequest.status,
    expectedRequestVersion: adminRequest.requestVersion,
  };
  const noOriginApproval = await fetch(
    `${ORIGIN}/api/admin/financials/access-requests/${request.id}/approve`,
    {
      method: "POST",
      headers: { ...ADMIN_HEADERS, "content-type": "application/json" },
      body: JSON.stringify(approvalBody),
    },
  );
  assert.equal(noOriginApproval.status, 403);
  pass("admin mutation rejects missing same-origin evidence");

  const approved = await json(
    await fetch(`${ORIGIN}/api/admin/financials/access-requests/${request.id}/approve`, {
      method: "POST",
      headers: { ...ADMIN_HEADERS, ...SAME_ORIGIN_HEADERS, "content-type": "application/json" },
      body: JSON.stringify(approvalBody),
    }),
  );
  assert.equal(approved.response.status, 200);
  assert.equal(approved.body.request.status, "approved");
  pass("authorized admin approval succeeds for the signed document version");

  const staleApproval = await fetch(
    `${ORIGIN}/api/admin/financials/access-requests/${request.id}/approve`,
    {
      method: "POST",
      headers: { ...ADMIN_HEADERS, ...SAME_ORIGIN_HEADERS, "content-type": "application/json" },
      body: JSON.stringify(approvalBody),
    },
  );
  assert.equal(staleApproval.status, 409);
  pass("stale or duplicate approval is rejected");

  const viewer = await json(
    await fetch(`${ORIGIN}/api/financials/viewer-sessions`, {
      method: "POST",
      headers: { "content-type": "application/json", ...SAME_ORIGIN_HEADERS },
      body: JSON.stringify({
        requestId: request.id,
        documentId: "CALL-VOLUME-REQUESTS-2022-2026",
        userId: request.userId,
      }),
    }),
  );
  assert.equal(viewer.response.status, 201);
  const session = viewer.body.session;
  const queryIdentity = await fetch(
    `${ORIGIN}/api/financials/viewer-sessions/${session.id}/pages/1?userId=${encodeURIComponent(request.userId)}`,
  );
  assert.equal(queryIdentity.status, 403);
  const viewerPage = await json(
    await fetch(`${ORIGIN}/api/financials/viewer-sessions/${session.id}/pages/1`, {
      headers: { "x-millstadt-user-id": request.userId },
    }),
  );
  assert.equal(viewerPage.response.status, 200);
  assert.equal(
    viewerPage.body.watermark,
    `MILLSTADT EMS RELEASE • RELEASE ID ${session.releaseId} • SEE FULL NOTICE`,
  );
  assert.match(viewerPage.body.footerText, new RegExp(`Release ID: ${session.releaseId}`));
  assert.match(viewerPage.body.footerText, /Document version: 2026\.08\.16/);
  assert.match(viewerPage.body.footerText, /Page: 1 of 16/);
  pass("approved viewer uses the short release watermark and complete document footer");

  const revokeBody = {
    reviewReason: "Synthetic revocation check.",
    expectedStatus: approved.body.request.status,
    expectedRequestVersion: approved.body.request.requestVersion,
  };
  const revoked = await json(
    await fetch(`${ORIGIN}/api/admin/financials/access-requests/${request.id}/revoke`, {
      method: "POST",
      headers: { ...ADMIN_HEADERS, ...SAME_ORIGIN_HEADERS, "content-type": "application/json" },
      body: JSON.stringify(revokeBody),
    }),
  );
  assert.equal(revoked.response.status, 200);
  assert.equal(revoked.body.request.status, "revoked");
  const revokedPage = await fetch(
    `${ORIGIN}/api/financials/viewer-sessions/${session.id}/pages/1`,
    { headers: { "x-millstadt-user-id": request.userId } },
  );
  assert.equal(revokedPage.status, 403);
  pass("revocation immediately invalidates controlled viewing");

  const accuracyPrep = await json(await fetch(`${ORIGIN}/api/financials/accuracy-reports`));
  const accuracyCookie = cookiePair(accuracyPrep.response.headers.get("set-cookie"));
  const reportData = new FormData();
  reportData.set("idempotencyKey", crypto.randomUUID());
  reportData.set("documentId", "SYN-990-2024-001");
  reportData.set("sourceUrl", "/api/financials/form-990/SYN-990-2024-001/html");
  reportData.set("pageOrSection", "Page 2, Part I summary");
  reportData.set("category", "Possible factual inaccuracy");
  reportData.set("description", "Synthetic concern used to verify secure report submission and review behavior.");
  reportData.set("supportingSource", "Synthetic integration evidence.");
  reportData.set("reporterName", "Taylor Morgan");
  reportData.set("reporterEmail", "taylor.morgan@example.test");
  reportData.set("reporterTelephone", "");
  reportData.set("certificationAccepted", "true");
  reportData.set(
    "certificationText",
    "I certify that I am submitting this report in good faith; that the factual information I have provided is accurate to the best of my knowledge after reasonable care; and that I have not knowingly submitted materially false information or fabricated, altered, or misrepresented supporting material. I understand that an honest mistake, disagreement, criticism, opinion, inference, or inability to prove a concern does not by itself mean that I violated this certification.",
  );
  reportData.set("signatureMethod", "typed");
  reportData.set("signatureTypedName", "Taylor Morgan");
  reportData.set("signatureDataUrl", "");
  const accuracyHeaders = {
    cookie: accuracyCookie,
    "x-csrf-token": accuracyPrep.body.csrfToken,
    ...SAME_ORIGIN_HEADERS,
  };
  const reportCreated = await json(
    await fetch(`${ORIGIN}/api/financials/accuracy-reports`, {
      method: "POST",
      headers: accuracyHeaders,
      body: reportData,
    }),
  );
  assert.equal(reportCreated.response.status, 201);
  assert.equal(reportCreated.body.report.status, "Received");
  assert.equal("notifications" in reportCreated.body, false);
  const reportDuplicate = await json(
    await fetch(`${ORIGIN}/api/financials/accuracy-reports`, {
      method: "POST",
      headers: accuracyHeaders,
      body: reportData,
    }),
  );
  assert.equal(reportDuplicate.response.status, 200);
  assert.equal(reportDuplicate.body.report.id, reportCreated.body.report.id);
  pass("signed accuracy report is CSRF-protected, private, and idempotent");

  const badUploadData = new FormData();
  for (const [key, value] of reportData.entries()) badUploadData.set(key, value);
  badUploadData.set("idempotencyKey", crypto.randomUUID());
  badUploadData.set(
    "supportingDocument",
    new Blob(["This is not a PDF."], { type: "application/pdf" }),
    "evidence.pdf",
  );
  const badUpload = await fetch(`${ORIGIN}/api/financials/accuracy-reports`, {
    method: "POST",
    headers: accuracyHeaders,
    body: badUploadData,
  });
  assert.equal(badUpload.status, 400);
  pass("accuracy upload rejects a mismatched PDF signature");

  const reportList = await json(
    await fetch(`${ORIGIN}/api/admin/financials/accuracy-reports`, { headers: ADMIN_HEADERS }),
  );
  const adminReport = reportList.body.reports.find((item) => item.id === reportCreated.body.report.id);
  assert.ok(adminReport);
  const reportAgreementResponse = await fetch(
    `${ORIGIN}/api/admin/financials/accuracy-reports/${adminReport.id}/agreement`,
    { headers: ADMIN_HEADERS },
  );
  assert.equal(reportAgreementResponse.status, 200);
  const reportAgreementPath = path.join(cwd, "work/test-evidence/signed-accuracy-report.pdf");
  await writeFile(reportAgreementPath, Buffer.from(await reportAgreementResponse.arrayBuffer()));
  const reportAgreementText = execFileSync("pdftotext", [reportAgreementPath, "-"], {
    encoding: "utf8",
  });
  assertReadableUniquePages(reportAgreementPath);
  assert.match(reportAgreementText, new RegExp(adminReport.id));
  assert.match(reportAgreementText, /Acknowledgment Version|acknowledgment version/i);
  assert.match(reportAgreementText, /Page 1 of/);
  pass("signed accuracy PDF contains the report ID, acknowledgment version, and page numbers");
  const reviewBody = {
    status: "Under review",
    reviewerNote: "Synthetic private review note.",
    resolution: "",
    expectedStatus: adminReport.status,
  };
  const reviewed = await fetch(
    `${ORIGIN}/api/admin/financials/accuracy-reports/${adminReport.id}`,
    {
      method: "PATCH",
      headers: { ...ADMIN_HEADERS, ...SAME_ORIGIN_HEADERS, "content-type": "application/json" },
      body: JSON.stringify(reviewBody),
    },
  );
  assert.equal(reviewed.status, 200);
  const staleReview = await fetch(
    `${ORIGIN}/api/admin/financials/accuracy-reports/${adminReport.id}`,
    {
      method: "PATCH",
      headers: { ...ADMIN_HEADERS, ...SAME_ORIGIN_HEADERS, "content-type": "application/json" },
      body: JSON.stringify(reviewBody),
    },
  );
  assert.equal(staleReview.status, 409);
  pass("accuracy review is admin-protected and rejects stale updates");

  const auditResult = await json(
    await fetch(`${ORIGIN}/api/admin/financials/audit-events`, { headers: ADMIN_HEADERS }),
  );
  const notificationAudit = auditResult.body.auditEvents.find(
    (event) => event.requestId === request.id && event.eventType === "administrator_notified",
  );
  assert.ok(notificationAudit);
  assert.match(notificationAudit.reason, /email=skipped/);
  assert.match(notificationAudit.reason, /to 1 configured test recipient/);
  assert.doesNotMatch(notificationAudit.reason, /@/);
  pass("test mode filters non-sink recipients and records skipped delivery without leakage");

  const signedCopyAudit = auditResult.body.auditEvents.find(
    (event) =>
      event.requestId === request.id && event.eventType === "requester_signed_copy_notified",
  );
  assert.ok(signedCopyAudit);
  assert.match(signedCopyAudit.reason, /email=skipped/);
  assert.match(signedCopyAudit.reason, /allowed test recipient/);
  const decisionAudits = auditResult.body.auditEvents.filter(
    (event) => event.requestId === request.id && event.eventType === "requester_decision_notified",
  );
  assert.ok(decisionAudits.length >= 2);
  assert.ok(decisionAudits.every((event) => !event.reason.includes("@")));
  pass("signed-copy and access-decision requester emails are allowlisted and audited");

  const deliveryMatrix = await readFile(path.join(cwd, "FORM_DELIVERY_MATRIX.md"), "utf8");
  const notificationSource = await readFile(
    path.join(cwd, "lib/financials-hub/notifications.ts"),
    "utf8",
  );
  assert.match(deliveryMatrix, /POST \/api\/financials\/access-requests/);
  assert.match(deliveryMatrix, /\[Millstadt EMS\] Restricted document request \{request ID\}/);
  assert.match(deliveryMatrix, /Signed request PDF when generation succeeds/);
  assert.match(deliveryMatrix, /\[Millstadt EMS\] Accuracy report \{report ID\}/);
  assert.match(notificationSource, /Restricted document request \$\{request\.id\}/);
  assert.match(notificationSource, /Accuracy report \$\{report\.id\}/);
  assert.match(notificationSource, /filename: agreement\.filename/);
  assert.match(notificationSource, /contentType: "application\/pdf"/);
  assert.match(notificationSource, /notifyRequesterSignedAgreement/);
  assert.match(notificationSource, /notifyRequesterAccessDecision/);
  assert.doesNotMatch(notificationSource, /@millstadtems\.org|@yahoo\.com/i);
  pass("delivery routes, subjects, attachments, and environment-only recipients match the matrix");

  const financialSource = await readFile(
    path.join(cwd, "app/financials-information-hub/FinancialsArchivePrototype.tsx"),
    "utf8",
  );
  assert.doesNotMatch(financialSource, /\?userId=/);
  pass("requester identifiers are absent from financial URLs");

  const disclosureSource = (
    await Promise.all(
      [
        "lib/financials-hub/types.ts",
        "lib/financials-hub/accuracy-types.ts",
        "lib/financials-hub/form990.ts",
        "lib/financials-hub/dev-store.ts",
      ].map((filename) => readFile(path.join(cwd, filename), "utf8")),
    )
  ).join("\n");
  assert.match(disclosureSource, /This page is an archive of available documents/);
  assert.match(disclosureSource, /Request Terms and Release Notice/);
  assert.match(disclosureSource, /Technical viewing controls are intended/);
  assert.match(disclosureSource, /Provenance and altered copies/);
  assert.doesNotMatch(disclosureSource, /also known as Millstadt EMS/i);
  pass("financial disclosures match the supplied archive and release workflow copy");

  for (let index = 0; index < 4; index += 1) {
    const rateResponse = await fetch(`${ORIGIN}/api/financials/access-requests`, {
      method: "POST",
      headers: submitHeaders,
      body: JSON.stringify({
        ...requestPayload,
        idempotencyKey: crypto.randomUUID(),
        fullLegalName: `Synthetic Rate Test ${index + 1}`,
        signatureFullName: `Synthetic Rate Test ${index + 1}`,
        signatureTypedName: `Synthetic Rate Test ${index + 1}`,
      }),
    });
    assert.equal(rateResponse.status, 201);
  }
  const rateLimited = await fetch(`${ORIGIN}/api/financials/access-requests`, {
    method: "POST",
    headers: submitHeaders,
    body: JSON.stringify({
      ...requestPayload,
      idempotencyKey: crypto.randomUUID(),
      fullLegalName: "Synthetic Rate Test Blocked",
      signatureFullName: "Synthetic Rate Test Blocked",
      signatureTypedName: "Synthetic Rate Test Blocked",
    }),
  });
  assert.equal(rateLimited.status, 429);
  pass("access request rate limit accepts five valid requests and blocks the next one");

  process.stdout.write(`\n${results.length} financial hub integration checks passed.\n`);
} catch (error) {
  process.stderr.write(`\nFinancial hub integration test failed:\n${error.stack ?? error}\n`);
  process.stderr.write(`\nServer output:\n${serverLog.slice(-12_000)}\n`);
  process.exitCode = 1;
} finally {
  server.kill("SIGTERM");
  await new Promise((resolve) => {
    if (server.exitCode !== null) return resolve();
    const timeout = setTimeout(resolve, 5_000);
    server.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
  await writeFile(tsconfigPath, originalTsconfig);
}
