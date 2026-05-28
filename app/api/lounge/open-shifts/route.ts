/**
 * GET  /api/lounge/open-shifts     — list (any employee)
 * POST /api/lounge/open-shifts     — create (admin only)
 *   body: { title, body, target? }
 */
import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { listOpenShifts, createOpenShift } from "@/lib/lounge/open-shifts";

export const runtime = "nodejs";

export async function GET() {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const shifts = await listOpenShifts(me.id);
  return NextResponse.json({ shifts });
}

export async function POST(req: NextRequest) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  if (!body.title?.trim() || !body.body?.trim()) {
    return NextResponse.json({ error: "Title and body required" }, { status: 400 });
  }
  const shift = await createOpenShift({
    authorId: me.id,
    title: String(body.title),
    body: String(body.body),
    target: String(body.target ?? "all"),
  });
  return NextResponse.json({ shift });
}
