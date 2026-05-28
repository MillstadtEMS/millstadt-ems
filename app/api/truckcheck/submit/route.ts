import { NextRequest, NextResponse } from "next/server";
import { isTruckCheckAuthed } from "@/lib/truckcheck/auth";
import { neon } from "@neondatabase/serverless";
import { currentEmployee } from "@/lib/lounge/auth";

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

  // Lounge-logged-in user becomes attendant 1 automatically. Client can
  // override (legacy shared-password path), but a real lounge session
  // wins so the form can't be spoofed.
  const me = await currentEmployee();
  const submitterName = me ? `${me.firstName} ${me.lastName}` : "";
  const submitterId = me?.id ?? null;

  const fields = {
    truckNumber: String(body.truckNumber || "").trim(),
    // Auto-stamp attendant 1 from the lounge session when present.
    attendant1Name: submitterName || String(body.attendant1Name || "").trim(),
    attendant1UserId: submitterId,
    attendant2Name: String(body.attendant2Name || body.partnerName || "").trim(),
    attendant1Signature: String(body.attendant1Signature || ""),
    attendant2Signature: String(body.attendant2Signature || ""),
    odometer: String(body.odometer || "").trim(),
    fuelLevel: String(body.fuelLevel || "").trim(),
    mainO2Psi: String(body.mainO2Psi || "").trim(),
    portableO2Psi: String(body.portableO2Psi || "").trim(),
    checklist: body.checklist && typeof body.checklist === "object" ? body.checklist : {},
    // Per-checkbox timestamps from the client. Shape: { [field]: ISOstring }
    checkboxTimestamps:
      body.checkboxTimestamps && typeof body.checkboxTimestamps === "object"
        ? body.checkboxTimestamps
        : {},
    // When the form was opened vs submitted.
    startedAt: body.startedAt ? String(body.startedAt) : null,
    finishedAt: new Date().toISOString(),
    notes: String(body.notes || "").trim(),
  };

  if (!fields.truckNumber)
    return NextResponse.json({ error: "Truck number required" }, { status: 400 });
  if (!fields.attendant1Name)
    return NextResponse.json({ error: "Attendant 1 name required" }, { status: 400 });
  // Attendant 1 signature requirement waived when a real lounge session
  // authenticates the submitter — the session IS the signature.
  if (!me && !fields.attendant1Signature)
    return NextResponse.json(
      { error: "Attendant 1 signature required" },
      { status: 400 },
    );

  const db = sql();
  const id = uid();
  await db`
    INSERT INTO form_submissions (id, form_type, fields, submitted_at)
    VALUES (${id}, 'truck_check', ${JSON.stringify(fields)}::jsonb, NOW())
  `;

  return NextResponse.json({ ok: true, id });
}
