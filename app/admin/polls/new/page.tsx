import { redirect } from "next/navigation";
import { currentEmployee } from "@/lib/lounge/auth";
import NewPollClient from "@/components/lounge/NewPollClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NewPollPage() {
  const session = await currentEmployee();
  if (!session) redirect("/lounge/login");
  if (!session.isAdmin) redirect("/lounge");
  return <NewPollClient />;
}
