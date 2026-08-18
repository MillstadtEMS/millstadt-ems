import { createHmac, timingSafeEqual } from "node:crypto";
import type { Testimonial } from "./testimonials";
import { sendGmailMessage } from "./reports/gmail-message";
import { escapeHtml, safeHeaderValue } from "./security/http";

export function signToken(id: string, action: string): string {
  const secret = process.env.APPROVAL_SECRET;
  if (!secret) throw new Error("APPROVAL_SECRET is not configured");
  return createHmac("sha256", secret)
    .update(`${id}:${action}`)
    .digest("hex")
    .slice(0, 32);
}

export function verifySignedToken(id: string, action: string, signature: string) {
  const expected = Buffer.from(signToken(id, action));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function sendApprovalEmail(t: Testimonial) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.millstadtems.org").replace(/\/$/, "");
  const reviewUrl = `${base}/admin/testimonials?review=${encodeURIComponent(t.id)}`;
  const displayNameValue = t.anonymous ? "Anonymous" : (t.name || "Anonymous");
  const displayName = escapeHtml(displayNameValue);
  const message = escapeHtml(t.message);

  const to = safeHeaderValue(process.env.TESTIMONIAL_REVIEW_EMAIL ?? "millstadtems@gmail.com", 254);
  const subject = safeHeaderValue(`New Testimonial - ${displayNameValue}`, 180);

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:580px;margin:0 auto;background:#040d1a;color:#f1f5f9;padding:40px;border-radius:16px;">
      <div style="margin-bottom:8px;">
        <span style="color:#f0b429;font-size:12px;font-weight:900;letter-spacing:0.2em;text-transform:uppercase;">New Submission</span>
      </div>
      <h1 style="color:#ffffff;font-size:28px;font-weight:900;margin:0 0 6px;">Testimonial Review</h1>
      <p style="color:#64748b;font-size:14px;margin:0 0 32px;">From: <strong style="color:#94a3b8;">${displayName}</strong> &nbsp;·&nbsp; ${new Date(t.submittedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>

      <div style="background:#071428;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:28px;margin-bottom:32px;">
        <p style="font-size:17px;line-height:1.75;color:#cbd5e1;margin:0;font-style:italic;">&ldquo;${message}&rdquo;</p>
      </div>

      <a href="${escapeHtml(reviewUrl)}" style="display:block;text-align:center;background:#f0b429;color:#040d1a;font-weight:900;font-size:16px;padding:18px;border-radius:12px;text-decoration:none;">Open Protected Review</a>
      <p style="color:#64748b;font-size:12px;line-height:1.6;margin-top:16px;text-align:center;">Email links never approve, deny, or delete a submission. Sign in with a named administrator account to take action.</p>

      <p style="color:#1e293b;font-size:11px;margin-top:32px;text-align:center;">Millstadt EMS · millstadtems.org</p>
    </div>
  `;

  const text = [
    "New testimonial submitted for review",
    `From: ${displayNameValue}`,
    `Submitted: ${new Date(t.submittedAt).toLocaleDateString("en-US", { timeZone: "America/Chicago" })}`,
    "",
    t.message,
    "",
    `Protected review: ${reviewUrl}`,
    "",
    "Email links never approve, deny, or delete a submission. Sign in with a named administrator account to take action.",
  ].join("\n");
  await sendGmailMessage({
    fromName: "Millstadt EMS Website",
    to: [to],
    subject,
    text,
    html,
  });
}
