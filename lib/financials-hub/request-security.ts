import { randomBytes, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { noStoreJson } from "./api-helpers";
import { FinancialsHubError } from "./dev-store";

export function issueCsrfToken(cookieName: string, cookiePath: string) {
  const csrfToken = randomBytes(24).toString("base64url");
  const response = noStoreJson({ csrfToken });
  response.cookies.set(cookieName, csrfToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: cookiePath,
    maxAge: 30 * 60,
  });
  return response;
}

export function validateCsrfToken(
  req: NextRequest,
  cookieName: string,
  expiredMessage: string,
) {
  const cookieToken = req.cookies.get(cookieName)?.value ?? "";
  const headerToken = req.headers.get("x-csrf-token") ?? "";
  const cookieBytes = Buffer.from(cookieToken);
  const headerBytes = Buffer.from(headerToken);
  if (
    !cookieToken ||
    !headerToken ||
    cookieBytes.length !== headerBytes.length ||
    !timingSafeEqual(cookieBytes, headerBytes)
  ) {
    throw new FinancialsHubError(expiredMessage, 403);
  }
}

export function validateSameOriginRequest(req: NextRequest, noun: string) {
  const origin = req.headers.get("origin");
  const fetchSite = req.headers.get("sec-fetch-site");
  const requestHost = req.headers.get("host")?.trim() || req.nextUrl.host;
  let originHost = "";
  if (origin) {
    try {
      originHost = new URL(origin).host;
    } catch {
      throw new FinancialsHubError(`Cross-site ${noun} was blocked.`, 403);
    }
  }
  if (
    (!origin && fetchSite !== "same-origin") ||
    (originHost && originHost !== requestHost) ||
    (fetchSite && fetchSite !== "same-origin")
  ) {
    throw new FinancialsHubError(`Cross-site ${noun} was blocked.`, 403);
  }
}

export function requireContentType(req: NextRequest, prefix: string, message: string) {
  if (!req.headers.get("content-type")?.toLowerCase().startsWith(prefix)) {
    throw new FinancialsHubError(message, 415);
  }
}

export function enforceContentLength(req: NextRequest, maximumBytes: number, message: string) {
  const raw = req.headers.get("content-length");
  if (!raw) return;
  const length = Number(raw);
  if (!Number.isFinite(length) || length < 0 || length > maximumBytes) {
    throw new FinancialsHubError(message, 413);
  }
}

export function assertAllowedObjectKeys(
  value: unknown,
  allowedKeys: readonly string[],
  message: string,
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new FinancialsHubError(message, 400);
  }
  const allowed = new Set(allowedKeys);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    throw new FinancialsHubError(message, 400);
  }
}
