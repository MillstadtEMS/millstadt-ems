import { notFound, redirect } from "next/navigation";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import { getHospitalLive } from "@/lib/lounge/hospitals";
import LoungeShell from "@/components/lounge/LoungeShell";
import HospitalEditClient from "@/components/lounge/HospitalEditClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function EditHospitalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const hospital = await getHospitalLive(id);
  if (!hospital) notFound();

  return (
    <LoungeShell me={me}>
      <HospitalEditClient hospital={hospital} />
    </LoungeShell>
  );
}
