import {
  ANALYTICS_EVENT_NAMES,
  OPTIONAL_ANALYTICS_CATEGORIES,
  type AnalyticsEventInput,
  type OptionalAnalyticsCategory,
} from "./types";

const SENSITIVE_PREFIXES = [
  "/admin",
  "/api",
  "/board",
  "/inventory",
  "/lounge",
  "/truckcheck",
];

const DOCUMENT_EVENT_NAMES = new Set([
  "document_view",
  "document_download",
  "print_selection",
  "accessible_alternative",
]);

export function isPublicAnalyticsPath(path: string) {
  return (
    path.startsWith("/") &&
    !path.includes("?") &&
    !path.includes("#") &&
    !SENSITIVE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
  );
}

export function sanitizeAnalyticsPath(value: unknown) {
  if (typeof value !== "string") return null;
  const path = value.trim();
  if (path.length < 1 || path.length > 180 || !isPublicAnalyticsPath(path)) return null;
  return path;
}

export function parseAnalyticsEvent(value: unknown): AnalyticsEventInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const allowed = new Set([
    "eventName",
    "path",
    "occurredAt",
    "durationMs",
    "value",
    "documentKind",
    "documentId",
    "control",
  ]);
  if (Object.keys(input).some((key) => !allowed.has(key))) return null;
  if (
    typeof input.eventName !== "string" ||
    !ANALYTICS_EVENT_NAMES.includes(input.eventName as AnalyticsEventInput["eventName"])
  ) {
    return null;
  }
  const path = sanitizeAnalyticsPath(input.path);
  if (!path) return null;
  const occurredAt = new Date(typeof input.occurredAt === "string" ? input.occurredAt : "");
  if (
    Number.isNaN(occurredAt.getTime()) ||
    Math.abs(Date.now() - occurredAt.getTime()) > 24 * 60 * 60 * 1000
  ) {
    return null;
  }
  const durationMs = optionalNumber(input.durationMs, 0, 24 * 60 * 60 * 1000);
  const metricValue = optionalNumber(input.value, 0, 24 * 60 * 60 * 1000);
  const documentKind =
    input.documentKind === "public_form_990" || input.documentKind === "restricted_document"
      ? input.documentKind
      : undefined;
  const documentId = cleanToken(input.documentId, 100);
  const control = cleanToken(input.control, 80);
  if (DOCUMENT_EVENT_NAMES.has(input.eventName) && !documentKind) return null;

  return {
    eventName: input.eventName as AnalyticsEventInput["eventName"],
    path,
    occurredAt: occurredAt.toISOString(),
    ...(durationMs === undefined ? {} : { durationMs }),
    ...(metricValue === undefined ? {} : { value: metricValue }),
    ...(documentKind ? { documentKind } : {}),
    ...(documentId ? { documentId } : {}),
    ...(control ? { control } : {}),
  };
}

export function parseAcceptedCategories(value: unknown): OptionalAnalyticsCategory[] {
  if (!Array.isArray(value)) return [];
  return OPTIONAL_ANALYTICS_CATEGORIES.filter((category) => value.includes(category));
}

export function documentEventsMustBeUnlinked(eventName: string) {
  return DOCUMENT_EVENT_NAMES.has(eventName);
}

export function categorizeUserAgent(userAgent: string | null) {
  const ua = (userAgent ?? "").toLowerCase();
  const browserCategory = ua.includes("edg/")
    ? "Edge"
    : ua.includes("firefox/")
      ? "Firefox"
      : ua.includes("chrome/") || ua.includes("crios/")
        ? "Chrome"
        : ua.includes("safari/")
          ? "Safari"
          : "Other";
  const operatingSystemCategory = ua.includes("windows")
    ? "Windows"
    : ua.includes("android")
      ? "Android"
      : ua.includes("iphone") || ua.includes("ipad")
        ? "iOS/iPadOS"
        : ua.includes("mac os") || ua.includes("macintosh")
          ? "macOS"
          : ua.includes("linux")
            ? "Linux"
            : "Other";
  const deviceCategory = /ipad|tablet/.test(ua)
    ? "Tablet"
    : /mobile|iphone|android/.test(ua)
      ? "Mobile"
      : "Desktop";
  return { browserCategory, operatingSystemCategory, deviceCategory };
}

export function categorizeReferrer(referrer: string | null, siteHost: string) {
  if (!referrer) return "Direct or unavailable";
  try {
    const host = new URL(referrer).host.toLowerCase();
    if (host === siteHost.toLowerCase()) return "Internal";
    if (/google\.|bing\.|duckduckgo\.|yahoo\./.test(host)) return "Search";
    if (/facebook\.|instagram\.|linkedin\.|x\.com|twitter\./.test(host)) return "Social";
    return "External referral";
  } catch {
    return "Direct or unavailable";
  }
}

function cleanToken(value: unknown, maximum: number) {
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > maximum || !/^[a-zA-Z0-9 _.:/-]+$/.test(cleaned)) {
    return undefined;
  }
  return cleaned;
}

function optionalNumber(value: unknown, minimum: number, maximum: number) {
  if (value === undefined) return undefined;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < minimum || numeric > maximum) return undefined;
  return Math.round(numeric);
}
