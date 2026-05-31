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
      bloodType: row.bloodType,
      phoneVerifiedAt: row.phoneVerifiedAt,
      profileCompletedAt: row.profileCompletedAt,
    },
  });
}

// PUT — the only About Me fields an employee can self-edit are now
// notification preferences (secondary email + alert opt-in). Every
// other field is managed by admins via /admin/employees/[id]; crew
// submit change requests through /api/lounge/profile-change-requests.
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

  try {
    await updateEmployee(session.id, {
      emailSecondary: s(body.emailSecondary),
      emailSecondaryAlerts: typeof body.emailSecondaryAlerts === "boolean" ? body.emailSecondaryAlerts : undefined,
    });
  } catch (e) {
    console.error("[me/profile PUT] updateEmployee failed:", e);
    return NextResponse.json({ error: "Could not save your profile. Please try again." }, { status: 500 });
  }

  const row = await getEmployee(session.id);
  return NextResponse.json({
    ok: true,
    profile: row ? {
      emailSecondary: row.emailSecondary,
      emailSecondaryAlerts: row.emailSecondaryAlerts,
    } : null,
  });
}
