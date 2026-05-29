import { redirect } from "next/navigation";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import LoungeShell from "@/components/lounge/LoungeShell";
import HospitalsClient from "@/components/lounge/HospitalsClient";
import { HOSPITALS, STATION_LAT, STATION_LNG, EMS_DOOR_CODE, distanceMiles } from "@/lib/lounge/hospitals";

export const dynamic = "force-dynamic";

export default async function HospitalsPage() {
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

  const enriched = HOSPITALS.map((h) => {
    const miles = distanceMiles(STATION_LAT, STATION_LNG, h.latitude, h.longitude);
    return { ...h, miles };
  }).sort((a, b) => a.miles - b.miles);

  return (
    <LoungeShell me={me}>
      <HospitalsClient hospitals={enriched} stationLat={STATION_LAT} stationLng={STATION_LNG} emsDoorCode={EMS_DOOR_CODE} />
    </LoungeShell>
  );
}
