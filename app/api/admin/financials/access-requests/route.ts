import {
  noStoreJson,
  requireFinancialsAdmin,
} from "@/lib/financials-hub/api-helpers";
import { snapshot } from "@/lib/financials-hub/dev-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const admin = await requireFinancialsAdmin(req.headers);
  if ("response" in admin) return admin.response;
  return noStoreJson({ requests: snapshot().requests });
}
