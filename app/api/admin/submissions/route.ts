import { NextRequest, NextResponse } from "next/server";
import {
  getSubmissionCategories,
  getFormSubmissions,
  getFormSubmission,
  markSubmissionRead,
  deleteFormSubmission,
} from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(); if (denied) return denied;
  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type");
  const id   = searchParams.get("id");

  if (id) {
    const sub = await getFormSubmission(id);
    if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(sub);
  }

  if (type) {
    const subs = await getFormSubmissions(type);
    return NextResponse.json(subs);
  }

  const cats = await getSubmissionCategories();
  return NextResponse.json(cats);
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(); if (denied) return denied;
  const { id } = await req.json() as { id: string };
  await markSubmissionRead(id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin(); if (denied) return denied;
  const { id } = await req.json() as { id: string };
  await deleteFormSubmission(id);
  return NextResponse.json({ ok: true });
}
