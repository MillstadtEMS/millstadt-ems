// The station TV marks itself so the shared seasonal components can tell they're on the hands-free
// TV: Time Out is ignored there, the crew fall with mad faces, and the living-room scenes run in the
// station's order.
//
// Two marks: an inline script in the station page sets window.__memsStation before React hydrates
// (so the very first checks already know), and the station component puts html[data-station] on the
// document once it has hydrated (for the station-only CSS). Setting the attribute any earlier would
// make React's hydration of <html> mismatch.

export const STATION_ATTRIBUTE = "data-station";
export const STATION_FLAG_SCRIPT = "window.__memsStation=true";

type StationWindow = Window & { __memsStation?: boolean };

export function isStation(): boolean {
  if (typeof window === "undefined") return false;
  return (window as StationWindow).__memsStation === true || document.documentElement.hasAttribute(STATION_ATTRIBUTE);
}

/** On the station, after hydration: both marks. */
export function setStationFlag() {
  (window as StationWindow).__memsStation = true;
  document.documentElement.setAttribute(STATION_ATTRIBUTE, "");
}

/** Leaving the station (a client navigation away): the shared components behave like the site again. */
export function clearStationFlag() {
  if (typeof window === "undefined") return;
  delete (window as StationWindow).__memsStation;
  document.documentElement.removeAttribute(STATION_ATTRIBUTE);
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
