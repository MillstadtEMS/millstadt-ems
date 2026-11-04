import "server-only";
import { unstable_cache } from "next/cache";
import { readCountyResults } from "./county";
import snapshot from "./snapshot.json";

// Cache a reconciled set of reports together. If a county update is in progress,
// a failed revalidation keeps the previous successful read and its timestamp.
const cachedReport = unstable_cache(readCountyResults, ["st-clair-2026-general-esd-350-v1"], { revalidate: 45 });

export async function getElectionReport() {
  try {
    return await cachedReport();
  } catch {
    return snapshot;
  }
}
