import { test, before } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import vm from "node:vm";
import {
  hashPortalPassword,
  portalConfig,
  issuePortalSession,
  verifyPortalSession,
  verifyPortalPassword,
  sessionCookie,
  requestSession,
  unwrapDemoToken,
  type PortalConfig,
} from "../lib/ten-eight-portal/auth";
import { handlePortalRequest } from "../lib/ten-eight-portal/handler";
import {
  PORTAL_CSP,
  UPSTREAM_ORIGIN,
  sameOriginMutation,
} from "../lib/ten-eight-portal/policy";
import { portalAssets } from "../lib/ten-eight-portal/vendor-assets";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";

const origin = "https://website.example";
const password = randomBytes(24).toString("base64url");
let config: PortalConfig, cookie: string;
before(async () => {
  config = {
    passwordHash: await hashPortalPassword(password),
    sessionSecret: randomBytes(48).toString("base64url"),
  };
  cookie = sessionCookie(issuePortalSession(config)).split(";")[0];
});
const allow = async () => ({ allowed: true, retryAfterSeconds: 0 });
const request = (path: string, init: RequestInit = {}, authenticated = true) =>
  new Request(origin + "/ten-eight" + path, {
    ...init,
    headers: {
      ...(authenticated ? { Cookie: cookie } : {}),
      ...(init.method === "POST" ? { Origin: origin } : {}),
      ...init.headers,
    },
  });
const run = (
  req: Request,
  fetcher: typeof fetch = async () => {
    throw new Error("unexpected network");
  },
) => {
  const parts = new URL(req.url).pathname
    .replace(/^\/ten-eight\/?/, "")
    .split("/")
    .filter(Boolean)
    .map(decodeURIComponent);
  return handlePortalRequest(req, parts, {
    config,
    fetch: fetcher,
    loginAllowance: allow,
  });
};
const reply = (data: unknown, status = 200, headers?: HeadersInit) =>
  Response.json(data, { status, headers });
const fixtureLogin = {
  publicPreview: true,
  realm: "public-demo",
  token: "fictional-upstream-token",
  agencies: [{ id: "demo" }],
};
async function loginBearer() {
  const response = await run(
    request("/api/v1/demo/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"account":"commander"}',
    }),
    async () => reply(fixtureLogin),
  );
  return (await response.json()).token as string;
}

test("private configuration helper accepts a synthetic ten-character password without exposing it", async () => {
  const synthetic = "Fixture10!";
  assert.equal(synthetic.length, 10);
  await assert.rejects(hashPortalPassword("short7!"), /at least 8/);
  const directory = await mkdtemp(
    join(tmpdir(), "ten-eight-portal-config-test-"),
  );
  const output = join(directory, "private.env");
  try {
    const stdout = execFileSync(
      process.execPath,
      ["scripts/create-ten-eight-portal-config.mjs", output],
      {
        input: synthetic + "\n",
        encoding: "utf8",
      },
    );
    const contents = await readFile(output, "utf8");
    assert.equal(stdout.includes(synthetic), false);
    assert.equal(contents.includes(synthetic), false);
    assert.equal((await stat(output)).mode & 0o777, 0o600);
    const fixtureConfig = portalConfig(
      Object.fromEntries(
        contents
          .trim()
          .split("\n")
          .map((line) => {
            const [key, ...value] = line.split("=");
            return [key, value.join("=").replace(/^'|'$/g, "")];
          }),
      ),
    );
    assert.ok(fixtureConfig);
    assert.equal(await verifyPortalPassword(synthetic, fixtureConfig), true);
    const response = await handlePortalRequest(
      request(
        "/session",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            password: synthetic,
            destination: "/ten-eight/dispatch",
          }).toString(),
        },
        false,
      ),
      ["session"],
      { config: fixtureConfig, loginAllowance: allow },
    );
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("location"), "/ten-eight/dispatch");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("salted password verification, configuration failure, signature and exact eight-hour expiry", async () => {
  assert.notEqual(await hashPortalPassword(password), config.passwordHash);
  assert.equal(await verifyPortalPassword(password, config), true);
  assert.equal(await verifyPortalPassword(password + "wrong", config), false);
  assert.equal(portalConfig({}), null);
  assert.equal(
    portalConfig({
      TEN_EIGHT_PORTAL_PASSWORD_HASH: config.passwordHash,
      TEN_EIGHT_PORTAL_SESSION_SECRET: "short",
    }),
    null,
  );
  const issued = issuePortalSession(config, 1000);
  assert.ok(verifyPortalSession(issued, config, 1000));
  assert.ok(verifyPortalSession(issued, config, 1000 + 28800000 - 1));
  assert.equal(verifyPortalSession(issued, config, 1000 + 28800000), null);
  assert.equal(verifyPortalSession(issued, config, 999), null);
  assert.equal(
    verifyPortalSession(
      issued,
      { ...config, sessionSecret: randomBytes(48).toString("base64url") },
      1000,
    ),
    null,
  );
  assert.equal(
    verifyPortalSession(
      issued,
      { ...config, passwordHash: await hashPortalPassword(password) },
      1000,
    ),
    null,
  );
  assert.match(
    sessionCookie(issued),
    /Path=\/ten-eight; Max-Age=28800; HttpOnly; Secure; SameSite=Strict$/,
  );
});

