/**
 * GET /api/cron/submission-reminders
 *   Triggered by Vercel cron (entry in vercel.json). Requires the
 *   CRON_SECRET in the Authorization header.
 *
 * Sends a single reminder email to millstadtems@gmail.com listing every
 * website form submission still unread after 5 days. Each item is only
 * reminded once — the column reminded_at is stamped on first send.
 */
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import {
  findOverdueSubmissions,
  markSubmissionsReminded,
  FormSubmission,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const THRESHOLD_DAYS = 5;

function getAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return auth;
}

function nameOf(fields: Record<string, string | string[]>) {
  const first = String(fields.first_name ?? fields.name ?? "");
  const last = String(fields.last_name ?? "");
  return [first, last].filter(Boolean).join(" ").trim() || "(no name)";
}

function summarize(row: FormSubmission) {
  const who = nameOf(row.fields);
  const when = new Date(row.submittedAt).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const days = Math.floor((Date.now() - new Date(row.submittedAt).getTime()) / 86400000);
  return `• [${row.formType}] ${who} — submitted ${when} CDT (${days} days ago)`;
}

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const overdue = await findOverdueSubmissions(THRESHOLD_DAYS);
  if (overdue.length === 0) {
    return NextResponse.json({ ok: true, reminded: 0, message: "Nothing overdue." });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://millstadtems.org";
  const emailBody = [
    `Reminder: ${overdue.length} form submission${overdue.length === 1 ? "" : "s"} from millstadtems.org ${overdue.length === 1 ? "has" : "have"} been waiting more than ${THRESHOLD_DAYS} days without an admin opening ${overdue.length === 1 ? "it" : "them"}.`,
    "",
    ...overdue.map(summarize),
    "",
    `Open the admin queue: ${baseUrl}/admin/submissions`,
    "",
    "(Opening a submission in the admin console clears the reminder for that item.)",
  ].join("\n");

  const from = process.env.GMAIL_USER ?? "millstadtcad@gmail.com";
  const to = "millstadtems@gmail.com";
  const subject = `[EMS Website] ${overdue.length} submission${overdue.length === 1 ? "" : "s"} need a response (${THRESHOLD_DAYS}+ days old)`;

  const raw = Buffer.from(
    `From: Millstadt EMS Website <${from}>\r\n` +
    `To: ${to}\r\n` +
    `Subject: ${subject}\r\n` +
    `Content-Type: text/plain; charset=utf-8\r\n` +
    `\r\n` +
    emailBody
  ).toString("base64url");

  let mailed = false;
  try {
    const gmail = google.gmail({ version: "v1", auth: getAuth() });
    await gmail.users.messages.send({ userId: from, requestBody: { raw } });
    mailed = true;
  } catch (e) {
    console.error("[cron/submission-reminders] mail send failed:", e);
  }

  // Only stamp reminded_at if Gmail actually accepted the message — otherwise
  // we'd silently drop the reminder on a Gmail blip.
  if (mailed) {
    await markSubmissionsReminded(overdue.map((r) => r.id));
  }

  return NextResponse.json({
    ok: true,
    reminded: mailed ? overdue.length : 0,
    mailed,
    items: overdue.map((r) => ({ id: r.id, formType: r.formType })),
  });
}
