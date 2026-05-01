import { NextResponse } from "next/server";
import { getAllApplicantWorkflows } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/applicants
 * Returns all applicant workflow records with their status. Used by the
 * submissions list to show status badges + per-status counts.
 */
export async function GET() {
  try {
    const all = await getAllApplicantWorkflows();
    // Build a map keyed by submission ID for quick lookup
    const byId: Record<string, { status: string; updatedAt: string }> = {};
    const counts: Record<string, number> = {
      Applied: 0,
      Waitlisted: 0,
      "Interview Process": 0,
      "Tentative Hire": 0,
      Hired: 0,
      Denied: 0,
    };
    for (const wf of all) {
      byId[wf.submissionId] = { status: wf.status, updatedAt: wf.updatedAt };
      counts[wf.status] = (counts[wf.status] ?? 0) + 1;
    }
    return NextResponse.json({ byId, counts });
  } catch (err) {
    console.error("[applicants index]", err);
    return NextResponse.json({ error: "Failed to load workflows" }, { status: 500 });
  }
}
