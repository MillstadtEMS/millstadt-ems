import { NextRequest } from "next/server";
import {
  disabledFinancialsResponse,
  handleFinancialsError,
  noStoreJson,
  requireFinancialsCapability,
} from "@/lib/financials-hub/api-helpers";
import {
  auditContextFromHeaders,
  getViewerPage,
} from "@/lib/financials-hub/dev-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ sessionId: string; pageNumber: string }> },
) {
  if (!requireFinancialsCapability("viewer")) {
    return disabledFinancialsResponse();
  }

  try {
    const { sessionId, pageNumber } = await ctx.params;
    const userId = req.headers.get("x-millstadt-user-id")?.trim() ?? "";
    const page = getViewerPage(
      { sessionId, pageNumber: Number(pageNumber), userId },
      auditContextFromHeaders(req.headers),
    );
    return noStoreJson(page);
  } catch (error) {
    return handleFinancialsError(error);
  }
}
