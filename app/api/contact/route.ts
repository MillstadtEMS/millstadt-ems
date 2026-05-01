/**
 * POST /api/contact
 * Accepts form submissions from the website and sends them to millstadtems@gmail.com
 * via the existing Gmail OAuth credentials (sending from millstadtcad@gmail.com).
 */

import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createFormSubmission } from "@/lib/db";

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
    try {
      await createFormSubmission(formType, fields);
      dbSaved = true;
    } catch (e) {
      console.error("[contact] DB store failed:", e);
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
      `Subject: ${subject}\r\n` +
      `Content-Type: text/plain; charset=utf-8\r\n` +
      `\r\n` +
      emailBody
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
