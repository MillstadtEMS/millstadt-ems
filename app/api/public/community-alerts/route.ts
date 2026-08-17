import { NextResponse } from "next/server";
import { getActiveCommunityAlerts } from "@/lib/community/alerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const alerts = await getActiveCommunityAlerts();
  return NextResponse.json(
    { alerts, checkedAt: new Date().toISOString() },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
