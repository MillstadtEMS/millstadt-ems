/**
 * POST /api/admin/writeups/[id]/finalize
 *
 * Validates required fields, renders the PDF, uploads it to Vercel Blob,
 * and (if saveToFile is set) creates a personnel record + attachment so
 * the write-up shows up in the employee's file. The write-up row itself
 * transitions to status="finalized" and becomes immutable.
 */
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAdmin } from "@/lib/admin/auth";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import {
  finalizeWriteUp,
  getWriteUp,
  logWriteUpAudit,
  missingRequiredFields,
} from "@/lib/lounge/writeups";
import { buildWriteUpPdf, writeUpFilename } from "@/lib/lounge/writeup-pdf";
import { createRecord, createAttachment } from "@/lib/lounge/personnel";
import { sendEmployeeEmail } from "@/lib/lounge/employee-email";
import { emailAdmins } from "@/lib/lounge/notify-admins";
import { createNotifications } from "@/lib/lounge/notifications";
import {
  privateBlobReference,
  privateLoungeBlobAbsoluteUrl,
  privateLoungeBlobUrl,
} from "@/lib/lounge/private-blobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const wu = await getWriteUp(id);
  if (!wu) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (wu.status === "finalized") {
    return NextResponse.json({ error: "Write-up is already finalized." }, { status: 409 });
  }

  const missing = missingRequiredFields(wu);
  if (missing.length > 0) {
    return NextResponse.json({ error: "Missing required fields", missing }, { status: 400 });
  }

  const emp = await getEmployee(wu.employeeId);
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  const last = emp.lastName;
  const first = emp.firstName;
  const filename = writeUpFilename(last, first, wu.dateIssued);

  // Render final (no draft watermark)
  const pdf = await buildWriteUpPdf({ writeUp: wu, draft: false });

  // Store in Vercel Blob. Path is per-employee so it's at least filed by
  // person; visibility is controlled by the personnel record's
  // employee_visible flag when (and only when) we save to file.
  const slug = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const blob = await put(
    `lounge/writeups/${wu.employeeId}/${slug}-${filename}`,
    pdf,
    { access: "private", contentType: "application/pdf" },
  );
  const pdfReference = privateBlobReference(blob.pathname);
  const protectedPdfUrl = privateLoungeBlobAbsoluteUrl(pdfReference);

  // Optionally create the personnel record + attachment.
  let personnelRecordId: string | null = null;
  if (wu.saveToFile) {
    const record = await createRecord({
      employeeId: wu.employeeId,
      category: "conduct",
      recordType: "corrective_action",
      title: `${wu.correctiveActionType}: ${wu.issueCategory}`.slice(0, 200),
      summary: wu.factualDescription.slice(0, 2000),
      actionTaken: wu.correctiveExpectations.slice(0, 2000),
      severity: severityForActionType(wu.correctiveActionType),
      status: "active",
      incidentDate: wu.incidentDate,
      createdBy: me.id,
      supervisorId: wu.supervisorId,
      witnesses: wu.witnessSignature?.printedName ?? null,
      relatedPolicy: wu.policyViolated.slice(0, 500),
      employeeVisible: true,
      restrictedVisibility: false,
      acknowledgmentRequired: false,
      adminNotes: wu.managerInternalNotes ?? null,
    });
    personnelRecordId = record.id;

    await createAttachment({
      recordId: record.id,
      employeeId: wu.employeeId,
      fileName: filename,
      fileUrl: pdfReference,
      fileMime: "application/pdf",
      fileSize: pdf.length,
      documentCategory: "Corrective action",
      visibilityLevel: "employee",
      uploadedBy: me.id,
    });

    await logWriteUpAudit({
      writeupId: id,
      actorId: me.id,
      actorName: `${me.firstName} ${me.lastName}`.trim(),
      action: "saved_to_file",
      details: `personnel record ${record.id}`,
    });
  }

  const finalized = await finalizeWriteUp({
    id,
    pdfUrl: pdfReference,
    pdfFilename: filename,
    personnelRecordId,
    finalizedById: me.id,
  });

  await logWriteUpAudit({
    writeupId: id,
    actorId: me.id,
    actorName: `${me.firstName} ${me.lastName}`.trim(),
    action: "finalized",
  });

  // Distribute the finalized write-up. When the admin chose to share
  // with the employee (saveToFile = true), the employee gets:
  //   1. an in-lounge notification (the red bell badge)
  //   2. an email with the PDF link to their primary inbox (and to
  //      their secondary inbox if they opted into duplicate alerts)
  // The admin inbox (millstadtems@gmail.com) always gets a record-keeping
  // copy on finalize so leadership has a paper trail outside the app.
  // All distribution is best-effort: a Gmail blip never blocks the
  // finalize from succeeding.
  const employeeName = `${first} ${last}`.trim();
  const subjectStamp = wu.dateIssued ?? new Date().toISOString().slice(0, 10);
  let emailedEmployee = false;
  let notifiedEmployee = false;

  if (wu.saveToFile) {
    try {
      await createNotifications([{
        recipientId: wu.employeeId,
        kind: "message",
        title: "A write-up has been filed to your personnel record",
        bodyPreview: `${wu.correctiveActionType ?? "Corrective action"} — open to review.`,
        linkUrl: "/lounge/my-file",
        sourceId: id,
        actorId: me.id,
      }]);
      notifiedEmployee = true;
      await logWriteUpAudit({
        writeupId: id, actorId: me.id, actorName: `${me.firstName} ${me.lastName}`.trim(),
        action: "notified_employee", details: "lounge notification",
      });
    } catch (e) {
      console.error("[writeups finalize] notify employee failed:", e);
    }

    if (emp.email) {
      try {
        const recipients = emp.emailSecondary && emp.emailSecondaryAlerts ? [emp.email, emp.emailSecondary] : [emp.email];
        await sendEmployeeEmail({
          to: recipients,
          subject: `Millstadt EMS — Write-up on file — ${employeeName} — ${subjectStamp}`,
          kicker: "Personnel Record",
          headline: `${wu.correctiveActionType ?? "Corrective action"} placed in your file`,
          meta: `Document ID ${id.slice(0, 8)} · ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })} CT`,
          bodyText:
            `A write-up has been finalized and placed in your personnel file.\n\n` +
            `Subject: ${wu.correctiveActionType ?? "Corrective action"}\n` +
            `Issue category: ${wu.issueCategory ?? "—"}\n\n` +
            `You can review the signed PDF using the link below, and you'll also find it in the Employee Lounge under "My File".\n\n` +
            `If anything in this document is inaccurate, contact leadership before signing your acknowledgment.`,
          link: { url: protectedPdfUrl, label: "Open the signed PDF" },
        });
        emailedEmployee = true;
        await logWriteUpAudit({
          writeupId: id, actorId: me.id, actorName: `${me.firstName} ${me.lastName}`.trim(),
          action: "emailed_employee", details: recipients.join(", "),
        });
      } catch (e) {
        console.error("[writeups finalize] email employee failed:", e);
      }
    }
  }

  try {
    await emailAdmins({
      kicker: "Personnel Record · Filed",
      headline: `Write-up filed for ${employeeName}`,
      meta: `Document ID ${id.slice(0, 8)} · ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })} CT · By ${me.firstName} ${me.lastName}`,
      bodyText:
        `Subject: ${wu.correctiveActionType ?? "Corrective action"}\n` +
        `Issue: ${wu.issueCategory ?? "—"}\n` +
        `Employee acknowledged: ${wu.employeeSignature ? "yes" : wu.employeeRefusedToSign ? "refused" : "pending"}\n` +
        `Shared with employee: ${wu.saveToFile ? "yes" : "no (admin-only)"}\n`,
      link: { url: protectedPdfUrl, label: "Open PDF" },
      subject: `[EMS HR] Write-up filed — ${employeeName} — ${subjectStamp}`,
    });
  } catch (e) {
    console.error("[writeups finalize] email admin inbox failed:", e);
  }

  return NextResponse.json({
    writeup: finalized,
    pdfUrl: privateLoungeBlobUrl(pdfReference),
    pdfFilename: filename,
    personnelRecordId,
    emailedEmployee,
    notifiedEmployee,
  });
}

function severityForActionType(t: string | null): "informational" | "coaching" | "minor" | "moderate" | "serious" | "critical" {
  switch (t) {
    case "Documented verbal counseling": return "coaching";
    case "Written warning": return "minor";
    case "Final written warning": return "moderate";
    case "Performance improvement plan": return "moderate";
    case "Suspension recommendation": return "serious";
    case "Termination recommendation": return "critical";
    default: return "informational";
  }
}
