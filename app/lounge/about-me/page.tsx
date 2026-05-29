import { redirect } from "next/navigation";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import LoungeShell from "@/components/lounge/LoungeShell";
import AboutMeForm from "@/components/lounge/AboutMeForm";

export const dynamic = "force-dynamic";

export default async function AboutMePage() {
  const session = await currentEmployee();
  if (!session) redirect("/lounge/login");

  const row = await getEmployee(session.id);
  if (!row) redirect("/lounge");

  const me = {
    firstName: session.firstName,
    lastName: session.lastName,
    certification: row.certification,
    photoUrl: row.photoUrl,
    isAdmin: session.isAdmin,
  };

  const initial = {
    firstName: row.firstName,
    lastName: row.lastName,
    certification: row.certification,
    position: row.position,
    hireDate: row.hireDate,
    email: row.email ?? "",
    phone: row.phone ?? "",
    dob: row.dob ?? "",
    addressStreet: row.addressStreet ?? "",
    addressCity: row.addressCity ?? "",
    addressState: row.addressState ?? "",
    addressZip: row.addressZip ?? "",
    driverLicenseNum: row.driverLicenseNum ?? "",
    driverLicenseState: row.driverLicenseState ?? "",
    ecName: row.ecName ?? "",
    ecRelationship: row.ecRelationship ?? "",
    ecPhone: row.ecPhone ?? "",
    ec2Name: row.ec2Name ?? "",
    ec2Relationship: row.ec2Relationship ?? "",
    ec2Phone: row.ec2Phone ?? "",
    shirtSize: row.shirtSize ?? "",
    pantSize: row.pantSize ?? "",
    jacketSize: row.jacketSize ?? "",
    allergies: row.allergies ?? "",
    medicalConditions: row.medicalConditions ?? "",
    bloodType: row.bloodType ?? "",
    phoneVerifiedAt: row.phoneVerifiedAt,
    profileCompletedAt: row.profileCompletedAt,
  };

  return (
    <LoungeShell me={me}>
      <header style={{ marginBottom: 22 }}>
        <div style={{ color: "#f0b429", fontSize: "0.7rem", fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
          About Me
        </div>
        <h1 style={{ margin: "4px 0 6px", fontSize: "1.85rem", fontWeight: 900, letterSpacing: "-0.015em" }}>
          Your personnel record
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "0.95rem", lineHeight: 1.55 }}>
          Keep your contact info, emergency contacts, and sizing up to date so management has what
          they need. Changes save instantly. Your SSN, write-ups, and admin notes are managed
          separately by leadership and not editable here.
        </p>
      </header>
      <AboutMeForm initial={initial} />
    </LoungeShell>
  );
}
