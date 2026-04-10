/**
 * Generate a printable PDF sheet of QR codes for inventory items.
 * Lays out QR codes in a grid with item names and locations.
 */

import { jsPDF } from "jspdf";
import QRCode from "qrcode";

interface QrItem {
  itemName: string;
  location: string | null;
  url: string;
}

export async function generateQrSheetPdf(
  items: QrItem[],
  categoryName?: string
): Promise<Buffer> {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(16);
  doc.setTextColor(4, 13, 26);
  doc.text("Millstadt EMS — Inventory QR Codes", 14, 15);
  if (categoryName) {
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text(categoryName, 14, 22);
  }
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated: ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })}  •  ${items.length} items`, 14, categoryName ? 28 : 22);

  // Layout: 3 columns x 5 rows per page = 15 per page
  const cols = 3;
  const rows = 5;
  const perPage = cols * rows;
  const cellW = 60;
  const cellH = 48;
  const marginLeft = 14;
  const marginTop = categoryName ? 34 : 28;
  const qrSize = 28;

  for (let i = 0; i < items.length; i++) {
    if (i > 0 && i % perPage === 0) {
      doc.addPage();
    }

    const pageIdx = i % perPage;
    const col = pageIdx % cols;
    const row = Math.floor(pageIdx / cols);
    const x = marginLeft + col * cellW;
    const y = marginTop + row * cellH;

    // Draw cell border (dashed for cutting guides)
    doc.setDrawColor(200, 200, 200);
    doc.setLineDashPattern([2, 2], 0);
    doc.rect(x, y, cellW - 2, cellH - 2);

    // Generate QR code as data URL
    try {
      const qrDataUrl = await QRCode.toDataURL(items[i].url, {
        width: 200,
        margin: 1,
        color: { dark: "#040d1a", light: "#ffffff" },
      });
      doc.addImage(qrDataUrl, "PNG", x + 2, y + 2, qrSize, qrSize);
    } catch {
      doc.setFontSize(6);
      doc.setTextColor(200, 0, 0);
      doc.text("QR Error", x + 4, y + 16);
    }

    // Item name (right of QR)
    doc.setFontSize(7);
    doc.setTextColor(4, 13, 26);
    const nameLines = doc.splitTextToSize(items[i].itemName, cellW - qrSize - 6);
    doc.text(nameLines.slice(0, 3), x + qrSize + 3, y + 6);

    // Location (below name)
    if (items[i].location) {
      doc.setFontSize(6);
      doc.setTextColor(120, 120, 120);
      const locY = y + 6 + Math.min(nameLines.length, 3) * 3;
      doc.text(items[i].location!, x + qrSize + 3, locY);
    }

    // Scan instruction
    doc.setFontSize(5);
    doc.setTextColor(160, 160, 160);
    doc.text("Scan to update stock", x + qrSize + 3, y + cellH - 6);
  }

  return Buffer.from(doc.output("arraybuffer"));
}
