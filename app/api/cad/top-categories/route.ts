/**
 * GET /api/cad/top-categories?year=YYYY
 *
 * Public-readable rollup of categories for the homepage tile. No
 * employee identity is exposed — only categorical counts. Defaults to
 * the current Chicago-year (YTD) so the tile reflects everything
 * dispatched so far this calendar year.
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
  const year = q.get("year") ? parseInt(q.get("year")!, 10) : now.getFullYear();

  const start = `${year}-01-01T00:00:00`;
  const end   = `${year + 1}-01-01T00:00:00`;

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
    year, scope: "ytd", total,
    categories: rows.map((r) => ({
      name: r.category,
      count: r.n,
      pct: total > 0 ? (r.n / total) * 100 : 0,
    })),
  });
}
