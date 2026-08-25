import { NextRequest, NextResponse } from "next/server";
import { refreshMcsSchedule } from "@/lib/community/mcs-schedule";
import { hasValidBearerSecret } from "@/lib/security/operational";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret?.trim()) {
    return NextResponse.json({ error: "Cron authentication is not configured" }, { status: 503 });
  }
  if (!hasValidBearerSecret(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await refreshMcsSchedule();
    return NextResponse.json({
      ok: true,
      sourceArticleId: snapshot.sourceArticleId,
      sourceTitle: snapshot.sourceTitle,
      publishedAt: snapshot.publishedAt,
      eventCount: snapshot.events.length,
      fetchedAt: snapshot.fetchedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "MCS schedule refresh failed" },
      { status: 502 },
    );
  }
}
