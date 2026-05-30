import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const denied = await requireAdmin(); if (denied) return denied;
  return NextResponse.json(await getAnnouncements(true));
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(); if (denied) return denied;
  const body = await req.json();
  const a = await createAnnouncement({ title: body.title, body: body.body, severity: body.severity ?? "info", active: body.active ?? true });
  return NextResponse.json(a);
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(); if (denied) return denied;
  const { id, ...data } = await req.json();
  await updateAnnouncement(id, data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin(); if (denied) return denied;
  const { id } = await req.json();
  await deleteAnnouncement(id);
  return NextResponse.json({ ok: true });
}
