import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin/auth";
import { getTestimonials, createTestimonial, updateTestimonial, deleteTestimonial } from "@/lib/db";

export const runtime = "nodejs";

async function auth() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

export async function GET() {
  const e = await auth(); if (e) return e;
  return NextResponse.json(await getTestimonials(true));
}

export async function POST(req: NextRequest) {
  const e = await auth(); if (e) return e;
  const body = await req.json();
  const t = await createTestimonial({ name: body.name, role: body.role ?? "", quote: body.quote, rating: body.rating ?? 5, approved: body.approved ?? true });
  return NextResponse.json(t);
}

export async function PATCH(req: NextRequest) {
  const e = await auth(); if (e) return e;
  const { id, ...data } = await req.json();
  await updateTestimonial(id, data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const e = await auth(); if (e) return e;
  const { id } = await req.json();
  await deleteTestimonial(id);
  return NextResponse.json({ ok: true });
}
