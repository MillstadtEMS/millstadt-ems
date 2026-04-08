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

  try {
    const { blobs } = await list({ prefix });

    const docs: Record<string, string> = {};
    for (const blob of blobs) {
      // filename: senior-center/2026/april_menu.pdf → type = "menu"
      const name = blob.pathname.split("/").pop() ?? "";
      const type = name.replace(`${month}_`, "").replace(".pdf", "");
      docs[type] = blob.url;
    }

    return NextResponse.json({ month, year, docs });
  } catch {
    return NextResponse.json({ month, year, docs: {} });
  }
}

function currentMonth(): string {
  return new Date().toLocaleString("en-US", { month: "long" }).toLowerCase();
}
