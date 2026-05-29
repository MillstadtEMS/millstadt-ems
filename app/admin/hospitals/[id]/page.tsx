import { notFound, redirect } from "next/navigation";
import { currentEmployee } from "@/lib/lounge/auth";
import { getHospitalLive } from "@/lib/lounge/hospitals";
import HospitalEditClient from "@/components/lounge/HospitalEditClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function EditHospitalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await currentEmployee();
  if (!session) redirect("/lounge/login");
  if (!session.isAdmin) redirect("/lounge");

  const hospital = await getHospitalLive(id);
  if (!hospital) notFound();

  return <HospitalEditClient hospital={hospital} />;
}
