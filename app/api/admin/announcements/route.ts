import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin/auth";
import { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from "@/lib/db";

export const runtime = "nodejs";

async function auth() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

export async function GET() {
  const e = await auth(); if (e) return e;
  return NextResponse.json(await getAnnouncements(true));
}

export async function POST(req: NextRequest) {
  const e = await auth(); if (e) return e;
  const body = await req.json();
  const a = await createAnnouncement({ title: body.title, body: body.body, severity: body.severity ?? "info", active: body.active ?? true });
  return NextResponse.json(a);
}

export async function PATCH(req: NextRequest) {
  const e = await auth(); if (e) return e;
  const { id, ...data } = await req.json();
  await updateAnnouncement(id, data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const e = await auth(); if (e) return e;
  const { id } = await req.json();
  await deleteAnnouncement(id);
  return NextResponse.json({ ok: true });
}
