import { redirect } from "next/navigation";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import LoungeShell from "@/components/lounge/LoungeShell";
import MessengerClient from "@/components/lounge/MessengerClient";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const session = await currentEmployee();
  if (!session) redirect("/lounge/login");
  const emp = await getEmployee(session.id);

  const me = {
    firstName: session.firstName,
    lastName: session.lastName,
    certification: emp?.certification ?? null,
    photoUrl: emp?.photoUrl ?? null,
    isAdmin: session.isAdmin,
  };

  return (
    <LoungeShell me={me}>
      <MessengerClient meId={session.id} />
    </LoungeShell>
  );
}
