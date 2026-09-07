import { NextRequest } from "next/server";
import { issueFormSecurityToken, noStoreJson } from "@/lib/security/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ACTIONS = new Set([
  "contact_form",
  "employment_application",
  "testimonial",
]);

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action") ?? "";
  if (!ALLOWED_ACTIONS.has(action)) {
    return noStoreJson({ error: "Unknown form security check." }, { status: 400 });
  }
  return issueFormSecurityToken(action);
}
