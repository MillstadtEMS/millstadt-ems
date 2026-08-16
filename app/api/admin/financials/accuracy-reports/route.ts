import {
  noStoreJson,
  requireFinancialsAdmin,
} from "@/lib/financials-hub/api-helpers";
import { accuracyReports } from "@/lib/financials-hub/accuracy-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const admin = await requireFinancialsAdmin(req.headers);
  if ("response" in admin) return admin.response;
  return noStoreJson({ reports: accuracyReports() });
}