test("page, dispatch, assets and API fail closed; HEAD never leaks page data", async () => {
  for (const path of ["", "/dispatch"]) {
    const response = await run(request(path, {}, false));
    assert.equal(response.status, 200);
    assert.match(await response.text(), /name="password"/);
    const head = await run(request(path, { method: "HEAD" }, false));
    assert.equal(await head.text(), "");
  }
  for (const path of [
    "/app.js",
    "/icons/fire.svg",
    "/api/v1/workspace-config",
    "/vendor/leaflet/leaflet.js",
  ]) {
    const response = await run(request(path, {}, false));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("x-ten-eight-portal"), "signin");
  }
  const response = await handlePortalRequest(request(""), [], {
    config: null,
    loginAllowance: allow,
  });
  assert.equal(response.status, 503);
  assert.equal(
    requestSession(
      request("", { headers: { Cookie: cookie + "; " + cookie } }),
      config,
    ),
    null,
  );
});

test("sign-in enforces origin, rate limit, bounded form and fixed redirects; logout removes only portal cookie", async () => {
  const form = new URLSearchParams({
    password,
    destination: "https://attacker.example",
  });
  const init = {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  };
  const response = await run(request("/session", init, false));
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "/ten-eight");
  assert.match(
    response.headers.get("set-cookie")!,
    /HttpOnly; Secure; SameSite=Strict/,
  );
  const wrong = await run(
    request("/session", { ...init, body: "password=wrong" }, false),
  );
  assert.equal(wrong.status, 403);
  assert.equal(wrong.headers.get("set-cookie"), null);
  const hostile = await run(
    request(
      "/session",
      {
        ...init,
        headers: { ...init.headers, Origin: "https://attacker.example" },
      },
      false,
    ),
  );
  assert.equal(hostile.status, 403);
  const fetchSite = await run(
    request(
      "/session",
      { ...init, headers: { ...init.headers, "Sec-Fetch-Site": "cross-site" } },
      false,
    ),
  );
  assert.equal(fetchSite.status, 403);
  const limited = await handlePortalRequest(
    request("/session", init, false),
    ["session"],
    {
      config,
      loginAllowance: async () => ({ allowed: false, retryAfterSeconds: 900 }),
    },
  );
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "900");
  const huge = await run(
    request(
      "/session",
      { ...init, body: "password=" + "x".repeat(5000) },
      false,
    ),
  );
  assert.equal(huge.status, 413);
  const out = await run(request("/session/logout", { method: "POST" }));
  assert.equal(out.status, 303);
  assert.equal(out.headers.get("set-cookie"), sessionCookie(""));
});

test("proxy binds public tokens to portal session and forwards only fixed-target headers", async () => {
  const bearer = await loginBearer();
  assert.notEqual(bearer, fixtureLogin.token);
  assert.equal(
    unwrapDemoToken(bearer, requestSession(request(""), config)!, config),
    fixtureLogin.token,
  );
  assert.equal(
    unwrapDemoToken(
      bearer,
      verifyPortalSession(issuePortalSession(config), config)!,
      config,
    ),
    null,
  );
  let calls = 0;
  const response = await run(
    request("/api/v1/snapshot", {
      headers: {
        Authorization: `Bearer ${bearer}`,
        "X-Agency-Id": "demo",
        Cookie: `${cookie}; mas_lounge=website-secret; ten_eight_pilot=private-secret`,
        "X-Ten-Eight-Pilot-Key": "never-forward",
        "X-Forwarded-For": "untrusted",
        "X-Provider-Key": "never-forward",
      },
    }),
    async (input, init) => {
      calls++;
      assert.equal(input, `${UPSTREAM_ORIGIN}/api/v1/snapshot`);
      const headers = new Headers(init?.headers);
      assert.deepEqual([...headers.keys()].sort(), [
        "accept",
        "authorization",
        "x-agency-id",
      ]);
      assert.equal(
        headers.get("authorization"),
        `Bearer ${fixtureLogin.token}`,
      );
      assert.equal(init?.redirect, "manual");
      assert.equal(init?.credentials, "omit");
      return reply(
        { publicPreview: true, realm: "public-demo", incidents: [] },
        200,
        { "Set-Cookie": "upstream=must-not-pass" },
      );
    },
  );
  assert.equal(response.status, 200);
  assert.equal(calls, 1);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(response.headers.get("content-security-policy"), PORTAL_CSP);
  const arbitrary = await run(
    request("/api/v1/snapshot", {
      headers: { Authorization: "Bearer some-private-token" },
    }),
  );
  assert.equal(arbitrary.status, 401);
});

