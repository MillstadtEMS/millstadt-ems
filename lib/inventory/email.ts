/**
 * Inventory email alerts — sends to configured recipients
 * via Gmail API (reuses existing OAuth2 pattern).
 */

import { sendGmailMessage } from "@/lib/reports/gmail-message";
import { escapeHtml } from "@/lib/security/http";
import type { InventoryItem } from "./db";
import { buildOrderPdf } from "./orderPdf";

const RECIPIENTS = [
  "Millstadtems@gmail.com",
  "Kenneth.James@millstadtems.org",
  "Jennifer.Goetz@millstadtems.org",
];

interface Attachment {
  filename: string;
  mimeType: string;
  content: Buffer;
}

async function sendEmail(to: string[], subject: string, text: string, html: string, attachments: Attachment[] = []) {
  await sendGmailMessage({
    fromName: "Millstadt EMS Inventory",
    to,
    subject,
    text,
    html,
    attachments: attachments.map((attachment) => ({
      filename: attachment.filename,
      contentType: attachment.mimeType,
      content: attachment.content,
    })),
  });
}

function emailTemplate(title: string, subtitle: string, body: string): string {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:580px;margin:0 auto;background:#040d1a;color:#f1f5f9;padding:40px;border-radius:16px;">
      <div style="margin-bottom:8px;">
        <span style="color:#f0b429;font-size:12px;font-weight:900;letter-spacing:0.2em;text-transform:uppercase;">Inventory</span>
      </div>
      <h1 style="color:#ffffff;font-size:24px;font-weight:900;margin:0 0 6px;">${escapeHtml(title)}</h1>
      <p style="color:#64748b;font-size:14px;margin:0 0 24px;">${escapeHtml(subtitle)}</p>
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
    const category = data.categorySlug ?? "All Categories";
    const submittedBy = data.submittedBy ?? "Inventory User";
    const subject = `Inventory Count Completed — ${category}`;
    const body = `
      <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 12px;">
        <strong style="color:#f0b429;">${escapeHtml(submittedBy)}</strong> completed an inventory count.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:12px 0;">
        <tr><td style="color:#64748b;padding:6px 0;font-size:13px;">Category</td><td style="color:#f1f5f9;padding:6px 0;font-size:13px;text-align:right;">${escapeHtml(data.categorySlug ?? "All")}</td></tr>
        <tr><td style="color:#64748b;padding:6px 0;font-size:13px;">Items Updated</td><td style="color:#f1f5f9;padding:6px 0;font-size:13px;text-align:right;">${data.itemsUpdated ?? 0}</td></tr>
        <tr><td style="color:#64748b;padding:6px 0;font-size:13px;">Time</td><td style="color:#f1f5f9;padding:6px 0;font-size:13px;text-align:right;">${escapeHtml(now)}</td></tr>
      </table>
      ${data.notes ? `<p style="color:#94a3b8;font-size:13px;margin:12px 0 0;border-top:1px solid rgba(255,255,255,0.08);padding-top:12px;"><em>Notes: ${escapeHtml(data.notes)}</em></p>` : ""}
      <div style="margin-top:16px;">
        <a href="${escapeHtml(base)}/admin/inventory-reports" style="display:inline-block;background:#f0b429;color:#040d1a;font-weight:800;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;">View Reports</a>
      </div>
    `;
    const text = [
      "Inventory Count Completed",
      `Submitted by: ${submittedBy}`,
      `Category: ${data.categorySlug ?? "All"}`,
      `Items updated: ${data.itemsUpdated ?? 0}`,
      `Time: ${now}`,
      data.notes ? `Notes: ${data.notes}` : "",
      `View reports: ${base}/admin/inventory-reports`,
    ].filter(Boolean).join("\n");
    await sendEmail(RECIPIENTS, subject, text, emailTemplate("Inventory Count Completed", now, body));
  }

  if (data.type === "qr_submission") {
    const subject = `QR Scan Recommendation — ${data.items?.length ?? 0} item(s)`;
    const itemRows = (data.items ?? []).map(i =>
      `<tr><td style="color:#f1f5f9;padding:6px 0;font-size:13px;">${escapeHtml(i.name)}</td><td style="color:#f0b429;padding:6px 0;font-size:13px;text-align:right;">${i.qty}</td><td style="color:#94a3b8;padding:6px 0;font-size:13px;text-align:right;">${escapeHtml(i.notes ?? "")}</td></tr>`
    ).join("");
    const body = `
      <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 12px;">
        A QR scan recommendation was submitted with <strong style="color:#f0b429;">${data.items?.length ?? 0}</strong> item(s).
      </p>
      <table style="width:100%;border-collapse:collapse;margin:12px 0;">
        <tr><th style="color:#64748b;padding:6px 0;font-size:12px;text-align:left;text-transform:uppercase;letter-spacing:0.1em;">Item</th><th style="color:#64748b;padding:6px 0;font-size:12px;text-align:right;text-transform:uppercase;letter-spacing:0.1em;">Qty</th><th style="color:#64748b;padding:6px 0;font-size:12px;text-align:right;text-transform:uppercase;letter-spacing:0.1em;">Notes</th></tr>
        ${itemRows}
      </table>
      ${data.notes ? `<p style="color:#94a3b8;font-size:13px;margin:12px 0 0;border-top:1px solid rgba(255,255,255,0.08);padding-top:12px;"><em>Notes: ${escapeHtml(data.notes)}</em></p>` : ""}
      <div style="margin-top:16px;">
        <a href="${escapeHtml(base)}/admin/inventory-reports" style="display:inline-block;background:#f0b429;color:#040d1a;font-weight:800;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;">View Reports</a>
      </div>
    `;
    const text = [
      "QR Scan Recommendation",
      ...(data.items ?? []).map((item) => `${item.name}: ${item.qty}${item.notes ? ` (${item.notes})` : ""}`),
      data.notes ? `Notes: ${data.notes}` : "",
      `View reports: ${base}/admin/inventory-reports`,
    ].filter(Boolean).join("\n");
    await sendEmail(RECIPIENTS, subject, text, emailTemplate("QR Scan Recommendation", now, body));
  }

  if (data.type === "password_change") {
    const subject = "Inventory Password Changed";
    const body = `
      <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 12px;">
        The inventory password was changed by <strong style="color:#f0b429;">${escapeHtml(data.submittedBy ?? "an administrator")}</strong>.
      </p>
      <p style="color:#94a3b8;font-size:13px;">Time: ${escapeHtml(now)}</p>
      <p style="color:#94a3b8;font-size:13px;">All existing inventory sessions have been invalidated.</p>
    `;
    const text = [
      "Inventory Password Changed",
      `Changed by: ${data.submittedBy ?? "an administrator"}`,
      `Time: ${now}`,
      "All existing inventory sessions have been invalidated.",
    ].join("\n");
    await sendEmail(RECIPIENTS, subject, text, emailTemplate("Password Changed", now, body));
  }
}

