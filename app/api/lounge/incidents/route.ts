/**
 * GET  /api/lounge/incidents   — list (yours, or everyone for admins)
 * POST /api/lounge/incidents   — submit a new report
 *
 * On a successful POST we also:
 *   - build a full PDF (large embedded photos),
 *   - upload it to private Vercel Blob storage,
 *   - attach the PDF to each involved employee's personnel file under
 *     the "clinical" category.
 */
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { currentEmployee, findEmployeeById } from "@/lib/lounge/auth";
import {
  createIncident,
  listIncidents,
  markIncidentPdfReady,
  type IncidentReport,
} from "@/lib/lounge/incidents";
import { buildIncidentPdf } from "@/lib/lounge/incident-pdf";
import { createAttachment, createRecord } from "@/lib/lounge/personnel";
import {
  privateBlobPath,
  privateBlobReference,
  privateIncidentBlobReference,
  privateIncidentBlobUrl,
} from "@/lib/lounge/private-blobs";
import { recordSecurityAudit } from "@/lib/security/audit";
import {
  contentLengthWithin,
  hasContentType,
  isSameOriginRequest,
  noStoreJson,
} from "@/lib/security/http";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface InvolvedEmployee { id: string; name: string }

const incidentSchema = z.object({
  incidentDate: z.string().trim().regex(/^$|^\d{4}-\d{2}-\d{2}$/).optional().default(""),
  incidentTime: z.string().trim().regex(/^$|^\d{2}:\d{2}$/).optional().default(""),
  city: z.string().trim().max(120).optional().default(""),
  specificLocation: z.string().trim().max(240).optional().default(""),
  unitInvolved: z.string().trim().max(80).optional().default(""),
  payload: z.object({
    summary: z.string().trim().min(1).max(8_000),
    patientInvolved: z.string().trim().max(1_000).optional().default(""),
    witnesses: z.string().trim().max(2_000).optional().default(""),
    actionsTaken: z.string().trim().max(8_000).optional().default(""),
    involvedEmployees: z.array(z.object({
      id: z.string().trim().min(1).max(80),
      name: z.string().trim().min(1).max(160),
    }).strict()).max(20).optional().default([]),
  }).strict(),
  media: z.array(z.object({
    url: z.string().min(1).max(2_000),
    kind: z.literal("image"),
    name: z.string().trim().max(120).optional(),
  }).strict()).max(12).optional().default([]),
}).strict();

function presentIncident(report: IncidentReport) {
  return {
    ...report,
    media: report.media.map((item) => ({ ...item, url: privateIncidentBlobUrl(item.url) })),
    pdfUrl: report.pdfUrl ? privateIncidentBlobUrl(report.pdfUrl) : null,
  };
}

export async function GET() {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const reports = await listIncidents({ viewerId: me.id, isAdmin: me.isAdmin });
  return noStoreJson({ reports: reports.map(presentIncident) });
}

export async function POST(req: NextRequest) {
  const me = await currentEmployee();
  if (!me) return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(req) || !hasContentType(req, "application/json")) {
    return noStoreJson({ error: "Invalid request" }, { status: 403 });
  }
  if (!contentLengthWithin(req, 128 * 1024)) {
    return noStoreJson({ error: "Incident report is too large" }, { status: 413 });
  }
  const limit = await checkRateLimit(req, "incident-report", {
    limit: 8,
    windowMs: 60 * 60_000,
    discriminator: me.id,
  });
  if (!limit.allowed) {
    const response = noStoreJson({ error: "Too many reports. Please wait and try again." }, { status: 429 });
    response.headers.set("Retry-After", String(limit.retryAfterSeconds));
    return response;
  }

  const parsed = incidentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return noStoreJson({ error: "Check the incident fields and try again." }, { status: 400 });
  const body = parsed.data;
  const payload = body.payload as Record<string, unknown>;
  const involvedEmployees: InvolvedEmployee[] = body.payload.involvedEmployees;
  for (const involved of involvedEmployees) {
    const employee = await findEmployeeById(involved.id);
    if (!employee?.isActive) return noStoreJson({ error: "An involved employee is invalid." }, { status: 400 });
  }
  const media = body.media.map((item) => ({
    ...item,
    url: privateIncidentBlobReference(item.url) ?? "",
  }));
  for (const item of media) {
    const pathname = privateBlobPath(item.url);
    if (!pathname?.startsWith(`lounge/incidents/${me.id}/`)) {
      return noStoreJson({ error: "An incident attachment is invalid." }, { status: 400 });
    }
  }

  const report = await createIncident({
    authorId: me.id,
    incidentDate: body.incidentDate || undefined,
    incidentTime: body.incidentTime || undefined,
    city: body.city || undefined,
    specificLocation: body.specificLocation || undefined,
    unitInvolved: body.unitInvolved || undefined,
    payload,
    media,
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
      const blob = await put(`lounge/incidents/reports/${report.id}.pdf`, pdfBytes, {
        access: "private",
        addRandomSuffix: false,
        contentType: "application/pdf",
      });
      pdfUrl = privateBlobReference(blob.pathname);
      await markIncidentPdfReady(report.id, pdfUrl);
    } catch (e) {
      console.error("[incident] PDF blob upload failed:", e);
    }
  } catch (e) {
    console.error("[incident] PDF build failed:", e);
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
          fileUrl: privateIncidentBlobUrl(pdfUrl),
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

  await recordSecurityAudit({
    actorType: "employee",
    actorId: me.id,
    action: "incident_report_create",
    resourceType: "incident_report",
    resourceId: report.id,
    outcome: "completed",
    req,
    detail: { photoCount: photos.length, pdfCreated: Boolean(pdfUrl) },
  });
  return noStoreJson({ report: presentIncident({ ...report, pdfUrl }) });
}
