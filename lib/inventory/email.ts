/**
 * Inventory email alerts — sends to configured recipients
 * via Gmail API (reuses existing OAuth2 pattern).
 */

import { google } from "googleapis";

const RECIPIENTS = [
  "Millstadtems@gmail.com",
  "Kenneth.James@millstadtems.org",
  "Jennifer.Goetz@millstadtems.org",
];

function getAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return auth;
}

async function sendEmail(to: string[], subject: string, html: string) {
  const from = process.env.GMAIL_USER ?? "millstadtcad@gmail.com";
  const raw = Buffer.from(
    `From: Millstadt EMS Inventory <${from}>\r\n` +
    `To: ${to.join(", ")}\r\n` +
    `Subject: ${subject}\r\n` +
    `MIME-Version: 1.0\r\n` +
    `Content-Type: text/html; charset=utf-8\r\n` +
    `\r\n` +
    html
  ).toString("base64url");

  const gmail = google.gmail({ version: "v1", auth: getAuth() });
  await gmail.users.messages.send({ userId: from, requestBody: { raw } });
}

function emailTemplate(title: string, subtitle: string, body: string): string {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:580px;margin:0 auto;background:#040d1a;color:#f1f5f9;padding:40px;border-radius:16px;">
      <div style="margin-bottom:8px;">
        <span style="color:#f0b429;font-size:12px;font-weight:900;letter-spacing:0.2em;text-transform:uppercase;">Inventory System</span>
      </div>
      <h1 style="color:#ffffff;font-size:24px;font-weight:900;margin:0 0 6px;">${title}</h1>
      <p style="color:#64748b;font-size:14px;margin:0 0 24px;">${subtitle}</p>
      <div style="background:#071428;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:24px;margin-bottom:24px;">
        ${body}
      </div>
      <p style="color:#1e293b;font-size:11px;margin-top:24px;text-align:center;">Millstadt EMS · millstadtems.org</p>
    </div>
  `;
}

interface InventoryEmailData {
  type: "inventory_submission" | "qr_submission" | "password_change";
  submissionId?: string;
  categorySlug?: string;
  itemsUpdated?: number;
  notes?: string;
  submittedBy?: string;
  items?: { name: string; qty: number; notes?: string }[];
}

export async function sendInventoryEmail(data: InventoryEmailData) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://millstadtems.org";
  const now = new Date().toLocaleString("en-US", {
    timeZone: "America/Chicago",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  if (data.type === "inventory_submission") {
    const subject = `Inventory Count Completed — ${data.categorySlug ?? "All Categories"}`;
    const body = `
      <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 12px;">
        <strong style="color:#f0b429;">${data.submittedBy ?? "Inventory User"}</strong> completed an inventory count.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:12px 0;">
        <tr><td style="color:#64748b;padding:6px 0;font-size:13px;">Category</td><td style="color:#f1f5f9;padding:6px 0;font-size:13px;text-align:right;">${data.categorySlug ?? "All"}</td></tr>
        <tr><td style="color:#64748b;padding:6px 0;font-size:13px;">Items Updated</td><td style="color:#f1f5f9;padding:6px 0;font-size:13px;text-align:right;">${data.itemsUpdated ?? 0}</td></tr>
        <tr><td style="color:#64748b;padding:6px 0;font-size:13px;">Time</td><td style="color:#f1f5f9;padding:6px 0;font-size:13px;text-align:right;">${now}</td></tr>
      </table>
      ${data.notes ? `<p style="color:#94a3b8;font-size:13px;margin:12px 0 0;border-top:1px solid rgba(255,255,255,0.08);padding-top:12px;"><em>Notes: ${data.notes}</em></p>` : ""}
      <div style="margin-top:16px;">
        <a href="${base}/admin/inventory-reports" style="display:inline-block;background:#f0b429;color:#040d1a;font-weight:800;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;">View Reports</a>
      </div>
    `;
    await sendEmail(RECIPIENTS, subject, emailTemplate("Inventory Count Completed", now, body));
  }

  if (data.type === "qr_submission") {
    const subject = `QR Scan Recommendation — ${data.items?.length ?? 0} item(s)`;
    const itemRows = (data.items ?? []).map(i =>
      `<tr><td style="color:#f1f5f9;padding:6px 0;font-size:13px;">${i.name}</td><td style="color:#f0b429;padding:6px 0;font-size:13px;text-align:right;">${i.qty}</td><td style="color:#94a3b8;padding:6px 0;font-size:13px;text-align:right;">${i.notes ?? ""}</td></tr>`
    ).join("");
    const body = `
      <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 12px;">
        A QR scan recommendation was submitted with <strong style="color:#f0b429;">${data.items?.length ?? 0}</strong> item(s).
      </p>
      <table style="width:100%;border-collapse:collapse;margin:12px 0;">
        <tr><th style="color:#64748b;padding:6px 0;font-size:12px;text-align:left;text-transform:uppercase;letter-spacing:0.1em;">Item</th><th style="color:#64748b;padding:6px 0;font-size:12px;text-align:right;text-transform:uppercase;letter-spacing:0.1em;">Qty</th><th style="color:#64748b;padding:6px 0;font-size:12px;text-align:right;text-transform:uppercase;letter-spacing:0.1em;">Notes</th></tr>
        ${itemRows}
      </table>
      ${data.notes ? `<p style="color:#94a3b8;font-size:13px;margin:12px 0 0;border-top:1px solid rgba(255,255,255,0.08);padding-top:12px;"><em>Notes: ${data.notes}</em></p>` : ""}
      <div style="margin-top:16px;">
        <a href="${base}/admin/inventory-reports" style="display:inline-block;background:#f0b429;color:#040d1a;font-weight:800;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;">View Reports</a>
      </div>
    `;
    await sendEmail(RECIPIENTS, subject, emailTemplate("QR Scan Recommendation", now, body));
  }

  if (data.type === "password_change") {
    const subject = "Inventory Password Changed";
    const body = `
      <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 12px;">
        The inventory system password was changed by <strong style="color:#f0b429;">${data.submittedBy ?? "an admin"}</strong>.
      </p>
      <p style="color:#94a3b8;font-size:13px;">Time: ${now}</p>
      <p style="color:#94a3b8;font-size:13px;">All existing inventory sessions have been invalidated.</p>
    `;
    await sendEmail(RECIPIENTS, subject, emailTemplate("Password Changed", now, body));
  }
}
