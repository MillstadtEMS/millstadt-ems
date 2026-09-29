import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { NextRequest, NextResponse } from "next/server";
import * as security from "../lib/security/http";
import { fetchFormJson, submitPublicForm } from "../lib/public-form-client";
import { parsePublicFormSubmission } from "../lib/security/public-form-schemas";
import { parseEmploymentApplication } from "../lib/security/employment-application-schema";

const origin = "https://www.millstadtems.org";
const json = (data: unknown, status = 200) => Response.json(data, { status });

function request(path: string, cookies: Record<string, string> = {}, init: RequestInit = {}) {
  return new NextRequest(origin + path, {
    ...init,
    signal: init.signal ?? undefined,
    headers: {
      origin,
      "sec-fetch-site": "same-origin",
      cookie: Object.entries(cookies).map(([key, value]) => `${key}=${value}`).join("; "),
      ...init.headers,
    },
  });
}

for (const [scope, action] of [["contact", "contact_form"], ["employment", "employment_application"]]) {
  test(`${scope}: opening a second form preserves the first form's security`, async () => {
    const firstCsrf = security.issueCsrfToken(scope);
    const firstCheck = security.issueFormSecurityToken(action);
    const csrfToken = (await firstCsrf.json()).csrfToken;
    const securityCheckToken = (await firstCheck.json()).securityCheckToken;
    const cookies = {
      [security.csrfCookieName(scope)]: csrfToken,
      [security.formSecurityCookieName(action)]: securityCheckToken,
    };
    const second = request("/api/contact", cookies);
    assert.equal((await security.issueCsrfToken(scope, second).json()).csrfToken, csrfToken);
    assert.equal((await security.issueFormSecurityToken(action, second).json()).securityCheckToken, securityCheckToken);
    const submission = request("/api/contact", cookies, { headers: { "X-CSRF-Token": csrfToken } });
    assert.equal(security.hasValidCsrfToken(submission, scope), true);
    assert.equal(security.hasValidFormSecurityToken(submission, action, securityCheckToken), true);
    assert.match(firstCsrf.headers.get("cache-control")!, /no-store/);
    assert.match(firstCheck.headers.get("set-cookie")!, /HttpOnly.*SameSite=strict/i);
  });
}

test("malformed cookies are replaced; cross-origin, missing and wrong-action tokens remain rejected", async () => {
  const invalid = request("/api/contact", { mas_csrf_contact: "invalid" });
  const token = (await security.issueCsrfToken("contact", invalid).json()).csrfToken;
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(security.hasValidCsrfToken(invalid, "contact"), false);
  const crossOrigin = request("/api/contact", { mas_csrf_contact: token, mas_form_check_contact_form: token }, {
    headers: { origin: "https://other.example", "X-CSRF-Token": token },
  });
  assert.equal(security.hasValidCsrfToken(crossOrigin, "contact"), false);
  assert.equal(security.hasValidFormSecurityToken(crossOrigin, "contact_form", token), false);
  assert.equal(security.hasValidFormSecurityToken(request("/api/apply", { mas_form_check_contact_form: token }), "employment_application", token), false);
});

function fakeTransport(post: (init: RequestInit) => Promise<Response>) {
  const calls: string[] = [];
  const fetchImpl: typeof fetch = async (url, init = {}) => {
    calls.push(`${init.method ?? "GET"} ${url}`);
    assert.equal(init.credentials, "same-origin");
    assert.equal(init.cache, "no-store");
    assert.ok(init.signal);
    if (init.method === "POST") return post(init);
    return String(url).includes("form-security")
      ? json({ securityCheckToken: "fresh-check" })
      : json({ csrfToken: "fresh-csrf" });
  };
  return { calls, fetchImpl };
}

const contactOptions = {
  endpoint: "/api/contact" as const,
  securityCheckToken: "checked-but-expired",
  contentType: "application/json",
  body: (token: string) => JSON.stringify({ securityCheckToken: token, first_name: "Synthetic" }),
};

test("long-open forms refresh both expired tokens and retain the submitted answers", async () => {
  const fake = fakeTransport(async (init) => {
    assert.equal(new Headers(init.headers).get("X-CSRF-Token"), "fresh-csrf");
    assert.deepEqual(JSON.parse(String(init.body)), { securityCheckToken: "fresh-check", first_name: "Synthetic" });
    return json({ ok: true });
  });
  await submitPublicForm(contactOptions, fake.fetchImpl);
  assert.equal(fake.calls.length, 3);
});

