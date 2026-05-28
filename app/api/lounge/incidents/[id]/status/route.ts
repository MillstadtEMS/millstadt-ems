/**
 * POST /api/lounge/incidents/[id]/status   — admin sets review status
 *   body: { status: 'pending' | 'under_review' | 'resolved' | 'dismissed' }
 */
import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { updateStatus, getIncident, type IncidentStatus } from "@/lib/lounge/incidents";

const VALID: IncidentStatus[] = ["pending", "under_review", "resolved", "dismissed"];

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const body = await req.json();
  if (!VALID.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  await updateStatus(id, body.status);
  return NextResponse.json({ report: await getIncident(id) });
}
