import {
  portalConfig,
  issuePortalSession,
  requestSession,
  sessionCookie,
  verifyPortalPassword,
  wrapDemoToken,
  unwrapDemoToken,
  type PortalConfig,
  type PortalSession,
} from "./auth";
import {
  allowedDemoRequest,
  validDemoBody,
  sameOriginMutation,
  isPublicDemo,
  protectResponse,
  UPSTREAM_ORIGIN,
} from "./policy";
import { portalAssets } from "./vendor-assets";

type Dependencies = {
  config?: PortalConfig | null;
  fetch?: typeof fetch;
  now?: () => number;
  loginAllowance: () => Promise<{
    allowed: boolean;
    retryAfterSeconds: number;
  }>;
};
const json = (
  status: number,
  code: string,
  message: string,
  headers?: HeadersInit,
) =>
  protectResponse(
    Response.json({ error: { code, message } }, { status, headers }),
  );
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const returnPath = (value: unknown) =>
  value === "/ten-eight/dispatch" ? value : "/ten-eight";

function loginPage(destination: string, message = "", status = 200): Response {
  const dispatch = destination === "/ten-eight/dispatch";
  return protectResponse(
    new Response(
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Ten-Eight · Millstadt EMS</title><style>
  *{box-sizing:border-box}body{margin:0;background:#f5f6f3;color:#14212e;font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:1080px;min-height:100svh;margin:auto;padding:9vh 7vw;display:grid;grid-template-columns:1.1fr 1fr;gap:8vw;align-items:center}.wordmark{font-size:27px;letter-spacing:-1.5px;font-weight:750}.overline{color:#52667a;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:22px}h1{font-size:clamp(38px,5vw,60px);font-weight:650;line-height:1.04;letter-spacing:-2px;margin:28px 0 22px}p{color:#536373}form{padding-top:24px;border-top:3px solid #175bea}label{display:block;font-size:14px;font-weight:650;margin-bottom:8px}input{width:100%;font:inherit;padding:14px;border:1px solid #9aa8b4;border-radius:6px;background:white}button{width:100%;font:inherit;font-weight:650;background:#175bea;border:0;color:white;border-radius:6px;margin-top:18px;padding:14px;cursor:pointer}input:focus-visible,button:focus-visible,a:focus-visible{outline:3px solid #55a4ff;outline-offset:3px}.error{color:#ad2639}.small{font-size:13px}a{color:#1551c1}.badge{display:inline-block;font-size:12px;color:#8a4b00;background:#fff0ce;padding:5px 10px;border-radius:3px}@media(max-width:700px){main{grid-template-columns:1fr;gap:24px;padding:36px 24px;align-content:center}h1{margin:22px 0 14px}.intro p{max-width:36ch}}
  </style></head><body><main><section class="intro"><div class="wordmark">ten-eight <span class="small">/ Millstadt EMS</span></div><h1>${dispatch ? "Dispatch,<br>in practice." : "A clearer picture.<br>A shared response."}</h1><p>${dispatch ? "Prepare an alert, follow responses and work the fictional dispatch queue." : "Explore calls, response coordination and agency operations."}</p><span class="badge">Fictional demo data only</span></section><section><div class="overline">Protected website portal</div><form action="/ten-eight/session" method="post"><input type="hidden" name="destination" value="${destination}"><label for="portal-password">Portal password</label><input id="portal-password" name="password" type="password" autocomplete="current-password" required maxlength="1024" aria-describedby="portal-help${message ? " portal-error" : ""}">${message ? `<p id="portal-error" role="alert" class="error">${escape(message)}</p>` : ""}<button type="submit">${dispatch ? "Open dispatch workspace" : "Enter Ten-Eight"}</button></form><p id="portal-help" class="small">Access lasts eight hours on this browser. After entry, choose a fictional role${dispatch ? " with Command access to use the dispatch console" : " to explore"}.</p><p class="small">This portal uses a shared public exercise. Do not enter real patient details, staff information or emergency traffic. Phone alerts and live CAD are not connected.</p><a class="small" href="/">Return to Millstadt EMS</a></section></main></body></html>`,
      { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
    ),
  );
}
async function limitedBody(request: Request, maximum: number): Promise<string> {
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > maximum))
    throw new Error("body_limit");
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let count = 0;
  try {
    for (;;) {
      const result = await reader.read();
      if (result.done) break;
      count += result.value.byteLength;
      if (count > maximum) {
        await reader.cancel();
        throw new Error("body_limit");
      }
      chunks.push(result.value);
    }
    return Buffer.concat(chunks).toString("utf8");
  } finally {
    reader.releaseLock();
  }
}
async function limitedJson(response: Response): Promise<unknown> {
  // A broken or redirected upstream must never turn this route into an HTML,
  // cookie or unbounded streaming proxy.
  if (!response.headers.get("content-type")?.startsWith("application/json"))
    throw new Error("invalid_upstream");
  return JSON.parse(
    await limitedBody(
      new Request("https://response.invalid", {
        method: "POST",
        body: response.body,
        duplex: "half",
      } as RequestInit),
      3 * 1024 * 1024,
    ),
  );
}
async function proxyDemo(
  request: Request,
  path: string,
  session: PortalSession,
  config: PortalConfig,
  deps: Dependencies,
): Promise<Response> {
  if (!allowedDemoRequest(request.method, path) || new URL(request.url).search)
    return json(
      403,
      "portal_action_unavailable",
      "This action is unavailable in the fictional website portal.",
    );
  const headers = new Headers({ Accept: "application/json" });
  const anonymous = path === "demo/login" || path === "workspace-config";
  if (!anonymous) {
    const supplied =
      request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1] || "";
    const token = unwrapDemoToken(
      supplied,
      session,
      config,
      (deps.now || Date.now)(),
    );
    if (!token)
      return json(
        401,
        "demo_signin_required",
        "Choose a demo role again to continue.",
      );
    headers.set("Authorization", `Bearer ${token}`);
    const agency = request.headers.get("x-agency-id");
    if (agency) {
      if (agency.length > 160 || /[\u0000-\u001f\u007f]/.test(agency))
        return json(400, "invalid_agency", "The agency selection is invalid.");
      headers.set("X-Agency-Id", agency);
    }
  }
  let body: string | undefined;
  if (request.method === "POST") {
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return json(415, "json_required", "Use a JSON request.");
    try {
      const decoded = JSON.parse(await limitedBody(request, 65536));
      if (!decoded || Array.isArray(decoded) || typeof decoded !== "object")
        return json(400, "invalid_json", "Use a JSON object.");
      if (!validDemoBody(path, decoded))
        return json(
          403,
          "public_preview_disabled",
          "Personal location and phone alerts are disabled in this exercise.",
        );
      body = JSON.stringify(decoded);
      headers.set("Content-Type", "application/json");
    } catch (error) {
      return json(
        error instanceof Error && error.message === "body_limit" ? 413 : 400,
        "invalid_request",
        "The request is invalid or too large.",
      );
    }
  }
  try {
    const upstream = await (deps.fetch || fetch)(
      `${UPSTREAM_ORIGIN}/api/v1/${path.split("/").map(encodeURIComponent).join("/")}`,
      {
        method: request.method,
        headers,
        body,
        redirect: "manual",
        cache: "no-store",
        credentials: "omit",
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(8500)]),
      },
    );
    if (upstream.status >= 300 && upstream.status < 400)
      throw new Error("upstream_redirect");
    const data = await limitedJson(upstream);
    if (
      upstream.ok &&
      ["workspace-config", "demo/login", "snapshot"].includes(path) &&
      !isPublicDemo(data)
    )
      return json(
        503,
        "public_demo_required",
        "The fictional workspace is unavailable. No private workspace has been opened.",
      );
    if (upstream.ok && path === "demo/login") {
      const result = data as Record<string, unknown>;
      if (
        typeof result.token !== "string" ||
        result.token.length > 4096 ||
        !/^[A-Za-z0-9._~+/-]+=*$/.test(result.token)
      )
        throw new Error("invalid_token");
      result.token = wrapDemoToken(result.token, session, config);
    }
    const outgoing = Response.json(data, { status: upstream.status });
    const retryAfter = upstream.headers.get("retry-after");
    if (retryAfter && /^\d{1,5}$/.test(retryAfter))
      outgoing.headers.set("Retry-After", retryAfter);
    return protectResponse(outgoing);
  } catch {
    return json(
      503,
      "demo_connection_unavailable",
      "The demo connection is temporarily unavailable. Nothing has been queued by this portal. Refresh before retrying an uncertain submission.",
    );
  }
}

export async function handlePortalRequest(
  request: Request,
  segments: string[],
  deps: Dependencies,
): Promise<Response> {
  const config = deps.config === undefined ? portalConfig() : deps.config;
  if (!config)
    return json(
      503,
      "portal_not_configured",
      "This portal is not available yet. Contact the website administrator.",
    );
  const path = segments.join("/");
  if (
    segments.some(
      (part) =>
        !part ||
        part === "." ||
        part === ".." ||
        /[\/\\%?#\u0000-\u001f\u007f]/.test(part),
    )
  )
    return json(404, "not_found", "Not found.");
  if (request.method === "POST" && !sameOriginMutation(request))
    return json(
      403,
      "invalid_origin",
      "Open this portal on the website before continuing.",
    );
  if (path === "session" && request.method === "POST") {
    let allowance;
    try {
      allowance = await deps.loginAllowance();
    } catch {
      return json(
        503,
        "signin_unavailable",
        "Sign-in is temporarily unavailable.",
      );
    }
    if (!allowance.allowed)
      return json(
        429,
        "signin_rate_limited",
        "Too many sign-in attempts. Please wait before retrying.",
        { "Retry-After": String(allowance.retryAfterSeconds) },
      );
    if (
      !request.headers
        .get("content-type")
        ?.startsWith("application/x-www-form-urlencoded")
    )
      return json(415, "form_required", "Use the portal sign-in form.");
    let form: URLSearchParams;
    try {
      form = new URLSearchParams(await limitedBody(request, 4096));
    } catch {
      return json(413, "form_too_large", "The sign-in request is too large.");
    }
    const destination = returnPath(form.get("destination"));
    if (
      form.getAll("password").length !== 1 ||
      !(await verifyPortalPassword(form.get("password") || "", config))
    )
      return loginPage(
        destination,
        "That password was not accepted. Please try again.",
        403,
      );
    return protectResponse(
      new Response(null, {
        status: 303,
        headers: {
          Location: destination,
          "Set-Cookie": sessionCookie(
            issuePortalSession(config, (deps.now || Date.now)()),
          ),
        },
      }),
    );
  }
  if (path === "session/logout" && request.method === "POST")
    return protectResponse(
      new Response(null, {
        status: 303,
        headers: { Location: "/ten-eight", "Set-Cookie": sessionCookie("") },
      }),
    );
  const session = requestSession(request, config, (deps.now || Date.now)());
  const page = path === "" || path === "dispatch";
  if (!session) {
    if (page && ["GET", "HEAD"].includes(request.method)) {
      const response = loginPage(
        path === "dispatch" ? "/ten-eight/dispatch" : "/ten-eight",
      );
      return request.method === "HEAD"
        ? protectResponse(new Response(null, { headers: response.headers }))
        : response;
    }
    return json(
      401,
      "portal_signin_required",
      "Sign in to the website portal to continue.",
      { "X-Ten-Eight-Portal": "signin" },
    );
  }
  if (path.startsWith("api/v1/"))
    return proxyDemo(request, path.slice(7), session, config, deps);
  if (!["GET", "HEAD"].includes(request.method))
    return json(405, "method_not_allowed", "Method not allowed.", {
      Allow: "GET, HEAD",
    });
  const assetKey = page ? "index.html" : path;
  const asset = Object.hasOwn(portalAssets, assetKey)
    ? portalAssets[assetKey]
    : undefined;
  if (!asset) return json(404, "not_found", "Not found.");
  return protectResponse(
    new Response(
      request.method === "HEAD" ? null : Buffer.from(asset.base64, "base64"),
      {
        headers: { "Content-Type": asset.contentType },
      },
    ),
  );
}
