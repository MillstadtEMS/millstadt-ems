import assert from "node:assert/strict";
import test from "node:test";
import { verifyTurnstileToken } from "../lib/security/turnstile";

const previousSecret = process.env.TURNSTILE_SECRET_KEY;
const previousHostnames = process.env.TURNSTILE_ALLOWED_HOSTNAMES;

process.env.TURNSTILE_SECRET_KEY = "test-secret";
process.env.TURNSTILE_ALLOWED_HOSTNAMES = "millstadtems.org,www.millstadtems.org";

test.after(() => {
  if (previousSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
  else process.env.TURNSTILE_SECRET_KEY = previousSecret;
  if (previousHostnames === undefined) delete process.env.TURNSTILE_ALLOWED_HOSTNAMES;
  else process.env.TURNSTILE_ALLOWED_HOSTNAMES = previousHostnames;
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("rejects a missing browser verification token", async () => {
  const result = await verifyTurnstileToken("", {
    action: "contact_form",
    fetchImpl: async () => jsonResponse({ success: true }) as never,
  });
  assert.deepEqual(result, { ok: false, reason: "missing" });
});

test("accepts a valid token for the expected form and hostname", async () => {
  let requestBody = "";
  const result = await verifyTurnstileToken("valid-token", {
    action: "contact_form",
    remoteIp: "203.0.113.12",
    fetchImpl: (async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestBody = String(init?.body ?? "");
      return jsonResponse({
        success: true,
        action: "contact_form",
        hostname: "www.millstadtems.org",
      });
    }) as typeof fetch,
  });

  assert.deepEqual(result, { ok: true });
  const sent = new URLSearchParams(requestBody);
  assert.equal(sent.get("response"), "valid-token");
  assert.equal(sent.get("remoteip"), "203.0.113.12");
  assert.equal(sent.get("secret"), "test-secret");
});

test("rejects a token issued for a different form action", async () => {
  const result = await verifyTurnstileToken("valid-token", {
    action: "employment_application",
    fetchImpl: (async () => jsonResponse({
      success: true,
      action: "contact_form",
      hostname: "www.millstadtems.org",
    })) as typeof fetch,
  });
  assert.deepEqual(result, { ok: false, reason: "invalid" });
});

test("rejects a token issued for an unapproved hostname", async () => {
  const result = await verifyTurnstileToken("valid-token", {
    action: "testimonial",
    fetchImpl: (async () => jsonResponse({
      success: true,
      action: "testimonial",
      hostname: "example.com",
    })) as typeof fetch,
  });
  assert.deepEqual(result, { ok: false, reason: "invalid" });
});

test("fails closed when Cloudflare is unavailable", async () => {
  const result = await verifyTurnstileToken("valid-token", {
    action: "testimonial",
    fetchImpl: (async () => jsonResponse({}, 503)) as typeof fetch,
  });
  assert.deepEqual(result, { ok: false, reason: "unavailable" });
});
