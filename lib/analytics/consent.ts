import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "crypto";
import type { NextResponse } from "next/server";
import { getAnalyticsConfig } from "./config";
import {
  OPTIONAL_ANALYTICS_CATEGORIES,
  type ConsentStatus,
  type OptionalAnalyticsCategory,
} from "./types";

export const ANALYTICS_CONSENT_COOKIE = "mas_analytics_consent";
export const ANALYTICS_BROWSER_COOKIE = "mas_analytics_browser";
export const ANALYTICS_SESSION_COOKIE = "mas_analytics_session";
export const ANALYTICS_OPTOUT_COOKIE = "mas_analytics_optout";

type ConsentCookie = {
  id: string;
  status: ConsentStatus;
  version: string;
  categories: OptionalAnalyticsCategory[];
  decidedAt: string;
};

function signingSecret() {
  return (
    process.env.ANALYTICS_HASH_KEY ||
    process.env.LOUNGE_ENCRYPTION_KEY ||
    process.env.ADMIN_PASSWORD ||
    ""
  );
}

function sign(value: string) {
  const secret = signingSecret();
  return secret ? createHmac("sha256", secret).update(value).digest("base64url") : null;
}

export function encodeConsentCookie(value: ConsentCookie) {
  const payload = Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
  const signature = sign(payload);
  return signature ? `v1.${payload}.${signature}` : null;
}

export function parseConsentCookie(raw: string | undefined): ConsentCookie | null {
  if (!raw) return null;
  const [format, payload, signature] = raw.split(".");
  if (format !== "v1" || !payload || !signature) return null;
  const expected = sign(payload);
  if (!expected) return null;
  const expectedBytes = Buffer.from(expected);
  const actualBytes = Buffer.from(signature);
  if (
    expectedBytes.length !== actualBytes.length ||
    !timingSafeEqual(expectedBytes, actualBytes)
  ) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<
      string,
      unknown
    >;
    const status = parsed.status;
    if (
      typeof parsed.id !== "string" ||
      !["allowed", "declined", "withdrawn"].includes(String(status)) ||
      typeof parsed.version !== "string" ||
      typeof parsed.decidedAt !== "string" ||
      Number.isNaN(Date.parse(parsed.decidedAt))
    ) {
      return null;
    }
    const categories = OPTIONAL_ANALYTICS_CATEGORIES.filter(
      (category) => Array.isArray(parsed.categories) && parsed.categories.includes(category),
    );
    return {
      id: parsed.id,
      status: status as ConsentStatus,
      version: parsed.version,
      categories,
      decidedAt: parsed.decidedAt,
    };
  } catch {
    return null;
  }
}

export function newConsentId() {
  return randomUUID();
}

export function randomFirstPartyId() {
  return randomBytes(32).toString("base64url");
}

export function hasCurrentAnalyticsConsent(
  consent: ConsentCookie | null,
  category: OptionalAnalyticsCategory,
) {
  const config = getAnalyticsConfig();
  return Boolean(
    config.optionalAnalyticsEnabled &&
      consent?.status === "allowed" &&
      consent.version === config.consentVersion &&
      consent.categories.includes(category),
  );
}

export function setConsentCookie(response: NextResponse, value: ConsentCookie) {
  const config = getAnalyticsConfig();
  const encoded = encodeConsentCookie(value);
  if (!encoded) return false;
  response.cookies.set(ANALYTICS_CONSENT_COOKIE, encoded, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: config.retention.consentDays * 24 * 60 * 60,
  });
  return true;
}

export function setOptionalIdentifierCookies(
  response: NextResponse,
  browserId: string | null,
  sessionId: string,
) {
  const config = getAnalyticsConfig();
  if (browserId) {
    response.cookies.set(ANALYTICS_BROWSER_COOKIE, browserId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/analytics",
      maxAge: config.retention.recurringVisitorDays * 24 * 60 * 60,
    });
  } else {
    response.cookies.set(ANALYTICS_BROWSER_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/analytics",
      maxAge: 0,
    });
  }
  response.cookies.set(ANALYTICS_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/analytics",
    maxAge: 30 * 60,
  });
}

export function clearOptionalIdentifierCookies(response: NextResponse) {
  for (const name of [ANALYTICS_BROWSER_COOKIE, ANALYTICS_SESSION_COOKIE]) {
    for (const path of ["/api/analytics", "/"]) {
      response.cookies.set(name, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path,
        maxAge: 0,
      });
    }
  }
}

export function setOptOutCookie(response: NextResponse, declined: boolean) {
  const config = getAnalyticsConfig();
  response.cookies.set(ANALYTICS_OPTOUT_COOKIE, declined ? "1" : "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: declined ? config.retention.consentDays * 24 * 60 * 60 : 0,
  });
}
