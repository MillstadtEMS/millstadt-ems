/**
 * /lounge/policies — server wrapper that mounts the policies client UI
 * inside the standard LoungeShell. Previously this page returned its
 * own bare <div>, so the sidebar (and the mobile bottom-tab bar that
 * lives on LoungeShell) disappeared whenever the user opened policies.
 */
import { redirect } from "next/navigation";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import LoungeShell from "@/components/lounge/LoungeShell";
import PoliciesClient from "@/components/lounge/PoliciesClient";

export const dynamic = "force-dynamic";

export default async function PoliciesPage() {
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
      <PoliciesClient />
    </LoungeShell>
  );
}
