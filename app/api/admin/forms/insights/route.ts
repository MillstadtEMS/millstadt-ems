/**
 * GET /api/admin/forms/insights
 *   Returns admin HR rollups for the forms framework: month/year finalized
 *   counts, pending+awaiting counts, overdue assignment count, top form
 *   types in the last 30 days, and a flat recent-activity feed.
 *
 *   Recent activity items are enriched server-side with employee names
 *   and form labels so the client can render without a second roundtrip.
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { sql } from "@/lib/lounge/db";
import { adminFormsInsights } from "@/lib/lounge/forms/db";
import { FORM_REGISTRY } from "@/lib/lounge/forms/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin(); if (denied) return denied;

  const insights = await adminFormsInsights();
  const labelByType = new Map(FORM_REGISTRY.map((f) => [f.id, f.label]));

  const employeeIds = Array.from(new Set(insights.recentActivity.map((r) => r.employeeId))).filter(Boolean);
  let nameById = new Map<string, string>();
  if (employeeIds.length > 0) {
    const db = sql();
    const rows = (await db`
      SELECT id, first_name, last_name
      FROM lounge_employees
      WHERE id = ANY(${employeeIds}::text[])
    `) as unknown as { id: string; first_name: string; last_name: string }[];
    nameById = new Map(rows.map((r) => [r.id, `${r.first_name} ${r.last_name}`.trim()]));
  }

  return NextResponse.json({
    ...insights,
    byTypeLast30: insights.byTypeLast30.map((r) => ({
      ...r,
      formLabel: labelByType.get(r.formType) ?? r.formType,
    })),
    recentActivity: insights.recentActivity.map((r) => ({
      ...r,
      formLabel: labelByType.get(r.formType) ?? r.formType,
      employeeName: nameById.get(r.employeeId) ?? r.employeeId,
    })),
  });
}
