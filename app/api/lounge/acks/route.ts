/**
 * GET  /api/lounge/acks       — viewer's list w/ per-ack viewed/acknowledged state
 *                                (?admin=1 returns admin roll-up w/ counts)
 * POST /api/lounge/acks       — create a new ack (admin only)
 *   body: { title, body, category, requiresAcknowledgment,
 *           attachmentUri?, attachmentName?, attachmentType? }
 */
import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import {
  listAcksForViewer,
  listAcksAdminRollup,
  createAck,
} from "@/lib/lounge/acks";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = new URL(req.url).searchParams.get("admin") === "1";
  if (admin && !me.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const acks = admin
    ? await listAcksAdminRollup()
    : await listAcksForViewer(me.id);
  return NextResponse.json({ acks });
}

export async function POST(req: NextRequest) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  if (!body.title?.trim() || !body.body?.trim()) {
    return NextResponse.json({ error: "Title and body required" }, { status: 400 });
  }
  const ack = await createAck({
    authorId: me.id,
    title: String(body.title),
    body: String(body.body),
    category: String(body.category ?? "General"),
    requiresAcknowledgment: !!body.requiresAcknowledgment,
    attachmentUri: body.attachmentUri,
    attachmentName: body.attachmentName,
    attachmentType: body.attachmentType,
  });
  return NextResponse.json({ ack });
}
