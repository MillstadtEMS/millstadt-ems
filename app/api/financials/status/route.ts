import { getFinancialsHubConfig } from "@/lib/financials-hub/config";
import { noStoreJson } from "@/lib/financials-hub/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const config = getFinancialsHubConfig();
  if (config.environment === "production" || !config.enabled) {
    return noStoreJson({ error: "Not found." }, { status: 404 });
  }
  return noStoreJson({
    environment: config.environment,
    enabled: config.enabled,
    allowRequests: config.allowRequests,
    allowViewer: config.allowViewer,
    allowDocumentApis: config.allowDocumentApis,
    allowPublic990s: config.allowPublic990s,
    syntheticDataOnly: config.syntheticDataOnly,
  });
}
