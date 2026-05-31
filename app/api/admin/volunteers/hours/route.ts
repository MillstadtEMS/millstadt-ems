/**
 * GET /api/admin/volunteers/hours?year=YYYY
 *   Returns every (volunteer × month) row for the requested year. The
 *   client materializes the matrix client-side so the API stays cheap.
 * PUT /api/admin/volunteers/hours
 *   Upserts one cell. Body: { volunteerId, year, month, hours, notes? }
 *   Setting hours = 0 keeps the row (useful for an audit trail showing
 *   "yes, we checked, it really was zero"). Use DELETE to clear.
 * DELETE /api/admin/volunteers/hours
 *   Body: { volunteerId, year, month } — removes the row entirely.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { currentEmployee } from "@/lib/lounge/auth";
import { deleteHours, listHoursForYear, setHours } from "@/lib/lounge/volunteers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(); if (denied) return denied;
  const yearParam = req.nextUrl.searchParams.get("year");
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }
  const hours = await listHoursForYear(year);
  return NextResponse.json({ year, hours });
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin(); if (denied) return denied;
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as null | Record<string, unknown>;
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const volunteerId = typeof body.volunteerId === "string" ? body.volunteerId : "";
  const year  = typeof body.year  === "number" ? body.year  : NaN;
  const month = typeof body.month === "number" ? body.month : NaN;
  const hours = typeof body.hours === "number" ? body.hours : NaN;
  const notes = typeof body.notes === "string" ? body.notes : null;

  if (!volunteerId || !Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12 || !Number.isFinite(hours) || hours < 0) {
    return NextResponse.json({ error: "volunteerId, year, month (1-12), and non-negative hours required" }, { status: 400 });
  }

  const row = await setHours({ volunteerId, year, month, hours, notes, updatedById: me.id });
  return NextResponse.json({ row });
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin(); if (denied) return denied;
  const body = await req.json().catch(() => null) as null | Record<string, unknown>;
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const volunteerId = typeof body.volunteerId === "string" ? body.volunteerId : "";
  const year  = typeof body.year  === "number" ? body.year  : NaN;
  const month = typeof body.month === "number" ? body.month : NaN;
  if (!volunteerId || !Number.isFinite(year) || !Number.isFinite(month)) {
    return NextResponse.json({ error: "volunteerId, year, month required" }, { status: 400 });
  }
  await deleteHours(volunteerId, year, month);
  return NextResponse.json({ ok: true });
}
