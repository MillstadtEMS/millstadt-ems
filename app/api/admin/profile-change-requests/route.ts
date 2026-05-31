/**
 * GET /api/admin/profile-change-requests
 *   List requests. Default: just pending. `?all=1` returns every status.
 *   `?employeeId=...` scopes to a single employee.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import {
  listPendingRequests,
  listRequestsForEmployee,
} from "@/lib/lounge/profile-change-requests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(); if (denied) return denied;

  const employeeId = req.nextUrl.searchParams.get("employeeId");
  if (employeeId) {
    const reqs = await listRequestsForEmployee(employeeId);
    return NextResponse.json({ requests: reqs });
  }
  const reqs = await listPendingRequests();
  return NextResponse.json({ requests: reqs });
}
