export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin/auth";
import { getItems, getCategories, getReports, saveReport, getAuditLog, getSubmissions } from "@/lib/inventory/db";
import { generateOrderReport, generateExpiredReport, generateFullInventoryReport } from "@/lib/inventory/pdf";
import { put } from "@vercel/blob";

export async function GET(req: NextRequest) {
  const authed = await isAdminAuthed();
  if (!authed) {
    return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  if (type === "audit") {
    const entries = await getAuditLog(500);
    return NextResponse.json(entries);
  }

  if (type === "submissions") {
    const submissions = await getSubmissions(100);
    return NextResponse.json(submissions);
  }

  // Return saved reports
  const reportType = searchParams.get("reportType");
  const reports = await getReports(reportType ?? undefined);
  return NextResponse.json(reports);
}

export async function POST(req: NextRequest) {
  const authed = await isAdminAuthed();
  if (!authed) {
    return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  }

  try {
    const { reportType } = await req.json();
    const items = await getItems();
    const categories = await getCategories();

    let pdfBuffer: Buffer;
    let filename: string;

    const timestamp = new Date().toISOString().slice(0, 10);

    switch (reportType) {
      case "order":
        pdfBuffer = generateOrderReport(items, categories);
        filename = `Order_Report_${timestamp}.pdf`;
        break;
      case "expired":
        pdfBuffer = generateExpiredReport(items, categories);
        filename = `Expired_Items_${timestamp}.pdf`;
        break;
      case "general":
        pdfBuffer = generateFullInventoryReport(items, categories);
        filename = `Full_Inventory_${timestamp}.pdf`;
        break;
      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }

    // Store PDF via Vercel Blob
    const blob = await put(`inventory-reports/${filename}`, pdfBuffer, {
      access: "public",
      contentType: "application/pdf",
    });

    const report = await saveReport({
      reportType,
      filename,
      blobUrl: blob.url,
    });

    return NextResponse.json({ ok: true, report });
  } catch (e) {
    console.error("Report generation error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
