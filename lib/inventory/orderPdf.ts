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

/**
 * How many of an item to order: bring usable stock back up to par.
 *
 * If the stock was left blank (current_stock <= 0) the item was never
 * counted, so we generate NO order for it — otherwise every uncounted item
 * would default to ordering its full par. Only counted items (stock > 0)
 * that fall below par produce an order quantity.
 */
export function orderNeed(item: Pick<InventoryItem, "par" | "currentStock" | "expiredQty" | "skipOrder">): number {
  if (item.skipOrder) return 0;
  if (item.currentStock <= 0) return 0;
  const usable = Math.max(0, item.currentStock - item.expiredQty);
  return Math.max(0, item.par - usable);
}

/**
 * Collapse a flat, pre-sorted item list into category groups. A line is
 * included only if it has an order quantity OR an expired quantity — blank,
 * fully-stocked items are left off the sheet entirely. Caller must pass
 * items already ordered by category sort_order, then item sort_order.
 */
export type OrderMode = "order" | "expired";

export function buildOrderGroups(items: InventoryItem[], mode: OrderMode = "order"): { groups: OrderGroup[]; lineCount: number; totalUnits: number } {
  const groups: OrderGroup[] = [];
  const idx = new Map<string, number>();
  let totalUnits = 0;
  for (const it of items) {
    const order = orderNeed(it);
    // expired mode: only items with an expired count.
    // order mode:   items that need ordering OR carry an expired count.
    const include = mode === "expired" ? it.expiredQty > 0 : order > 0 || it.expiredQty > 0;
    if (!include) continue;
    totalUnits += mode === "expired" ? it.expiredQty : order;
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
  mode?: OrderMode;
}

/**
 * Render to a PDF Buffer. mode "order" = the back-stock order; mode
 * "expired" = a plain expired-count sheet. Returns null if there are no
 * rows to show for that mode.
 */
export function buildOrderPdf(items: InventoryItem[], meta: OrderPdfMeta = {}): { buffer: Buffer; lineCount: number; totalUnits: number; categories: string[] } | null {
  const mode: OrderMode = meta.mode ?? "order";
  const expiredMode = mode === "expired";
  const { groups, lineCount, totalUnits } = buildOrderGroups(items, mode);
  if (lineCount === 0) return null;

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const PAGE_W = doc.internal.pageSize.getWidth();
  const M = 40;

  const submitted = meta.submittedDate ?? new Date();
  const dateStr = submitted.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Chicago" });
  const genStr = new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" });

  const title = expiredMode ? "Expired Count" : "Back-Stock Order";
  const summary = expiredMode
    ? `${lineCount} item(s) · ${totalUnits} expired unit(s)`
    : `${lineCount} line item(s) · ${totalUnits} unit(s) to order`;

  // Header band
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, 86, "F");
  doc.setTextColor(...GOLD);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("MILLSTADT EMS · INVENTORY", M, 30);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text(title, M, 54);
  doc.setTextColor(180, 190, 205);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`${dateStr}${meta.submittedBy ? ` · ${meta.submittedBy}` : ""}`, M, 72);
  doc.setFontSize(9);
  doc.setTextColor(150, 160, 175);
  doc.text(summary, PAGE_W - M, 54, { align: "right" });
  doc.text(`Generated ${genStr}`, PAGE_W - M, 72, { align: "right" });

  const headCols = expiredMode
    ? ["#", "Item", "Location / Shelf", "Expired"]
    : ["#", "Item", "Location / Shelf", "Par", "Hand", "Exp", "Order"];
  const nCols = headCols.length;

  let cursorY = 104;
  for (const g of groups) {
    const body = g.rows.map((r, i) =>
      expiredMode
        ? [String(i + 1), r.name, r.location, String(r.exp)]
        : [String(i + 1), r.name, r.location, String(r.par), String(r.hand), r.exp > 0 ? String(r.exp) : "", r.order > 0 ? String(r.order) : ""],
    );
    const groupUnits = g.rows.reduce((n, r) => n + (expiredMode ? r.exp : r.order), 0);
    const groupLabel = expiredMode
      ? `${g.name}  —  ${g.rows.length} item(s), ${groupUnits} expired`
      : `${g.name}  —  ${g.rows.length} item(s), ${groupUnits} unit(s)`;
    autoTable(doc, {
      startY: cursorY,
      head: [
        [{ content: groupLabel, colSpan: nCols, styles: { halign: "left" } }],
        headCols,
      ],
      body,
      theme: "grid",
      margin: { left: M, right: M },
      styles: { font: "helvetica", fontSize: 8, cellPadding: 4, overflow: "linebreak", lineColor: [226, 232, 240], textColor: [30, 41, 59], valign: "middle" },
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold", fontSize: 8 },
      columnStyles: expiredMode
        ? {
            0: { cellWidth: 22, halign: "center", textColor: SLATE },
            1: { cellWidth: 330 },
            2: { cellWidth: 130, textColor: SLATE, fontSize: 7 },
            3: { cellWidth: 50, halign: "center", fontStyle: "bold", textColor: [220, 38, 38], fillColor: [254, 226, 226] },
          }
        : {
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
