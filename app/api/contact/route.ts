/**
 * POST /api/contact
 * Accepts form submissions from the website and sends them to millstadtems@gmail.com
 * via the existing Gmail OAuth credentials (sending from millstadtcad@gmail.com).
 */

import { NextRequest } from "next/server";
import { google } from "googleapis";
import { createFormSubmission } from "@/lib/db";
import { encodeMimeSubject } from "@/lib/reports/subject";
import { notifyAdminsInLounge } from "@/lib/lounge/notify-admins";
import {
  contentLengthWithin,
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

function getAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return auth;
}

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

    // Always save to DB FIRST so submissions aren't lost if email fails
    let dbSaved = false;
    let submissionId: string | null = null;
    try {
      const sub = await createFormSubmission(formType, fields);
      submissionId = sub.id;
      dbSaved = true;
    } catch (e) {
      console.error("[contact] DB store failed:", e);
    }

    // Light the admin bell + sidebar badge — best-effort, never blocks the
    // submission. Do not copy requester PII into notification surfaces.
    if (submissionId) {
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
    }

    // Email is notification-only. Personal fields stay in the protected
    // submission record instead of being copied into an ordinary mailbox.
    const emailBody = [
      `New ${formType} submission from millstadtems.org`,
      `Submitted: ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })} CDT`,
      "",
      submissionId ? `Submission ID: ${submissionId}` : "Submission ID unavailable.",
      submissionId ? `Review: ${(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.millstadtems.org").replace(/\/$/, "")}/admin/submissions/${submissionId}` : "Review the protected administrator submission queue.",
      "",
      "Requester details are intentionally omitted from email.",
    ].join("\n");

    const from = process.env.GMAIL_USER ?? "millstadtcad@gmail.com";
    const to   = "millstadtems@gmail.com";
    const subject = `[EMS Website] ${formType}`;

    const rawEmail = Buffer.from(
      `From: Millstadt EMS Website <${from}>\r\n` +
      `To: ${to}\r\n` +
      `Subject: ${encodeMimeSubject(subject)}\r\n` +
      `MIME-Version: 1.0\r\n` +
      `Content-Type: text/plain; charset=UTF-8\r\n` +
      `Content-Transfer-Encoding: base64\r\n` +
      `\r\n` +
      Buffer.from(emailBody, "utf8").toString("base64").replace(/(.{76})/g, "$1\r\n")
    ).toString("base64url");

    try {
      const gmail = google.gmail({ version: "v1", auth: getAuth() });
      await gmail.users.messages.send({ userId: from, requestBody: { raw: rawEmail } });
      return noStoreJson({ ok: true });
    } catch (mailErr) {
      const msg = mailErr instanceof Error ? mailErr.message : String(mailErr);
      console.error("[contact] mail send failed:", msg);
      // Email failed but DB saved → still treat as success since submission is stored
      if (dbSaved) {
        return noStoreJson({
          ok: true,
          warning: "Submission received (email notification delayed)",
        });
      }
      // Both failed
      const friendly = msg.includes("invalid_grant") || msg.includes("revoked")
        ? "Form system temporarily unavailable. Please call (618) 277-3565 or email millstadtems@gmail.com."
        : "Could not submit form. Please try again or email millstadtems@gmail.com.";
      return noStoreJson({ error: friendly }, { status: 500 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[contact] send error:", msg);
    return noStoreJson({
      error: "Could not submit form. Please try again or email millstadtems@gmail.com directly.",
    }, { status: 500 });
  }
}
