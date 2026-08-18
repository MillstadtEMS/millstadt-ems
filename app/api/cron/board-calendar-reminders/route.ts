/**
 * GET /api/cron/board-calendar-reminders
 * Sends board calendar email reminders that are due based on each item's
 * reminder settings. Intended for Vercel Cron; safe to run multiple daily
 * passes because each item records send counts and the last sent day.
 */
import { NextRequest, NextResponse } from "next/server";
import { sendGmailMessage } from "@/lib/reports/gmail-message";
import {
  getDueCalendarEmailReminders,
  markCalendarReminderError,
  markCalendarReminderSent,
  type DueCalendarReminder,
} from "@/lib/board/governance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" :
    c === "<" ? "&lt;" :
    c === ">" ? "&gt;" :
    c === "\"" ? "&quot;" : "&#39;");
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function buildEmail(item: DueCalendarReminder): { subject: string; html: string; text: string } {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://millstadtems.org";
  const date = formatDate(item.date);
  const time = [item.startTime, item.endTime].filter(Boolean).join(" - ") || "Time not set";
  const description = item.description?.trim() || "";
  const subject = `Board reminder: ${item.title} — ${date}`;
  const text = [
    `Board calendar reminder`,
    ``,
    item.title,
    `${date} · ${time}`,
    description,
    ``,
    `Open the board portal: ${site}/board/meetings`,
  ].filter(Boolean).join("\n");
  const html = `
    <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:620px;margin:0 auto;background:#081018;color:#f5f3ee;padding:32px;border-radius:16px;">
      <div style="color:#d1a45f;font-size:12px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;margin-bottom:8px;">Millstadt EMS Board</div>
      <h1 style="margin:0 0 10px;font-size:24px;line-height:1.15;color:#ffffff;">${escapeHtml(item.title)}</h1>
      <p style="margin:0 0 22px;color:#adb8c3;font-size:15px;">${escapeHtml(date)} · ${escapeHtml(time)}</p>
      ${description ? `<div style="background:#13202c;border:1px solid #2a3b4c;border-radius:10px;padding:16px;color:#d8dee5;line-height:1.55;white-space:pre-wrap;">${escapeHtml(description)}</div>` : ""}
      <p style="margin:22px 0 0;color:#7e8c99;font-size:13px;">This reminder was sent from the board portal calendar. <a href="${site}/board/meetings" style="color:#d1a45f;">Open meetings and reminders</a>.</p>
    </div>
  `;
  return { subject, html, text };
}

async function sendReminder(item: DueCalendarReminder) {
  const { subject, html, text } = buildEmail(item);
  return sendGmailMessage({
    fromName: "Millstadt EMS Board Portal",
    to: item.recipientEmails,
    subject,
    text,
    html,
  });
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await getDueCalendarEmailReminders();
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const item of due) {
    try {
      const result = await sendReminder(item);
      if (!result.sent) {
        skipped += 1;
        continue;
      }
      await markCalendarReminderSent(item.id);
      sent += 1;
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      await markCalendarReminderError(item.id, message);
      console.error("[board-calendar-reminders] send failed:", item.id, message);
    }
  }

  return NextResponse.json({ ok: true, checked: due.length, sent, failed, skipped });
}
