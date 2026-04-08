import { NextRequest, NextResponse } from "next/server";
import { list } from "@vercel/blob";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") ?? currentMonth();
  const year  = searchParams.get("year")  ?? String(new Date().getFullYear());
  const prefix = `commercial-club/${year}/${month}_newsletter`;

  try {
    const { blobs } = await list({ prefix });
    const blob = blobs[0];
    return NextResponse.json({ month, year, url: blob?.url ?? null });
  } catch {
    return NextResponse.json({ month, year, url: null });
  }
}

function currentMonth() {
  return new Date().toLocaleString("en-US", { month: "long" }).toLowerCase();
}
