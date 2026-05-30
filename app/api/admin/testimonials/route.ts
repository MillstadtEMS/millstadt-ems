import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import {
  getAllTestimonials,
  setStatus,
  deleteTestimonial,
} from "@/lib/testimonials";

export const runtime = "nodejs";

export async function GET() {
  const denied = await requireAdmin(); if (denied) return denied;
  return NextResponse.json(await getAllTestimonials());
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(); if (denied) return denied;
  const { id, status } = await req.json() as { id: string; status: "approved" | "denied" };
  if (status !== "approved" && status !== "denied") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  await setStatus(id, status);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin(); if (denied) return denied;
  const { id } = await req.json() as { id: string };
  await deleteTestimonial(id);
  return NextResponse.json({ ok: true });
}
