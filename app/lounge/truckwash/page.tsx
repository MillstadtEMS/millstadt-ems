import { redirect } from "next/navigation";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import LoungeShell from "@/components/lounge/LoungeShell";
import TruckWashClient from "@/components/lounge/TruckWashClient";

export const dynamic = "force-dynamic";

export default async function TruckWashPage() {
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
      <TruckWashClient
        currentUser={{ id: session.id, firstName: session.firstName, lastName: session.lastName }}
      />
    </LoungeShell>
  );
}
