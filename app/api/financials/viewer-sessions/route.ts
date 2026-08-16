import { NextRequest } from "next/server";
import {
  disabledFinancialsResponse,
  handleFinancialsError,
  noStoreJson,
  requireFinancialsCapability,
} from "@/lib/financials-hub/api-helpers";
import {
  auditContextFromHeaders,
  createViewerSession,
} from "@/lib/financials-hub/dev-store";
import {
  assertAllowedObjectKeys,
  enforceContentLength,
  requireContentType,
  validateSameOriginRequest,
} from "@/lib/financials-hub/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!requireFinancialsCapability("viewer")) {
    return disabledFinancialsResponse();
  }

  try {
    validateSameOriginRequest(req, "viewer request");
    requireContentType(req, "application/json", "The viewer request must be submitted as JSON.");
    enforceContentLength(req, 16 * 1024, "The viewer request is too large.");
    const body = await req.json();
    assertAllowedObjectKeys(
      body,
      ["requestId", "documentId", "userId"],
      "The viewer request contains unsupported fields.",
    );
    const session = createViewerSession(body, auditContextFromHeaders(req.headers));
    return noStoreJson({ session }, { status: 201 });
  } catch (error) {
    return handleFinancialsError(error);
  }
}
