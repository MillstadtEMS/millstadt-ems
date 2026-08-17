import {
  disabledFinancialsResponse,
  noStoreJson,
  requireFinancialsCapability,
} from "@/lib/financials-hub/api-helpers";
import {
  publicForm990Catalog,
} from "@/lib/financials-hub/form990";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!requireFinancialsCapability("public990s")) {
    return disabledFinancialsResponse();
  }

  return noStoreJson({
    documents: publicForm990Catalog(),
  });
}
