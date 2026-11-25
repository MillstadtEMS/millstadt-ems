// Shapes shared by the station CAD feed's server code and the station TV panel. Client-safe: no
// imports, no secrets. A call here is what the TV is allowed to show (no notes, callers or patients).

export const CALL_PHASES = ["dispatched", "enroute", "onscene", "transport", "athospital", "clear"] as const;
export type CallPhase = (typeof CALL_PHASES)[number];

export const PHASE_LABELS: Record<CallPhase, string> = {
  dispatched: "Dispatched",
  enroute: "Enroute",
  onscene: "On Scene",
  transport: "Transport",
  athospital: "At Hospital",
  clear: "Clear",
};

export function phaseRank(phase: CallPhase): number {
  return CALL_PHASES.indexOf(phase);
}

export type LocationSource = "email" | "census" | "nominatim" | "demo";

export interface CallLocation {
  lat: number;
  lon: number;
  source: LocationSource;
  /** True when only the street (not the house number) or one street of an intersection was found. */
  approximate?: boolean;
}

export interface StationCall {
  id: string;
  eventNumber: string | null;
  /** The call type as the TV shows it, e.g. "Medical" or "Accident w/ Injuries". */
  nature: string;
  /** A second line when the email carries a problem or complaint beyond the category. */
  detail: string | null;
  address: string | null;
  city: string | null;
  /** Business or common place name, e.g. "Millstadt Village Park". */
  place: string | null;
  crossStreets: string | null;
  units: string[];
  phase: CallPhase;
  /** ISO time the current phase began. */
  phaseAt: string;
  /** ISO time each phase was first reached (Clear is the time the call closed). */
  times: Partial<Record<CallPhase, string>>;
  dispatchedAt: string;
  closedAt: string | null;
  cancelled: boolean;
  location: CallLocation | null;
  /** An address is being looked up; false once found or given up on. */
  locating: boolean;
  /** ISO time of the last change the TV should notice (a new status, a moved pin). */
  changedAt: string;
}

export interface StationFeedHealth {
  lastSyncAt: string | null;
  lastOkAt: string | null;
  /** A short, non-sensitive reason the last sync failed (never an email body or address). */
  error: string | null;
  /** True when the feed has not synced successfully for a while. */
  delayed: boolean;
  demo?: "demo" | "demo3";
}

export type StationCallsResponse =
  | { available: true; serverTime: string; calls: StationCall[]; feed: StationFeedHealth }
  | { available: false; serverTime: string; reason: string; calls: StationCall[] };

/** Millstadt EMS, 100 E Laurel St (US Census geocoder). */
export const STATION_POINT = { lat: 38.45892, lon: -90.09035 } as const;
