import assert from "node:assert/strict";

const origin = new URL(process.argv[2] ?? "https://www.millstadtems.org").origin;
const cookies = new Map();
async function send(path, init = {}) {
  const response = await fetch(origin + path, {
    ...init,
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
    headers: {
      Origin: origin,
      "Sec-Fetch-Site": "same-origin",
      Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join("; "),
      ...init.headers,
    },
  });
  for (const raw of response.headers.getSetCookie()) {
    const [pair] = raw.split(";");
    const equals = pair.indexOf("=");
    cookies.set(pair.slice(0, equals), pair.slice(equals + 1));
  }
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  return { status: response.status, data: await response.json() };
}

for (const [route, action] of [["contact", "contact_form"], ["apply", "employment_application"]]) {
  const csrf = await send(`/api/${route}`);
  const check = await send(`/api/form-security?action=${action}`);
  assert.equal(csrf.status, 200);
  assert.equal(check.status, 200);
  assert.ok(csrf.data.csrfToken);
  assert.ok(check.data.securityCheckToken);
  const secondCsrf = await send(`/api/${route}`);
  const secondCheck = await send(`/api/form-security?action=${action}`);
  assert.ok(secondCsrf.data.csrfToken === csrf.data.csrfToken, `${route}: opening another form invalidated CSRF`);
  assert.ok(secondCheck.data.securityCheckToken === check.data.securityCheckToken, `${route}: opening another form invalidated the security check`);
  const headers = { "X-CSRF-Token": csrf.data.csrfToken };
  let body;
  if (route === "contact") {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify({ formType: "Ride Along Request", securityCheckToken: check.data.securityCheckToken });
  } else {
    body = new FormData();
    body.set("securityCheckToken", check.data.securityCheckToken);
  }
  const result = await send(`/api/${route}`, { method: "POST", headers, body });
  assert.equal(result.status, 400, `${route}: expected validation, received HTTP ${result.status}`);
  assert.match(result.data.error, /Please complete/);
  console.log(`${route}: token reuse and submission validation passed (no records or notifications created).`);
}
