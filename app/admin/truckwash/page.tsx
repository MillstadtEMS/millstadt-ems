import { redirect } from "next/navigation";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import { listTruckWashLogs } from "@/lib/lounge/truckwash";
import LoungeShell from "@/components/lounge/LoungeShell";
import AdminTruckWashLog from "@/components/lounge/AdminTruckWashLog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminTruckWashPage() {
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

  const initialLogs = await listTruckWashLogs({ limit: 250 });

  return (
    <LoungeShell me={me}>
      <header style={{ marginBottom: 22 }}>
        <div style={{ color: "#f0b429", fontSize: "0.7rem", fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
          Admin
        </div>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.85rem", fontWeight: 900, letterSpacing: "-0.015em" }}>
          Truck Wash Log
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "0.92rem", marginTop: 4, lineHeight: 1.55 }}>
          Every wash entry the crew has submitted, newest first. Filter by truck, sort by date,
          or click an entry to see the full signature on file.
        </p>
      </header>
      <AdminTruckWashLog initialLogs={initialLogs} />
    </LoungeShell>
  );
}
