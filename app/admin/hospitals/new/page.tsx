import { redirect } from "next/navigation";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import LoungeShell from "@/components/lounge/LoungeShell";
import HospitalNewClient from "@/components/lounge/HospitalNewClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NewHospitalPage() {
  const session = await currentEmployee();
  if (!session) redirect("/lounge/login");
  if (!session.isAdmin) redirect("/lounge");
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
      <HospitalNewClient />
    </LoungeShell>
  );
}