test("an unchecked human confirmation cannot submit or silently refresh", async () => {
  const fake = fakeTransport(async () => json({ ok: true }));
  await assert.rejects(submitPublicForm({ ...contactOptions, securityCheckToken: "" }, fake.fetchImpl), /not a robot/);
  assert.equal(fake.calls.length, 0);
});

test("a simultaneous first-load security race retries once, before storage", async () => {
  let posts = 0;
  const fake = fakeTransport(async () => ++posts === 1
    ? json({ code: "FORM_SESSION_EXPIRED" }, 403) : json({ ok: true }));
  await submitPublicForm(contactOptions, fake.fetchImpl);
  assert.equal(posts, 2);
});

test("persistent security failures stop after one recovery attempt", async () => {
  let posts = 0;
  const fake = fakeTransport(async () => { posts++; return json({ code: "FORM_SESSION_EXPIRED" }, 403); });
  await assert.rejects(submitPublicForm(contactOptions, fake.fetchImpl));
  assert.equal(posts, 2);
});

for (const [name, post] of [
  ["storage unavailable", async () => json({ error: "Could not store" }, 503)],
  ["unrelated forbidden response", async () => json({ error: "Forbidden" }, 403)],
  ["lost response after a possible save", async () => { throw new Error("offline"); }],
  ["HTML returned instead of a receipt", async () => new Response("<html>Sign in</html>")],
  ["empty success response", async () => json({})],
] as const) {
  test(`${name}: no false success and no automatic duplicate POST`, async () => {
    const fake = fakeTransport(post);
    await assert.rejects(submitPublicForm(contactOptions, fake.fetchImpl));
    assert.equal(fake.calls.filter((call) => call.startsWith("POST")).length, 1);
  });
}

test("failed initialization is retryable without reloading the form", async () => {
  await assert.rejects(submitPublicForm(contactOptions, async () => json({}, 503)));
  await submitPublicForm(contactOptions, fakeTransport(async () => json({ ok: true })).fetchImpl);
});

test("a stalled connection is aborted rather than leaving the form sending forever", async () => {
  await assert.rejects(fetchFormJson("/api/contact", {}, 10, async (_url, init) => new Promise((_resolve, reject) => {
    init!.signal!.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
  })), /answers are still here/);
});

test("applications retain multipart fields and use the application receipt contract", async () => {
  const fd = new FormData();
  fd.set("first_name", "Synthetic");
  const fake = fakeTransport(async (init) => {
    assert.equal((init.body as FormData).get("securityCheckToken"), "fresh-check");
    assert.equal((init.body as FormData).get("first_name"), "Synthetic");
    assert.equal(new Headers(init.headers).has("Content-Type"), false);
    return json({ success: true });
  });
  await submitPublicForm({
    endpoint: "/api/apply", securityCheckToken: "checked",
    body: (token) => { fd.set("securityCheckToken", token); return fd; },
  }, fake.fetchImpl);
});

