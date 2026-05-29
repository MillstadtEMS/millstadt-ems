import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import {
  createHospital,
  listHospitalsLive,
} from "@/lib/lounge/hospitals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!me.isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const hospitals = await listHospitalsLive();
  return NextResponse.json({ hospitals });
}

export async function POST(req: NextRequest) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!me.isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  if (!body.name || !body.city || !body.state || !body.primaryPhone || !body.address
      || typeof body.latitude !== "number" || typeof body.longitude !== "number") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const created = await createHospital({
    name: String(body.name),
    city: String(body.city),
    state: String(body.state),
    primaryLabel: ["EMS Patch", "ED", "Report Line"].includes(body.primaryLabel) ? body.primaryLabel : "EMS Patch",
    primaryPhone: String(body.primaryPhone),
    address: String(body.address),
    latitude: Number(body.latitude),
    longitude: Number(body.longitude),
  });
  return NextResponse.json({ hospital: created });
}
