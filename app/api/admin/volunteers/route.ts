/**
 * GET  /api/admin/volunteers           — list all (active + inactive)
 * POST /api/admin/volunteers           — add a new volunteer { name }
 *
 * Hours are fetched alongside the roster from the related
 * /api/admin/volunteers/hours?year=YYYY endpoint so the page only
 * touches the DB twice.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { createVolunteer, listVolunteers } from "@/lib/lounge/volunteers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin(); if (denied) return denied;
  const volunteers = await listVolunteers(true);
  return NextResponse.json({ volunteers });
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(); if (denied) return denied;
  const body = await req.json().catch(() => null) as null | Record<string, unknown>;
  const name = body && typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const notes = body && typeof body.notes === "string" ? body.notes.trim() || null : null;
  const v = await createVolunteer({ name, notes });
  return NextResponse.json({ volunteer: v });
}
