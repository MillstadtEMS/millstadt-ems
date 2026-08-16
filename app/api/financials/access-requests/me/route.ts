import { NextRequest } from "next/server";
import {
  disabledFinancialsResponse,
  noStoreJson,
  requireFinancialsCapability,
} from "@/lib/financials-hub/api-helpers";
import { requestForUser } from "@/lib/financials-hub/dev-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!requireFinancialsCapability("requests")) {
    return disabledFinancialsResponse();
  }

  const userId = req.headers.get("x-millstadt-user-id")?.trim();
  if (!userId) return noStoreJson({ requests: [] });
  return noStoreJson({ requests: requestForUser(userId) });
}
