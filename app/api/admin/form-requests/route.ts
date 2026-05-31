/**
 * GET /api/admin/form-requests
 *   Admin view of all form requests. ?status=pending narrows to the
 *   queue that needs action.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { listAllRequests, listPendingRequests } from "@/lib/lounge/form-requests";
import { FORM_REGISTRY } from "@/lib/lounge/forms/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(); if (denied) return denied;
  const status = req.nextUrl.searchParams.get("status");

  const requests = status === "pending"
    ? await listPendingRequests()
    : await listAllRequests();

  const labelByType = new Map(FORM_REGISTRY.map((f) => [f.id, f.label]));
  return NextResponse.json({
    requests: requests.map((r) => ({ ...r, formLabel: labelByType.get(r.formType) ?? r.formType })),
  });
}
