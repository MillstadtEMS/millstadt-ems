/**
 * GET /api/cad/top-categories?year=YYYY&month=MM
 *
 * Public-readable rollup of categories for the homepage tile. No
 * employee identity is exposed — only categorical counts. Defaults to
 * the current Chicago-month so the tile auto-updates as time passes.
 */
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { ensureCadStructuredSchema } from "@/lib/cad/structured";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await ensureCadStructuredSchema();
  const q = req.nextUrl.searchParams;
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Chicago" }));
  const year  = q.get("year")  ? parseInt(q.get("year")!,  10) : now.getFullYear();
  const month = q.get("month") ? parseInt(q.get("month")!, 10) : now.getMonth() + 1;

  const start = `${year}-${String(month).padStart(2, "0")}-01T00:00:00`;
  const endY  = month === 12 ? year + 1 : year;
  const endM  = month === 12 ? 1 : month + 1;
  const end   = `${endY}-${String(endM).padStart(2, "0")}-01T00:00:00`;

  const db = sql();
  const rows = (await db`
    SELECT category, COUNT(*)::int AS n
    FROM cad_calls
    WHERE dispatch_datetime >= ${start} AND dispatch_datetime < ${end}
      AND category IS NOT NULL AND category <> ''
    GROUP BY category
    ORDER BY n DESC, category ASC
  `) as unknown as { category: string; n: number }[];

  const totalRow = (await db`
    SELECT COUNT(*)::int AS n
    FROM cad_calls
    WHERE dispatch_datetime >= ${start} AND dispatch_datetime < ${end}
  `) as unknown as { n: number }[];
  const total = totalRow[0]?.n ?? 0;

  return NextResponse.json({
    year, month, total,
    categories: rows.map((r) => ({
      name: r.category,
      count: r.n,
      pct: total > 0 ? (r.n / total) * 100 : 0,
    })),
  });
}
