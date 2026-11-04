import "server-only";
import { unstable_cache } from "next/cache";
import { readClerkCanvass } from "./canvass";
import { readCountyResults } from "./county";
import snapshot from "./snapshot.json";

// Keep reconciled online returns together, including the time they were checked.
const cachedReport = unstable_cache(readCountyResults, ["st-clair-2026-general-esd-350-v1"], { revalidate: 45 });
const cachedCanvass = unstable_cache(readClerkCanvass, ["st-clair-2026-general-esd-canvass-v1"], { revalidate: 900 });

export async function getElectionReport() {
  const [returns, canvass] = await Promise.all([
    cachedReport().catch(() => snapshot),
    cachedCanvass().catch(() => null),
  ]);
  const certified = canvass?.totals;
  return {
    ...returns,
    yes: certified?.yes ?? returns.yes,
    no: certified?.no ?? returns.no,
    official: Boolean(certified) || returns.official,
    canvassUrl: canvass?.url,
    certifiedPage: certified?.page,
    detailTotal: returns.yes + returns.no,
    detailNote: certified && (!returns.official || returns.yes !== certified.yes || returns.no !== certified.no)
      ? (returns.official ? "These breakdowns come from the county’s online report." : "The county still labels these online breakdowns unofficial.")
      : null,
    saved: Date.now() - Date.parse(returns.checkedAt) > 150_000,
  };
}
