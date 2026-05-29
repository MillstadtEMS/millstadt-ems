/**
 * Server-side PDF generation for a completed truck check.
 * Uses jspdf + jspdf-autotable. Returns a Buffer of the PDF bytes.
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface PdfInput {
  truckCheckId: string;
  unit: string;
  unitDescription: string;
  submittedBy: string;
  startedAt: string | null;
  submittedAt: string;
  durationSeconds: number;
  pencilWhipFlag: string;
  pencilWhipReasons: { code: string; message: string; severity: string }[];
  overallStatus: string;
  notes: string;
  categoryComments?: Record<string, string>;
  refillRequest?: string | null;
  items: {
    category: string;
    label: string;
    status: string | null;
    numericValue: number | null;
    unitOfMeasure: string | null;
    amountAdded: number | null;
    amountUnit: string | null;
    comment: string;
    isAbnormal: boolean;
    checkedAt: string;
  }[];
  photos: { url: string; caption: string | null }[];
  signatureDataUrl: string | null;
  // First attendant is the submitter (above). These are the additional crew.
  additionalAttendants: { name: string; signatureDataUrl: string | null }[];
}

function fmtTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function fmtClock(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

export async function buildTruckCheckPdf(input: PdfInput): Promise<Buffer> {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  let y = 48;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(20, 30, 60);
  doc.text("Millstadt EMS — Truck Check Report", 48, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Report ID: ${input.truckCheckId}`, 48, y); y += 14;
  doc.text(`Unit: ${input.unit} — ${input.unitDescription}`, 48, y); y += 14;
  const otherNames = input.additionalAttendants.map((a) => a.name).join(", ");
  doc.text(`Submitted by: ${input.submittedBy}${otherNames ? ` · With: ${otherNames}` : ""}`, 48, y); y += 14;
  doc.text(`Started: ${input.startedAt ? fmtClock(input.startedAt) : "?"}`, 48, y); y += 14;
  doc.text(`Submitted: ${fmtClock(input.submittedAt)}`, 48, y); y += 14;
  doc.text(`Duration: ${fmtTime(input.durationSeconds)}`, 48, y); y += 18;

  // Flag banner
  const flagColor: [number, number, number] =
    input.pencilWhipFlag === "possible_whip" ? [220, 38, 38]
    : input.pencilWhipFlag === "review" ? [217, 119, 6]
    : [22, 163, 74];
  doc.setFillColor(...flagColor);
  doc.roundedRect(48, y, W - 96, 26, 6, 6, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(input.pencilWhipFlag.toUpperCase().replace("_", " "), 60, y + 17);
  doc.setFont("helvetica", "normal");
  doc.text(`Overall: ${input.overallStatus}`, W - 200, y + 17);
  y += 38;

  if (input.pencilWhipReasons.length > 0) {
    doc.setTextColor(60);
    doc.setFontSize(9);
    for (const r of input.pencilWhipReasons) {
      const lines = doc.splitTextToSize(`• ${r.message}`, W - 110);
      doc.text(lines, 56, y);
      y += 12 * lines.length;
    }
    y += 6;
  }

  // Items table — group by category
  const byCat = new Map<string, PdfInput["items"]>();
  for (const it of input.items) {
    const arr = byCat.get(it.category) ?? [];
    arr.push(it);
    byCat.set(it.category, arr);
  }

  for (const [cat, list] of byCat) {
    if (y > 700) { doc.addPage(); y = 48; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(20, 30, 60);
    doc.text(cat, 48, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [["Item", "Status / Value", "Amount", "Comment"]],
      body: list.map((it) => [
        it.label + (it.isAbnormal ? "  ⚠" : ""),
        it.numericValue !== null
          ? `${it.numericValue} ${it.unitOfMeasure ?? ""}${it.status ? ` (${it.status})` : ""}`
          : (it.status ?? "—"),
        it.amountAdded !== null ? `${it.amountAdded} ${it.amountUnit ?? ""}` : "",
        it.comment || "",
      ]),
      styles: { fontSize: 9, cellPadding: 4, valign: "top" },
      headStyles: { fillColor: [240, 180, 41], textColor: 20, fontStyle: "bold" },
      bodyStyles: { textColor: 30 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 200 },
        1: { cellWidth: 110 },
        2: { cellWidth: 60 },
        3: { cellWidth: "auto" as unknown as number },
      },
      didParseCell: (data) => {
        if (data.section === "body") {
          const row = list[data.row.index];
          if (row?.isAbnormal) data.cell.styles.textColor = [220, 38, 38];
        }
      },
    });
    // @ts-expect-error jspdf-autotable extends `lastAutoTable` on the document.
    y = (doc.lastAutoTable?.finalY ?? y) + 10;

    // Section comments under each category, if present
    const sectionComment = input.categoryComments?.[cat];
    if (sectionComment) {
      if (y > 720) { doc.addPage(); y = 48; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(217, 119, 6);
      doc.text("Section comments:", 48, y); y += 12;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60);
      const lines = doc.splitTextToSize(sectionComment, W - 96);
      doc.text(lines, 48, y);
      y += 11 * lines.length + 6;
    }

    // Management-notify flag for the fridge specifically
    const fridge = list.find((i) => i.label.toLowerCase().startsWith("refrigerator temperature"));
    if (fridge && fridge.isAbnormal) {
      if (y > 720) { doc.addPage(); y = 48; }
      doc.setFillColor(220, 38, 38);
      doc.roundedRect(48, y, W - 96, 22, 4, 4, "F");
      doc.setTextColor(255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(
        `NOTIFY MANAGEMENT — Refrigerator out of range (${fridge.numericValue}°F). Acceptable 36–46°F.`,
        58,
        y + 15,
      );
      y += 32;
    }

    y += 8;
  }

  // Refill request
  if (input.refillRequest) {
    if (y > 680) { doc.addPage(); y = 48; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(20, 30, 60);
    doc.text("Vehicle Equipment / Maintenance Refill Request", 48, y); y += 14;
    doc.setFillColor(254, 243, 199);
    const refillLines = doc.splitTextToSize(input.refillRequest, W - 116);
    const boxH = 18 + 12 * refillLines.length;
    doc.roundedRect(48, y, W - 96, boxH, 6, 6, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(75, 41, 12);
    doc.text(refillLines, 58, y + 16);
    y += boxH + 18;
  }

  // Notes
  if (input.notes) {
    if (y > 700) { doc.addPage(); y = 48; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 30, 60);
    doc.text("General notes", 48, y); y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(40);
    const lines = doc.splitTextToSize(input.notes, W - 96);
    doc.text(lines, 48, y);
    y += 14 * lines.length + 8;
  }

  // Photos
  if (input.photos.length > 0) {
    if (y > 700) { doc.addPage(); y = 48; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 30, 60);
    doc.text(`Photos (${input.photos.length})`, 48, y); y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(40);
    for (const p of input.photos) {
      const line = `• ${p.caption || "(no caption)"} — ${p.url}`;
      const lines = doc.splitTextToSize(line, W - 96);
      doc.text(lines, 48, y);
      y += 12 * lines.length;
      if (y > 740) { doc.addPage(); y = 48; }
    }
  }

  // Signatures + certification
  if (y > 580) { doc.addPage(); y = 48; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 30, 60);
  doc.text("Certification", 48, y); y += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(45);
  const certText =
    "By signing below, I confirm that the information I have provided is true, accurate, and complete to " +
    "the best of my knowledge. I understand that this information may be used for documentation, " +
    "verification, scheduling, credentialing, administrative, or operational purposes. If any information " +
    "changes or if I later realize something needs to be corrected, I agree to notify the organization " +
    "as soon as reasonably possible.";
  const certLines = doc.splitTextToSize(certText, W - 96);
  doc.text(certLines, 48, y);
  y += 11 * certLines.length + 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 30, 60);
  doc.text("Signatures", 48, y); y += 14;

  // Two signatures per row.
  const all: { name: string; sig: string | null }[] = [
    { name: input.submittedBy, sig: input.signatureDataUrl },
    ...input.additionalAttendants.map((a) => ({ name: a.name, sig: a.signatureDataUrl })),
  ];
  for (let i = 0; i < all.length; i++) {
    const col = i % 2; // 0 left, 1 right
    if (col === 0 && i > 0) y += 110;
    if (y > 720) { doc.addPage(); y = 48; }
    const x = col === 0 ? 48 : 320;
    const a = all[i];
    if (a.sig) {
      try { doc.addImage(a.sig, "PNG", x, y, 220, 60); } catch { /* ignore */ }
    }
    doc.line(x, y + 64, x + 220, y + 64);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60);
    const role = i === 0 ? "Attendant" : `Attendant ${i + 1}`;
    doc.text(`${role} — ${a.name}`, x, y + 76);
    doc.text(`Signed ${fmtClock(input.submittedAt)}`, x, y + 88);
  }

  const buf = doc.output("arraybuffer");
  return Buffer.from(buf);
}
