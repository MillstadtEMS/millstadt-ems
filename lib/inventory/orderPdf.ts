/**
 * Back-stock order PDF.
 *
 * Builds the "what to order" document: every backstock item whose usable
 * stock (current − expired) is below par, grouped by category in the same
 * order the inventory screen uses, with Par / Hand / Exp / Order columns.
 *
 * Returns a Buffer so callers can attach it to an email or stream it.
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { InventoryItem } from "./db";

const NAVY: [number, number, number] = [4, 13, 26];
const GOLD: [number, number, number] = [240, 180, 41];
const SLATE: [number, number, number] = [100, 116, 139];

export interface OrderLine {
  name: string;
  location: string;
  par: number;
  hand: number;
  exp: number;
  order: number;
}

export interface OrderGroup {
  name: string;
  rows: OrderLine[];
}

/** How many of an item to order: bring usable stock back up to par. */
export function orderNeed(item: Pick<InventoryItem, "par" | "currentStock" | "expiredQty" | "skipOrder">): number {
  if (item.skipOrder) return 0;
  const usable = Math.max(0, item.currentStock - item.expiredQty);
  return Math.max(0, item.par - usable);
}

/**
 * Collapse a flat, pre-sorted item list into category groups containing
 * only the lines that need ordering. Caller must pass items already
 * ordered by category sort_order, then item sort_order (getItems does this).
 */
export function buildOrderGroups(items: InventoryItem[]): { groups: OrderGroup[]; lineCount: number; totalUnits: number } {
  const groups: OrderGroup[] = [];
  const idx = new Map<string, number>();
  let totalUnits = 0;
  for (const it of items) {
    const order = orderNeed(it);
    if (order <= 0) continue;
    totalUnits += order;
    const cat = it.categoryName ?? it.categorySlug ?? "Uncategorized";
    if (!idx.has(cat)) {
      idx.set(cat, groups.length);
      groups.push({ name: cat, rows: [] });
    }
    groups[idx.get(cat)!].rows.push({
      name: it.name,
      location: it.location || "—",
      par: it.par,
      hand: it.currentStock,
      exp: it.expiredQty,
      order,
    });
  }
  const lineCount = groups.reduce((n, g) => n + g.rows.length, 0);
  return { groups, lineCount, totalUnits };
}

export interface OrderPdfMeta {
  submittedDate?: Date;
  submittedBy?: string;
}

/** Render the order to a PDF Buffer. Returns null if nothing needs ordering. */
export function buildOrderPdf(items: InventoryItem[], meta: OrderPdfMeta = {}): { buffer: Buffer; lineCount: number; totalUnits: number; categories: string[] } | null {
  const { groups, lineCount, totalUnits } = buildOrderGroups(items);
  if (lineCount === 0) return null;

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const PAGE_W = doc.internal.pageSize.getWidth();
  const M = 40;

  const submitted = meta.submittedDate ?? new Date();
  const dateStr = submitted.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Chicago" });
  const genStr = new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" });

  // Header band
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, 86, "F");
  doc.setTextColor(...GOLD);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("MILLSTADT EMS · INVENTORY", M, 30);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text("Back-Stock Order", M, 54);
  doc.setTextColor(180, 190, 205);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Count submitted ${dateStr}${meta.submittedBy ? ` · ${meta.submittedBy}` : ""}`, M, 72);
  doc.setFontSize(9);
  doc.setTextColor(150, 160, 175);
  doc.text(`${lineCount} line item(s) · ${totalUnits} unit(s) to order`, PAGE_W - M, 54, { align: "right" });
  doc.text(`Generated ${genStr}`, PAGE_W - M, 72, { align: "right" });

  let cursorY = 104;
  for (const g of groups) {
    const body = g.rows.map((r, i) => [
      String(i + 1), r.name, r.location, String(r.par), String(r.hand), r.exp > 0 ? String(r.exp) : "", String(r.order),
    ]);
    const groupUnits = g.rows.reduce((n, r) => n + r.order, 0);
    autoTable(doc, {
      startY: cursorY,
      head: [
        [{ content: `${g.name}  —  ${g.rows.length} item(s), ${groupUnits} unit(s)`, colSpan: 7, styles: { halign: "left" } }],
        ["#", "Item", "Location / Shelf", "Par", "Hand", "Exp", "Order"],
      ],
      body,
      theme: "grid",
      margin: { left: M, right: M },
      styles: { font: "helvetica", fontSize: 8, cellPadding: 4, overflow: "linebreak", lineColor: [226, 232, 240], textColor: [30, 41, 59], valign: "middle" },
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold", fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 20, halign: "center", textColor: SLATE },
        1: { cellWidth: 212 },
        2: { cellWidth: 140, textColor: SLATE, fontSize: 7 },
        3: { cellWidth: 28, halign: "center" },
        4: { cellWidth: 30, halign: "center" },
        5: { cellWidth: 26, halign: "center", textColor: [220, 38, 38] },
        6: { cellWidth: 36, halign: "center", fontStyle: "bold", fillColor: [254, 243, 199] },
      },
      didParseCell: (data) => {
        if (data.section === "head" && data.row.index === 0) {
          data.cell.styles.fillColor = GOLD;
          data.cell.styles.textColor = NAVY;
          data.cell.styles.fontSize = 10;
          data.cell.styles.cellPadding = 5;
        }
      },
      didDrawPage: () => {
        const ph = doc.internal.pageSize.getHeight();
        doc.setFontSize(7.5);
        doc.setTextColor(...SLATE);
        doc.setFont("helvetica", "normal");
        doc.text("Millstadt EMS · millstadtems.org", M, ph - 18);
        doc.text(`Page ${doc.getNumberOfPages()}`, PAGE_W - M, ph - 18, { align: "right" });
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cursorY = (doc as any).lastAutoTable.finalY + 16;
  }

  const buffer = Buffer.from(doc.output("arraybuffer"));
  return { buffer, lineCount, totalUnits, categories: groups.map((g) => g.name) };
}
