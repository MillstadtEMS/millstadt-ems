import { NextResponse } from "next/server";
import { list } from "@vercel/blob";

export const runtime = "nodejs";

const MONTH_ORDER = [
  "january","february","march","april","may","june",
  "july","august","september","october","november","december",
];

export async function GET() {
  try {
    const { blobs } = await list({ prefix: "commercial-club/" });

    if (!blobs.length) return NextResponse.json({ month: null, year: null });

    // Parse each blob path: commercial-club/{year}/{month}_newsletter.pdf
    type Parsed = { month: string; year: number; monthIdx: number };
    const parsed: Parsed[] = [];
    for (const blob of blobs) {
      const match = blob.pathname.match(/commercial-club\/(\d{4})\/(\w+)_newsletter/);
      if (!match) continue;
      const year = parseInt(match[1], 10);
      const month = match[2].toLowerCase();
      const monthIdx = MONTH_ORDER.indexOf(month);
      if (monthIdx === -1) continue;
      parsed.push({ month, year, monthIdx });
    }

    if (!parsed.length) return NextResponse.json({ month: null, year: null });

    // Find the latest by year then month index
    parsed.sort((a, b) => b.year - a.year || b.monthIdx - a.monthIdx);
    const latest = parsed[0];
    return NextResponse.json({ month: latest.month, year: String(latest.year) });
  } catch {
    return NextResponse.json({ month: null, year: null });
  }
}
