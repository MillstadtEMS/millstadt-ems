// The station TV marks the document with html[data-station] before anything else runs (an inline
// script in the station page), so the shared seasonal components can tell they're on the hands-free
// TV: Time Out is ignored there, the crew fall with mad faces, and the living-room scenes run in the
// station's order.

export const STATION_ATTRIBUTE = "data-station";

export function isStation(): boolean {
  return typeof document !== "undefined" && document.documentElement.hasAttribute(STATION_ATTRIBUTE);
}

function query(): URLSearchParams | null {
  try { return new URLSearchParams(window.location.search); } catch { return null; }
}

/** ?preview=ve&station-fast=1 runs the attract loop quickly for testing. */
export function stationFast(): boolean {
  const params = query();
  return params?.get("preview") === "ve" && params.get("station-fast") === "1";
}

/** ?station-debug=1 shows the display and loop diagnostics panel. */
export function stationDebug(): boolean {
  return query()?.get("station-debug") === "1";
}
