import { redirect } from "next/navigation";
import { currentEmployee } from "@/lib/lounge/auth";
import HospitalNewClient from "@/components/lounge/HospitalNewClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NewHospitalPage() {
  const session = await currentEmployee();
  if (!session) redirect("/lounge/login");
  if (!session.isAdmin) redirect("/lounge");
  return <HospitalNewClient />;
}
