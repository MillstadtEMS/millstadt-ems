import { NextRequest } from "next/server";
import { deliverProblemReport, parseProblemReport } from "@/lib/financials-hub/problem-reporting";
import { outboundEmailAllowed, sendGmailMessage } from "@/lib/reports/gmail-message";
import { hasContentType, isSameOriginRequest, noStoreJson, readBoundedJson } from "@/lib/security/http";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request) || !hasContentType(request, "application/json")) {
    return noStoreJson({ status: "invalid" }, { status: 403 });
  }
  const body = await readBoundedJson(request, 10240);
  const input = body.ok ? parseProblemReport(body.value) : null;
  if (!input) return noStoreJson({ status: "invalid" }, { status: 400 });
  if (!outboundEmailAllowed()) {
    return noStoreJson({ status: process.env.NODE_ENV === "development" ? "preview-disabled" : "unavailable" }, { status: 503 });
  }
  const mailConfigured = Boolean(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN);
  const securityConfigured = process.env.NODE_ENV !== "production" || Boolean(process.env.DATABASE_URL && (process.env.SECURITY_RATE_LIMIT_KEY || process.env.ANALYTICS_HASH_KEY || process.env.LOUNGE_ENCRYPTION_KEY));
  if (!mailConfigured || !securityConfigured) return noStoreJson({ status: "unavailable" }, { status: 503 });
  try {
    const limit = await checkRateLimit(request, "financials-technical-report", { limit: 5, windowMs: 3600000 });
    if (!limit.allowed) return noStoreJson({ status: "rate-limited" }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
    const result = await deliverProblemReport(input, sendGmailMessage);
    return noStoreJson(result, { status: result.status === "sent" ? 200 : 503 });
  } catch {
    return noStoreJson({ status: "unavailable" }, { status: 503 });
  }
}
