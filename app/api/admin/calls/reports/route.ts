/**
 * GET /api/admin/calls/reports?year=YYYY&month=MM&unit=M3925&agency=...&category=...&maStatus=received|given|none&hemsStatus=requested|handoff|disregarded
 *
 * Returns aggregated statistics for the call ticker over the requested
 * filter set. All filters are optional. The response is one rollup so
 * the report page only needs a single round-trip.
 *
 *   {
 *     range: { from, to, year, month },
 *     totals: { calls, mutualAidReceived, mutualAidGiven, hemsRequested, hemsHandoff, hemsDisregarded, multiUnit },
 *     byCategory: [{ name, count, pct }],          // sorted desc, includes pct of total in range
 *     byUnit:     [{ unit, count }],
 *     byMAAgency: [{ agency, count }],             // mutual aid received agency breakdown
 *     maGivenByUnit: [{ unit, count }],            // mutual aid given by Millstadt unit
 *     dailyCounts: [{ day, count }],               // for the date histogram
 *   }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireTickerEditor } from "@/lib/admin/auth";
import { sql } from "@/lib/neon";
import { ensureCadStructuredSchema } from "@/lib/cad/structured";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  dispatch_datetime: Date | string;
  category: string | null;
  units: string[] | null;
  mutual_aid_received: boolean;
  mutual_aid_received_agency: string | null;
  mutual_aid_given: boolean;
  mutual_aid_given_agency: string | null;
  hems_requested: boolean;
  hems_outcome: string | null;
  classification: string | null;
  cardiac_age: string | null;
  dispatch_date: string;
  dispatch_time: string;
  dispatch_nature: string;
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export async function GET(req: NextRequest) {
  const denied = await requireTickerEditor(); if (denied) return denied;
  await ensureCadStructuredSchema();
  const q = req.nextUrl.searchParams;

  const year  = q.get("year")  ? parseInt(q.get("year")!, 10)  : null;
  const month = q.get("month") ? parseInt(q.get("month")!, 10) : null;
  const from  = q.get("from"); // ISO date YYYY-MM-DD
  const to    = q.get("to");
  const unit  = q.get("unit");
  const agency = q.get("agency");
  const category = q.get("category");
  const maStatus = q.get("maStatus");     // received|given|none
  const hemsStatus = q.get("hemsStatus"); // requested|handoff|disregarded

  // Build a single WHERE chain. Neon's tagged-template SQL doesn't
  // easily compose so we fetch the full set for the date window and
  // filter the rest in JS — the table is small (<1k rows per year)
  // so this is cheap and keeps the SQL trivial.
  const db = sql();
  let rows: Row[];

  if (from && to) {
    rows = (await db`
      SELECT id, dispatch_datetime, dispatch_date, dispatch_time, dispatch_nature, category, units,
             mutual_aid_received, mutual_aid_received_agency,
             mutual_aid_given, mutual_aid_given_agency, hems_requested, hems_outcome,
             classification, cardiac_age
      FROM cad_calls
      WHERE dispatch_datetime >= ${from + "T00:00:00"}
        AND dispatch_datetime <  ${to   + "T23:59:59"}
    `) as unknown as Row[];
  } else if (year && month) {
    const start = `${year}-${String(month).padStart(2, "0")}-01T00:00:00`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear  = month === 12 ? year + 1 : year;
    const end = `${endYear}-${String(endMonth).padStart(2, "0")}-01T00:00:00`;
    rows = (await db`
      SELECT id, dispatch_datetime, dispatch_date, dispatch_time, dispatch_nature, category, units,
             mutual_aid_received, mutual_aid_received_agency,
             mutual_aid_given, mutual_aid_given_agency, hems_requested, hems_outcome,
             classification, cardiac_age
      FROM cad_calls
      WHERE dispatch_datetime >= ${start} AND dispatch_datetime < ${end}
    `) as unknown as Row[];
  } else if (year) {
    rows = (await db`
      SELECT id, dispatch_datetime, dispatch_date, dispatch_time, dispatch_nature, category, units,
             mutual_aid_received, mutual_aid_received_agency,
             mutual_aid_given, mutual_aid_given_agency, hems_requested, hems_outcome,
             classification, cardiac_age
      FROM cad_calls
      WHERE source_year = ${year}
    `) as unknown as Row[];
  } else {
    const thisYear = new Date().getFullYear();
    rows = (await db`
      SELECT id, dispatch_datetime, dispatch_date, dispatch_time, dispatch_nature, category, units,
             mutual_aid_received, mutual_aid_received_agency,
             mutual_aid_given, mutual_aid_given_agency, hems_requested, hems_outcome,
             classification, cardiac_age
      FROM cad_calls
      WHERE source_year = ${thisYear}
    `) as unknown as Row[];
  }

  // Apply field-level filters
  const filtered = rows.filter((r) => {
    if (unit) {
      const us = asArray<string>(r.units);
      if (!us.includes(unit)) return false;
    }
    if (agency && r.mutual_aid_received_agency !== agency && r.mutual_aid_given_agency !== agency) return false;
    if (category && r.category !== category) return false;
    if (maStatus === "received" && !r.mutual_aid_received) return false;
    if (maStatus === "given" && !r.mutual_aid_given) return false;
    if (maStatus === "none" && (r.mutual_aid_received || r.mutual_aid_given)) return false;
    if (hemsStatus === "requested"   && !r.hems_requested) return false;
    if (hemsStatus === "handoff"     && r.hems_outcome !== "handoff") return false;
    if (hemsStatus === "disregarded" && r.hems_outcome !== "disregarded") return false;
    return true;
  });

  const total = filtered.length;

  const catCount = new Map<string, number>();
  const unitCount = new Map<string, number>();
  const agencyCount = new Map<string, number>();
  const maGivenUnitCount = new Map<string, number>();
  const maGivenAgencyCount = new Map<string, number>();
  const dayCount = new Map<string, number>();
  let mar = 0, mag = 0, hReq = 0, hHand = 0, hDis = 0, multiUnit = 0;

  for (const r of filtered) {
    if (r.category) catCount.set(r.category, (catCount.get(r.category) ?? 0) + 1);
    const us = asArray<string>(r.units);
    for (const u of us) unitCount.set(u, (unitCount.get(u) ?? 0) + 1);
    if (us.length > 1) multiUnit++;
    if (r.mutual_aid_received) {
      mar++;
      if (r.mutual_aid_received_agency) agencyCount.set(r.mutual_aid_received_agency, (agencyCount.get(r.mutual_aid_received_agency) ?? 0) + 1);
    }
    if (r.mutual_aid_given) {
      mag++;
      for (const u of us) maGivenUnitCount.set(u, (maGivenUnitCount.get(u) ?? 0) + 1);
      if (r.mutual_aid_given_agency) maGivenAgencyCount.set(r.mutual_aid_given_agency, (maGivenAgencyCount.get(r.mutual_aid_given_agency) ?? 0) + 1);
    }
    if (r.hems_requested) {
      hReq++;
      if (r.hems_outcome === "handoff") hHand++;
      if (r.hems_outcome === "disregarded") hDis++;
    }
    const dt = r.dispatch_datetime instanceof Date ? r.dispatch_datetime : new Date(r.dispatch_datetime);
    if (!Number.isNaN(dt.getTime())) {
      const day = dt.toISOString().slice(0, 10);
      dayCount.set(day, (dayCount.get(day) ?? 0) + 1);
    }
  }

  function rank<T extends string>(m: Map<T, number>, label: string): { count: number; pct: number; [k: string]: number | string }[] {
    return Array.from(m.entries())
      .map(([k, count]) => ({ [label]: k, count, pct: total > 0 ? (count / total) * 100 : 0 }))
      .sort((a, b) => (b.count as number) - (a.count as number));
  }

  // ── Classification groups + Fire + Cardiac (hierarchical) ────────────
  const pctOf = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  const classOf = (r: Row): "trauma" | "medical" | "uncategorized" =>
    r.classification === "trauma" ? "trauma" : r.classification === "medical" ? "medical" : "uncategorized";
  const isFire = (cat: string | null) => !!cat && /^fire/i.test(cat);
  const fireType = (cat: string | null): "still" | "first" | "other" =>
    /still/i.test(cat ?? "") ? "still" : /1st/i.test(cat ?? "") ? "first" : "other";

  function buildGroup(pred: (r: Row) => boolean) {
    const rs = filtered.filter(pred);
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

  const groups = {
    trauma:        buildGroup((r) => classOf(r) === "trauma"),
    medical:       buildGroup((r) => classOf(r) === "medical"),
    // Uncategorized EXCLUDES fire — fire is surfaced as its own group.
    uncategorized: buildGroup((r) => classOf(r) === "uncategorized" && !isFire(r.category)),
  };

  const fireRows = filtered.filter((r) => isFire(r.category));
  const fire = {
    count: fireRows.length, pct: pctOf(fireRows.length),
    still: { count: fireRows.filter((r) => fireType(r.category) === "still").length, pct: pctOf(fireRows.filter((r) => fireType(r.category) === "still").length) },
    first: { count: fireRows.filter((r) => fireType(r.category) === "first").length, pct: pctOf(fireRows.filter((r) => fireType(r.category) === "first").length) },
    other: { count: fireRows.filter((r) => fireType(r.category) === "other").length, pct: pctOf(fireRows.filter((r) => fireType(r.category) === "other").length) },
  };

  // Busiest hour-of-day (0-23) + day-of-week (0=Sun) from dispatch strings.
  const byHour = new Array(24).fill(0);
  const byDow = new Array(7).fill(0);
  for (const r of filtered) {
    const hm = String(r.dispatch_time || "").match(/^(\d{1,2}):(\d{2})/);
    if (hm) { const h = parseInt(hm[1], 10); if (h >= 0 && h < 24) byHour[h]++; }
    const dm = String(r.dispatch_date || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dm) { const d = new Date(parseInt(dm[3], 10), parseInt(dm[1], 10) - 1, parseInt(dm[2], 10)); if (!Number.isNaN(d.getTime())) byDow[d.getDay()]++; }
  }

  const caRows = filtered.filter((r) => r.category === "Cardiac Arrest");
  const cardiac = {
    count: caRows.length, pct: pctOf(caRows.length),
    trauma:  caRows.filter((r) => r.classification === "trauma").length,
    medical: caRows.filter((r) => r.classification === "medical").length,
    adult:     caRows.filter((r) => r.cardiac_age === "adult").length,
    pediatric: caRows.filter((r) => r.cardiac_age === "pediatric").length,
  };

  // Lightweight call list for the clickable drill-down (admin only).
  const callList = filtered
    .slice()
    .sort((a, b) => {
      const ta = a.dispatch_datetime instanceof Date ? a.dispatch_datetime.getTime() : new Date(a.dispatch_datetime).getTime();
      const tb = b.dispatch_datetime instanceof Date ? b.dispatch_datetime.getTime() : new Date(b.dispatch_datetime).getTime();
      return tb - ta;
    })
    .map((r) => ({
      id: r.id,
      date: r.dispatch_date,
      time: r.dispatch_time,
      nature: r.dispatch_nature,
      category: r.category ?? "",
      classification: classOf(r),
      isFire: isFire(r.category),
      fireType: isFire(r.category) ? fireType(r.category) : null,
    }));

  return NextResponse.json({
    range: { from, to, year, month },
    filters: { unit, agency, category, maStatus, hemsStatus },
    totals: {
      calls: total,
      mutualAidReceived: mar,
      mutualAidGiven: mag,
      hemsRequested: hReq,
      hemsHandoff: hHand,
      hemsDisregarded: hDis,
      multiUnit,
    },
    byCategory: rank(catCount, "name"),
    byUnit:     rank(unitCount, "unit"),
    byMAAgency: rank(agencyCount, "agency"),
    maGivenByUnit: rank(maGivenUnitCount, "unit"),
    maGivenByAgency: rank(maGivenAgencyCount, "agency"),
    dailyCounts: Array.from(dayCount.entries()).map(([day, count]) => ({ day, count })).sort((a, b) => a.day.localeCompare(b.day)),
    groups,
    fire,
    cardiac,
    byHour,
    byDow,
    calls: callList,
  });
}
