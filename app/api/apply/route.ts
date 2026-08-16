import { NextRequest } from "next/server";
import { google } from "googleapis";
import { createFormSubmission } from "@/lib/db";
import { buildApplicationFlags } from "@/lib/application-flags";
import { notifyAdminsInLounge } from "@/lib/lounge/notify-admins";
import {
  contentLengthWithin,
  escapeHtml,
  hasContentType,
  hasValidCsrfToken,
  issueCsrfToken,
  noStoreJson,
  safeHeaderValue,
} from "@/lib/security/http";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { parseEmploymentApplication } from "@/lib/security/employment-application-schema";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const CSRF_SCOPE = "employment";
const MAX_BODY_BYTES = 1_200_000;

function getGmailClient() {
  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_USER } = process.env;
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
    throw new Error("Gmail OAuth credentials are not configured.");
  }
  const auth = new google.auth.OAuth2(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });
  return {
    gmail: google.gmail({ version: "v1", auth }),
    sender: safeHeaderValue(GMAIL_USER || "millstadtcad@gmail.com", 254),
  };
}

function buildNotificationEmail(options: {
  sender: string;
  reviewUrl: string;
  submissionId: string;
}) {
  const subject = safeHeaderValue("[EMS Website] New employment application");
  const html = [
    "<p>A new employment application was received.</p>",
    `<p><a href="${escapeHtml(options.reviewUrl)}">Open the protected administrator record</a>.</p>`,
    `<p>Submission ID: ${escapeHtml(options.submissionId)}</p>`,
    "<p>Applicant details are intentionally omitted from email.</p>",
  ].join("");
  const message = [
    "MIME-Version: 1.0",
    `From: Millstadt EMS Careers <${options.sender}>`,
    "To: millstadtems@gmail.com",
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(html, "utf8").toString("base64"),
  ].join("\r\n");
  return Buffer.from(message, "utf8").toString("base64url");
}

export async function GET() {
  return issueCsrfToken(CSRF_SCOPE);
}

export async function POST(req: NextRequest) {
  if (!hasContentType(req, "multipart/form-data") || !contentLengthWithin(req, MAX_BODY_BYTES)) {
    return noStoreJson({ success: false, error: "Invalid or oversized application." }, { status: 413 });
  }
  if (!hasValidCsrfToken(req, CSRF_SCOPE)) {
    return noStoreJson({ success: false, error: "Refresh the application and try again." }, { status: 403 });
  }

  const ipLimit = await checkRateLimit(req, "employment-application", {
    limit: 3,
    windowMs: 24 * 60 * 60_000,
    blockMs: 24 * 60 * 60_000,
  });
  if (!ipLimit.allowed) {
    const response = noStoreJson(
      { success: false, error: "Too many applications. Please try again later." },
      { status: 429 },
    );
    response.headers.set("Retry-After", String(ipLimit.retryAfterSeconds));
    return response;
  }

  try {
    const formData = await req.formData();
    const rawFields: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        if (value.size > 0) {
          return noStoreJson(
            { success: false, error: "File uploads are not accepted with the initial application." },
            { status: 400 },
          );
        }
      } else {
        rawFields[key] = rawFields[key] ? `${rawFields[key]}, ${value}` : value;
      }
    }

    const parsed = parseEmploymentApplication(rawFields);
    if (!parsed.ok) return noStoreJson({ success: false, error: parsed.error }, { status: 400 });
    const fields = parsed.fields;

    const identityLimit = await checkRateLimit(req, "employment-application-identity", {
      limit: 2,
      windowMs: 24 * 60 * 60_000,
      blockMs: 24 * 60 * 60_000,
      discriminator: fields.email,
    });
    if (!identityLimit.allowed) {
      const response = noStoreJson(
        { success: false, error: "An application was already received recently." },
        { status: 429 },
      );
      response.headers.set("Retry-After", String(identityLimit.retryAfterSeconds));
      return response;
    }

    let submissionId: string;
    try {
      const submission = await createFormSubmission("Employment Application", fields);
      submissionId = submission.id;
    } catch (error) {
      console.error("[apply] protected submission store failed", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
      return noStoreJson(
        { success: false, error: "The application could not be stored securely. Please try again later." },
        { status: 503 },
      );
    }

    const flagCount = buildApplicationFlags(fields).length;
    const flagText = flagCount > 0 ? ` · ${flagCount} flag${flagCount === 1 ? "" : "s"}` : "";
    await notifyAdminsInLounge({
      kind: "post",
      title: "New Employment Application",
      bodyPreview: `Open the protected application record${flagText}.`,
      linkUrl: `/admin/submissions/${submissionId}`,
      sourceId: submissionId,
    }).catch((error) => {
      console.error("[apply] administrator notification failed", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
    });

    try {
      const { gmail, sender } = getGmailClient();
      const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.millstadtems.org").replace(/\/$/, "");
      const raw = buildNotificationEmail({
        sender,
        reviewUrl: `${site}/admin/submissions/${submissionId}`,
        submissionId,
      });
      await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
    } catch (error) {
      console.error("[apply] notification email failed", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
    }

    return noStoreJson({ success: true });
  } catch (error) {
    console.error("[apply] application submission failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return noStoreJson(
      { success: false, error: "The application could not be submitted securely. Please try again later." },
      { status: 500 },
    );
  }
}
