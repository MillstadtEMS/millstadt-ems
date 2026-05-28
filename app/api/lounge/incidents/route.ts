/**
 * GET  /api/lounge/incidents   — list (yours, or everyone for admins)
 * POST /api/lounge/incidents   — submit a new report
 *   body: {
 *     incidentDate?, incidentTime?, city?, specificLocation?, unitInvolved?,
 *     media?: [{url,kind,name}],
 *     payload?: { ...arbitrary form fields... }
 *   }
 */
import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { listIncidents, createIncident } from "@/lib/lounge/incidents";

export const runtime = "nodejs";

export async function GET() {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const reports = await listIncidents({ viewerId: me.id, isAdmin: me.isAdmin });
  return NextResponse.json({ reports });
}

export async function POST(req: NextRequest) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const report = await createIncident({
    authorId: me.id,
    incidentDate: body.incidentDate,
    incidentTime: body.incidentTime,
    city: body.city,
    specificLocation: body.specificLocation,
    unitInvolved: body.unitInvolved,
    payload: body.payload,
    media: Array.isArray(body.media) ? body.media : undefined,
  });
  return NextResponse.json({ report });
}
