/**
 * Real driving-route ETA for the hospital list. Calls OSRM's public demo
 * server (router.project-osrm.org) to get an OSM-based driving time, then
 * applies a rush-hour traffic multiplier so the number the crew sees is
 * closer to what they'd see in Google/Apple Maps without us having to
 * sign a paid contract with either.
 *
 *   GET /api/lounge/hospitals/eta?lat=…&lng=…
 *
 * Returns { miles, minutes, source } where source is "osrm" on success
 * or "estimate" on a fall-back.
 */
import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { STATION_LAT, STATION_LNG, distanceMiles } from "@/lib/lounge/hospitals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function rushFactor(now: Date): number {
  const day = now.getDay();
  const h = now.getHours();
  if (day === 0 || day === 6) return 1.05;          // weekend
  if (h >= 7 && h < 9)  return 1.45;                // AM rush
  if (h >= 16 && h < 19) return 1.50;               // PM rush
  if (h >= 11 && h < 14) return 1.15;               // mid-day
  return 1.10;
}

export async function GET(req: NextRequest) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lng = Number(req.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  const haversineMiles = distanceMiles(STATION_LAT, STATION_LNG, lat, lng);
  const factor = rushFactor(new Date());

  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${STATION_LNG},${STATION_LAT};${lng},${lat}` +
      `?overview=false&alternatives=false&steps=false`;
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(tid);
    if (res.ok) {
      const d = await res.json();
      const r = d?.routes?.[0];
      if (r && typeof r.distance === "number" && typeof r.duration === "number") {
        const baseMiles = r.distance * 0.000621371;
        const baseMin = r.duration / 60;
        const trafficMin = Math.max(1, Math.round(baseMin * factor));
        return NextResponse.json({
          miles: Number(baseMiles.toFixed(1)),
          minutes: trafficMin,
          source: "osrm",
          rush: factor > 1.20,
        });
      }
    }
  } catch (e) {
    console.warn("[hospitals/eta] OSRM lookup failed:", e instanceof Error ? e.message : e);
  }

  // Fallback: distance / 55mph base, scaled by traffic factor.
  const baseMin = (haversineMiles / 55) * 60;
  return NextResponse.json({
    miles: Number(haversineMiles.toFixed(1)),
    minutes: Math.max(2, Math.round(baseMin * factor)),
    source: "estimate",
    rush: factor > 1.20,
  });
}