// Execute the actual route handlers with isolated persistence/notification
// adapters. Synthetic requests never reach a live database or mailbox.
function loadRoute(kind: "contact" | "apply", failStorage = false) {
  const saved: unknown[] = [];
  const deferred: (() => Promise<void>)[] = [];
  const notifications: string[] = [];
  const dependencies: Record<string, unknown> = {
    "next/server": { NextRequest, NextResponse, after: (fn: () => Promise<void>) => deferred.push(fn) },
    "@/lib/db": { createFormSubmission: async (type: string, fields: unknown) => {
      if (failStorage) throw new Error("Synthetic storage outage");
      saved.push({ type, fields }); return { id: "synthetic-record" };
    } },
    "@/lib/security/http": security,
    "@/lib/security/rate-limit": { checkRateLimit: async () => ({ allowed: true }) },
    "@/lib/security/public-form-schemas": { parsePublicFormSubmission },
    "@/lib/security/employment-application-schema": { parseEmploymentApplication },
    "@/lib/application-flags": { buildApplicationFlags: () => [] },
    "@/lib/lounge/notify-admins": { notifyAdminsInLounge: async () => { notifications.push("lounge"); throw new Error("Synthetic provider outage"); } },
    "@/lib/reports/gmail-message": { sendGmailMessage: async () => { notifications.push("email"); throw new Error("Synthetic provider outage"); } },
  };
  const source = readFileSync(new URL(`../app/api/${kind}/route.ts`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports: { GET?: (req: NextRequest) => Promise<Response>; POST?: (req: NextRequest) => Promise<Response> } = {};
  const realRequire = createRequire(import.meta.url);
  vm.runInNewContext(compiled, {
    exports, require: (id: string) => dependencies[id] ?? realRequire(id),
    Buffer, File, process: { env: {} }, console: { error() {} },
  });
  return { saved, deferred, notifications, GET: exports.GET!, POST: exports.POST! };
}

const requester = { first_name: "Synthetic", last_name: "Test", email: "synthetic@example.com", phone: "618-555-0100" };
const fixtures: Record<string, Record<string, string | string[]>> = {
  "Education Request": { program: "Safety", audience: "Adults", acknowledgment: "on" },
  "Equipment Request": { item: "Equipment", purpose: "Training", date_needed: "2026-10-01", acknowledgment: "on" },
  "Event Appearance Request": { event_type: "Community", event_date: "2026-10-01", location: "Synthetic location", acknowledgment: "on" },
  "Ride Along Request": { dob: "2000-01-01", purpose: "Civilian Observation / Interest" },
  "Birthday Party Appearance Request": { child_name: "Synthetic", party_date: "2026-10-01", address: "Synthetic location" },
  "Birthday Party at Station Request": { child_name: "Synthetic", party_date: "2026-10-01" },
  "Employment Application": { position: "EMT", availability: ["Days", "Nights"] },
};

async function routeRequest(kind: "contact" | "apply", fields: Record<string, unknown>) {
  const scope = kind === "contact" ? "contact" : "employment";
  const action = kind === "contact" ? "contact_form" : "employment_application";
  const csrfToken = (await security.issueCsrfToken(scope).json()).csrfToken;
  const check = (await security.issueFormSecurityToken(action).json()).securityCheckToken;
  const cookies = { [security.csrfCookieName(scope)]: csrfToken, [security.formSecurityCookieName(action)]: check };
  if (kind === "contact") return request("/api/contact", cookies, {
    method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ ...fields, securityCheckToken: check }),
  });
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.set(key, String(value));
  body.set("securityCheckToken", check);
  return request("/api/apply", cookies, { method: "POST", headers: { "X-CSRF-Token": csrfToken }, body });
}

for (const [formType, fields] of Object.entries(fixtures)) {
  test(`${formType}: accepted and stored before any notification work`, async () => {
    const route = loadRoute("contact");
    const response = await route.POST(await routeRequest("contact", { formType, ...requester, ...fields }));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).submissionId, "synthetic-record");
    assert.equal(route.saved.length, 1);
    assert.deepEqual(route.notifications, []);
    assert.equal(route.deferred.length, 1);
    await route.deferred[0]();
    assert.deepEqual(route.notifications, ["lounge", "email"]);
  });
}

const application = {
  ...requester, position: "EMT (BLS)", employment_type: "Full-Time", dob: "2000-01-01",
  authorized_us: "Yes", felony: "No", excluded_medicare: "No", license_suspended: "No",
  valid_dl: "Yes", certified: "on",
  signature_data_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6SAAAAABJRU5ErkJggg==",
};

test("full application: notification failures cannot reverse a saved receipt", async () => {
  const route = loadRoute("apply");
  const response = await route.POST(await routeRequest("apply", application));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).success, true);
  assert.equal(route.saved.length, 1);
  assert.deepEqual(route.notifications, []);
  await route.deferred[0]();
  assert.deepEqual(route.notifications, ["lounge", "email"]);
});

for (const kind of ["contact", "apply"] as const) {
  test(`${kind}: storage outage produces a failure, never a success or notification`, async () => {
    const route = loadRoute(kind, true);
    const fields = kind === "apply" ? application : { formType: "Employment Application", ...requester, position: "EMT" };
    const response = await route.POST(await routeRequest(kind, fields));
    assert.equal(response.status, 503);
    assert.deepEqual(route.saved, []);
    assert.deepEqual(route.deferred, []);
  });
  test(`${kind}: missing session is rejected before validation or persistence`, async () => {
    const route = loadRoute(kind);
    const body = kind === "apply" ? new FormData() : "{}";
    const headers: Record<string, string> = kind === "apply" ? {} : { "Content-Type": "application/json" };
    const response = await route.POST(request(`/api/${kind}`, {}, { method: "POST", headers, body }));
    assert.equal(response.status, 403);
    assert.equal((await response.json()).code, "FORM_SESSION_EXPIRED");
    assert.deepEqual(route.saved, []);
    assert.deepEqual(route.deferred, []);
  });
  test(`${kind}: invalid fields do not persist or notify`, async () => {
    const route = loadRoute(kind);
    const response = await route.POST(await routeRequest(kind, kind === "contact" ? { formType: "Ride Along Request" } : {}));
    assert.equal(response.status, 400);
    assert.deepEqual(route.saved, []);
    assert.deepEqual(route.deferred, []);
  });
}
