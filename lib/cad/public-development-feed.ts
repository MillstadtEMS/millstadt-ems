// A local preview can read the already-public feed without production database credentials.
export const PUBLIC_CAD_LOG_URL = "https://www.millstadtems.org/api/cad/log";

export function shouldReadPublicDevelopmentFeed(environment: { NODE_ENV?: string; DATABASE_URL?: string }) {
  return environment.NODE_ENV === "development" && !environment.DATABASE_URL;
}

export async function readPublicDevelopmentFeed(fetchFeed: typeof fetch = fetch) {
  const response = await fetchFeed(PUBLIC_CAD_LOG_URL, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Public CAD feed unavailable");
  const calls: unknown = await response.json();
  if (!Array.isArray(calls) || calls.some(call => !call || typeof call !== "object" || Array.isArray(call))) {
    throw new Error("Invalid public CAD feed");
  }
  // Preserve the existing public boundary even if upstream fields change.
  return calls.map(call => {
    const publicCall = { ...call };
    delete publicCall.editedBy;
    delete publicCall.editedAt;
    return publicCall;
  });
}
