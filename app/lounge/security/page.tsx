import { redirect } from "next/navigation";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import LoungeShell from "@/components/lounge/LoungeShell";
import LoungePageHeader from "@/components/lounge/LoungePageHeader";
import SignInDevices from "@/components/lounge/SignInDevices";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const session = await currentEmployee();
  if (!session) redirect("/lounge/login");

  const row = await getEmployee(session.id);
  const me = {
    firstName: session.firstName,
    lastName: session.lastName,
    certification: row?.certification ?? null,
    photoUrl: row?.photoUrl ?? null,
    isAdmin: session.isAdmin,
  };

  return (
    <LoungeShell me={me}>
      <LoungePageHeader
        kicker="Security"
        title="Sign-in & devices"
        description={
          <>
            Manage how you sign in to the lounge. Add Face ID, Touch ID, or fingerprint for
            every device you use — your phone, your tablet, your laptop, the station computer.
            Each device is independent, so removing one never affects the others.
          </>
        }
      />
      <SignInDevices />
    </LoungeShell>
  );
}
