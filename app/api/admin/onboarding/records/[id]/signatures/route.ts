/**
 * POST /api/admin/onboarding/records/[id]/signatures
 *   Upsert one signature panel (employee / preceptor / witness). Body:
 *     { who, printedName, signatureDataUrl }
 *   Replaces any prior signature for the same who+record pair so the
 *   PDF always shows the most recent capture.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { currentEmployee } from "@/lib/lounge/auth";
import {
  getRecord,
  listSignatures,
  logOnboardingAudit,
  upsertSignature,
} from "@/lib/lounge/onboarding/db";
import type { SignerWho } from "@/lib/lounge/onboarding/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_WHO: SignerWho[] = ["employee", "preceptor", "witness"];

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const rec = await getRecord(id);
  if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (rec.status === "finalized") return NextResponse.json({ error: "Record is locked." }, { status: 409 });

  const body = await req.json().catch(() => null) as null | Record<string, unknown>;
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const who = typeof body.who === "string" ? body.who : null;
  const printedName = typeof body.printedName === "string" ? body.printedName.trim() : "";
  const signatureDataUrl = typeof body.signatureDataUrl === "string" ? body.signatureDataUrl : "";
  if (!who || !(VALID_WHO as string[]).includes(who)) {
    return NextResponse.json({ error: "who must be employee | preceptor | witness" }, { status: 400 });
  }
  if (!printedName) return NextResponse.json({ error: "printedName required" }, { status: 400 });
  if (!signatureDataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "signatureDataUrl must be a data: image" }, { status: 400 });
  }

  const sig = await upsertSignature({
    recordId: id,
    who: who as SignerWho,
    printedName,
    signatureDataUrl,
  });

  await logOnboardingAudit({
    recordId: id,
    actorId: me.id,
    actorName: `${me.firstName} ${me.lastName}`.trim(),
    action: "signed",
    details: `${who} — ${printedName}`,
  });

  const signatures = await listSignatures(id);
  return NextResponse.json({ signature: sig, signatures });
}
