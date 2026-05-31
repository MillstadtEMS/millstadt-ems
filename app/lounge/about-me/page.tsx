import Link from "next/link";
import { redirect } from "next/navigation";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import LoungeShell from "@/components/lounge/LoungeShell";
import LoungePageHeader from "@/components/lounge/LoungePageHeader";
import AboutMeReadOnly, { type AboutMeSnapshot } from "@/components/lounge/AboutMeReadOnly";
import NotificationPreferences from "@/components/lounge/NotificationPreferences";
import PhotoSelfEditor from "@/components/lounge/PhotoSelfEditor";
import RequestProfileChange from "@/components/lounge/RequestProfileChange";
import { REQUESTABLE_FIELDS } from "@/lib/lounge/profile-change-requests";

export const dynamic = "force-dynamic";

export default async function AboutMePage() {
  const session = await currentEmployee();
  if (!session) redirect("/lounge/login");
  if (session.mustChangePassword) redirect("/lounge/change-password");

  const row = await getEmployee(session.id);
  if (!row) redirect("/lounge");

  const me = {
    firstName: session.firstName,
    lastName: session.lastName,
    certification: row.certification,
    photoUrl: row.photoUrl,
    isAdmin: session.isAdmin,
  };

  const snapshot: AboutMeSnapshot = {
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
  };

  return (
    <LoungeShell me={me}>
      <LoungePageHeader
        kicker="About Me"
        title="Your personnel record"
        description={
          <>
            This is the snapshot leadership keeps on file for you. Names, addresses, emergency
            contacts, uniform sizes — anything sensitive is managed by admins. Use the
            <em> Request a change</em> form at the bottom of this page to ask for an update,
            attach a license or document if needed, and we&apos;ll take it from there.
          </>
        }
        photo="/lounge/brand/crew-providers.jpg"
        photoPosition="center 30%"
      />

      {session.isAdmin && (
        <div style={adminBanner}>
          <span style={{ fontSize: 18 }} aria-hidden>🛡</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#fde68a", fontWeight: 900, fontSize: 13 }}>
              You&apos;re an admin — you can edit any About Me record directly.
            </div>
            <div style={{ color: "#cbd5e1", fontSize: 12.5, marginTop: 2 }}>
              Crew see this same page in read-only mode and submit change requests below.
            </div>
          </div>
          <Link href={`/admin/employees/${session.id}`} style={adminLink}>
            Edit my record →
          </Link>
        </div>
      )}

      <PhotoSelfEditor
        initialPhotoUrl={row.photoUrl}
        firstName={row.firstName}
        lastName={row.lastName}
      />

      <div style={{ height: 18 }} />
      <AboutMeReadOnly p={snapshot} />

      <div style={{ height: 18 }} />
      <NotificationPreferences
        initialEmailSecondary={row.emailSecondary ?? ""}
        initialEmailSecondaryAlerts={row.emailSecondaryAlerts}
      />

      <div style={{ height: 18 }} />
      <RequestProfileChange fields={REQUESTABLE_FIELDS} />
    </LoungeShell>
  );
}

const adminBanner: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "12px 16px",
  background: "linear-gradient(180deg, rgba(240,180,41,0.10), rgba(240,180,41,0.04))",
  border: "1px solid rgba(240,180,41,0.30)",
  borderRadius: 14,
  marginBottom: 18,
  flexWrap: "wrap",
};
const adminLink: React.CSSProperties = {
  padding: "8px 14px",
  background: "#f0b429",
  color: "#040d1a",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  borderRadius: 10,
  textDecoration: "none",
};
