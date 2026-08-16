import { NextRequest } from "next/server";
import { noStoreJson } from "@/lib/analytics/http";
import { pruneExpiredAnalytics } from "@/lib/analytics/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  }
  await pruneExpiredAnalytics();
  return noStoreJson({ ok: true });
}
