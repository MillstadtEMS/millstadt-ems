import { redirect } from "next/navigation";
import { currentEmployee } from "@/lib/lounge/auth";
import { listSuggestions } from "@/lib/lounge/hospital-suggestions";
import { listHospitalsLive } from "@/lib/lounge/hospitals";
import AdminHospitalSuggestions from "@/components/lounge/AdminHospitalSuggestions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminHospitalSuggestionsPage() {
  const session = await currentEmployee();
  if (!session) redirect("/lounge/login");
  if (!session.isAdmin) redirect("/lounge");

  const [suggestions, hospitals] = await Promise.all([
    listSuggestions(),
    listHospitalsLive(),
  ]);
  const hMap = Object.fromEntries(hospitals.map((h) => [h.id, h.name]));

  return (
    <>
      <header style={{ marginBottom: 22 }}>
        <div style={{ color: "#f0b429", fontSize: "0.7rem", fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
          Admin
        </div>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.85rem", fontWeight: 900, letterSpacing: "-0.015em" }}>
          Crew Hospital Suggestions
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "0.92rem", marginTop: 4, lineHeight: 1.55 }}>
          Crew-submitted code corrections + new-facility requests. Approving a code change
          updates the live hospital record; approving a new facility creates it and drops you
          into the edit screen to fill in lat/lng and access codes.
        </p>
      </header>
      <AdminHospitalSuggestions initial={suggestions} hospitalNameById={hMap} />
    </>
  );
}
