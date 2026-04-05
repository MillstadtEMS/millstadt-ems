/**
 * POST /api/cad/poll
 *
 * Triggered by Vercel Cron every 5 minutes (see vercel.json).
 * Also callable manually with the correct secret for testing.
 *
 * Security: requires Authorization: Bearer <CAD_POLL_SECRET> header,
 * OR the request must come from Vercel Cron (which sends the CRON_SECRET header
 * automatically in production).
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchUnreadDispatchEmails, markAsRead } from "@/lib/cad/gmail";
import { parseDispatchEmail, isCloseoutEmail, parseCloseoutEmail } from "@/lib/cad/parser";
import { isDuplicate, saveCall, saveFailedParse, markCallComplete, isEventNumberDuplicate } from "@/lib/cad/db";
import { transcribeAudio, extractNatureFromTranscript } from "@/lib/cad/whisper";

export const runtime = "nodejs"; // needs fs access

export async function GET(req: NextRequest) {
  return handlePoll(req);
}
export async function POST(req: NextRequest) {
  return handlePoll(req);
}

async function handlePoll(req: NextRequest): Promise<NextResponse> {
  // ── Auth ─────────────────────────────────────────────────────────────────
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    processed: 0,
    duplicates: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    // ── Fetch unread emails ────────────────────────────────────────────────
    const emails = await fetchUnreadDispatchEmails();

    for (const email of emails) {
      try {
        // ── Deduplication ────────────────────────────────────────────────
        if (await isDuplicate(email.id)) {
          results.duplicates++;
          await markAsRead(email.id).catch(() => {});
          continue;
        }

        // ── Closeout email (cencom@omnigo.com "EVENT CLOSEOUT ...") ──────
        if (isCloseoutEmail(email.subject)) {
          const closeout = parseCloseoutEmail(email.subject, email.body);
          if (closeout) {
            // Pass nature from closeout so the call record gets the real complaint
            const closeoutNature = closeout.nature !== "UNKNOWN" ? closeout.nature : null;
            await markCallComplete(closeout.closedAt, closeout.eventNumber, closeout.dispatchDate, closeout.dispatchTime, closeoutNature);
            results.processed++;
          } else {
            results.failed++;
          }
          await markAsRead(email.id);
          continue;
        }

        // ── Whisper: transcribe audio pager tone if present ──────────────
        let audioNature: string | null = null;
        if (email.audioAttachment) {
          const transcript = await transcribeAudio(
            email.audioAttachment.data,
            email.audioAttachment.mimeType,
            email.audioAttachment.filename,
          );
          if (transcript) {
            audioNature = extractNatureFromTranscript(transcript);
          }
        }

        // ── Parse dispatch email ─────────────────────────────────────────
        const parsed = parseDispatchEmail(email.subject, email.body, email.received);

        if (parsed.status === "failed") {
          await saveFailedParse({
            gmailMessageId: email.id,
            subject: email.subject,
            receivedAt: email.received.toISOString(),
            errorMessage: parsed.reason,
            // Store only first 300 chars for debug — never expose publicly
            rawSnippet: email.body.slice(0, 300),
          });
          results.failed++;
        } else {
          // Skip if this event number is already saved (duplicate from paired cfmsg emails)
          // Note: we do NOT skip Enroute emails — they carry the event number needed for closeout matching
          if (parsed.eventNumber && await isEventNumberDuplicate(parsed.eventNumber)) {
            results.duplicates++;
            await markAsRead(email.id);
            continue;
          }

          await saveCall({
            gmailMessageId:   email.id,
            eventNumber:      parsed.eventNumber,
            dispatchDatetime: parsed.dispatchDatetime,
            dispatchDate:     parsed.dispatchDate,
            dispatchTime:     parsed.dispatchTime,
            // Whisper transcript takes priority over text parsing
            dispatchNature:   audioNature ?? parsed.dispatchNature,
            sourceYear:       parsed.sourceYear,
            parseStatus:      parsed.status,
            completedAt:      null,
          });
          results.processed++;
        }

        // ── Mark as read ─────────────────────────────────────────────────
        await markAsRead(email.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.errors.push(`Message ${email.id}: ${msg}`);
        results.failed++;
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Gmail fetch failed: ${msg}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...results });
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CAD_POLL_SECRET;
  if (!secret) return false; // refuse if secret not set

  // Vercel Cron sends this header automatically
  const cronSecret = req.headers.get("x-vercel-cron-signature");
  if (cronSecret) return true; // Vercel cron is always trusted

  // Manual trigger with bearer token
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}
