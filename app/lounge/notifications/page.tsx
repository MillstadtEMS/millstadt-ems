import { redirect } from "next/navigation";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import LoungeShell from "@/components/lounge/LoungeShell";
import { NotificationsList } from "@/components/lounge/NotificationsCenter";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
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
      <NotificationsList />
    </LoungeShell>
  );
}
