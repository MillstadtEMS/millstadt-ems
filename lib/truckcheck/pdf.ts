/**
 * Server-side PDF generation for a completed truck check.
 * Uses jspdf + jspdf-autotable. Returns a Buffer of the PDF bytes.
 */

import autoTable from "jspdf-autotable";
import {
  M,
  drawBulletList,
  drawCallout,
  drawContainedImage,
  drawMetadataGrid,
  drawOfficialHeader,
  drawTitleBlock,
  drawWrappedText,
  newDoc,
  stampFooter,
  type Cursor,
} from "@/lib/reports/pdf-system";

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
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

export async function buildTruckCheckPdf(input: PdfInput): Promise<Buffer> {
  const doc = newDoc();
  const W = doc.internal.pageSize.getWidth();
  const c: Cursor = { doc, y: M };
  await drawOfficialHeader(c, {
    reportType: "Truck Check Report",
    reportSubtitle: "Completed inspection",
    reportId: input.truckCheckId.slice(0, 8),
    submittedAt: input.submittedAt,
  });
  drawTitleBlock(c, {
    title: `Unit ${input.unit} Truck Check`,
    subtitle: input.unitDescription,
  });
  const otherNames = input.additionalAttendants.map((a) => a.name).join(", ");
  drawMetadataGrid(c, [
    { label: "Report ID", value: input.truckCheckId },
    { label: "Unit", value: `${input.unit} - ${input.unitDescription}` },
    { label: "Submitted by", value: input.submittedBy },
    ...(otherNames ? [{ label: "Additional crew", value: otherNames }] : []),
    { label: "Started", value: input.startedAt ? fmtClock(input.startedAt) : "Not provided" },
    { label: "Submitted", value: fmtClock(input.submittedAt) },
    { label: "Duration", value: fmtTime(input.durationSeconds) },
  ]);
  let y = c.y;

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
      c.y = y;
      drawBulletList(c, [r.message]);
      y = c.y;
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
        it.label + (it.isAbnormal ? "  [!]" : ""),
        it.numericValue !== null
          ? `${it.numericValue} ${it.unitOfMeasure ?? ""}${it.status ? ` (${it.status})` : ""}`
          : (it.status ?? "-"),
        it.amountAdded !== null ? `${it.amountAdded} ${it.amountUnit ?? ""}` : "",
        it.comment || "",
      ]),
      styles: { fontSize: 9, cellPadding: 4, valign: "top" },
      headStyles: { fillColor: [240, 180, 41], textColor: 20, fontStyle: "bold" },
      bodyStyles: { textColor: 30 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 48, right: 48, bottom: 64 },
      pageBreak: "auto",
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
      c.y = y;
      drawWrappedText(c, sectionComment, { x: 48, width: W - 96, lineHeight: 11, topOffset: 0, bottomGap: 6 });
      y = c.y;
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
        `NOTIFY MANAGEMENT - Refrigerator out of range (${fridge.numericValue} deg F). Acceptable 36-46 deg F.`,
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
    c.y = y;
    drawCallout(c, input.refillRequest);
    y = c.y;
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
    c.y = y;
    drawWrappedText(c, input.notes, { x: 48, width: W - 96 });
    y = c.y;
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
      const line = `${p.caption || "Photo"} - protected attachment retained with the electronic record`;
      c.y = y;
      drawBulletList(c, [line]);
      y = c.y;
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
      drawContainedImage(doc, a.sig, "PNG", x, y, 220, 60);
    }
    doc.line(x, y + 64, x + 220, y + 64);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60);
    const role = i === 0 ? "Attendant" : `Attendant ${i + 1}`;
    doc.text(`${role} - ${a.name}`, x, y + 76);
    doc.text(`Signed ${fmtClock(input.submittedAt)}`, x, y + 88);
  }

  stampFooter(doc, { reportId: input.truckCheckId.slice(0, 8), generatedAt: new Date().toISOString() });
  const buf = doc.output("arraybuffer");
  return Buffer.from(buf);
}
