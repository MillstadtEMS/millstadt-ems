import { NextResponse } from "next/server";

export const runtime = "nodejs";
// Revalidate every 10 minutes — METAR updates on the hour and half-hour
export const revalidate = 600;

export async function GET() {
  try {
    const res = await fetch(
      "https://aviationweather.gov/api/data/metar?ids=KALN&format=json&hours=2",
      {
        headers: {
          "User-Agent": "(millstadtems.org, millstadtems@gmail.com)",
          Accept: "application/json",
        },
        next: { revalidate: 600 },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "METAR fetch failed", status: res.status }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=600, stale-while-revalidate=120" },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
