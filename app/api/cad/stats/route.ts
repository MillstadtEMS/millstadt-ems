/**
 * GET /api/cad/stats  (public)
 *
 * Year-to-date call statistics for the public stats page + homepage
 * summary. Aggregate counts/percentages only — no patient detail, no
 * age bands (those stay back-office). Mirrors the grouping the admin
 * reports use so the public and internal numbers always agree.
 */
import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { ensureCadStructuredSchema } from "@/lib/cad/structured";
import { monthlyPeaks } from "@/lib/cad/stats";

export const runtime = "nodejs";
export const revalidate = 0;

interface Row {
  category: string | null;
  classification: string | null;
  dispatch_date: string;
  dispatch_time: string;
  dispatch_nature: string;
  dispatch_datetime: Date | string;
}

function currentChicagoYear(): number {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })).getFullYear();
}

export async function GET() {
  await ensureCadStructuredSchema();
  const db = sql();
  const year = currentChicagoYear();
  const rows = (await db`
    SELECT category, classification, dispatch_date, dispatch_time, dispatch_nature, dispatch_datetime
    FROM cad_calls WHERE source_year = ${year}
    ORDER BY dispatch_datetime DESC
  `) as unknown as Row[];

  const total = rows.length;
  const pctOf = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  const classOf = (r: Row): "trauma" | "medical" | "uncategorized" =>
    r.classification === "trauma" ? "trauma" : r.classification === "medical" ? "medical" : "uncategorized";
  const isFire = (cat: string | null) => !!cat && /^fire/i.test(cat);
  const fireType = (cat: string | null): "still" | "first" | "other" =>
    /still/i.test(cat ?? "") ? "still" : /1st/i.test(cat ?? "") ? "first" : "other";

  function group(pred: (r: Row) => boolean) {
    const rs = rows.filter(pred);
    const m = new Map<string, number>();
    for (const r of rs) if (r.category) m.set(r.category, (m.get(r.category) ?? 0) + 1);
    return {
      count: rs.length,
      pct: pctOf(rs.length),
      categories: Array.from(m.entries())
        .map(([name, count]) => ({ name, count, pct: pctOf(count) }))
        .sort((a, b) => b.count - a.count),
    };
  }

  const fireRows = rows.filter((r) => isFire(r.category));
  const fireCount = (t: string) => fireRows.filter((r) => fireType(r.category) === t).length;
  const caRows = rows.filter((r) => r.category === "Cardiac Arrest");

  const months = monthlyPeaks(rows);

  return NextResponse.json({
    year,
    total,
    groups: {
      trauma:        group((r) => classOf(r) === "trauma"),
      medical:       group((r) => classOf(r) === "medical"),
      uncategorized: group((r) => classOf(r) === "uncategorized" && !isFire(r.category)),
    },
    fire: {
      count: fireRows.length, pct: pctOf(fireRows.length),
      still: { count: fireCount("still"), pct: pctOf(fireCount("still")) },
      first: { count: fireCount("first"), pct: pctOf(fireCount("first")) },
      other: { count: fireCount("other"), pct: pctOf(fireCount("other")) },
    },
    cardiac: {
      count: caRows.length, pct: pctOf(caRows.length),
      medical: caRows.filter((r) => r.classification === "medical").length,
      trauma:  caRows.filter((r) => r.classification === "trauma").length,
    },
    months,
    // Individual calls (already public on the ticker) so the stats page
    // can list a category's calls on hover/tap.
    calls: rows.map((r) => ({
      date: r.dispatch_date,
      time: r.dispatch_time,
      nature: r.dispatch_nature,
      category: r.category ?? "",
      classification: classOf(r),
      fireType: isFire(r.category) ? fireType(r.category) : null,
    })),
  });
}
