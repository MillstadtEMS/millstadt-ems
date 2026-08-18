/**
 * POST /api/contact
 * Accepts form submissions from the website and sends them to millstadtems@gmail.com
 * via the existing Gmail OAuth credentials (sending from millstadtcad@gmail.com).
 */

import { NextRequest } from "next/server";
import { createFormSubmission } from "@/lib/db";
import { sendGmailMessage } from "@/lib/reports/gmail-message";
import { notifyAdminsInLounge } from "@/lib/lounge/notify-admins";
import {
  contentLengthWithin,
  escapeHtml,
  hasContentType,
  hasValidCsrfToken,
  issueCsrfToken,
  noStoreJson,
} from "@/lib/security/http";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { parsePublicFormSubmission } from "@/lib/security/public-form-schemas";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

const CSRF_SCOPE = "contact";
const MAX_BODY_BYTES = 64 * 1024;

export async function GET() {
  return issueCsrfToken(CSRF_SCOPE);
}

export async function POST(req: NextRequest) {
  if (!hasContentType(req, "application/json") || !contentLengthWithin(req, MAX_BODY_BYTES)) {
    return noStoreJson({ error: "Invalid request." }, { status: 415 });
  }
  if (!hasValidCsrfToken(req, CSRF_SCOPE)) {
    return noStoreJson({ error: "Refresh the form and try again." }, { status: 403 });
  }
  const limit = await checkRateLimit(req, "public-contact", {
    limit: 5,
    windowMs: 15 * 60_000,
    blockMs: 30 * 60_000,
  });
  if (!limit.allowed) {
    const response = noStoreJson({ error: "Too many submissions. Please wait and try again." }, { status: 429 });
    response.headers.set("Retry-After", String(limit.retryAfterSeconds));
    return response;
  }

  try {
    const rawBody = await req.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
      return noStoreJson({ error: "Submission is too large." }, { status: 413 });
    }
    const parsed = parsePublicFormSubmission(JSON.parse(rawBody));
    if (!parsed.ok) return noStoreJson({ error: parsed.error }, { status: 400 });
    const { formType, fields } = parsed;

    // Durable protected storage is the success boundary. Notification side
    // effects only run after the submission has a stable record ID.
    let submissionId: string;
    try {
      const sub = await createFormSubmission(formType, fields);
      submissionId = sub.id;
    } catch (e) {
      console.error("[contact] protected submission store failed", {
        name: e instanceof Error ? e.name : "UnknownError",
      });
      return noStoreJson(
        { error: "The submission could not be stored securely. Please try again later." },
        { status: 503 },
      );
    }

    // Light the admin bell + sidebar badge — best-effort, never blocks the
    // submission. Do not copy requester PII into notification surfaces.
    try {
      await notifyAdminsInLounge({
        kind: "post",
        title: `New ${formType}`,
        bodyPreview: "Open the protected submission record to review it.",
        linkUrl: `/admin/submissions/${submissionId}`,
        sourceId: submissionId,
      });
    } catch (e) {
      console.error("[contact] notify admins failed:", e);
    }

    // Email is notification-only. Personal fields stay in the protected
    // submission record instead of being copied into an ordinary mailbox.
    const emailBody = [
      `New ${formType} submission from millstadtems.org`,
      `Submitted: ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })} CDT`,
      "",
      `Submission ID: ${submissionId}`,
      `Review: ${(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.millstadtems.org").replace(/\/$/, "")}/admin/submissions/${submissionId}`,
      "",
      "Requester details are intentionally omitted from email.",
    ].join("\n");

    const to   = "millstadtems@gmail.com";
    const subject = `[EMS Website] ${formType}`;

    try {
      await sendGmailMessage({
        fromName: "Millstadt EMS Website",
        to: [to],
        subject,
        text: emailBody,
        html: `<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap;">${escapeHtml(emailBody)}</pre>`,
      });
      return noStoreJson({ ok: true });
    } catch (mailErr) {
      const msg = mailErr instanceof Error ? mailErr.message : String(mailErr);
      console.error("[contact] mail send failed:", msg);
      return noStoreJson({
        ok: true,
        warning: "Submission received (email notification delayed)",
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[contact] send error:", msg);
    return noStoreJson({
      error: "Could not submit form. Please try again or email millstadtems@gmail.com directly.",
    }, { status: 500 });
  }
}
