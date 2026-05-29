/**
 * GET  /api/lounge/incidents   — list (yours, or everyone for admins)
 * POST /api/lounge/incidents   — submit a new report
 *
 * On a successful POST we also:
 *   - build a full PDF (large embedded photos),
 *   - upload it to Vercel Blob,
 *   - email it to millstadtems@gmail.com,
 *   - attach the PDF to each involved employee's personnel file under
 *     the "clinical" category.
 */
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { currentEmployee } from "@/lib/lounge/auth";
import {
  createIncident,
  listIncidents,
  markIncidentEmailSent,
  markIncidentPdfReady,
} from "@/lib/lounge/incidents";
import { buildIncidentPdf } from "@/lib/lounge/incident-pdf";
import { sendIncidentReportEmail } from "@/lib/lounge/incident-email";
import { createAttachment, createRecord } from "@/lib/lounge/personnel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface InvolvedEmployee { id: string; name: string }

export async function GET() {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const reports = await listIncidents({ viewerId: me.id, isAdmin: me.isAdmin });
  return NextResponse.json({ reports });
}

export async function POST(req: NextRequest) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const payload = (body.payload && typeof body.payload === "object" && !Array.isArray(body.payload))
    ? body.payload as Record<string, unknown>
    : {};
  const involvedEmployees: InvolvedEmployee[] = Array.isArray(payload.involvedEmployees)
    ? (payload.involvedEmployees as InvolvedEmployee[]).filter((e) => typeof e?.id === "string" && typeof e?.name === "string")
    : [];

  const report = await createIncident({
    authorId: me.id,
    incidentDate: typeof body.incidentDate === "string" ? body.incidentDate : undefined,
    incidentTime: typeof body.incidentTime === "string" ? body.incidentTime : undefined,
    city: typeof body.city === "string" ? body.city : undefined,
    specificLocation: typeof body.specificLocation === "string" ? body.specificLocation : undefined,
    unitInvolved: typeof body.unitInvolved === "string" ? body.unitInvolved : undefined,
    payload,
    media: Array.isArray(body.media) ? body.media : undefined,
  });

  const photos = (report.media || [])
    .filter((m) => m.kind === "image")
    .map((m) => ({ url: m.url, name: m.name ?? null }));

  let pdfUrl: string | null = null;
  let pdfBytes: Buffer | null = null;
  try {
    pdfBytes = await buildIncidentPdf({
      id: report.id,
      createdBy: { name: `${me.firstName} ${me.lastName}` },
      incidentDate: report.incidentDate,
      incidentTime: report.incidentTime,
      city: report.city,
      specificLocation: report.specificLocation,
      unitInvolved: report.unitInvolved,
      summary: String(payload.summary ?? ""),
      patientInvolved: typeof payload.patientInvolved === "string" ? payload.patientInvolved : null,
      witnesses: typeof payload.witnesses === "string" ? payload.witnesses : null,
      actionsTaken: typeof payload.actionsTaken === "string" ? payload.actionsTaken : null,
      involvedEmployees,
      photos,
      submittedAt: report.createdAt,
    });

    try {
      const blob = await put(`lounge/incidents/${report.id}.pdf`, pdfBytes, {
        access: "public",
        addRandomSuffix: false,
        contentType: "application/pdf",
      });
      pdfUrl = blob.url;
      await markIncidentPdfReady(report.id, pdfUrl);
    } catch (e) {
      console.error("[incident] PDF blob upload failed:", e);
    }
  } catch (e) {
    console.error("[incident] PDF build failed:", e);
  }

  // Email
  if (pdfBytes) {
    try {
      await sendIncidentReportEmail({
        reportId: report.id,
        unit: report.unitInvolved,
        city: report.city,
        submittedBy: `${me.firstName} ${me.lastName}`,
        incidentDate: report.incidentDate,
        incidentTime: report.incidentTime,
        summary: String(payload.summary ?? ""),
        involvedEmployees,
        photoCount: photos.length,
        pdfBytes,
      });
      await markIncidentEmailSent(report.id);
    } catch (e) {
      console.error("[incident] email failed:", e);
    }
  }

  // Auto-attach to each involved employee's personnel file under Clinical.
  if (pdfUrl && involvedEmployees.length > 0) {
    try {
      for (const emp of involvedEmployees) {
        const rec = await createRecord({
          employeeId: emp.id,
          category: "clinical",
          recordType: "Incident Report",
          title: `Incident — ${report.city ?? "—"} · ${report.unitInvolved ?? "Unit unknown"}`,
          summary: String(payload.summary ?? "").slice(0, 800),
          severity: "informational",
          incidentDate: report.incidentDate,
          createdBy: me.id,
          adminNotes: `Auto-created from incident report ${report.id}.`,
        });
        await createAttachment({
          recordId: rec.id,
          employeeId: emp.id,
          fileName: `IncidentReport_${report.id}.pdf`,
          fileUrl: pdfUrl,
          fileMime: "application/pdf",
          documentCategory: "incident_report",
          visibilityLevel: "admin",
          uploadedBy: me.id,
        });
      }
    } catch (e) {
      console.error("[incident] personnel attach failed:", e);
    }
  }

  return NextResponse.json({ report: { ...report, pdfUrl } });
}
