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
import { getLatestUnrepliedSms, markSmsReplied } from "@/lib/db";
import { updateCallNature } from "@/lib/cad/db";
import { sendSms } from "@/lib/sms";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const body = String(form.get("Body") ?? "").trim();

  if (!body) return new NextResponse("<?xml version=\"1.0\"?><Response/>", { headers: { "Content-Type": "text/xml" } });

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
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${msg}</Message></Response>`;
  return new NextResponse(xml, { headers: { "Content-Type": "text/xml" } });
}