test("private realm, redirects, HTML and upstream failures never yield app records", async () => {
  for (const upstream of [
    () =>
      reply({
        publicPreview: false,
        realm: "private-workspace",
        token: "secret",
      }),
    () =>
      new Response(null, {
        status: 302,
        headers: { Location: "https://elsewhere.example" },
      }),
    () =>
      new Response("<h1>not JSON</h1>", {
        headers: { "Content-Type": "text/html" },
      }),
    () => {
      throw new Error("provider-secret-that-must-not-be-returned");
    },
  ]) {
    const response = await run(
      request("/api/v1/demo/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }),
      async () => upstream(),
    );
    assert.equal(response.status, 503);
    assert.doesNotMatch(await response.text(), /provider-secret|"token"|<h1>/);
  }
});

test("allowlist denies real providers, uploads, sharing, queries and path tricks before network", async () => {
  const bearer = await loginBearer();
  const base = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json",
    },
  };
  for (const path of [
    "/api/v1/access/enter",
    "/api/v1/flux911/connect",
    "/api/v1/media",
    "/api/v1/location/sharing",
    "/api/v1/push/installations",
    "/api/v1/assistant/query",
    "/api/v1/circles",
    "/api/v1/voice/sessions",
  ]) {
    assert.equal(
      (await run(request(path, { ...base, body: "{}" }))).status,
      403,
    );
  }
  for (const [path, body] of [
    ["/api/v1/incidents/fictional/respond", { shareLocation: true }],
    ["/api/v1/training/dispatch", { criticalRequested: true }],
  ]) {
    assert.equal(
      (
        await run(
          request(String(path), { ...base, body: JSON.stringify(body) }),
        )
      ).status,
      403,
    );
  }
  assert.equal(
    (
      await run(
        request("/api/v1/snapshot?url=https://evil.example", {
          headers: base.headers,
        }),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await handlePortalRequest(
        request("/api/v1/snapshot"),
        ["api", "v1", "..", "private"],
        { config, loginAllowance: allow },
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await handlePortalRequest(
        request("/api/v1/snapshot"),
        ["api", "v1", "incidents", "x%2fy", "respond"],
        { config, loginAllowance: allow },
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await run(
        request("/api/v1/training/dispatch", {
          ...base,
          body: JSON.stringify({
            criticalRequested: false,
            notes: "x".repeat(70000),
          }),
        }),
      )
    ).status,
    413,
  );
});

test("packaged assets are prefix-contained, protected, online-only and preserve map modules", async () => {
  const html = Buffer.from(
    portalAssets["index.html"].base64,
    "base64",
  ).toString();
  assert.doesNotMatch(html, /manifest|\/install.js|\/sw.js/);
  for (const match of html.matchAll(/(?:src|href)="(\/[^\"]+)"/g))
    assert.ok(match[1].startsWith("/ten-eight/"), match[1]);
  const app = Buffer.from(portalAssets["app.js"].base64, "base64").toString();
  assert.doesNotMatch(
    app,
    /fetch\(`\/api\/v1|import\("\/(?:voice|private-note-vault|radio-player)\.js/,
  );
  assert.match(app, /fetch\(`\/ten-eight\/api\/v1/);
  assert.match(app, /Website portal & sign out/);
  const portal = Buffer.from(
    portalAssets["portal.js"].base64,
    "base64",
  ).toString();
  assert.doesNotMatch(portal, /serviceWorker\.register|localStorage/);
  assert.match(portal, /\/ten-eight\/session\/logout/);
  for (const name of Object.keys(portalAssets)) {
    const response = await run(request("/" + name));
    assert.equal(response.status, 200, name);
    assert.match(response.headers.get("cache-control")!, /no-store/);
    assert.match(response.headers.get("x-robots-tag")!, /noindex/);
  }
  assert.equal((await run(request("/sw.js"))).status, 404);
  assert.equal((await run(request("/manifest.webmanifest"))).status, 404);
});

test("actual packaged login selects the CAD console only for the dispatch entry path", async () => {
  const app = Buffer.from(portalAssets["app.js"].base64, "base64").toString();
  const handler = app
    .split("const handlers = {\n  login: ")[1]
    .split("\n  logout:")[0]
    .replace(/,\s*$/, "");
  for (const [path, expected] of [
    ["/ten-eight", "#command"],
    ["/ten-eight/dispatch", "#settings/dispatch-test"],
  ]) {
    const context = {
      state: {} as Record<string, unknown>,
      location: { pathname: path, hash: "" },
      api: async () => structuredClone(fixtureLogin),
      render: () => {},
      refresh: async () => {},
      $: () => ({ textContent: "" }),
    };
    const login = vm.runInNewContext(`(${handler})`, context);
    await login({ dataset: { account: "commander" }, disabled: false });
    assert.equal(context.location.hash, expected);
    assert.equal(
      context.state.selected,
      path.endsWith("dispatch") ? "dispatch-test" : null,
    );
  }
});

test("website proxy scopes the portal policy exactly and preserves other route headers", async () => {
  const baseline = await proxy(new NextRequest(origin + "/about"));
  for (const path of [
    "/ten-eight-other",
    "/ten-eighty",
    "/ten-eightish/app",
    "/contact",
    "/forms/employment",
  ]) {
    const response = await proxy(new NextRequest(origin + path));
    for (const header of [
      "content-security-policy",
      "permissions-policy",
      "x-frame-options",
      "referrer-policy",
    ])
      assert.equal(
        response.headers.get(header),
        baseline.headers.get(header),
        `${path}: ${header}`,
      );
  }
  for (const path of [
    "/ten-eight",
    "/ten-eight/dispatch",
    "/ten-eight/api/v1/snapshot",
  ]) {
    const response = await proxy(new NextRequest(origin + path));
    assert.equal(response.headers.get("content-security-policy"), PORTAL_CSP);
    assert.equal(
      response.headers.get("permissions-policy"),
      "camera=(), microphone=(), geolocation=(), payment=()",
    );
    assert.match(response.headers.get("cache-control")!, /private, no-store/);
  }
});

test("same-origin mutation works behind HTTPS termination without trusting a forwarded host", () => {
  const terminated = (headers: Record<string, string>) =>
    new Request("http://website.example/ten-eight/session", {
      method: "POST",
      headers: { Origin: origin, "X-Forwarded-Proto": "https", ...headers },
    });
  assert.equal(sameOriginMutation(terminated({})), true);
  assert.equal(
    sameOriginMutation(terminated({ Origin: "http://website.example" })),
    false,
  );
  assert.equal(
    sameOriginMutation(
      terminated({
        Origin: "https://hostile.example",
        "X-Forwarded-Host": "hostile.example",
      }),
    ),
    false,
  );
  assert.equal(
    sameOriginMutation(terminated({ "X-Forwarded-Proto": "javascript" })),
    false,
  );
  assert.equal(
    sameOriginMutation(terminated({ "Sec-Fetch-Site": "cross-site" })),
    false,
  );
  assert.equal(
    sameOriginMutation(
      new Request("http://localhost:3100/ten-eight/session", {
        method: "POST",
        headers: {
          Origin: origin,
          Host: "website.example",
          "X-Forwarded-Proto": "https",
        },
      }),
    ),
    true,
  );
  assert.equal(
    sameOriginMutation(terminated({ Host: "website.example@hostile.example" })),
    false,
  );
});

test("prototype asset keys and encoded separators are rejected without upstream calls", async () => {
  for (const path of ["constructor", "__proto__", "toString"])
    assert.equal((await run(request("/" + path))).status, 404);
  let calls = 0;
  const response = await handlePortalRequest(
    request("/api/v1/workspace-config"),
    ["api/v1/workspace-config"],
    {
      config,
      loginAllowance: allow,
      fetch: async () => {
        calls++;
        return reply({ publicPreview: true, realm: "public-demo" });
      },
    },
  );
  assert.equal(response.status, 404);
  assert.equal(calls, 0);
});
