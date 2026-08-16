import {
  noStoreJson,
  requireFinancialsAdmin,
} from "@/lib/financials-hub/api-helpers";
import { resetAccuracyReportStore } from "@/lib/financials-hub/accuracy-store";
import { resetDevelopmentStore } from "@/lib/financials-hub/dev-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const admin = await requireFinancialsAdmin(req.headers, req.method);
  if ("response" in admin) return admin.response;
  resetAccuracyReportStore();
  return noStoreJson(resetDevelopmentStore());
}
