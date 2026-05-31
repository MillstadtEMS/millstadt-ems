import { redirect } from "next/navigation";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import LoungeShell from "@/components/lounge/LoungeShell";
import LoungePageHeader from "@/components/lounge/LoungePageHeader";
import EmployeeFormsHub from "@/components/lounge/EmployeeFormsHub";

export const dynamic = "force-dynamic";

export default async function FormsHubPage() {
  const session = await currentEmployee();
  if (!session) redirect("/lounge/login");
  if (session.mustChangePassword) redirect("/lounge/change-password");
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
        kicker="Forms & paperwork"
        title="Your HR forms"
        description={
          <>
            Acknowledgments leadership has pushed out, drafts you&apos;ve started yourself, and a
            catalog of everyday requests like leave, missed punches, shift trades, and accommodations.
            Sensitive incident, complaint, return-to-work, injury, damage, and separation paperwork
            is sent by leadership when needed.
          </>
        }
        photo="/lounge/brand/crew-providers.jpg"
        photoPosition="center 35%"
      />
      <EmployeeFormsHub />
    </LoungeShell>
  );
}
