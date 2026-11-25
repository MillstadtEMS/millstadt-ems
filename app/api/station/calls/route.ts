import { after, NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { isStationAuthed, stationReviewBypass } from "@/lib/station/auth";
import { demoCalls, isDemoMode } from "@/lib/station/cad/demo";
import { feedDiagnostics, getStationCalls, resolvePendingGeocodes } from "@/lib/station/cad/feed";
import type { StationCallsResponse } from "@/lib/station/cad/types";

// Live CAD calls for the station TV (components/station/StationCalls polls this every ~10 seconds).
// Signed-in station TVs only: call details never reach a public page, a cache or a search engine.
// ?health=1 is an admin-only readout of how the feed is doing (no call details, no email bodies).
// ?demo=demo|demo3 serves synthetic calls, in development only.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Room for a sync (Gmail) plus the geocoding that runs after the response.
export const maxDuration = 30;

const HEADERS = {
  "Cache-Control": "no-store, private, max-age=0",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: HEADERS });
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  if (params.get("health") === "1") {
    const employee = await currentEmployee();
    if (!employee?.isAdmin) return unauthorized();
    return NextResponse.json(await feedDiagnostics(), { headers: HEADERS });
  }

  const review = stationReviewBypass(Object.fromEntries(params.entries()), req.headers.get("host"));
  if (!review && !(await isStationAuthed())) return unauthorized();

  const demo = params.get("demo");
  if (process.env.NODE_ENV !== "production" && isDemoMode(demo)) {
    const now = Date.now();
    const asked = Number(params.get("t0"));
    const t0 = Number.isFinite(asked) && asked <= now && now - asked < 6 * 60 * 60_000 ? asked : now;
    const body: StationCallsResponse = {
      available: true,
      serverTime: new Date(now).toISOString(),
      calls: demoCalls(demo, t0, now),
      feed: { lastSyncAt: new Date(now).toISOString(), lastOkAt: new Date(now).toISOString(), error: null, delayed: false, demo },
    };
    return NextResponse.json(body, { headers: HEADERS });
  }

  const { response, pending } = await getStationCalls();
  if (pending.length) after(() => resolvePendingGeocodes(pending));
  return NextResponse.json(response, { headers: HEADERS });
}
