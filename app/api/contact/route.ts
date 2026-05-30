/**
 * POST /api/contact
 * Accepts form submissions from the website and sends them to millstadtems@gmail.com
 * via the existing Gmail OAuth credentials (sending from millstadtcad@gmail.com).
 */

import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createFormSubmission } from "@/lib/db";
import { encodeMimeSubject } from "@/lib/reports/subject";
import { notifyAdminsInLounge } from "@/lib/lounge/notify-admins";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

function getAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return auth;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, string | string[]>;
    const { formType, ...fields } = body;

    if (!formType || typeof formType !== "string") {
      return NextResponse.json({ error: "Missing formType" }, { status: 400 });
    }

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
    // submission. Body preview deliberately omits PII like emails/phones.
    if (submissionId) {
      const submitterName = pickSubmitterName(fields);
      try {
        await notifyAdminsInLounge({
          kind: "post",
          title: `New ${formType}${submitterName ? `: ${submitterName}` : ""}`,
          bodyPreview: previewForFormType(formType, fields),
          linkUrl: `/admin/submissions/${submissionId}`,
          sourceId: submissionId,
        });
      } catch (e) {
        console.error("[contact] notify admins failed:", e);
      }
    }

    // Build a readable plain-text email body from form fields
    const lines = Object.entries(fields).map(([key, val]) => {
      const label = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      const value = Array.isArray(val) ? val.join(", ") : (val || "—");
      return `${label}: ${value}`;
    });

    const emailBody = [
      `New ${formType} submission from millstadtems.org`,
      `Submitted: ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })} CDT`,
      "",
      ...lines,
    ].join("\n");

    const from = process.env.GMAIL_USER ?? "millstadtcad@gmail.com";
    const to   = "millstadtems@gmail.com";
    const subject = `[EMS Website] ${formType}`;

    const raw = Buffer.from(
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
      await gmail.users.messages.send({ userId: from, requestBody: { raw } });
      return NextResponse.json({ ok: true });
    } catch (mailErr) {
      const msg = mailErr instanceof Error ? mailErr.message : String(mailErr);
      console.error("[contact] mail send failed:", msg);
      // Email failed but DB saved → still treat as success since submission is stored
      if (dbSaved) {
        return NextResponse.json({
          ok: true,
          warning: "Submission received (email notification delayed)",
        });
      }
      // Both failed
      const friendly = msg.includes("invalid_grant") || msg.includes("revoked")
        ? "Form system temporarily unavailable. Please call (618) 277-3565 or email millstadtems@gmail.com."
        : "Could not submit form. Please try again or email millstadtems@gmail.com.";
      return NextResponse.json({ error: friendly }, { status: 500 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[contact] send error:", msg);
    return NextResponse.json({
      error: "Could not submit form. Please try again or email millstadtems@gmail.com directly.",
    }, { status: 500 });
  }
}

function pickSubmitterName(fields: Record<string, string | string[]>): string {
  const first = String(fields.first_name ?? fields.firstName ?? "").trim();
  const last  = String(fields.last_name  ?? fields.lastName  ?? "").trim();
  const name  = String(fields.name ?? "").trim();
  return [first, last].filter(Boolean).join(" ") || name;
}

function previewForFormType(formType: string, fields: Record<string, string | string[]>): string {
  const date = String(fields.event_date ?? fields.preferred_date ?? fields.date ?? "").trim();
  const subject = String(fields.subject ?? fields.topic ?? "").trim();
  if (date) return `Requested date: ${date}`;
  if (subject) return subject;
  return `New ${formType} submitted from millstadtems.org`;
}