/**
 * Send the full back-stock order as a PDF attachment. This is the document
 * the order workflow is actually about — every item below par, grouped by
 * category, with quantities. Pass the *complete* backstock item list (all
 * categories), not just the one that was submitted, so the order has
 * everything. Returns false (and sends nothing) if nothing needs ordering.
 */
export async function sendInventoryOrderEmail(
  items: InventoryItem[],
  meta: { submittedBy?: string; submittedDate?: Date; mode?: "order" | "expired" } = {},
): Promise<boolean> {
  const expiredMode = meta.mode === "expired";
  const built = await buildOrderPdf(items, meta);
  if (!built) return false;
  const { buffer, lineCount, totalUnits, categories } = built;

  const submitted = meta.submittedDate ?? new Date();
  const dateStr = submitted.toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const docName = expiredMode ? "Expired Count" : "Back-Stock Order";
  const subject = expiredMode
    ? `Expired Count — ${dateStr} (${lineCount} items, ${totalUnits} expired)`
    : `Back-Stock Order — ${dateStr} (${lineCount} items, ${totalUnits} units)`;
  const body = `
    <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 12px;">
      ${meta.submittedBy ? `<strong style="color:#f0b429;">${escapeHtml(meta.submittedBy)}</strong> ` : ""}${expiredMode ? "Expired count is attached as a PDF." : "The full back-stock order is attached as a PDF."}
    </p>
    <table style="width:100%;border-collapse:collapse;margin:12px 0;">
      <tr><td style="color:#64748b;padding:6px 0;font-size:13px;">Items</td><td style="color:#f1f5f9;padding:6px 0;font-size:13px;text-align:right;">${lineCount}</td></tr>
      <tr><td style="color:#64748b;padding:6px 0;font-size:13px;">${expiredMode ? "Expired Units" : "Units to Order"}</td><td style="color:#f1f5f9;padding:6px 0;font-size:13px;text-align:right;">${totalUnits}</td></tr>
      <tr><td style="color:#64748b;padding:6px 0;font-size:13px;">Categories</td><td style="color:#f1f5f9;padding:6px 0;font-size:13px;text-align:right;">${categories.length}</td></tr>
    </table>
    <p style="color:#94a3b8;font-size:12px;margin:0;">${escapeHtml(categories.join(" · "))}</p>
  `;

  const filePrefix = expiredMode ? "Expired-Count" : "Order";
  const filename = `Millstadt-EMS-${filePrefix}-${submitted.toISOString().slice(0, 10)}.pdf`;
  await sendEmail(
    RECIPIENTS,
    subject,
    [
      docName,
      meta.submittedBy ? `Submitted by: ${meta.submittedBy}` : "",
      `Items: ${lineCount}`,
      `${expiredMode ? "Expired units" : "Units to order"}: ${totalUnits}`,
      `Categories: ${categories.join(", ")}`,
      `Attachment: ${filename}`,
    ].filter(Boolean).join("\n"),
    emailTemplate(docName, dateStr, body),
    [{ filename, mimeType: "application/pdf", content: buffer }],
  );
  return true;
}
