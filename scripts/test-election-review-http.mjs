// Run against the dev server with ELECTION_REVIEW_TEST_PASSWORD set.
import assert from "node:assert/strict";
import test from "node:test";

const password = process.env.ELECTION_REVIEW_TEST_PASSWORD;
if (!password) throw new Error("Set ELECTION_REVIEW_TEST_PASSWORD before running the local login checks.");
const port = process.env.ELECTION_REVIEW_TEST_PORT || "3000";

for (const host of ["localhost", "127.0.0.1"]) {
  test(`Review login stays on ${host} and opens protected content`, async () => {
    const origin = `http://${host}:${port}`;
    const login = (value, next) => fetch(`${origin}/api/election-review/login`, {
      method: "POST", redirect: "manual",
      headers: { Origin: origin, "Content-Type": "application/x-www-form-urlencoded", "X-Forwarded-For": "192.0.2.147" },
      body: new URLSearchParams({ password: value, next }),
    });
    const denied = await login("incorrect-test-password", "/election-information");
    assert.equal(denied.status, 303);
    assert.ok(denied.headers.get("location").startsWith("/election-review?error=password"));
    assert.equal(denied.headers.get("set-cookie"), null);

    const accepted = await login(password, "https://unrelated.invalid/");
    assert.equal(accepted.status, 303);
    // A relative redirect avoids cross-origin form-action failures on local aliases.
    assert.equal(accepted.headers.get("location"), "/election-information");
    assert.match(accepted.headers.get("cache-control"), /no-store/);
    const cookie = accepted.headers.get("set-cookie");
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=lax/i);
    const page = await fetch(new URL(accepted.headers.get("location"), origin), {
      redirect: "manual", headers: { Cookie: cookie.split(";")[0] },
    });
    assert.equal(page.status, 200);
    assert.ok((await page.text()).includes("Find your address"));
  });
}
