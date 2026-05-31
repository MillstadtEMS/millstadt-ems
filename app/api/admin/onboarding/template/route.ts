/**
 * GET  /api/admin/onboarding/template
 *   Returns the full editable onboarding template (sections + items).
 * POST /api/admin/onboarding/template
 *   Creates a section or item depending on body.kind. Body shapes:
 *     { kind: "section", title, displayOrder? }
 *     { kind: "item", sectionId, label, required?, hasUpload?, ... }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { createItem, createSection, listTemplate } from "@/lib/lounge/onboarding/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin(); if (denied) return denied;
  const t = await listTemplate();
  return NextResponse.json(t);
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(); if (denied) return denied;
  const body = await req.json().catch(() => null) as null | Record<string, unknown>;
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const kind = body.kind;
  if (kind === "section") {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "Title required" }, { status: 400 });
    }
    const sec = await createSection({ title: body.title.trim(), displayOrder: typeof body.displayOrder === "number" ? body.displayOrder : undefined });
    return NextResponse.json({ section: sec });
  }
  if (kind === "item") {
    if (typeof body.sectionId !== "string" || typeof body.label !== "string" || !body.label.trim()) {
      return NextResponse.json({ error: "sectionId and label required" }, { status: 400 });
    }
    const item = await createItem({
      sectionId: body.sectionId,
      label: body.label.trim(),
      required: Boolean(body.required),
      hasUpload: Boolean(body.hasUpload),
      hasExpiration: Boolean(body.hasExpiration),
      hasNotes: body.hasNotes === undefined ? true : Boolean(body.hasNotes),
      hasVerification: Boolean(body.hasVerification),
      shareSaveToFile: Boolean(body.shareSaveToFile),
      shareEmailEmployee: Boolean(body.shareEmailEmployee),
      shareEmailAdmin: Boolean(body.shareEmailAdmin),
    });
    return NextResponse.json({ item });
  }
  return NextResponse.json({ error: "kind must be 'section' or 'item'" }, { status: 400 });
}
