import { NextRequest, NextResponse } from "next/server";
import { runAiMonitor } from "@/lib/ai-monitor/runner";
import { hasValidBearerSecret } from "@/lib/security/operational";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function chicagoClock(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return {
    date: part("year") + "-" + part("month") + "-" + part("day"),
    hour: Number(part("hour")),
    weekday: part("weekday"),
  };
}

function json(body: unknown, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store, private");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

export async function GET(req: NextRequest) {
  const previewSmoke =
    process.env.VERCEL_ENV === "preview" && req.nextUrl.searchParams.get("smoke") === "1";
  if (!previewSmoke) {
    const secret = process.env.CRON_SECRET;
    if (!secret?.trim()) return json({ error: "Cron authentication is not configured." }, 503);
    if (!hasValidBearerSecret(req.headers.get("authorization"), secret)) {
      return json({ error: "Unauthorized" }, 401);
    }
  }

  const now = new Date();
  if (previewSmoke) {
    const commit = (process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown").slice(0, 12);
    const nightly = await runAiMonitor("nightly_security", `preview-${commit}`, now);
    return json({ ok: true, previewSmoke: true, reportOnly: true, nightly });
  }

  const chicago = chicagoClock(now);
  if (chicago.hour !== 23) {
    return json({ ok: true, skipped: true, reason: "outside_chicago_schedule_window" });
  }

  const nightly = await runAiMonitor("nightly_security", chicago.date, now);
  const weekly = chicago.weekday === "Sun"
    ? await runAiMonitor("weekly_analytics", chicago.date, now)
    : { status: "skipped" as const, reason: "not_weekly_window" };
  return json({ ok: true, reportOnly: true, nightly, weekly });
}
