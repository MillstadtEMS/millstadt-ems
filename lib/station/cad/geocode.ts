// Finds a call's address on the map: the US Census geocoder first (free, no key, house-number
// accurate for US addresses), then OpenStreetMap's Nominatim, both biased to the call's town or
// Millstadt, Illinois, and both rejected when the answer lands more than ~35 miles from the station.
// Intersections ("RT 158 & RT 163") are found where the two streets share a point in OpenStreetMap.
// Results are cached by the caller (store.ts); each request times out after 4 seconds, and the API
// runs this after its response so a slow geocoder never holds the TV up.

import { MAX_CALL_DISTANCE_MILES, milesBetween, withinServiceArea } from "./geo";
import { STATION_POINT, type LocationSource } from "./types";

/** The site's own identification, as its weather requests send it. */
export const SITE_USER_AGENT = "(millstadtems.org, millstadtems@gmail.com)";
const CENSUS_URL = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const TIMEOUT_MS = 4000;
const NOMINATIM_SPACING_MS = 1100; // the public Nominatim service allows one request a second

export interface GeocodeHit {
  lat: number;
  lon: number;
  source: Extract<LocationSource, "census" | "nominatim">;
  /** Only the street (not the house) or a rough intersection was found. */
  approximate: boolean;
}

export interface GeocodeOptions {
  fetchImpl?: typeof fetch;
  userAgent?: string;
  timeoutMs?: number;
}

export interface GeocodeQuery {
  /** "353 SHAD LN" with no block or apartment words, or null for an intersection. */
  street: string | null;
  intersection: [string, string] | null;
  city: string;
  hasNumber: boolean;
}

