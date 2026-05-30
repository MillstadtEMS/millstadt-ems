import { redirect } from "next/navigation";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import LoungeShell from "@/components/lounge/LoungeShell";
import AboutMeForm from "@/components/lounge/AboutMeForm";
import LoungePageHeader from "@/components/lounge/LoungePageHeader";

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
    photoUrl: row.photoUrl,
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
      <LoungePageHeader
        kicker="About Me"
        title="Your personnel record"
        description={
          <>
            Keep your contact info, emergency contacts, and sizing up to date so leadership has
            what they need. Changes save instantly. Your SSN, write-ups, and admin notes are
            managed separately by leadership and not editable here.
          </>
        }
        photo="/lounge/brand/crew-providers.jpg"
        photoPosition="center 30%"
      />
      <AboutMeForm initial={initial} />
    </LoungeShell>
  );
}
