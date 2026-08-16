import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import {
  ANALYTICS_BROWSER_COOKIE,
  ANALYTICS_CONSENT_COOKIE,
  ANALYTICS_SESSION_COOKIE,
  hasCurrentAnalyticsConsent,
  parseConsentCookie,
  randomFirstPartyId,
  setOptionalIdentifierCookies,
} from "@/lib/analytics/consent";
import { pseudonymousHash } from "@/lib/analytics/crypto";
import { getAnalyticsConfig } from "@/lib/analytics/config";
import {
  allowAnalyticsRequest,
  contentLengthWithin,
  hasJsonContentType,
  isSameOriginRequest,
  noStoreJson,
  requestIp,
} from "@/lib/analytics/http";
import {
  pruneExpiredAnalytics,
  saveAnalyticsEvent,
  saveSecurityEvent,
  touchReturningBrowser,
} from "@/lib/analytics/store";
import {
  categorizeReferrer,
  categorizeUserAgent,
  documentEventsMustBeUnlinked,
  parseAnalyticsEvent,
} from "@/lib/analytics/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const config = getAnalyticsConfig();
  if (!config.optionalAnalyticsEnabled) return noStoreJson({ accepted: false });
  if (!isSameOriginRequest(req)) {
    await recordBlocked(req, "Cross-site analytics event blocked.", 403);
    return noStoreJson({ error: "Request blocked." }, { status: 403 });
  }
  if (!hasJsonContentType(req) || !contentLengthWithin(req, 4_096)) {
    await recordBlocked(req, "Invalid analytics content type or size.", 415);
    return noStoreJson({ error: "Invalid event." }, { status: 415 });
  }
  if (!(await allowAnalyticsRequest(req, "optional-events", 120, 60_000))) {
    return noStoreJson({ error: "Too many events." }, { status: 429 });
  }

  const consent = parseConsentCookie(req.cookies.get(ANALYTICS_CONSENT_COOKIE)?.value);
  if (!hasCurrentAnalyticsConsent(consent, "aggregate")) {
    return noStoreJson({ accepted: false }, { status: 403 });
  }

  let parsed: ReturnType<typeof parseAnalyticsEvent>;
  try {
    parsed = parseAnalyticsEvent(await req.json());
  } catch {
    parsed = null;
  }
  if (!parsed) {
    await recordBlocked(req, "Analytics payload validation failed.", 400);
    return noStoreJson({ error: "Invalid event." }, { status: 400 });
  }

  const unlinkedDocumentEvent =
    documentEventsMustBeUnlinked(parsed.eventName) || Boolean(parsed.documentKind);
  const browserId = req.cookies.get(ANALYTICS_BROWSER_COOKIE)?.value ?? randomFirstPartyId();
  const sessionId = req.cookies.get(ANALYTICS_SESSION_COOKIE)?.value ?? randomFirstPartyId();
  const returningAllowed =
    !unlinkedDocumentEvent && hasCurrentAnalyticsConsent(consent, "returning_visitor");
  const browserHash = returningAllowed ? pseudonymousHash(browserId) : null;
  const sessionHash = unlinkedDocumentEvent ? null : pseudonymousHash(sessionId);
  let returningBrowser: boolean | null = null;
  let returnIntervalDays: number | null = null;
  if (browserHash && sessionHash) {
    const estimate = await touchReturningBrowser({
      browserHash,
      sessionHash,
      occurredAt: parsed.occurredAt,
    });
    returningBrowser = estimate.returningBrowser;
    returnIntervalDays = estimate.returnIntervalDays;
  }

  const userAgent = categorizeUserAgent(req.headers.get("user-agent"));
  const geographyAllowed = hasCurrentAnalyticsConsent(consent, "broad_geography");
  const referringSource = categorizeReferrer(
    req.headers.get("x-analytics-referrer"),
    req.nextUrl.host,
  );
  await saveAnalyticsEvent({
    ...parsed,
    id: randomUUID(),
    sessionHash,
    browserHash,
    returningBrowser,
    returnIntervalDays,
    ...userAgent,
    referringSource,
    country: geographyAllowed ? cleanGeo(req.headers.get("x-vercel-ip-country"), 2) : null,
    region: geographyAllowed ? cleanGeo(req.headers.get("x-vercel-ip-country-region"), 80) : null,
    city: geographyAllowed ? cleanGeo(req.headers.get("x-vercel-ip-city"), 80) : null,
  });
  if (Math.random() < 0.01) await pruneExpiredAnalytics().catch(() => undefined);

  const response = noStoreJson({ accepted: true }, { status: 202 });
  if (!unlinkedDocumentEvent) {
    setOptionalIdentifierCookies(response, returningAllowed ? browserId : null, sessionId);
  }
  return response;
}

async function recordBlocked(req: NextRequest, reason: string, responseStatus: number) {
  await saveSecurityEvent({
    eventType: "unauthorized_access",
    route: req.nextUrl.pathname,
    method: req.method,
    responseStatus,
    ipAddress: requestIp(req),
    userAgent: req.headers.get("user-agent"),
    reason,
  }).catch(() => undefined);
}

function cleanGeo(value: string | null, maximum: number) {
  if (!value) return null;
  try {
    const cleaned = decodeURIComponent(value).trim();
    return cleaned && cleaned.length <= maximum && /^[\p{L}\p{N} .'-]+$/u.test(cleaned)
      ? cleaned
      : null;
  } catch {
    return null;
  }
}
