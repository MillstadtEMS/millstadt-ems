import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { canEditTicker } from "@/lib/admin/auth";
import { sql } from "@/lib/neon";
import {
  CallStructured,
  ensureCadStructuredSchema,
  formatDispatchNature,
  HemsOutcome,
  MILLSTADT_UNITS,
  MillstadtUnit,
  MUTUAL_AID_AGENCIES,
  MutualAidAgency,
} from "@/lib/cad/structured";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface StructuredPayload {
  units?: string[];
  category?: string;
  notes?: string | null;
  mutualAidReceived?: boolean;
  mutualAidReceivedAgency?: string | null;
  mutualAidGiven?: boolean;
  hemsRequested?: boolean;
  hemsOutcome?: string | null;
}

/**
 * Mirror of the admin route's normalize() — clamps every incoming
 * structured field to the canonical shape so a bad client can't ever
 * land a non-canonical unit / agency / outcome in the row.
 */
function normalize(p: StructuredPayload | null | undefined): CallStructured {
  const units = Array.isArray(p?.units)
    ? (p!.units as string[]).filter((u): u is MillstadtUnit => (MILLSTADT_UNITS as readonly string[]).includes(u))
    : [];
  const agency = p?.mutualAidReceivedAgency && (MUTUAL_AID_AGENCIES as readonly string[]).includes(p.mutualAidReceivedAgency)
    ? (p.mutualAidReceivedAgency as MutualAidAgency)
    : null;
  const outcome: HemsOutcome | null = p?.hemsOutcome === "handoff" || p?.hemsOutcome === "disregarded"
    ? p.hemsOutcome
    : null;
  return {
    units: Array.from(new Set(units)),
    category: (p?.category ?? "").trim(),
    notes: p?.notes ? String(p.notes).trim() || null : null,
    mutualAidReceived: !!agency || p?.mutualAidReceived === true,
    mutualAidReceivedAgency: agency,
    mutualAidGiven: !!p?.mutualAidGiven,
    hemsRequested: !!p?.hemsRequested,
    hemsOutcome: outcome,
  };
}

interface CadCallRow {
  id: string;
  event_number: string | null;
  dispatch_datetime: Date | string;
  dispatch_date: string;
  dispatch_time: string;
  dispatch_nature: string;
  source_year: number;
  completed_at: Date | string | null;
  created_at: Date | string;
  units?: string[] | null;
  category?: string | null;
  notes?: string | null;
  mutual_aid_received?: boolean | null;
  mutual_aid_received_agency?: string | null;
  mutual_aid_given?: boolean | null;
  hems_requested?: boolean | null;
  hems_outcome?: string | null;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function currentChicagoYear(): number {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })).getFullYear();
}

function toIso(value: Date | string | null): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function rowToCall(row: CadCallRow) {
  return {
    id: row.id,
    eventNumber: row.event_number,
    dispatchDatetime: toIso(row.dispatch_datetime),
    dispatchDate: row.dispatch_date,
    dispatchTime: row.dispatch_time,
    dispatchNature: row.dispatch_nature,
    sourceYear: row.source_year,
    completedAt: toIso(row.completed_at),
    createdAt: toIso(row.created_at),
    structured: {
      units: Array.isArray(row.units) ? row.units : [],
      category: row.category ?? "",
      notes: row.notes ?? "",
      mutualAidReceived: !!row.mutual_aid_received,
      mutualAidReceivedAgency: row.mutual_aid_received_agency ?? "",
      mutualAidGiven: !!row.mutual_aid_given,
      hemsRequested: !!row.hems_requested,
      hemsOutcome: row.hems_outcome ?? "",
    },
  };
}

/**
 * Gate every method in this route on the same can_edit_ticker
 * permission used by /lounge/ticker-control's page-level check.
 * Without this they diverged: page lets Dylan in, API doesn't, so the
 * client got 403 on its first poll and reload-looped forever.
 */
async function gate() {
  const me = await currentEmployee();
  if (!me) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!(await canEditTicker())) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { me };
}

export async function GET() {
  const g = await gate();
  if ("response" in g) return g.response;
  await ensureCadStructuredSchema();

  const db = sql();
  const year = currentChicagoYear();
  const rows = (await db`
    SELECT id, event_number, dispatch_datetime, dispatch_date, dispatch_time,
           dispatch_nature, source_year, completed_at, created_at,
           units, category, notes,
           mutual_aid_received, mutual_aid_received_agency, mutual_aid_given,
           hems_requested, hems_outcome
    FROM cad_calls
    WHERE source_year = ${year}
    ORDER BY dispatch_datetime DESC
  `) as unknown as CadCallRow[];

  return NextResponse.json({ calls: rows.map(rowToCall) });
}

