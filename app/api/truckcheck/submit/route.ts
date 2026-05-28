import { NextRequest, NextResponse } from "next/server";
import { isTruckCheckAuthed } from "@/lib/truckcheck/auth";
import { neon } from "@neondatabase/serverless";

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  return neon(url);
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export async function POST(req: NextRequest) {
  if (!(await isTruckCheckAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const fields = {
    truckNumber: String(body.truckNumber || "").trim(),
    attendant1Name: String(body.attendant1Name || "").trim(),
    attendant2Name: String(body.attendant2Name || "").trim(),
    attendant1Signature: String(body.attendant1Signature || ""),
    attendant2Signature: String(body.attendant2Signature || ""),
    odometer: String(body.odometer || "").trim(),
    fuelLevel: String(body.fuelLevel || "").trim(),
    mainO2Psi: String(body.mainO2Psi || "").trim(),
    portableO2Psi: String(body.portableO2Psi || "").trim(),
    checklist: body.checklist && typeof body.checklist === "object" ? body.checklist : {},
    notes: String(body.notes || "").trim(),
  };

  if (!fields.truckNumber) return NextResponse.json({ error: "Truck number required" }, { status: 400 });
  if (!fields.attendant1Name) return NextResponse.json({ error: "Attendant 1 name required" }, { status: 400 });
  if (!fields.attendant1Signature) return NextResponse.json({ error: "Attendant 1 signature required" }, { status: 400 });

  const db = sql();
  const id = uid();
  await db`
    INSERT INTO form_submissions (id, form_type, fields, submitted_at)
    VALUES (${id}, 'truck_check', ${JSON.stringify(fields)}::jsonb, NOW())
  `;

  return NextResponse.json({ ok: true, id });
}
