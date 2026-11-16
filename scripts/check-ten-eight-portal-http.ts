// Rehearses the built website locally. No upstream API/provider calls, no
// production credentials, and no real password written to disk or output.
import assert from "node:assert/strict";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { resolve } from "node:path";
import { hashPortalPassword } from "../lib/ten-eight-portal/auth";
import { PORTAL_CSP } from "../lib/ten-eight-portal/policy";

let stage = "startup";
async function main() {
  const reservation = createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const port = (reservation.address() as { port: number }).port;
  await new Promise<void>((done) => reservation.close(() => done()));
  const password = randomBytes(24).toString("base64url");
  const child = spawn(
    process.execPath,
    [
      resolve("node_modules/next/dist/bin/next"),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: process.cwd(),
      stdio: ["ignore", "ignore", "pipe"],
      env: {
        PATH: process.env.PATH,
        NODE_ENV: "production",
        NEXT_TELEMETRY_DISABLED: "1",
        TEN_EIGHT_PORTAL_PASSWORD_HASH: await hashPortalPassword(password),
        TEN_EIGHT_PORTAL_SESSION_SECRET: randomBytes(48).toString("base64url"),
        SECURITY_RATE_LIMIT_KEY: randomBytes(48).toString("base64url"),
      },
    },
  );
  child.stderr?.resume();
  const base = `http://127.0.0.1:${port}`;
  const secureOrigin = `https://127.0.0.1:${port}`;
  const local = (path: string, init: RequestInit = {}) =>
    fetch(base + path, {
      ...init,
      headers: { "X-Forwarded-Proto": "https", ...init.headers },
    });
  let checks = 0;
  try {
    const started = Date.now();
    for (;;) {
      if (child.exitCode !== null)
        throw new Error("Local website process exited before readiness.");
      try {
        if (
          (await local("/ten-eight", { signal: AbortSignal.timeout(1000) }))
            .status === 200
        )
          break;
      } catch {}
      if (Date.now() - started > 20000)
        throw new Error("Local website did not become ready.");
      await new Promise((done) => setTimeout(done, 200));
    }
    stage = "anonymous gate and headers";
    let response = await local("/ten-eight/dispatch");
    assert.equal(response.status, 200);
    checks++;
    assert.match(await response.text(), /Portal password/);
    checks++;
    if (response.headers.get("content-security-policy") !== PORTAL_CSP)
      console.error(
        JSON.stringify({
          issue: "portal_csp_override",
          actual: response.headers.get("content-security-policy"),
        }),
      );
    assert.equal(response.headers.get("content-security-policy"), PORTAL_CSP);
    checks++;
    assert.match(response.headers.get("cache-control")!, /no-store/);
    checks++;
    assert.match(response.headers.get("x-robots-tag")!, /noindex/);
    checks++;
    assert.equal((await local("/ten-eight/app.js")).status, 401);
    checks++;
    assert.equal((await local("/ten-eight/api/v1/snapshot")).status, 401);
    checks++;
    stage = "password and origin gate";
    const form = new URLSearchParams({
      password,
      destination: "/ten-eight/dispatch",
    });
    response = await local("/ten-eight/session", {
      method: "POST",
      redirect: "manual",
      headers: { Origin: "https://hostile.example" },
      body: form,
    });
    assert.equal(response.status, 403);
    checks++;
    response = await local("/ten-eight/session", {
      method: "POST",
      redirect: "manual",
      headers: { Origin: secureOrigin },
      body: form,
    });
    if (response.status !== 303)
      console.error(
        JSON.stringify({
          stage,
          status: response.status,
          code: (
            await response
              .clone()
              .json()
              .catch(() => ({}))
          ).error?.code,
        }),
      );
    assert.equal(response.status, 303);
    checks++;
    assert.equal(response.headers.get("location"), "/ten-eight/dispatch");
    checks++;
    stage = "session cookie";
    const setCookie = response.headers.get("set-cookie")!;
    assert.match(
      setCookie,
      /Path=\/ten-eight; Max-Age=28800; HttpOnly; Secure; SameSite=Strict/,
    );
    checks++;
    // Node's direct Cookie header is solely an HTTP fixture; the browser uses
    // this Secure cookie over the actual production HTTPS origin.
    const cookie = setCookie.split(";")[0];
    stage = "authenticated app and headers";
    response = await local("/ten-eight/dispatch", {
      headers: { Cookie: cookie },
    });
    assert.equal(response.status, 200);
    checks++;
    assert.match(await response.text(), /src="\/ten-eight\/app.js"/);
    checks++;
    assert.equal(response.headers.get("content-security-policy"), PORTAL_CSP);
    checks++;
    response = await local("/ten-eight/app.js", {
      headers: { Cookie: cookie },
    });
    assert.equal(response.status, 200);
    checks++;
    assert.match(response.headers.get("content-type")!, /javascript/);
    checks++;
    assert.match(await response.text(), /\/ten-eight\/api\/v1/);
    checks++;
    response = await local("/ten-eight/icons/fire.svg", {
      method: "HEAD",
      headers: { Cookie: cookie },
    });
    assert.equal(response.status, 200);
    checks++;
    assert.equal(await response.text(), "");
    checks++;
    assert.equal(response.headers.get("content-security-policy"), PORTAL_CSP);
    checks++;
    assert.equal(
      (await local("/ten-eight/sw.js", { headers: { Cookie: cookie } })).status,
      404,
    );
    checks++;
    stage = "logout";
    response = await local("/ten-eight/session/logout", {
      method: "POST",
      redirect: "manual",
      headers: { Cookie: cookie, Origin: secureOrigin },
    });
    assert.equal(response.status, 303);
    checks++;
    assert.match(response.headers.get("set-cookie")!, /Max-Age=0/);
    checks++;
    stage = "existing public website";
    assert.equal((await local("/about")).status, 200);
    checks++;
    console.log(
      JSON.stringify({
        passed: true,
        checks,
        profile:
          "built Next.js local HTTP; ephemeral credentials; no upstream requests",
        browserHttpsCookieTest: "pending publication review",
      }),
    );
  } finally {
    if (child.exitCode === null) {
      const stopped = once(child, "exit");
      child.kill("SIGTERM");
      const deadline = setTimeout(() => child.kill("SIGKILL"), 4000);
      await stopped;
      clearTimeout(deadline);
    }
  }
}
main().catch(() => {
  console.error(
    `Portal HTTP rehearsal failed at ${stage}; no credentials were logged.`,
  );
  process.exitCode = 1;
});
