import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { currentEmployee } from "@/lib/lounge/auth";
import { getAckForUser, linkAckToPersonnelRecord, markAcknowledged } from "@/lib/lounge/acks";
import { createAttachment, createRecord } from "@/lib/lounge/personnel";
import { getEmployee } from "@/lib/lounge/employees";
import { buildAckMemorandumPdf } from "@/lib/lounge/ack-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: ackId } = await ctx.params;

  const body = await req.json().catch(() => ({}));
  const signature: string | null = typeof body.signature === "string" ? body.signature : null;

  // Look up the ack metadata for the personnel record title.
  const ack = await getAckForUser(ackId, me.id);
  if (!ack) return NextResponse.json({ error: "Notice not found" }, { status: 404 });

  // Require a signature on acks flagged requires_acknowledgment.
  if (ack.requiresAcknowledgment && (!signature || !signature.startsWith("data:image/"))) {
    return NextResponse.json({ error: "Signature required to acknowledge this notice." }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = req.headers.get("user-agent") ?? null;
  const acknowledgedAt = new Date().toISOString();

  await markAcknowledged({
    ackId,
    userId: me.id,
    signatureDataUrl: signature,
    ip,
    userAgent: ua,
  });

  // Drop a "Notice acknowledged" entry into the employee's personnel file
  // so admins see it in the Filing Cabinet timeline.
  try {
    const rec = await createRecord({
      employeeId: me.id,
      category: "performance",
      recordType: "Notice Acknowledgment",
      title: `Acknowledged: ${ack.title}`,
      summary: ack.body.slice(0, 800),
      severity: "informational",
      incidentDate: new Date().toISOString().slice(0, 10),
      createdBy: me.id,
      employeeVisible: true,
      adminNotes: `Auto-created from notice ack. Notice id: ${ack.id}. IP: ${ip ?? "?"}. UA: ${(ua ?? "?").slice(0, 200)}.`,
    });

    // Generate a memorandum PDF showing the notice + the signature + when it
    // was acknowledged, and attach that to the personnel record as the main
    // employee-visible document. Falls back gracefully if PDF build fails.
    let memoUrl: string | null = null;
    try {
      const emp = await getEmployee(me.id);
      const pdfBytes = await buildAckMemorandumPdf({
        noticeTitle: ack.title,
        noticeBody: ack.body,
        noticeCreatedAt: ack.createdAt,
        employeeName: `${me.firstName} ${me.lastName}`,
        employeeRank: emp?.position ?? emp?.certification ?? null,
        acknowledgedAt,
        signatureDataUrl: signature,
        signatureIp: ip,
      });
      const safeTitle = ack.title.replace(/[^a-z0-9]+/gi, "-").slice(0, 60).replace(/^-|-$/g, "") || "notice";
      const blob = await put(
        `lounge/ack-memorandums/${ack.id}-${me.id}-${safeTitle}.pdf`,
        pdfBytes,
        { access: "public", addRandomSuffix: false, contentType: "application/pdf" },
      );
      memoUrl = blob.url;
    } catch (e) {
      console.error("[ack] memorandum PDF build/upload failed:", e);
    }

    if (memoUrl) {
      await createAttachment({
        recordId: rec.id,
        employeeId: me.id,
        fileName: `Memorandum-${ack.title}.pdf`,
        fileUrl: memoUrl,
        fileMime: "application/pdf",
        documentCategory: "notice_acknowledgment",
        visibilityLevel: "employee",
        employeeNotes: `Signed memorandum for "${ack.title}"`,
        uploadedBy: me.id,
      });
    } else if (signature) {
      // PDF failed — at least keep the raw signature image so the audit
      // trail isn't completely empty.
      await createAttachment({
        recordId: rec.id,
        employeeId: me.id,
        fileName: `Acknowledgment-${ack.id}.png`,
        fileUrl: signature,
        fileMime: "image/png",
        documentCategory: "notice_acknowledgment",
        visibilityLevel: "employee",
        employeeNotes: `Signed copy of "${ack.title}"`,
        uploadedBy: me.id,
      });
    }
    await linkAckToPersonnelRecord(ack.id, me.id, rec.id);
  } catch (e) {
    // Personnel-file attach is best-effort — never block the ack itself.
    console.error("[ack] personnel record attach failed:", e);
  }

  return NextResponse.json({
    ok: true,
    acknowledgedAt,
    employeeFirstName: me.firstName,
  });
}
