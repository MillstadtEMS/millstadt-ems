import nodemailer from "nodemailer";
import { createHmac } from "crypto";
import type { Testimonial } from "./testimonials";

export function signToken(id: string, action: string): string {
  const secret = process.env.APPROVAL_SECRET ?? "dev-secret-change-me";
  return createHmac("sha256", secret)
    .update(`${id}:${action}`)
    .digest("hex")
    .slice(0, 32);
}

export async function sendApprovalEmail(t: Testimonial) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const approveUrl = `${base}/api/testimonials/approve?id=${t.id}&action=approve&sig=${signToken(t.id, "approve")}`;
  const denyUrl = `${base}/api/testimonials/approve?id=${t.id}&action=deny&sig=${signToken(t.id, "deny")}`;
  const displayName = t.anonymous ? "Anonymous" : (t.name || "Anonymous");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Millstadt EMS Website" <${process.env.EMAIL_USER}>`,
    to: "millstadtems@gmail.com",
    subject: `New Testimonial — ${displayName}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:580px;margin:0 auto;background:#040d1a;color:#f1f5f9;padding:40px;border-radius:16px;">
        <div style="margin-bottom:8px;">
          <span style="color:#f0b429;font-size:12px;font-weight:900;letter-spacing:0.2em;text-transform:uppercase;">New Submission</span>
        </div>
        <h1 style="color:#ffffff;font-size:28px;font-weight:900;margin:0 0 6px;">Testimonial Review</h1>
        <p style="color:#64748b;font-size:14px;margin:0 0 32px;">From: <strong style="color:#94a3b8;">${displayName}</strong> &nbsp;·&nbsp; ${new Date(t.submittedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>

        <div style="background:#071428;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:28px;margin-bottom:32px;">
          <p style="font-size:17px;line-height:1.75;color:#cbd5e1;margin:0;font-style:italic;">"${t.message}"</p>
        </div>

        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-right:8px;">
              <a href="${approveUrl}" style="display:block;text-align:center;background:#22c55e;color:#fff;font-weight:900;font-size:16px;padding:18px;border-radius:12px;text-decoration:none;">✓ &nbsp;Approve</a>
            </td>
            <td style="padding-left:8px;">
              <a href="${denyUrl}" style="display:block;text-align:center;background:#ef4444;color:#fff;font-weight:900;font-size:16px;padding:18px;border-radius:12px;text-decoration:none;">✕ &nbsp;Deny</a>
            </td>
          </tr>
        </table>

        <p style="color:#1e293b;font-size:11px;margin-top:32px;text-align:center;">Millstadt EMS · millstadtems.org</p>
      </div>
    `,
  });
}
