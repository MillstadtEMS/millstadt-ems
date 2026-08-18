/**
 * Generate a printable PDF sheet of QR codes for inventory items.
 * Lays out QR codes in a grid with item names and locations.
 */

import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { drawContainedImage, loadLogo } from "@/lib/reports/pdf-system";

interface QrItem {
  itemName: string;
  location: string | null;
  url: string;
}

export async function generateQrSheetPdf(
  items: QrItem[],
  categoryName?: string
): Promise<Buffer> {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const generatedAt = new Date().toLocaleString("en-US", {
    timeZone: "America/Chicago",
    hour12: false,
  });

  // Layout: 3 columns x 5 rows per page = 15 per page
  const cols = 3;
  const rows = 5;
  const perPage = cols * rows;
  const cellW = 180;
  const cellH = 126;
  const marginLeft = 36;
  const marginTop = 92;
  const qrSize = 82;

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
    doc.setLineDashPattern([3, 3], 0);
    doc.rect(x, y, cellW - 4, cellH - 4);

    // Generate QR code as data URL
    try {
      const qrDataUrl = await QRCode.toDataURL(items[i].url, {
        width: 200,
        margin: 1,
        color: { dark: "#040d1a", light: "#ffffff" },
      });
      doc.addImage(qrDataUrl, "PNG", x + 6, y + 6, qrSize, qrSize);
    } catch {
      doc.setFontSize(8);
      doc.setTextColor(200, 0, 0);
      doc.text("QR Error", x + 12, y + 40);
    }

    // Item name (right of QR)
    doc.setFontSize(9);
    doc.setTextColor(4, 13, 26);
    const nameLines = doc.splitTextToSize(items[i].itemName, cellW - qrSize - 18);
    doc.text(nameLines.slice(0, 4), x + qrSize + 12, y + 16);

    // Location (below name)
    if (items[i].location) {
      doc.setFontSize(7.5);
      doc.setTextColor(120, 120, 120);
      const locY = y + 20 + Math.min(nameLines.length, 4) * 10;
      doc.text(doc.splitTextToSize(items[i].location!, cellW - qrSize - 18).slice(0, 2), x + qrSize + 12, locY);
    }

    // Scan instruction
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text("Scan for inventory item", x + qrSize + 12, y + cellH - 14);
  }

  const logo = await loadLogo();
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFillColor(12, 35, 64);
    doc.rect(0, 0, 612, 72, "F");
    doc.setFillColor(240, 180, 41);
    doc.rect(0, 72, 612, 3, "F");
    if (logo) drawContainedImage(doc, logo.dataUri, "PNG", 36, 13, 42, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text("Inventory QR Codes", 92, 34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(240, 180, 41);
    doc.text(`${categoryName ?? "All categories"} - ${items.length} items`, 92, 50);
    doc.setDrawColor(221, 226, 233);
    doc.line(36, 756, 576, 756);
    doc.setTextColor(126, 135, 148);
    doc.setFontSize(7.5);
    doc.text(`Generated ${generatedAt}`, 36, 772);
    doc.text(`Page ${page} of ${pageCount}`, 576, 772, { align: "right" });
  }

  return Buffer.from(doc.output("arraybuffer"));
}
