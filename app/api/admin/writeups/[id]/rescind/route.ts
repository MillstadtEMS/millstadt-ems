/**
 * POST /api/admin/writeups/[id]/rescind
 *
 * Removes a FINALIZED write-up from the employee's view:
 *   - Deletes the personnel record attachment(s) from Vercel Blob.
 *   - Archives the linked personnel record so it disappears from
 *     /lounge/my-file and the personnel dashboard.
 *   - Marks the write-up itself as 'rescinded' (status change) so the
 *     audit log is preserved instead of nuked.
 *   - Sends an in-lounge "this write-up was rescinded" notification to
 *     the employee.
 *   - Best-effort: emails the employee a rescission notice. Gmail's
 *     transport doesn't expose a true "unsend" once the message is
 *     out the door, so we explicitly send a follow-up notice instead;
 *     the response payload tells the admin this so the UI can show the
 *     warning verbatim.
 *
 * Body:
 *   { reason: string } — included on the rescission email + audit log
 *
 * Locked records: only status='finalized' can be rescinded. Drafts go
 * through the existing DELETE on /api/admin/writeups/[id].
 */
import { NextRequest, NextResponse } from "next/server";
import { del as blobDel } from "@vercel/blob";
import { privateBlobDeleteTarget } from "@/lib/lounge/private-blobs";
import { requireAdmin } from "@/lib/admin/auth";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import {
  getWriteUp,
  logWriteUpAudit,
  setWriteUpStatus,
} from "@/lib/lounge/writeups";
import {
  archiveRecord,
  deleteAttachment,
  listAttachmentsForRecord,
} from "@/lib/lounge/personnel";
import { sendEmployeeEmail } from "@/lib/lounge/employee-email";
import { emailAdmins } from "@/lib/lounge/notify-admins";
import { createNotifications } from "@/lib/lounge/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const wu = await getWriteUp(id);
  if (!wu) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (wu.status !== "finalized") {
    return NextResponse.json({ error: "Only finalized write-ups can be rescinded." }, { status: 409 });
  }

  const body = await req.json().catch(() => null) as null | { reason?: string };
  const reason = body && typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason) {
    return NextResponse.json({ error: "Please provide a reason for rescinding." }, { status: 400 });
  }

  const emp = await getEmployee(wu.employeeId);
  const employeeName = emp ? `${emp.firstName} ${emp.lastName}`.trim() : wu.employeeFullName || "the employee";

  // 1. Remove the attachment(s) from blob storage + archive the personnel
  //    record. We catch errors per step so a missing record doesn't
  //    block the rest of the rescind from happening.
  let attachmentsDeleted = 0;
  let blobsDeleted = 0;
  if (wu.personnelRecordId) {
    try {
      const attachments = await listAttachmentsForRecord(wu.personnelRecordId);
      for (const a of attachments) {
        try { await blobDel(privateBlobDeleteTarget(a.fileUrl)); blobsDeleted++; } catch (e) { console.error("[writeups rescind] blob delete:", e); }
        try { await deleteAttachment(a.id); attachmentsDeleted++; } catch (e) { console.error("[writeups rescind] attachment delete:", e); }
      }
    } catch (e) { console.error("[writeups rescind] list attachments:", e); }
    try { await archiveRecord(wu.personnelRecordId); } catch (e) { console.error("[writeups rescind] archive personnel:", e); }
  }
  // Also kill the standalone PDF blob the finalize uploaded, in case
  // saveToFile was false (no personnel record was ever created).
  if (wu.pdfUrl) {
    try { await blobDel(privateBlobDeleteTarget(wu.pdfUrl)); blobsDeleted++; } catch (e) { console.error("[writeups rescind] blob delete pdf:", e); }
  }

  // 2. Status flip — keep the row + audit trail so HR can prove the
  //    sequence of events later. The PDF URL is wiped so nothing in
  //    the UI offers a stale download.
  await setWriteUpStatus({ id, status: "rescinded", pdfUrl: null });
  await logWriteUpAudit({
    writeupId: id,
    actorId: me.id,
    actorName: `${me.firstName} ${me.lastName}`.trim(),
    action: "rescinded",
    details: reason,
  });

  // 3. Notify the employee in-lounge. Best-effort.
  try {
    await createNotifications([{
      recipientId: wu.employeeId,
      kind: "message",
      title: "A write-up on your record has been rescinded",
      bodyPreview: reason,
      linkUrl: "/lounge/my-file",
      sourceId: id,
      actorId: me.id,
    }]);
  } catch (e) { console.error("[writeups rescind] notify employee:", e); }

  // 4. Try to email a rescission notice. Email cannot truly be unsent
  //    after delivery — but we can send a clear follow-up so the
  //    employee knows the original write-up no longer stands.
  let rescissionEmailed = false;
  if (emp?.email && wu.saveToFile) {
    try {
      const recipients = emp.emailSecondary && emp.emailSecondaryAlerts ? [emp.email, emp.emailSecondary] : [emp.email];
      await sendEmployeeEmail({
        to: recipients,
        subject: `Millstadt EMS — Rescinded: prior write-up — ${employeeName}`,
        kicker: "Personnel Record · Rescinded",
        headline: "A write-up previously filed has been rescinded",
        meta: `Document ID ${id.slice(0, 8)} · ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })} CT`,
        bodyText:
          `Please disregard the previously emailed write-up — it has been rescinded by leadership.\n\n` +
          `Reason given:\n${reason}\n\n` +
          `The record has been removed from your personnel file in the Employee Lounge. If you have any questions, contact the office.`,
      });
      rescissionEmailed = true;
      await logWriteUpAudit({
        writeupId: id, actorId: me.id, actorName: `${me.firstName} ${me.lastName}`.trim(),
        action: "rescission_email_sent", details: recipients.join(", "),
      });
    } catch (e) { console.error("[writeups rescind] rescission email:", e); }
  }

  // 5. Tell the admin inbox.
  try {
    await emailAdmins({
      kicker: "Personnel Record · Rescinded",
      headline: `Write-up rescinded for ${employeeName}`,
      meta: `Document ID ${id.slice(0, 8)} · ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })} CT · By ${me.firstName} ${me.lastName}`,
      bodyText: `Reason:\n${reason}\n\nAttachments deleted: ${attachmentsDeleted}\nBlobs purged: ${blobsDeleted}\nRescission email to employee: ${rescissionEmailed ? "sent" : "skipped (no email / not previously shared)"}\n`,
      subject: `[EMS HR] Write-up rescinded — ${employeeName}`,
    });
  } catch (e) { console.error("[writeups rescind] email admin inbox:", e); }

  return NextResponse.json({
    ok: true,
    rescissionEmailed,
    attachmentsDeleted,
    blobsDeleted,
    // Tell the client the truth about email recall so the UI can
    // surface the right wording instead of pretending we unsent it.
    emailRecalled: false,
    emailRecallSupported: false,
  });
}
