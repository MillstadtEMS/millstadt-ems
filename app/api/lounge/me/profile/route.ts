import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee, updateEmployee } from "@/lib/lounge/employees";

export const dynamic = "force-dynamic";

// GET — return the logged-in employee's own profile (safe fields only).
export async function GET() {
  const session = await currentEmployee();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await getEmployee(session.id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Strip admin-only fields from the response (notes, ssnLast4 stay hidden
  // from the self-service view — they're admin notes / sensitive).
  return NextResponse.json({
    profile: {
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      certification: row.certification,
      position: row.position,
      email: row.email,
      phone: row.phone,
      dob: row.dob,
      photoUrl: row.photoUrl,
      hireDate: row.hireDate,
      addressStreet: row.addressStreet,
      addressCity: row.addressCity,
      addressState: row.addressState,
      addressZip: row.addressZip,
      driverLicenseNum: row.driverLicenseNum,
      driverLicenseState: row.driverLicenseState,
      ecName: row.ecName,
      ecRelationship: row.ecRelationship,
      ecPhone: row.ecPhone,
      ec2Name: row.ec2Name,
      ec2Relationship: row.ec2Relationship,
      ec2Phone: row.ec2Phone,
      shirtSize: row.shirtSize,
      pantSize: row.pantSize,
      jacketSize: row.jacketSize,
      allergies: row.allergies,
      medicalConditions: row.medicalConditions,
      profileCompletedAt: row.profileCompletedAt,
    },
  });
}

// PUT — let the logged-in employee update their own personal info.
// They CAN edit: address, phone, email, emergency contacts, sizes, medical, DL.
// They CANNOT edit: name, hire date, admin flag, position, SSN — those are
// employer-set and admins manage them via /admin/employees/[id].
export async function PUT(req: NextRequest) {
  const session = await currentEmployee();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const s = (v: unknown): string | null => {
    if (v === null || v === undefined) return null;
    if (typeof v !== "string") return null;
    const t = v.trim();
    return t === "" ? null : t;
  };

  await updateEmployee(session.id, {
    email: s(body.email),
    phone: s(body.phone),
    dob: s(body.dob),
    addressStreet: s(body.addressStreet),
    addressCity: s(body.addressCity),
    addressState: s(body.addressState),
    addressZip: s(body.addressZip),
    driverLicenseNum: s(body.driverLicenseNum),
    driverLicenseState: s(body.driverLicenseState),
    ecName: s(body.ecName),
    ecRelationship: s(body.ecRelationship),
    ecPhone: s(body.ecPhone),
    ec2Name: s(body.ec2Name),
    ec2Relationship: s(body.ec2Relationship),
    ec2Phone: s(body.ec2Phone),
    shirtSize: s(body.shirtSize),
    pantSize: s(body.pantSize),
    jacketSize: s(body.jacketSize),
    allergies: s(body.allergies),
    medicalConditions: s(body.medicalConditions),
    markProfileCompleted: true,
  });

  return NextResponse.json({ ok: true });
}
