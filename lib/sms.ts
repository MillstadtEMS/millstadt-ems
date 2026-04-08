/**
 * SMS helper — Twilio.
 * Sends a text message to ADMIN_PHONE_NUMBER from TWILIO_FROM_NUMBER.
 * Returns true on success, false if Twilio is not configured.
 */
import Twilio from "twilio";

export async function sendSms(message: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_FROM_NUMBER;
  const to         = process.env.ADMIN_PHONE_NUMBER;

  if (!accountSid || !authToken || !from || !to) {
    console.warn("[sms] Twilio not fully configured — skipping SMS");
    return false;
  }

  try {
    const client = Twilio(accountSid, authToken);
    await client.messages.create({ body: message, from, to });
    return true;
  } catch (err) {
    console.error("[sms] Failed to send SMS:", err);
    return false;
  }
}

/** Returns true if the dispatch nature should trigger a chief-complaint SMS. */
export function shouldSendNatureSms(dispatchNature: string): boolean {
  return dispatchNature.toLowerCase().includes("medical first responder");
}
