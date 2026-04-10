/**
 * PDF report generation for inventory.
 * Uses jsPDF + jspdf-autotable.
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { InventoryItem, InventoryCategory } from "./db";

function header(doc: jsPDF, title: string, subtitle: string) {
  doc.setFontSize(18);
  doc.setTextColor(4, 13, 26);
  doc.text("Millstadt EMS", 14, 18);
  doc.setFontSize(14);
  doc.text(title, 14, 28);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(subtitle, 14, 35);
  doc.text(`Generated: ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })}`, 14, 41);
}

export function generateOrderReport(
  items: InventoryItem[],
  categories: InventoryCategory[]
): Buffer {
  const doc = new jsPDF();
  header(doc, "Quantity Needed to Order", "Items below PAR level");

  const catMap = new Map(categories.map(c => [c.slug, c.name]));
  const needsOrder = items.filter(i => i.qtyToOrder > 0 && !i.skipOrder);

  // Group by category
  const grouped = new Map<string, InventoryItem[]>();
  for (const item of needsOrder) {
    const cat = item.categorySlug ?? "unknown";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(item);
  }

  let startY = 46;
  for (const [slug, catItems] of grouped) {
    const catName = catMap.get(slug) ?? slug;
    doc.setFontSize(12);
    doc.setTextColor(4, 13, 26);
    doc.text(catName, 14, startY);

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
        0: { cellWidth: 65 },
        1: { cellWidth: 45 },
        2: { cellWidth: 20, halign: "center" },
        3: { cellWidth: 20, halign: "center" },
        4: { cellWidth: 25, halign: "center" },
      },
      margin: { left: 14, right: 14 },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startY = (doc as any).lastAutoTable.finalY + 10;
  }

  if (needsOrder.length === 0) {
    doc.setFontSize(12);
    doc.setTextColor(34, 197, 94);
    doc.text("All items are at or above PAR level. Nothing to order.", 14, 50);
  }

  return Buffer.from(doc.output("arraybuffer"));
}

export function generateExpiredReport(
  items: InventoryItem[],
  categories: InventoryCategory[]
): Buffer {
  const doc = new jsPDF();
  header(doc, "Expired Items Report", "Items with expired quantities");

  const catMap = new Map(categories.map(c => [c.slug, c.name]));
  const expired = items.filter(i => i.expiredQty > 0);

  const grouped = new Map<string, InventoryItem[]>();
  for (const item of expired) {
    const cat = item.categorySlug ?? "unknown";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(item);
  }

  let startY = 46;
  for (const [slug, catItems] of grouped) {
    const catName = catMap.get(slug) ?? slug;
    doc.setFontSize(12);
    doc.setTextColor(4, 13, 26);
    doc.text(catName, 14, startY);

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
      margin: { left: 14, right: 14 },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startY = (doc as any).lastAutoTable.finalY + 10;
  }

  if (expired.length === 0) {
    doc.setFontSize(12);
    doc.setTextColor(34, 197, 94);
    doc.text("No expired items found.", 14, 50);
  }

  return Buffer.from(doc.output("arraybuffer"));
}

export function generateFullInventoryReport(
  items: InventoryItem[],
  categories: InventoryCategory[]
): Buffer {
  const doc = new jsPDF({ orientation: "landscape" });
  header(doc, "General Inventory Report", "Complete inventory snapshot");

  const catMap = new Map(categories.map(c => [c.slug, c.name]));

  const grouped = new Map<string, InventoryItem[]>();
  for (const item of items) {
    const cat = item.categorySlug ?? "unknown";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(item);
  }

  let startY = 46;
  for (const [slug, catItems] of grouped) {
    const catName = catMap.get(slug) ?? slug;

    if (startY > 170) {
      doc.addPage();
      startY = 20;
    }

    doc.setFontSize(12);
    doc.setTextColor(4, 13, 26);
    doc.text(`${catName} (${catItems.length} items)`, 14, startY);

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
        0: { cellWidth: 55 },
        1: { cellWidth: 35 },
        2: { cellWidth: 15, halign: "center" },
        3: { cellWidth: 15, halign: "center" },
        4: { cellWidth: 15, halign: "center" },
        5: { cellWidth: 18, halign: "center" },
        6: { cellWidth: 15, halign: "center" },
        7: { cellWidth: 15, halign: "center" },
        8: { cellWidth: 80 },
      },
      margin: { left: 14, right: 14 },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startY = (doc as any).lastAutoTable.finalY + 10;
  }

  return Buffer.from(doc.output("arraybuffer"));
}
