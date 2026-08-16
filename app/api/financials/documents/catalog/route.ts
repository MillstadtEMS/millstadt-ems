import {
  disabledFinancialsResponse,
  noStoreJson,
  requireFinancialsCapability,
} from "@/lib/financials-hub/api-helpers";
import { catalog } from "@/lib/financials-hub/dev-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!requireFinancialsCapability("documents")) {
    return disabledFinancialsResponse();
  }
  return noStoreJson({ documents: catalog() });
}
