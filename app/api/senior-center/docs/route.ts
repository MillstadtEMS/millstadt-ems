/**
 * GET /api/senior-center/docs?month=april&year=2026
 * Returns available PDF URLs from Vercel Blob for the given month/year.
 */
import { NextRequest, NextResponse } from "next/server";
import { list } from "@vercel/blob";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") ?? currentMonth();
  const year  = searchParams.get("year")  ?? String(new Date().getFullYear());

  const prefix = `senior-center/${year}/${month}_`;

  // Static fallbacks — files already committed to public/senior-center/
  const STATIC: Record<string, Record<string, string>> = {
    "april-2026": {
      menu:         "/senior-center/april_menu.pdf",
      activities:   "/senior-center/april_activities.pdf",
      newsletter:   "/senior-center/april_newsletter.pdf",
    },
  };
  const staticKey = `${month}-${year}`;

  try {
    const { blobs } = await list({ prefix });

    const docs: Record<string, string> = { ...(STATIC[staticKey] ?? {}) };
    for (const blob of blobs) {
      // Blob always wins over static fallback
      const name = blob.pathname.split("/").pop() ?? "";
      const type = name.replace(`${month}_`, "").replace(".pdf", "");
      docs[type] = blob.url;
    }

    return NextResponse.json({ month, year, docs });
  } catch {
    // Blob not configured yet — serve static files only
    return NextResponse.json({ month, year, docs: STATIC[staticKey] ?? {} });
  }
}

function currentMonth(): string {
  return new Date().toLocaleString("en-US", { month: "long" }).toLowerCase();
}
