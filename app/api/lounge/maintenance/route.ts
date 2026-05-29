import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import {
  createMaintenanceRequest,
  listMaintenanceRequests,
  VEHICLE_CATEGORIES,
  BUILDING_CATEGORIES,
} from "@/lib/lounge/maintenance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scope = req.nextUrl.searchParams.get("scope"); // "mine" | "all"
  const requests = me.isAdmin && scope === "all"
    ? await listMaintenanceRequests()
    : await listMaintenanceRequests({ mine: me.id });

  return NextResponse.json({ requests });
}

export async function POST(req: NextRequest) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const kind = body.kind === "building" ? "building" : body.kind === "vehicle" ? "vehicle" : null;
  if (!kind) return NextResponse.json({ error: "kind must be vehicle or building" }, { status: 400 });

  const allowed = kind === "vehicle" ? VEHICLE_CATEGORIES : BUILDING_CATEGORIES;
  const category = typeof body.category === "string" ? body.category : "";
  if (!allowed.includes(category as never)) {
    return NextResponse.json({ error: "Unknown category for this kind" }, { status: 400 });
  }

  const customCategory = category === "Other"
    ? (typeof body.customCategory === "string" ? body.customCategory.trim() : "")
    : null;
  if (category === "Other" && !customCategory) {
    return NextResponse.json({ error: "Please describe the issue in Other." }, { status: 400 });
  }

  const summary = typeof body.summary === "string" ? body.summary.trim() : "";
  if (!summary) return NextResponse.json({ error: "Summary required" }, { status: 400 });

  const request = await createMaintenanceRequest({
    createdBy: me.id,
    kind,
    category,
    customCategory: customCategory || null,
    unitOrLocation: typeof body.unitOrLocation === "string" ? body.unitOrLocation.trim() || null : null,
    summary,
    details: typeof body.details === "string" ? body.details.trim() || null : null,
  });

  return NextResponse.json({ ok: true, request });
}
