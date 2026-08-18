/**
 * Cert-renewal email sender — reuses the Gmail OAuth pattern from
 * lib/inventory/email.ts. Two surfaces:
 *
 *   sendEmployeeCertAlert  — to the individual employee, one cert at a time
 *   sendAdminCertDigest    — weekly Monday roll-up of everyone's expiring
 *                            certs to admins (KJ + Goetz).
 */
import type { EmployeeCert } from "./certs";
import { plainTextFromHtml, sendGmailMessage } from "@/lib/reports/gmail-message";
import { escapeHtml } from "@/lib/security/http";

async function sendRaw(to: string[], subject: string, html: string) {
  await sendGmailMessage({
    fromName: "Millstadt EMS Lounge",
    to,
    subject,
    text: plainTextFromHtml(html),
    html,
  });
}

function shell(title: string, subtitle: string, body: string): string {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:580px;margin:0 auto;background:#040d1a;color:#f1f5f9;padding:40px;border-radius:16px;">
      <div style="margin-bottom:8px;">
        <span style="color:#f0b429;font-size:12px;font-weight:900;letter-spacing:0.2em;text-transform:uppercase;">Employee Lounge</span>
      </div>
      <h1 style="color:#ffffff;font-size:24px;font-weight:900;margin:0 0 6px;">${escapeHtml(title)}</h1>
      <p style="color:#64748b;font-size:14px;margin:0 0 24px;">${escapeHtml(subtitle)}</p>
      <div style="background:#071428;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:24px;margin-bottom:24px;">
        ${body}
      </div>
      <p style="color:#1e293b;font-size:11px;margin-top:24px;text-align:center;">Millstadt EMS · millstadtems.org/lounge</p>
    </div>
  `;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ── Employee-facing single-cert alert ──────────────────────────────────

export async function sendEmployeeCertAlert(params: {
  to: string;
  employeeName: string;
  cert: EmployeeCert;
  daysLeft: number;
}): Promise<void> {
  const { cert, daysLeft, employeeName } = params;
  const expired = daysLeft < 0;
  const subject = expired
    ? `EXPIRED: Your ${cert.certTypeName} — contact management before working`
    : daysLeft === 0
      ? `Your ${cert.certTypeName} expires TODAY`
      : `Your ${cert.certTypeName} expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;

  const ctaBlock = expired
    ? `<div style="background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.35);border-radius:10px;padding:16px;margin-top:18px;">
         <div style="color:#fca5a5;font-weight:900;text-transform:uppercase;letter-spacing:0.16em;font-size:11px;margin-bottom:6px;">Action Required</div>
         <div style="color:#fecaca;font-size:14px;line-height:1.55;">
           Your ${escapeHtml(cert.certTypeName)} is expired. <strong>Do not pick up another shift</strong> until you've spoken with management and uploaded a renewed copy.
         </div>
       </div>`
    : `<div style="background:rgba(240,180,41,0.10);border:1px solid rgba(240,180,41,0.30);border-radius:10px;padding:16px;margin-top:18px;">
         <div style="color:#f0b429;font-weight:900;text-transform:uppercase;letter-spacing:0.16em;font-size:11px;margin-bottom:6px;">Renewal Reminder</div>
         <div style="color:#fef3c7;font-size:14px;line-height:1.55;">
           Time to start your renewal. Sign in to the Lounge and upload the new copy as soon as you have it.
         </div>
       </div>`;

  const body = `
    <div style="display:flex;flex-direction:column;gap:8px;">
      <div style="color:#94a3b8;font-size:13px;">Hello ${escapeHtml(employeeName)},</div>
      <div style="color:#f1f5f9;font-size:15px;line-height:1.55;">
        Your <strong style="color:#f0b429;">${escapeHtml(cert.certTypeName)}</strong> ${expired ? "expired on" : "expires on"} <strong>${escapeHtml(fmtDate(cert.expiresOn))}</strong>${expired ? "." : daysLeft === 0 ? " (today)." : ` — that's <strong>${daysLeft} day${daysLeft === 1 ? "" : "s"}</strong> from now.`}
      </div>
      ${ctaBlock}
      <div style="margin-top:18px;">
        <a href="${escapeHtml(siteUrl())}/lounge/certs" style="display:inline-block;background:#f0b429;color:#040d1a;font-weight:900;padding:12px 18px;border-radius:10px;text-decoration:none;letter-spacing:0.12em;text-transform:uppercase;font-size:12px;">Upload renewal</a>
      </div>
    </div>
  `;
  await sendRaw([params.to], subject, shell(
    expired ? "Certification expired" : "Certification expiring soon",
    expired ? "Action required before your next shift" : `${daysLeft === 0 ? "Expires today" : `${daysLeft} days remaining`}`,
    body,
  ));
}

// ── Admin weekly digest ────────────────────────────────────────────────

export async function sendAdminCertDigest(params: {
  to: string[];
  expiringSoon: Array<{ employeeName: string; cert: EmployeeCert; daysLeft: number }>;
  expired: Array<{ employeeName: string; cert: EmployeeCert; daysLeft: number }>;
}): Promise<void> {
  const { to, expiringSoon, expired } = params;
  if (to.length === 0) return;
  if (expiringSoon.length === 0 && expired.length === 0) return;

  const subject =
    expired.length > 0
      ? `Cert digest: ${expired.length} expired, ${expiringSoon.length} expiring soon`
      : `Cert digest: ${expiringSoon.length} expiring soon`;

  const expiredHtml =
    expired.length === 0
      ? ""
      : `<div style="background:rgba(239,68,68,0.10);border:1px solid rgba(239,68,68,0.30);border-radius:10px;padding:16px;margin-bottom:16px;">
           <div style="color:#fca5a5;font-weight:900;text-transform:uppercase;letter-spacing:0.16em;font-size:11px;margin-bottom:10px;">Expired (${expired.length})</div>
           ${expired
             .sort((a, b) => a.daysLeft - b.daysLeft)
             .map(
               (r) => `
             <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:8px 0;border-top:1px solid rgba(255,255,255,0.06);">
               <div style="color:#fecaca;font-weight:700;">${escapeHtml(r.employeeName)}</div>
               <div style="color:#f1f5f9;font-size:13px;">${escapeHtml(r.cert.certTypeName)} <span style="color:#fca5a5;">· expired ${Math.abs(r.daysLeft)}d ago</span></div>
             </div>`,
             )
             .join("")}
         </div>`;

  const soonHtml =
    expiringSoon.length === 0
      ? ""
      : `<div style="background:rgba(240,180,41,0.08);border:1px solid rgba(240,180,41,0.25);border-radius:10px;padding:16px;">
           <div style="color:#f0b429;font-weight:900;text-transform:uppercase;letter-spacing:0.16em;font-size:11px;margin-bottom:10px;">Expiring soon (${expiringSoon.length})</div>
           ${expiringSoon
             .sort((a, b) => a.daysLeft - b.daysLeft)
             .map(
               (r) => `
             <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:8px 0;border-top:1px solid rgba(255,255,255,0.06);">
               <div style="color:#fef3c7;font-weight:700;">${escapeHtml(r.employeeName)}</div>
               <div style="color:#f1f5f9;font-size:13px;">${escapeHtml(r.cert.certTypeName)} <span style="color:#f0b429;">· in ${r.daysLeft}d</span></div>
             </div>`,
             )
             .join("")}
         </div>`;

  const body = `
    ${expiredHtml}
    ${soonHtml}
    <div style="margin-top:18px;">
      <a href="${escapeHtml(siteUrl())}/admin/employees" style="display:inline-block;background:#f0b429;color:#040d1a;font-weight:900;padding:12px 18px;border-radius:10px;text-decoration:none;letter-spacing:0.12em;text-transform:uppercase;font-size:12px;">Open admin</a>
    </div>
  `;
  await sendRaw(to, subject, shell("Weekly cert digest", "Crew certifications expiring or expired", body));
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://millstadtems.org";
}
