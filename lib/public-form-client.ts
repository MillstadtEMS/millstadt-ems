type FormEndpoint = "/api/contact" | "/api/apply";
type JsonBody = Record<string, unknown>;

const contracts = {
  "/api/contact": { action: "contact_form", successKey: "ok", timeoutMs: 40_000 },
  "/api/apply": { action: "employment_application", successKey: "success", timeoutMs: 70_000 },
} as const;

export class PublicFormSubmissionError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "PublicFormSubmissionError";
  }
}

// Bound both the request and response body read. A stalled connection must not
// leave the submit button disabled forever. Never retry an uncertain POST.
export async function fetchFormJson(
  url: string,
  init: RequestInit = {},
  timeoutMs = 15_000,
  fetchImpl: typeof fetch = fetch,
): Promise<{ response: Response; data: JsonBody }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      ...init,
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    });
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid response");
    return { response, data: data as JsonBody };
  } catch {
    throw new PublicFormSubmissionError(
      "We could not confirm the submission. Your answers are still here. Please try again or save a copy below.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function submitPublicForm(options: {
  endpoint: FormEndpoint;
  securityCheckToken: string;
  body: (securityCheckToken: string) => BodyInit;
  contentType?: string;
}, fetchImpl: typeof fetch = fetch) {
  if (!options.securityCheckToken) {
    throw new PublicFormSubmissionError("Please select “I’m not a robot” before submitting.");
  }
  const contract = contracts[options.endpoint];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    // Refresh immediately before submitting so long applications, expired
    // cookies and failed page-load initialization recover without a reload.
    const [csrf, security] = await Promise.all([
      fetchFormJson(options.endpoint, {}, 15_000, fetchImpl),
      fetchFormJson(`/api/form-security?action=${contract.action}`, {}, 15_000, fetchImpl),
    ]);
    if (!csrf.response.ok || typeof csrf.data.csrfToken !== "string" || !csrf.data.csrfToken
      || !security.response.ok || typeof security.data.securityCheckToken !== "string" || !security.data.securityCheckToken) {
      throw new PublicFormSubmissionError("The secure form could not connect. Your answers are still here. Please try again.");
    }
    const headers: Record<string, string> = { "X-CSRF-Token": csrf.data.csrfToken };
    if (options.contentType) headers["Content-Type"] = options.contentType;
    const result = await fetchFormJson(options.endpoint, {
      method: "POST",
      headers,
      body: options.body(security.data.securityCheckToken),
    }, contract.timeoutMs, fetchImpl);
    // This code is emitted only before validation/storage/notifications. One
    // retry handles simultaneous first loads safely; no other POST is retried.
    if (attempt === 0 && result.response.status === 403 && result.data.code === "FORM_SESSION_EXPIRED") continue;
    if (!result.response.ok || result.data[contract.successKey] !== true) {
      throw new PublicFormSubmissionError(
        typeof result.data.error === "string" ? result.data.error : "The form could not be submitted. Your answers are still here. Please try again.",
        result.response.status,
      );
    }
    return result.data;
  }
  throw new PublicFormSubmissionError("The form session could not be refreshed. Please try again.");
}
