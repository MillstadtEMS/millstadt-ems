/**
 * PDF report generation for inventory.
 * Uses jsPDF + jspdf-autotable.
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { InventoryItem, InventoryCategory } from "./db";
import { drawContainedImage, loadLogo } from "@/lib/reports/pdf-system";

type Logo = Awaited<ReturnType<typeof loadLogo>>;

function stampReport(doc: jsPDF, title: string, subtitle: string, generatedAt: string, logo: Logo) {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    doc.setFillColor(12, 35, 64);
    doc.rect(0, 0, width, 72, "F");
    doc.setFillColor(240, 180, 41);
    doc.rect(0, 72, width, 3, "F");
    if (logo) drawContainedImage(doc, logo.dataUri, "PNG", 40, 12, 44, 44);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text(title, 96, 34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(240, 180, 41);
    doc.text(subtitle, 96, 50);
    doc.setDrawColor(221, 226, 233);
    doc.line(40, height - 36, width - 40, height - 36);
    doc.setFontSize(8);
    doc.setTextColor(126, 135, 148);
    doc.text(`Generated ${generatedAt}`, 40, height - 22);
    doc.text(`Page ${page} of ${pages}`, width - 40, height - 22, { align: "right" });
  }
}

export async function generateOrderReport(
  items: InventoryItem[],
  categories: InventoryCategory[]
): Promise<Buffer> {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const generatedAt = new Date().toLocaleString("en-US", { timeZone: "America/Chicago", hour12: false });

  const catMap = new Map(categories.map(c => [c.slug, c.name]));
  const needsOrder = items.filter(i => i.qtyToOrder > 0 && !i.skipOrder);

  // Group by category
  const grouped = new Map<string, InventoryItem[]>();
  for (const item of needsOrder) {
    const cat = item.categorySlug ?? "unknown";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(item);
  }

  let startY = 100;
  for (const [slug, catItems] of grouped) {
    const catName = catMap.get(slug) ?? slug;
    doc.setFontSize(12);
    doc.setTextColor(4, 13, 26);
    if (startY > 690) { doc.addPage(); startY = 100; }
    doc.text(catName, 40, startY);

    autoTable(doc, {
      startY: startY + 3,
      head: [["Item", "Location", "PAR", "Stock", "Order Qty"]],
      body: catItems.map(i => [
        i.name,
        i.location ?? "",
        String(i.par),
        String(i.currentStock),
        String(i.qtyToOrder),
      ]),
      theme: "grid",
      headStyles: { fillColor: [4, 13, 26], textColor: [240, 180, 41], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 220 },
        1: { cellWidth: 150 },
        2: { cellWidth: 45, halign: "center" },
        3: { cellWidth: 45, halign: "center" },
        4: { cellWidth: 52, halign: "center" },
      },
      margin: { left: 40, right: 40, top: 100, bottom: 58 },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startY = (doc as any).lastAutoTable.finalY + 10;
  }

  if (needsOrder.length === 0) {
    doc.setFontSize(12);
    doc.setTextColor(34, 197, 94);
    doc.text("All items are at or above PAR level. Nothing to order.", 40, 110);
  }

  stampReport(doc, "Quantity Needed to Order", "Items below PAR level", generatedAt, await loadLogo());
  return Buffer.from(doc.output("arraybuffer"));
}

export async function generateExpiredReport(
  items: InventoryItem[],
  categories: InventoryCategory[]
): Promise<Buffer> {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const generatedAt = new Date().toLocaleString("en-US", { timeZone: "America/Chicago", hour12: false });

  const catMap = new Map(categories.map(c => [c.slug, c.name]));
  const expired = items.filter(i => i.expiredQty > 0);

  const grouped = new Map<string, InventoryItem[]>();
  for (const item of expired) {
    const cat = item.categorySlug ?? "unknown";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(item);
  }

  let startY = 100;
  for (const [slug, catItems] of grouped) {
    const catName = catMap.get(slug) ?? slug;
    doc.setFontSize(12);
    doc.setTextColor(4, 13, 26);
    if (startY > 690) { doc.addPage(); startY = 100; }
    doc.text(catName, 40, startY);

    autoTable(doc, {
      startY: startY + 3,
      head: [["Item", "Location", "Expired Qty", "Current Stock", "PAR"]],
      body: catItems.map(i => [
        i.name,
        i.location ?? "",
        String(i.expiredQty),
        String(i.currentStock),
        String(i.par),
      ]),
      theme: "grid",
      headStyles: { fillColor: [200, 16, 46], textColor: [255, 255, 255], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 40, right: 40, top: 100, bottom: 58 },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startY = (doc as any).lastAutoTable.finalY + 10;
  }

  if (expired.length === 0) {
    doc.setFontSize(12);
    doc.setTextColor(34, 197, 94);
    doc.text("No expired items found.", 40, 110);
  }

  stampReport(doc, "Expired Items Report", "Items with expired quantities", generatedAt, await loadLogo());
  return Buffer.from(doc.output("arraybuffer"));
}

export async function generateFullInventoryReport(
  items: InventoryItem[],
  categories: InventoryCategory[]
): Promise<Buffer> {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  const generatedAt = new Date().toLocaleString("en-US", { timeZone: "America/Chicago", hour12: false });

  const catMap = new Map(categories.map(c => [c.slug, c.name]));

  const grouped = new Map<string, InventoryItem[]>();
  for (const item of items) {
    const cat = item.categorySlug ?? "unknown";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(item);
  }

  let startY = 100;
  for (const [slug, catItems] of grouped) {
    const catName = catMap.get(slug) ?? slug;

    if (startY > 530) {
      doc.addPage();
      startY = 100;
    }

    doc.setFontSize(12);
    doc.setTextColor(4, 13, 26);
    doc.text(`${catName} (${catItems.length} items)`, 40, startY);

    autoTable(doc, {
      startY: startY + 3,
      head: [["Item", "Location", "PAR", "Stock", "Order", "Expired", "Prior", "Delta", "Notes"]],
      body: catItems.map(i => [
        i.name,
        i.location ?? "",
        String(i.par),
        String(i.currentStock),
        i.skipOrder ? "SKIP" : String(i.qtyToOrder),
        String(i.expiredQty || ""),
        i.priorStock != null ? String(i.priorStock) : "",
        i.delta != null ? (i.delta >= 0 ? `+${i.delta}` : String(i.delta)) : "",
        i.notes ?? "",
      ]),
      theme: "grid",
      headStyles: { fillColor: [4, 13, 26], textColor: [240, 180, 41], fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 180 },
        1: { cellWidth: 100 },
        2: { cellWidth: 45, halign: "center" },
        3: { cellWidth: 45, halign: "center" },
        4: { cellWidth: 45, halign: "center" },
        5: { cellWidth: 50, halign: "center" },
        6: { cellWidth: 45, halign: "center" },
        7: { cellWidth: 45, halign: "center" },
        8: { cellWidth: 157 },
      },
      margin: { left: 40, right: 40, top: 100, bottom: 58 },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startY = (doc as any).lastAutoTable.finalY + 10;
  }

  stampReport(doc, "General Inventory Report", "Complete inventory snapshot", generatedAt, await loadLogo());
  return Buffer.from(doc.output("arraybuffer"));
}
