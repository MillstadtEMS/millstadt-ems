import { NextResponse } from "next/server";
import { getActiveCommunityAlerts } from "@/lib/community/alerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const alerts = await getActiveCommunityAlerts();
  const cacheControl = alerts.some((alert) => alert.state === "live")
    ? "public, s-maxage=20, stale-while-revalidate=20"
    : "public, s-maxage=300, stale-while-revalidate=600";
  return NextResponse.json(
    { alerts, checkedAt: new Date().toISOString() },
    {
      headers: {
        "Cache-Control": cacheControl,
      },
    },
  );
}
