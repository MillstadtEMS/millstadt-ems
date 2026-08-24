const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const MAX_TOKEN_LENGTH = 2_048;

type TurnstileResponse = {
  success?: boolean;
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
};

type VerifyOptions = {
  action: string;
  remoteIp?: string;
  fetchImpl?: typeof fetch;
};

export type TurnstileVerification =
  | { ok: true }
  | { ok: false; reason: "missing" | "misconfigured" | "invalid" | "unavailable" };

function allowedHostnames() {
  const configured = process.env.TURNSTILE_ALLOWED_HOSTNAMES;
  return new Set(
    (configured ? configured.split(",") : ["millstadtems.org", "www.millstadtems.org"])
      .map((hostname) => hostname.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function verifyTurnstileToken(
  token: unknown,
  options: VerifyOptions,
): Promise<TurnstileVerification> {
  if (typeof token !== "string" || !token.trim() || token.length > MAX_TOKEN_LENGTH) {
    return { ok: false, reason: "missing" };
  }

  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    console.error("[turnstile] TURNSTILE_SECRET_KEY is not configured");
    return { ok: false, reason: "misconfigured" };
  }

  const body = new URLSearchParams({
    secret,
    response: token,
  });
  if (options.remoteIp && options.remoteIp !== "unknown") {
    body.set("remoteip", options.remoteIp);
  }

  try {
    const response = await (options.fetchImpl ?? fetch)(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return { ok: false, reason: "unavailable" };

    const result = await response.json() as TurnstileResponse;
    if (!result.success) return { ok: false, reason: "invalid" };
    if (result.action !== options.action) return { ok: false, reason: "invalid" };

    const hostname = result.hostname?.trim().toLowerCase() ?? "";
    if (!allowedHostnames().has(hostname)) return { ok: false, reason: "invalid" };

    return { ok: true };
  } catch (error) {
    console.error("[turnstile] verification unavailable", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return { ok: false, reason: "unavailable" };
  }
}
