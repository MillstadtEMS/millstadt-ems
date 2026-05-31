import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { canEditTicker } from "@/lib/admin/auth";
import { sql } from "@/lib/neon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const db = sql();
  const year = currentChicagoYear();
  const rows = (await db`
    SELECT id, event_number, dispatch_datetime, dispatch_date, dispatch_time,
           dispatch_nature, source_year, completed_at, created_at
    FROM cad_calls
    WHERE source_year = ${year}
    ORDER BY dispatch_datetime DESC
  `) as unknown as CadCallRow[];

  return NextResponse.json({ calls: rows.map(rowToCall) });
}

export async function POST(req: NextRequest) {
  const g = await gate();
  if ("response" in g) return g.response;

  const body = await req.json().catch(() => ({}));
  const dispatchDate = typeof body.dispatchDate === "string" ? body.dispatchDate.trim() : "";
  const dispatchTime = typeof body.dispatchTime === "string" ? body.dispatchTime.trim() : "";
  const dispatchNature = typeof body.dispatchNature === "string" ? body.dispatchNature.trim() : "";
  const eventNumber = typeof body.eventNumber === "string" ? body.eventNumber.trim() : "";
  const active = body.active !== false;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dispatchDate) || !/^\d{2}:\d{2}$/.test(dispatchTime) || !dispatchNature) {
    return NextResponse.json({ error: "Date, time, and ticker text are required." }, { status: 400 });
  }

  const id = uid();
  const [year, month, day] = dispatchDate.split("-");
  const formattedDate = `${month}/${day}/${year}`;
  const dispatchDatetime = `${dispatchDate}T${dispatchTime}:00`;
  const completedAt = active ? null : new Date();
  const db = sql();

  await db`
    INSERT INTO cad_calls
      (id, gmail_message_id, event_number, dispatch_datetime, dispatch_date, dispatch_time,
       dispatch_nature, source_year, parse_status, completed_at)
    VALUES
      (${id}, ${`manual-ticker-${id}`}, ${eventNumber || null}, ${dispatchDatetime},
       ${formattedDate}, ${dispatchTime}, ${dispatchNature}, ${Number.parseInt(year, 10)}, 'manual', ${completedAt})
  `;

  return NextResponse.json({ ok: true, id });
}

export async function PATCH(req: NextRequest) {
  const g = await gate();
  if ("response" in g) return g.response;

  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const dispatchNature = typeof body.dispatchNature === "string" ? body.dispatchNature.trim() : undefined;
  const eventNumber = typeof body.eventNumber === "string" ? body.eventNumber.trim() : undefined;
  const active = typeof body.active === "boolean" ? body.active : undefined;

  if (!id) return NextResponse.json({ error: "Missing call id." }, { status: 400 });
  if (dispatchNature !== undefined && !dispatchNature) {
    return NextResponse.json({ error: "Ticker text cannot be blank." }, { status: 400 });
  }

  const db = sql();
  if (dispatchNature !== undefined) {
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
