/**
 * POST /api/lounge/incidents/[id]/admin-note
 *   body: { body: string }   — admin only; appends a note to admin_notes.
 */
import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { addAdminNote, getIncident } from "@/lib/lounge/incidents";

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const body = await req.json();
  if (!body.body?.trim()) return NextResponse.json({ error: "Note body required" }, { status: 400 });
  await addAdminNote({
    incidentId: id,
    authorId: me.id,
    authorName: `${me.firstName} ${me.lastName}`,
    body: String(body.body),
  });
  return NextResponse.json({ report: await getIncident(id) });
}
