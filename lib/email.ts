import { google } from "googleapis";
import { createHmac } from "crypto";
import type { Testimonial } from "./testimonials";

export function signToken(id: string, action: string): string {
  const secret = process.env.APPROVAL_SECRET ?? "dev-secret-change-me";
  return createHmac("sha256", secret)
    .update(`${id}:${action}`)
    .digest("hex")
    .slice(0, 32);
}

function getAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return auth;
}

export async function sendApprovalEmail(t: Testimonial) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://millstadtems.org";
  const approveUrl = `${base}/api/testimonials/approve?id=${t.id}&action=approve&sig=${signToken(t.id, "approve")}`;
  const denyUrl    = `${base}/api/testimonials/approve?id=${t.id}&action=deny&sig=${signToken(t.id, "deny")}`;
  const deleteUrl  = `${base}/api/testimonials/approve?id=${t.id}&action=delete&sig=${signToken(t.id, "delete")}`;
  const displayName = t.anonymous ? "Anonymous" : (t.name || "Anonymous");

  const from    = process.env.GMAIL_USER ?? "millstadtcad@gmail.com";
  const to      = "millstadtems@gmail.com";
  const subject = `New Testimonial — ${displayName}`;

  const html = `
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
        <tr>
          <td colspan="2" style="padding-top:8px;">
            <a href="${deleteUrl}" style="display:block;text-align:center;background:#1e293b;color:#94a3b8;font-weight:700;font-size:14px;padding:14px;border-radius:12px;text-decoration:none;border:1px solid rgba(255,255,255,0.08);">🗑 &nbsp;Permanently Delete</a>
          </td>
        </tr>
      </table>

      <p style="color:#1e293b;font-size:11px;margin-top:32px;text-align:center;">Millstadt EMS · millstadtems.org</p>
    </div>
  `;

  // Build RFC 2822 message with HTML body
  const boundary = "boundary_ems_" + Date.now();
  const raw = Buffer.from(
    `From: Millstadt EMS Website <${from}>\r\n` +
    `To: ${to}\r\n` +
    `Subject: ${subject}\r\n` +
    `MIME-Version: 1.0\r\n` +
    `Content-Type: text/html; charset=utf-8\r\n` +
    `\r\n` +
    html
  ).toString("base64url");

  const gmail = google.gmail({ version: "v1", auth: getAuth() });
  await gmail.users.messages.send({ userId: from, requestBody: { raw } });

  // suppress unused var warning
  void boundary;
}
