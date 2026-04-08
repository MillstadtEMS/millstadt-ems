/**
 * POST /api/contact
 * Accepts form submissions from the website and sends them to millstadtems@gmail.com
 * via the existing Gmail OAuth credentials (sending from millstadtcad@gmail.com).
 */

import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createFormSubmission } from "@/lib/db";

export const runtime = "nodejs";

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

    // Store in database (fire-and-forget — don't block email on DB failure)
    createFormSubmission(formType, fields).catch(e => console.error("[contact] DB store failed:", e));

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

    const gmail = google.gmail({ version: "v1", auth: getAuth() });
    await gmail.users.messages.send({ userId: from, requestBody: { raw } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[contact] send error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