const UNIT_SUFFIX = /\s+(?:APT|APARTMENT|UNIT|LOT|STE|SUITE|RM|ROOM|BLDG|BUILDING|FL|FLOOR|TRLR|TRAILER|SPC|SPACE|#)\.?\s*[A-Z0-9-]+$/i;

/** What to ask the geocoders for, or null when the location can't be geocoded (a mile marker). */
export function geocodeQuery(address: string, city: string | null): GeocodeQuery | null {
  let street = address
    .replace(/\s+/g, " ")
    .replace(/\b(?:BLK|BLOCK)\b\.?/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  for (let i = 0; i < 2; i++) street = street.replace(UNIT_SUFFIX, "").trim();
  if (!street || /\b(?:MM|MILE\s*MARKER|MILEPOST)\b/i.test(street)) return null;
  const town = (city ?? "Millstadt").trim() || "Millstadt";
  const parts = street.split(/\s+(?:&|AND|@|AT)\s+|\s*\/\s*/i).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 2) {
    // "100 MAIN ST & ELM ST" is a house with its cross street; "MAIN ST & ELM ST" is an intersection.
    if (/^\d+[A-Z]?\s+\S/i.test(parts[0])) street = parts[0];
    else if (!/^\d/.test(parts[1])) return { street: null, intersection: [parts[0], parts[1]], city: town, hasNumber: false };
  }
  return { street, intersection: null, city: town, hasNumber: /^\d+[A-Z]?\s+\S/i.test(street) };
}

/** Road names the way OpenStreetMap spells them: "RT 158" → "Route 158". */
function osmName(street: string) {
  return street.replace(/\b(?:RT|RTE|ROUTE|IL|ILL)\.?\s*-?\s*(\d+)\b/i, "Route $1").replace(/\bHWY\b/i, "Highway");
}

async function getJson(url: string, options: GeocodeOptions, headers: Record<string, string> = {}): Promise<unknown> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(url, {
    headers: { Accept: "application/json", "User-Agent": options.userAgent ?? SITE_USER_AGENT, ...headers },
    signal: AbortSignal.timeout(options.timeoutMs ?? TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`geocoder answered ${response.status}`);
  return response.json();
}

function point(lat: unknown, lon: unknown): { lat: number; lon: number } | null {
  const p = { lat: Number(lat), lon: Number(lon) };
  return Number.isFinite(p.lat) && Number.isFinite(p.lon) && withinServiceArea(p) ? p : null;
}

// ── US Census ─────────────────────────────────────────────────────────────────────────────────────

interface CensusResponse {
  result?: { addressMatches?: Array<{ coordinates?: { x?: number; y?: number } }> };
}

export async function censusGeocode(street: string, city: string, options: GeocodeOptions = {}): Promise<GeocodeHit | null> {
  const address = `${street}, ${city}, IL`;
  const url = `${CENSUS_URL}?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&format=json`;
  const data = (await getJson(url, options)) as CensusResponse;
  for (const match of data.result?.addressMatches ?? []) {
    const p = point(match.coordinates?.y, match.coordinates?.x);
    if (p) return { ...p, source: "census", approximate: false };
  }
  return null;
}

// ── Nominatim ─────────────────────────────────────────────────────────────────────────────────────

interface NominatimPlace {
  lat?: string;
  lon?: string;
  place_rank?: number;
  geojson?: { type?: string; coordinates?: unknown };
}

let nominatimNext = 0;
async function nominatimTurn() {
  const wait = nominatimNext - Date.now();
  nominatimNext = Math.max(Date.now(), nominatimNext) + NOMINATIM_SPACING_MS;
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
}

function viewbox() {
  // About 35 miles each way from the station.
  const dLat = MAX_CALL_DISTANCE_MILES / 69;
  const dLon = MAX_CALL_DISTANCE_MILES / (69 * Math.cos((STATION_POINT.lat * Math.PI) / 180));
  return [STATION_POINT.lon - dLon, STATION_POINT.lat + dLat, STATION_POINT.lon + dLon, STATION_POINT.lat - dLat].map((n) => n.toFixed(4)).join(",");
}

async function nominatimSearch(q: string, options: GeocodeOptions, geometry = false): Promise<NominatimPlace[]> {
  await nominatimTurn();
  const params = new URLSearchParams({
    q, format: "jsonv2", limit: geometry ? "6" : "3", countrycodes: "us", viewbox: viewbox(), bounded: "1",
  });
  if (geometry) params.set("polygon_geojson", "1");
  const data = await getJson(`${NOMINATIM_URL}?${params}`, options, { "Accept-Language": "en" });
  return Array.isArray(data) ? (data as NominatimPlace[]) : [];
}

export async function nominatimGeocode(street: string, city: string, options: GeocodeOptions = {}): Promise<GeocodeHit | null> {
  for (const place of await nominatimSearch(`${osmName(street)}, ${city}, Illinois`, options)) {
    const p = point(place.lat, place.lon);
    if (p) return { ...p, source: "nominatim", approximate: (place.place_rank ?? 30) < 28 };
  }
  return null;
}

function vertices(geojson: NominatimPlace["geojson"]): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const walk = (value: unknown) => {
    if (!Array.isArray(value)) return;
    if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") out.push([value[1], value[0]]);
    else for (const item of value) walk(item);
  };
  walk(geojson?.coordinates);
  return out;
}

/** Where two streets meet: the closest pair of their OpenStreetMap points (crossing roads share a
 *  node, so a real intersection is a distance of zero). */
export async function intersectionGeocode(a: string, b: string, city: string, options: GeocodeOptions = {}): Promise<GeocodeHit | null> {
  const first = (await nominatimSearch(`${osmName(a)}, ${city}, Illinois`, options, true)).flatMap((p) => vertices(p.geojson));
  if (!first.length) return null;
  const second = (await nominatimSearch(`${osmName(b)}, ${city}, Illinois`, options, true)).flatMap((p) => vertices(p.geojson));
  let best: { lat: number; lon: number; miles: number } | null = null;
  for (const [lat1, lon1] of first) {
    for (const [lat2, lon2] of second) {
      const miles = milesBetween({ lat: lat1, lon: lon1 }, { lat: lat2, lon: lon2 });
      if (!best || miles < best.miles) best = { lat: (lat1 + lat2) / 2, lon: (lon1 + lon2) / 2, miles };
    }
  }
  if (!best || best.miles > 0.25) return null;
  const p = point(best.lat, best.lon);
  return p ? { ...p, source: "nominatim", approximate: best.miles > 0.03 } : null;
}

/** Find an address, trying each geocoder in turn. Never throws: null means not found. */
export async function geocodeAddress(address: string, city: string | null, options: GeocodeOptions = {}): Promise<GeocodeHit | null> {
  const query = geocodeQuery(address, city);
  if (!query) return null;
  const attempt = async (run: () => Promise<GeocodeHit | null>) => {
    try { return await run(); } catch { return null; }
  };
  if (query.intersection) {
    const [a, b] = query.intersection;
    return (await attempt(() => intersectionGeocode(a, b, query.city, options))) ??
      (await attempt(() => nominatimGeocode(a, query.city, options).then((hit) => (hit ? { ...hit, approximate: true } : null))));
  }
  const street = query.street!;
  if (query.hasNumber) {
    const census = await attempt(() => censusGeocode(street, query.city, options));
    if (census) return census;
  }
  return attempt(() => nominatimGeocode(street, query.city, options));
}
