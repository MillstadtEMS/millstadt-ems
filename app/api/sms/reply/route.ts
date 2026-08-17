/**
 * POST /api/sms/reply
 * Twilio webhook — receives inbound SMS replies.
 * When the admin replies with a chief complaint, updates the most recent
 * Medical First Responder call with that complaint.
 *
 * Twilio sends: Body, From, To, etc. as application/x-www-form-urlencoded
 * Webhook URL must be set in your Twilio phone number settings.
 */
import { NextRequest, NextResponse } from "next/server";
import Twilio from "twilio";
import { getLatestUnrepliedSms, markSmsReplied } from "@/lib/db";
import { updateCallNature } from "@/lib/cad/db";
import { sendSms } from "@/lib/sms";
import { getFinancialsHubConfig } from "@/lib/financials-hub/config";
import {
  auditContextFromHeaders,
  decideAccessRequestFromSms,
} from "@/lib/financials-hub/dev-store";
import { notifyRequesterAccessDecision } from "@/lib/financials-hub/notifications";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const body = String(form.get("Body") ?? "").trim();

  if (!body) return new NextResponse("<?xml version=\"1.0\"?><Response/>", { headers: { "Content-Type": "text/xml" } });

  const financialsConfig = getFinancialsHubConfig();
  if (
    financialsConfig.environment === "development" &&
    financialsConfig.enabled &&
    /^(YES|NO)\b/i.test(body)
  ) {
    if (!isVerifiedFinancialsSms(req, form, financialsConfig.adminSmsNumber)) {
      return twimlResponse("Financials SMS decision ignored. Sender or Twilio signature was not authorized.");
    }
    if (!/DEV-REQ-[A-Z0-9]+/i.test(body)) {
      return twimlResponse("Reply with YES or NO plus the request ID, for example YES DEV-REQ-123.");
    }
    const context = auditContextFromHeaders(req.headers);
    const handled = decideAccessRequestFromSms(body, context);
    if (handled?.handled) {
      if ("request" in handled && handled.request) {
        await notifyRequesterAccessDecision(handled.request, context);
      }
      return twimlResponse(handled.message);
    }
  }

  const pending = await getLatestUnrepliedSms();

  if (!pending) {
    // No pending call — just acknowledge
    return twimlResponse("No pending call to update.");
  }

  if (body.toUpperCase() === "SKIP") {
    await markSmsReplied(pending.id);
    return twimlResponse("OK, kept as-is.");
  }

  // Update the call nature with the chief complaint
  const updatedNature = `${pending.callNature}: ${body}`;
  await updateCallNature(pending.callId, updatedNature);
  await markSmsReplied(pending.id);

  // Confirmation SMS
  await sendSms(`Updated: ${updatedNature}`).catch(() => {});

  return twimlResponse(`Updated to: ${updatedNature}`);
}

function twimlResponse(msg: string): NextResponse {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(msg)}</Message></Response>`;
  return new NextResponse(xml, { headers: { "Content-Type": "text/xml" } });
}

function isVerifiedFinancialsSms(req: NextRequest, form: FormData, configuredAdminNumber: string) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = req.headers.get("x-twilio-signature") ?? "";
  if (!authToken || !signature) return false;

  const from = normalizePhone(String(form.get("From") ?? ""));
  const allowedNumbers = new Set(
    [
      configuredAdminNumber,
      process.env.MILLSTADT_INFORMATION_HUB_ADMIN_SMS_NUMBER,
      process.env.ADMIN_PHONE_NUMBER,
      ...splitPhoneList(process.env.MILLSTADT_INFORMATION_HUB_ADMIN_SMS_NUMBERS),
    ]
      .map(normalizePhone)
      .filter(Boolean),
  );
  if (!from || allowedNumbers.size === 0 || !allowedNumbers.has(from)) return false;

  try {
    return Twilio.validateRequest(authToken, signature, publicWebhookUrl(req), formParams(form));
  } catch {
    return false;
  }
}

function publicWebhookUrl(req: NextRequest) {
  const explicitUrl = process.env.TWILIO_SMS_REPLY_WEBHOOK_URL?.trim();
  if (explicitUrl) return explicitUrl;

  const url = new URL(req.url);
  const forwardedHost = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const forwardedProto = req.headers.get("x-forwarded-proto");
  if (forwardedHost) url.host = forwardedHost;
  if (forwardedProto) url.protocol = `${forwardedProto}:`;
  return url.toString();
}

function formParams(form: FormData) {
  const params: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    params[key] = typeof value === "string" ? value : value.name;
  }
  return params;
}

function splitPhoneList(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizePhone(value: string | undefined) {
  return (value ?? "").trim().replace(/[^\d+]/g, "");
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
