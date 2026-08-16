import {
  disabledFinancialsResponse,
  noStoreJson,
  requireFinancialsCapability,
} from "@/lib/financials-hub/api-helpers";
import {
  PUBLIC_FORM_990_AI_NOTICE,
  PUBLIC_FORM_990_HEADING,
  PUBLIC_FORM_990_INTRO,
  PUBLIC_FORM_990_NOTICE,
  PUBLIC_FORM_990_REVIEW_NOTICE,
  publicForm990Catalog,
} from "@/lib/financials-hub/form990";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!requireFinancialsCapability("public990s")) {
    return disabledFinancialsResponse();
  }

  return noStoreJson({
    heading: PUBLIC_FORM_990_HEADING,
    intro: PUBLIC_FORM_990_INTRO,
    notice: PUBLIC_FORM_990_NOTICE,
    aiNotice: PUBLIC_FORM_990_AI_NOTICE,
    reviewNotice: PUBLIC_FORM_990_REVIEW_NOTICE,
    documents: publicForm990Catalog(),
  });
}
