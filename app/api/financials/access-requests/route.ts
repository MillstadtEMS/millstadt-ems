import { NextRequest } from "next/server";
import {
  disabledFinancialsResponse,
  handleFinancialsError,
  noStoreJson,
  requireFinancialsCapability,
} from "@/lib/financials-hub/api-helpers";
import {
  auditContextFromHeaders,
  createAccessRequest,
} from "@/lib/financials-hub/dev-store";
import { notifyFinancialsHubAdmins } from "@/lib/financials-hub/notifications";
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

const CSRF_COOKIE = "millstadt_access_csrf";
const ALLOWED_REQUEST_KEYS = [
  "idempotencyKey",
  "fullLegalName",
  "verifiedEmail",
  "mailingAddress",
  "addressLine2",
  "city",
  "state",
  "postalCode",
  "selectedDocIds",
  "requestedInformationDescription",
  "acceptedCheckboxText",
  "acceptedButtonText",
  "signatureMethod",
  "signatureDataUrl",
  "signatureTypedName",
] as const;

export async function GET() {
  if (!requireFinancialsCapability("requests")) return disabledFinancialsResponse();
  return issueCsrfToken(CSRF_COOKIE, "/api/financials/access-requests");
}

export async function POST(req: NextRequest) {
  if (!requireFinancialsCapability("requests")) {
    return disabledFinancialsResponse();
  }

  try {
    validateSameOriginRequest(req, "access-request submission");
    validateCsrfToken(
      req,
      CSRF_COOKIE,
      "The request form expired. Review the terms and try again.",
    );
    requireContentType(req, "application/json", "The request must be submitted as JSON.");
    enforceContentLength(req, 1024 * 1024, "The request is too large.");
    const body = await req.json();
    assertAllowedObjectKeys(body, ALLOWED_REQUEST_KEYS, "The request contains unsupported fields.");
    const context = auditContextFromHeaders(req.headers);
    const result = createAccessRequest(body, context);
    if (result.created) await notifyFinancialsHubAdmins(result.request, context);
    return noStoreJson(
      { request: result.request, duplicate: !result.created },
      { status: result.created ? 201 : 200 },
    );
  } catch (error) {
    return handleFinancialsError(error);
  }
}
