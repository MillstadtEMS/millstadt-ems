import { redirect } from "next/navigation";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import LoungeShell from "@/components/lounge/LoungeShell";
import MyFileClient from "@/components/lounge/MyFileClient";
import LoungePageHeader from "@/components/lounge/LoungePageHeader";

export const dynamic = "force-dynamic";

export default async function MyFilePage() {
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
        kicker="My Employee File"
        title="Documents shared with you"
        description={
          <>
            Only records leadership has explicitly shared appear here. Anything that requires
            your acknowledgment is highlighted at the top.
          </>
        }
        photo="/lounge/brand/unit-3926-front.jpg"
        photoPosition="center 55%"
      />
      <MyFileClient />
    </LoungeShell>
  );
}