export async function POST(req: NextRequest) {
  const g = await gate();
  if ("response" in g) return g.response;
  await ensureCadStructuredSchema();

  const body = await req.json().catch(() => ({}));
  const dispatchDate = typeof body.dispatchDate === "string" ? body.dispatchDate.trim() : "";
  const dispatchTime = typeof body.dispatchTime === "string" ? body.dispatchTime.trim() : "";
  const eventNumber = typeof body.eventNumber === "string" ? body.eventNumber.trim() : "";
  const active = body.active !== false;
  const rawNature = typeof body.dispatchNature === "string" ? body.dispatchNature.trim() : "";
  const structuredIn = body.structured as StructuredPayload | undefined;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dispatchDate) || !/^\d{2}:\d{2}$/.test(dispatchTime)) {
    return NextResponse.json({ error: "Date and time are required." }, { status: 400 });
  }

  // Structured-first: when the new mobile editor sends `structured`,
  // regenerate the canonical dispatchNature from it so the row's text
  // always matches the structured columns. Legacy text-only POSTs still
  // work — they just won't backfill the structured columns.
  const struct = normalize(structuredIn);
  const dispatchNature = structuredIn
    ? formatDispatchNature(struct)
    : rawNature;

  if (!dispatchNature) {
    return NextResponse.json({ error: "Pick at least a unit or a category." }, { status: 400 });
  }
  if (structuredIn && struct.hemsRequested && struct.hemsOutcome === null) {
    return NextResponse.json(
      { error: "HEMS requested needs an outcome: Patient handoff or Disregarded." },
      { status: 400 },
    );
  }

  const id = uid();
  const [year, month, day] = dispatchDate.split("-");
  const formattedDate = `${month}/${day}/${year}`;
  const dispatchDatetime = `${dispatchDate}T${dispatchTime}:00`;
  const completedAt = active ? null : new Date();
  const db = sql();

  if (structuredIn) {
    await db`
      INSERT INTO cad_calls
        (id, gmail_message_id, event_number, dispatch_datetime, dispatch_date, dispatch_time,
         dispatch_nature, source_year, parse_status, completed_at,
         units, category, notes,
         mutual_aid_received, mutual_aid_received_agency, mutual_aid_given,
         hems_requested, hems_outcome)
      VALUES
        (${id}, ${`manual-ticker-${id}`}, ${eventNumber || null}, ${dispatchDatetime},
         ${formattedDate}, ${dispatchTime}, ${dispatchNature}, ${Number.parseInt(year, 10)}, 'manual', ${completedAt},
         ${JSON.stringify(struct.units)}::jsonb, ${struct.category || null}, ${struct.notes},
         ${struct.mutualAidReceived}, ${struct.mutualAidReceivedAgency}, ${struct.mutualAidGiven},
         ${struct.hemsRequested}, ${struct.hemsOutcome})
    `;
  } else {
    await db`
      INSERT INTO cad_calls
        (id, gmail_message_id, event_number, dispatch_datetime, dispatch_date, dispatch_time,
         dispatch_nature, source_year, parse_status, completed_at)
      VALUES
        (${id}, ${`manual-ticker-${id}`}, ${eventNumber || null}, ${dispatchDatetime},
         ${formattedDate}, ${dispatchTime}, ${dispatchNature}, ${Number.parseInt(year, 10)}, 'manual', ${completedAt})
    `;
  }

  return NextResponse.json({ ok: true, id });
}

export async function PATCH(req: NextRequest) {
  const g = await gate();
  if ("response" in g) return g.response;
  await ensureCadStructuredSchema();

  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const dispatchNature = typeof body.dispatchNature === "string" ? body.dispatchNature.trim() : undefined;
  const eventNumber = typeof body.eventNumber === "string" ? body.eventNumber.trim() : undefined;
  const active = typeof body.active === "boolean" ? body.active : undefined;
  const structuredIn = body.structured as StructuredPayload | undefined;

  if (!id) return NextResponse.json({ error: "Missing call id." }, { status: 400 });

  const db = sql();

  // Structured edit — regenerate text + persist all structured columns
  // in one shot. This is how the new mobile editor saves changes.
  if (structuredIn) {
    const struct = normalize(structuredIn);
    if (struct.hemsRequested && struct.hemsOutcome === null) {
      return NextResponse.json(
        { error: "HEMS requested needs an outcome: Patient handoff or Disregarded." },
        { status: 400 },
      );
    }
    const text = formatDispatchNature(struct);
    if (!text) {
      return NextResponse.json({ error: "Pick at least a unit or a category." }, { status: 400 });
    }
    await db`
      UPDATE cad_calls SET
        dispatch_nature             = ${text},
        units                       = ${JSON.stringify(struct.units)}::jsonb,
        category                    = ${struct.category || null},
        notes                       = ${struct.notes},
        mutual_aid_received         = ${struct.mutualAidReceived},
        mutual_aid_received_agency  = ${struct.mutualAidReceivedAgency},
        mutual_aid_given            = ${struct.mutualAidGiven},
        hems_requested              = ${struct.hemsRequested},
        hems_outcome                = ${struct.hemsOutcome}
      WHERE id = ${id}
    `;
  } else if (dispatchNature !== undefined) {
    if (!dispatchNature) {
      return NextResponse.json({ error: "Ticker text cannot be blank." }, { status: 400 });
    }
    await db`UPDATE cad_calls SET dispatch_nature = ${dispatchNature} WHERE id = ${id}`;
  }

  if (eventNumber !== undefined) {
    await db`UPDATE cad_calls SET event_number = ${eventNumber || null} WHERE id = ${id}`;
  }
  if (active !== undefined) {
    if (active) {
      await db`UPDATE cad_calls SET completed_at = NULL WHERE id = ${id}`;
    } else {
      await db`UPDATE cad_calls SET completed_at = NOW() WHERE id = ${id} AND completed_at IS NULL`;
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const g = await gate();
  if ("response" in g) return g.response;

  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return NextResponse.json({ error: "Missing call id." }, { status: 400 });

  const db = sql();
  await db`DELETE FROM cad_calls WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
