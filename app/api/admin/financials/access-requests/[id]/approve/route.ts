import { NextRequest } from "next/server";
import {
  handleFinancialsError,
  noStoreJson,
  requireFinancialsAdmin,
} from "@/lib/financials-hub/api-helpers";
import {
  approveAccessRequest,
  auditContextFromHeaders,
} from "@/lib/financials-hub/dev-store";
import {
  assertAllowedObjectKeys,
  enforceContentLength,
  requireContentType,
} from "@/lib/financials-hub/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireFinancialsAdmin(req.headers, req.method);
  if ("response" in admin) return admin.response;

  try {
    const { id } = await ctx.params;
    requireContentType(req, "application/json", "The admin action must be submitted as JSON.");
    enforceContentLength(req, 32 * 1024, "The admin action is too large.");
    const body = await req.json();
    assertAllowedObjectKeys(
      body,
      ["approvedDocIds", "expirationAtUtc", "reviewReason", "expectedStatus", "expectedRequestVersion"],
      "The admin action contains unsupported fields.",
    );
    const request = approveAccessRequest(
      id,
      body,
      auditContextFromHeaders(req.headers),
    );
    return noStoreJson({ request });
  } catch (error) {
    return handleFinancialsError(error);
  }
}
