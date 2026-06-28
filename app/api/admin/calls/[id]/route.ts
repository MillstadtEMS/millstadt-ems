/**
 * GET /api/admin/calls/[id]
 *
 * Returns one cad_calls row including the structured columns so the
 * admin editor can pre-fill its unit/category/mutual-aid/HEMS/notes
 * fields when an existing entry is opened for inline edit.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireTickerEditor } from "@/lib/admin/auth";
import { sql } from "@/lib/neon";
import { ensureCadStructuredSchema } from "@/lib/cad/structured";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  dispatch_date: string;
  dispatch_time: string;
  dispatch_nature: string;
  event_number: string | null;
  completed_at: Date | string | null;
  units: string[] | null;
  category: string | null;
  notes: string | null;
  mutual_aid_received: boolean;
  mutual_aid_received_agency: string | null;
  mutual_aid_given: boolean;
  mutual_aid_given_agency: string | null;
  hems_requested: boolean;
  hems_outcome: string | null;
  classification: string | null;
  cardiac_age: string | null;
  fire_responded: boolean | null;
  fire_agencies: string[] | null;
  police_responded: boolean | null;
  police_agencies: string[] | null;
  ems_mutual_aid: boolean | null;
  ems_mutual_aid_agencies: string[] | null;
  unit_dispositions: Record<string, string> | null;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireTickerEditor(); if (denied) return denied;
  await ensureCadStructuredSchema();
  const { id } = await ctx.params;
  const db = sql();
  const rows = (await db`
    SELECT id, dispatch_date, dispatch_time, dispatch_nature, event_number, completed_at,
           units, category, notes,
           mutual_aid_received, mutual_aid_received_agency, mutual_aid_given, mutual_aid_given_agency,
           hems_requested, hems_outcome, classification, cardiac_age,
           fire_responded, fire_agencies, police_responded, police_agencies,
           ems_mutual_aid, ems_mutual_aid_agencies, unit_dispositions
    FROM cad_calls
    WHERE id = ${id}
    LIMIT 1
  `) as unknown as Row[];
  const r = rows[0];
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: r.id,
    dispatchDate: r.dispatch_date,
    dispatchTime: r.dispatch_time,
    dispatchNature: r.dispatch_nature,
    eventNumber: r.event_number,
    completedAt: r.completed_at instanceof Date ? r.completed_at.toISOString() : r.completed_at,
    structured: {
      units: Array.isArray(r.units) ? r.units : [],
      category: r.category ?? "",
      notes: r.notes ?? "",
      mutualAidReceived: r.mutual_aid_received,
      mutualAidReceivedAgency: r.mutual_aid_received_agency ?? "",
      mutualAidGiven: r.mutual_aid_given,
      mutualAidGivenAgency: r.mutual_aid_given_agency ?? "",
      hemsRequested: r.hems_requested,
      hemsOutcome: r.hems_outcome ?? "",
      classification: r.classification ?? "",
      cardiacAge: r.cardiac_age ?? "",
      fireResponded: !!r.fire_responded,
      fireAgencies: Array.isArray(r.fire_agencies) ? r.fire_agencies : [],
      policeResponded: !!r.police_responded,
      policeAgencies: Array.isArray(r.police_agencies) ? r.police_agencies : [],
      emsMutualAid: !!r.ems_mutual_aid,
      emsMutualAidAgencies: Array.isArray(r.ems_mutual_aid_agencies) ? r.ems_mutual_aid_agencies : [],
      unitDispositions: (r.unit_dispositions && typeof r.unit_dispositions === "object" && !Array.isArray(r.unit_dispositions)) ? r.unit_dispositions : {},
    },
  });
}
