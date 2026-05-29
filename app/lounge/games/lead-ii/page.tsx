import { redirect } from "next/navigation";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import LoungeShell from "@/components/lounge/LoungeShell";
import LeadIIApp from "@/components/lounge/games/lead-ii/LeadIIApp";

export const dynamic = "force-dynamic";

export default async function LeadIIPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
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
  const params = await searchParams;
  const raw = typeof params.level === "string" ? params.level : "";
  const initialLevel = ["beginner", "intermediate", "expert"].includes(raw)
    ? (raw as "beginner" | "intermediate" | "expert")
    : undefined;

  return (
    <LoungeShell me={me}>
      <LeadIIApp playerName={session.firstName} initialLevel={initialLevel} />
    </LoungeShell>
  );
}
