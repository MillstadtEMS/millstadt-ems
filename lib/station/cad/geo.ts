// Small geography helpers shared by the parser, the geocoder and the TV panel. Client-safe.

import { STATION_POINT } from "./types";

/** Calls farther than this from the station are treated as bad matches. */
export const MAX_CALL_DISTANCE_MILES = 35;

export function milesBetween(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function milesFromStation(point: { lat: number; lon: number }): number {
  return milesBetween(STATION_POINT, point);
}

export function withinServiceArea(point: { lat: number; lon: number }, maxMiles = MAX_CALL_DISTANCE_MILES): boolean {
  return Number.isFinite(point.lat) && Number.isFinite(point.lon) && milesFromStation(point) <= maxMiles;
}
