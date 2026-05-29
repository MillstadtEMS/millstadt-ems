import Link from "next/link";
import { redirect } from "next/navigation";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import { listHospitalsLive } from "@/lib/lounge/hospitals";
import LoungeShell from "@/components/lounge/LoungeShell";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminHospitalsPage() {
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
  const hospitals = await listHospitalsLive();

  return (
    <LoungeShell me={me}>
      <header style={{ marginBottom: 22 }}>
        <div style={{ color: "#f0b429", fontSize: "0.7rem", fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
          Admin
        </div>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.85rem", fontWeight: 900, letterSpacing: "-0.015em" }}>
          Hospitals
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "0.92rem", marginTop: 4, lineHeight: 1.55 }}>
          Edit door codes, patch numbers, fax lines, and notes. Edits go live for the crew immediately.
        </p>
      </header>

      <div style={{ marginBottom: 14 }}>
        <Link
          href="/admin/hospitals/new"
          style={{ display: "inline-block", padding: "10px 18px", background: "#f0b429", color: "#040d1a", borderRadius: 12, fontWeight: 900, fontSize: 13, letterSpacing: "0.10em", textTransform: "uppercase", textDecoration: "none" }}
        >
          + New Hospital
        </Link>
      </div>

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
        {hospitals.map((h) => (
          <li key={h.id}>
            <Link
              href={`/admin/hospitals/${h.id}`}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "14px 16px", background: "#071428", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, color: "white", textDecoration: "none" }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{h.name}</div>
                <div style={{ color: "#94a3b8", fontSize: 12.5, marginTop: 2 }}>
                  {h.city}, {h.state}{h.doorCode ? ` · door ${h.doorCode}` : ""}
                </div>
              </div>
              {h.flagForReview && (
                <span style={{ padding: "4px 10px", borderRadius: 999, background: "rgba(252,165,165,0.12)", color: "#fca5a5", fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  Flagged
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </LoungeShell>
  );
}
