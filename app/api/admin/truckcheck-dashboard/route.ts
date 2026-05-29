import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { sql } from "@/lib/lounge/db";

export const dynamic = "force-dynamic";

interface CheckRow {
  id: string;
  unit: string;
  submitted_at: string;
  started_at: string | null;
  duration_seconds: number | null;
  overall_status: string | null;
  pencil_whip_flag: string | null;
  pencil_whip_reasons: { code: string; message: string; severity: string }[];
  submitted_by_id: string;
  attendant_name: string | null;
  attendant2_name: string | null;
  notes: string | null;
  pdf_url: string | null;
  abnormal_count: number;
  fail_count: number;
  photo_count: number;
}

interface TrendRow {
  unit: string;
  trend_group: string;
  occurrences: number;
  last_at: string;
  avg_value: number | null;
}

export async function GET(req: NextRequest) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const unit = url.searchParams.get("unit");
  const days = Math.min(180, Math.max(1, Number(url.searchParams.get("days") ?? 30)));
  const employee = url.searchParams.get("employee");
  const flag = url.searchParams.get("flag");

  const db = sql();

  // Recent checks list (filterable). Compute item counts inline.
  const checks = (await db`
    SELECT
      c.id, c.unit, c.submitted_at, c.started_at, c.duration_seconds,
      c.overall_status, c.pencil_whip_flag, c.pencil_whip_reasons,
      c.submitted_by_id, c.attendant2_name, c.notes, c.pdf_url,
      e.first_name || ' ' || e.last_name AS attendant_name,
      COALESCE((SELECT COUNT(*)::int FROM lounge_truck_check_items i WHERE i.truck_check_id = c.id AND i.is_abnormal = TRUE), 0) AS abnormal_count,
      COALESCE((SELECT COUNT(*)::int FROM lounge_truck_check_items i WHERE i.truck_check_id = c.id AND i.status IN ('Fail','Missing','Discrepancy','Expired Found','Out of Range')), 0) AS fail_count,
      COALESCE((SELECT COUNT(*)::int FROM lounge_truck_check_photos p WHERE p.truck_check_id = c.id), 0) AS photo_count
    FROM lounge_truck_checks c
    LEFT JOIN lounge_employees e ON e.id = c.submitted_by_id
    WHERE c.submitted_at > NOW() - (${days} || ' days')::interval
      AND (${unit ?? null}::text IS NULL OR c.unit = ${unit ?? null}::text)
      AND (${employee ?? null}::text IS NULL OR c.submitted_by_id = ${employee ?? null}::text)
      AND (${flag ?? null}::text IS NULL OR c.pencil_whip_flag = ${flag ?? null}::text)
    ORDER BY c.submitted_at DESC
    LIMIT 200
  `) as unknown as CheckRow[];

  // Trend rollups by trend_group + unit (last `days` days).
  const trends = (await db`
    SELECT i.unit, i.trend_group,
           COUNT(*)::int AS occurrences,
           MAX(i.checked_at) AS last_at,
           AVG(i.numeric_value)::numeric(10,2) AS avg_value
    FROM lounge_truck_check_items i
    WHERE i.checked_at > NOW() - (${days} || ' days')::interval
      AND i.trend_group IS NOT NULL
      AND (${unit ?? null}::text IS NULL OR i.unit = ${unit ?? null}::text)
      AND (i.is_abnormal = TRUE
           OR i.status IN ('Filled','Added Oil','Restocked','Replaced','Leak Noted')
           OR i.amount_added IS NOT NULL)
    GROUP BY i.unit, i.trend_group
    ORDER BY occurrences DESC, last_at DESC
    LIMIT 60
  `) as unknown as TrendRow[];

  // Employees with multiple flagged checks in the window
  const fastSubmitters = (await db`
    SELECT e.id, e.first_name || ' ' || e.last_name AS name,
           COUNT(*)::int AS fast_count
    FROM lounge_truck_checks c
    JOIN lounge_employees e ON e.id = c.submitted_by_id
    WHERE c.submitted_at > NOW() - (${days} || ' days')::interval
      AND c.duration_seconds IS NOT NULL
      AND c.duration_seconds < 90
    GROUP BY e.id, e.first_name, e.last_name
    HAVING COUNT(*) >= 2
    ORDER BY fast_count DESC
    LIMIT 20
  `) as unknown as { id: string; name: string; fast_count: number }[];

  return NextResponse.json({
    days,
    checks,
    trends,
    fastSubmitters,
  });
}
