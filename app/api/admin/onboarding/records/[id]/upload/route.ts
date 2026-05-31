/**
 * POST /api/admin/onboarding/records/[id]/upload
 *   Multipart upload for one checklist item's supporting document
 *   (license PDF, FEMA certificate, CPR card, etc.). Body must include
 *   { file, itemId, expirationDate? }.
 *
 *   The blob is stored in lounge/onboarding/<recordId>/<itemId>/ so it
 *   stays scoped to this onboarding record.
 */
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAdmin } from "@/lib/admin/auth";
import { currentEmployee } from "@/lib/lounge/auth";
import { getRecord, logOnboardingAudit, setProgress } from "@/lib/lounge/onboarding/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const rec = await getRecord(id);
  if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (rec.status === "finalized") return NextResponse.json({ error: "Record is locked." }, { status: 409 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const itemId = form.get("itemId") as string | null;
  const expirationDate = (form.get("expirationDate") as string | null) || null;
  if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });
  if (!itemId) return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 25 MB)" }, { status: 400 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `lounge/onboarding/${id}/${itemId}/${Date.now()}_${safeName}`;
  const blob = await put(path, file, {
    access: "public",
    allowOverwrite: false,
    contentType: file.type || "application/octet-stream",
  });

  const progress = await setProgress({
    recordId: id,
    itemId,
    actorId: me.id,
    actorName: `${me.firstName} ${me.lastName}`.trim(),
    patch: {
      fileUrl: blob.url,
      fileName: file.name,
      expirationDate,
    },
  });

  await logOnboardingAudit({
    recordId: id,
    actorId: me.id,
    actorName: `${me.firstName} ${me.lastName}`.trim(),
    action: "upload",
    details: `Item ${itemId.slice(0, 8)} — ${file.name}`,
  });

  return NextResponse.json({ progress, url: blob.url });
}
