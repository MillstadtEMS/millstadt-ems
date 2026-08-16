import { NextRequest } from "next/server";
import {
  disabledFinancialsResponse,
  noStoreJson,
  requireFinancialsCapability,
} from "@/lib/financials-hub/api-helpers";
import { accessForDocument } from "@/lib/financials-hub/dev-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ documentId: string }> },
) {
  if (!requireFinancialsCapability("documents")) {
    return disabledFinancialsResponse();
  }

  const { documentId } = await ctx.params;
  const userId = req.headers.get("x-millstadt-user-id")?.trim() ?? "";
  return noStoreJson(accessForDocument({ documentId, userId }));
}
