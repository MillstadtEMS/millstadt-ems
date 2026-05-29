/**
 * SMS via Twilio. Falls back to console log if Twilio env vars aren't set
 * (useful for dev + the brief window before the user finishes Twilio setup).
 *
 * Required env vars for real SMS:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_FROM_NUMBER         (in E.164 form, e.g. +16185551234)
 */

export interface SmsResult {
  delivered: boolean;
  via: "twilio" | "fallback";
  detail?: string;
}

export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
}

export async function sendSms(toE164: string, body: string): Promise<SmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!sid || !token || !from) {
    console.warn(`[sms-fallback] no Twilio creds; would have sent to ${toE164}: ${body}`);
    return { delivered: false, via: "fallback", detail: "Twilio not configured" };
  }

  const params = new URLSearchParams();
  params.set("To", toE164);
  params.set("From", from);
  params.set("Body", body);

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error("[twilio] send failed", res.status, txt);
      return { delivered: false, via: "twilio", detail: `Twilio ${res.status}` };
    }
    return { delivered: true, via: "twilio" };
  } catch (e) {
    console.error("[twilio] error", e);
    return { delivered: false, via: "twilio", detail: e instanceof Error ? e.message : "unknown" };
  }
}
