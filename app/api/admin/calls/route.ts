import { NextRequest, NextResponse } from "next/server";
import { requireTickerEditor } from "@/lib/admin/auth";
import { sql } from "@/lib/neon";

export const runtime = "nodejs";

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export async function POST(req: NextRequest) {
  const denied = await requireTickerEditor(); if (denied) return denied;
  const { dispatchDate, dispatchTime, dispatchNature, eventNumber, active } = await req.json();
  if (!dispatchDate || !dispatchTime || !dispatchNature?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const id = uid();
  const gmailMessageId = `manual-${id}`;
  // dispatchDate comes in as YYYY-MM-DD from the date input; convert to MM/DD/YYYY to match CAD format
  const [year, month, day] = dispatchDate.split("-");
  const formattedDate = `${month}/${day}/${year}`;
  const dispatchDatetime = `${dispatchDate}T${dispatchTime}:00`;
  const sourceYear = parseInt(year, 10);
  const completedAt = active === true ? null : new Date();
  const db = sql();
  await db`
    INSERT INTO cad_calls
      (id, gmail_message_id, event_number, dispatch_datetime, dispatch_date, dispatch_time,
       dispatch_nature, source_year, parse_status, completed_at)
    VALUES
      (${id}, ${gmailMessageId}, ${eventNumber?.trim() || null}, ${dispatchDatetime},
       ${formattedDate}, ${dispatchTime}, ${dispatchNature.trim()}, ${sourceYear}, 'manual', ${completedAt})
  `;
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const denied = await requireTickerEditor(); if (denied) return denied;
  const body = await req.json();
  const { id, dispatchNature, active } = body as { id?: string; dispatchNature?: string; active?: boolean };
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const db = sql();
  if (typeof dispatchNature === "string") {
    await db`UPDATE cad_calls SET dispatch_nature = ${dispatchNature.trim()} WHERE id = ${id}`;
  }
  if (typeof active === "boolean") {
    if (active) {
      await db`UPDATE cad_calls SET completed_at = NULL WHERE id = ${id}`;
    } else {
      await db`UPDATE cad_calls SET completed_at = NOW() WHERE id = ${id} AND completed_at IS NULL`;
    }
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const denied = await requireTickerEditor(); if (denied) return denied;
  const { id } = await req.json();
  const db = sql();
  await db`DELETE FROM cad_calls WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
