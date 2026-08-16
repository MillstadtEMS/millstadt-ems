import { NextRequest } from "next/server";
import {
  ANALYTICS_BROWSER_COOKIE,
  ANALYTICS_CONSENT_COOKIE,
  ANALYTICS_SESSION_COOKIE,
  ANALYTICS_OPTOUT_COOKIE,
  clearOptionalIdentifierCookies,
  newConsentId,
  parseConsentCookie,
  randomFirstPartyId,
  setConsentCookie,
  setOptionalIdentifierCookies,
  setOptOutCookie,
} from "@/lib/analytics/consent";
import { getAnalyticsConfig, publicAnalyticsConfiguration } from "@/lib/analytics/config";
import {
  allowAnalyticsRequest,
  contentLengthWithin,
  hasJsonContentType,
  isSameOriginRequest,
  noStoreJson,
} from "@/lib/analytics/http";
import { saveConsent } from "@/lib/analytics/store";
import { parseAcceptedCategories } from "@/lib/analytics/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const config = getAnalyticsConfig();
  const consent = parseConsentCookie(req.cookies.get(ANALYTICS_CONSENT_COOKIE)?.value);
  const current = consent?.version === config.consentVersion ? consent : null;
  const optedOut = req.cookies.get(ANALYTICS_OPTOUT_COOKIE)?.value === "1";
  return noStoreJson({
    ...publicAnalyticsConfiguration(),
    preference: {
      status: current?.status ?? (optedOut ? "declined" : "unknown"),
      categories: current?.categories ?? [],
      decidedAt: current?.decidedAt ?? null,
    },
  });
}

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return noStoreJson({ error: "Cross-site preference update blocked." }, { status: 403 });
  }
  if (!hasJsonContentType(req) || !contentLengthWithin(req, 2_048)) {
    return noStoreJson({ error: "Invalid preference request." }, { status: 415 });
  }
  if (!(await allowAnalyticsRequest(req, "privacy-preferences", 20, 60_000))) {
    return noStoreJson({ error: "Too many preference updates." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return noStoreJson({ error: "Invalid preference request." }, { status: 400 });
  }
  if (
    !body ||
    Array.isArray(body) ||
    Object.keys(body).some((key) => !["status", "categories"].includes(key))
  ) {
    return noStoreJson({ error: "Invalid preference request." }, { status: 400 });
  }

  const requestedStatus = body.status;
  if (!["allowed", "declined", "withdrawn"].includes(String(requestedStatus))) {
    return noStoreJson({ error: "Invalid preference selection." }, { status: 400 });
  }
  const status = requestedStatus as "allowed" | "declined" | "withdrawn";
  const config = getAnalyticsConfig();
  const categories = status === "allowed" ? parseAcceptedCategories(body.categories) : [];
  if (status === "allowed" && !config.optionalAnalyticsEnabled) {
    return noStoreJson(
      { error: "Optional analytics are not enabled on this website." },
      { status: 409 },
    );
  }
  if (status === "allowed" && !categories.includes("aggregate")) {
    return noStoreJson(
      { error: "Select aggregate website analytics or decline optional analytics." },
      { status: 400 },
    );
  }

  const existing = parseConsentCookie(req.cookies.get(ANALYTICS_CONSENT_COOKIE)?.value);
  const now = new Date().toISOString();
  const consent = {
    id: existing?.id ?? newConsentId(),
    status,
    version: config.consentVersion,
    categories,
    decidedAt: now,
  };
  let consentRecorded = true;
  try {
    await saveConsent({
      id: consent.id,
      status,
      consentVersion: consent.version,
      categories,
      decidedAt: now,
      withdrawnAt: status === "withdrawn" ? now : null,
    });
  } catch {
    consentRecorded = false;
  }
  if (status === "allowed" && !consentRecorded) {
    return noStoreJson(
      { error: "Optional analytics could not be enabled because the consent record was not stored." },
      { status: 503 },
    );
  }

  const response = noStoreJson({
    ok: true,
    preference: { status, categories, decidedAt: now },
  });
  if (!setConsentCookie(response, consent) && status === "allowed") {
    return noStoreJson({ error: "Privacy preference storage is not configured." }, { status: 503 });
  }
  if (status === "allowed") {
    setOptOutCookie(response, false);
    setOptionalIdentifierCookies(
      response,
      categories.includes("returning_visitor")
        ? req.cookies.get(ANALYTICS_BROWSER_COOKIE)?.value ?? randomFirstPartyId()
        : null,
      req.cookies.get(ANALYTICS_SESSION_COOKIE)?.value ?? randomFirstPartyId(),
    );
  } else {
    setOptOutCookie(response, true);
    clearOptionalIdentifierCookies(response);
  }
  return response;
}
