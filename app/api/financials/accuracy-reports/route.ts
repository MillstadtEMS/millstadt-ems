import { NextRequest } from "next/server";
import {
  disabledFinancialsResponse,
  handleFinancialsError,
  noStoreJson,
  requireFinancialsCapability,
} from "@/lib/financials-hub/api-helpers";
import { createAccuracyReport } from "@/lib/financials-hub/accuracy-store";
import { auditContextFromHeaders } from "@/lib/financials-hub/dev-store";
import { notifyAccuracyReportAdmins } from "@/lib/financials-hub/notifications";
import {
  assertAllowedObjectKeys,
  enforceContentLength,
  issueCsrfToken,
  requireContentType,
  validateCsrfToken,
  validateSameOriginRequest,
} from "@/lib/financials-hub/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CSRF_COOKIE = "millstadt_accuracy_csrf";
const ALLOWED_REPORT_KEYS = [
  "idempotencyKey",
  "documentId",
  "sourceUrl",
  "pageOrSection",
  "category",
  "description",
  "supportingSource",
  "reporterName",
  "reporterEmail",
  "reporterTelephone",
  "certificationAccepted",
  "certificationText",
  "signatureMethod",
  "signatureDataUrl",
  "signatureTypedName",
  "supportingDocument",
] as const;

export async function GET() {
  if (!requireFinancialsCapability("requests")) return disabledFinancialsResponse();
  return issueCsrfToken(CSRF_COOKIE, "/api/financials/accuracy-reports");
}

export async function POST(req: NextRequest) {
  if (!requireFinancialsCapability("requests")) return disabledFinancialsResponse();

  try {
    validateSameOriginRequest(req, "report submission");
    validateCsrfToken(
      req,
      CSRF_COOKIE,
      "The report form expired. Close it and try again.",
    );
    requireContentType(req, "multipart/form-data", "The report must be submitted as form data.");
    enforceContentLength(
      req,
      11 * 1024 * 1024,
      "The report and supporting upload must be 11 MB or smaller.",
    );

    const data = await req.formData();
    assertAllowedObjectKeys(
      Object.fromEntries(Array.from(data.keys(), (key) => [key, true])),
      ALLOWED_REPORT_KEYS,
      "The report contains unsupported fields.",
    );
    const uploadValue = data.get("supportingDocument");
    const upload =
      uploadValue && typeof uploadValue !== "string" && uploadValue.size > 0
        ? {
            filename: uploadValue.name,
            contentType: uploadValue.type,
            bytes: Buffer.from(await uploadValue.arrayBuffer()),
          }
        : null;
    const context = auditContextFromHeaders(req.headers);
    const result = await createAccuracyReport(
      {
        idempotencyKey: data.get("idempotencyKey"),
        documentId: data.get("documentId"),
        sourceUrl: data.get("sourceUrl"),
        pageOrSection: data.get("pageOrSection"),
        category: data.get("category"),
        description: data.get("description"),
        supportingSource: data.get("supportingSource"),
        reporterName: data.get("reporterName"),
        reporterEmail: data.get("reporterEmail"),
        reporterTelephone: data.get("reporterTelephone"),
        certificationAccepted: data.get("certificationAccepted"),
        certificationText: data.get("certificationText"),
        signatureMethod: data.get("signatureMethod"),
        signatureDataUrl: data.get("signatureDataUrl"),
        signatureTypedName: data.get("signatureTypedName"),
      },
      upload,
      context,
    );
    if (result.created) await notifyAccuracyReportAdmins(result.report);
    return noStoreJson(
      {
        report: {
          id: result.report.id,
          status: result.report.status,
          submittedAtUtc: result.report.submittedAtUtc,
        },
        duplicate: !result.created,
      },
      { status: result.created ? 201 : 200 },
    );
  } catch (error) {
    return handleFinancialsError(error);
  }
}
