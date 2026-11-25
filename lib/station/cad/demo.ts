// Synthetic calls for trying the station TV's CAD panel without real data. Development only: the API
// route never calls this in production. Times run from the moment the TV started the demo (t0), so a
// fresh load always shows the same story: the location turns up after a few seconds, the crew goes
// enroute about 30 seconds in, then on scene, transporting, at the hospital and clear, and the demo
// starts over with a new call. The streets are real (block numbers, located with the US Census
// geocoder) so the pins land where they should; the calls are invented.

import { CALL_PHASES, type CallLocation, type CallPhase, type StationCall } from "./types";

export type DemoMode = "demo" | "demo3";

export function isDemoMode(value: unknown): value is DemoMode {
  return value === "demo" || value === "demo3";
}

interface DemoScript {
  key: string;
  eventNumber: string;
  nature: string;
  detail: string | null;
  address: string;
  city: string;
  crossStreets: string | null;
  units: string[];
  location: CallLocation;
  /** Seconds after t0 the location is found (negative: already known). */
  locatedAt: number;
  /** Seconds after t0 each phase starts. */
  phases: Partial<Record<CallPhase, number>>;
}

const WASHINGTON: CallLocation = { lat: 38.461376, lon: -90.094891, source: "demo" };
const FLORAVILLE: CallLocation = { lat: 38.440022, lon: -90.08227, source: "demo" };
const COLUMBIA: CallLocation = { lat: 38.446491, lon: -90.203422, source: "demo" };

const ONE: DemoScript[] = [
  {
    key: "fall", eventNumber: "2026-90118", nature: "Medical", detail: "Fall - Possible Hip Injury",
    address: "300 Blk W Washington St", city: "Millstadt", crossStreets: "S Monroe St / S Polk St", units: ["M3925"],
    location: WASHINGTON, locatedAt: 3,
    phases: { dispatched: -8, enroute: 30, onscene: 95, transport: 165, athospital: 235, clear: 295 },
  },
];

const THREE: DemoScript[] = [
  {
    key: "mva", eventNumber: "2026-90101", nature: "MVA", detail: "Two Vehicles - Injuries Reported",
    address: "6000 Blk Floraville Rd", city: "Millstadt", crossStreets: null, units: ["M3925", "M3926"],
    location: FLORAVILLE, locatedAt: -600,
    phases: { dispatched: -14 * 60, enroute: -13 * 60 - 10, onscene: -6 * 60, transport: 40, athospital: 150, clear: 280 },
  },
  {
    key: "breathing", eventNumber: "2026-90107", nature: "Difficulty Breathing", detail: null,
    address: "500 Blk N Main St", city: "Columbia", crossStreets: null, units: ["M3935"],
    location: COLUMBIA, locatedAt: -200,
    phases: { dispatched: -4 * 60, enroute: -200, onscene: 35, transport: 200, athospital: 300 },
  },
  {
    key: "fall", eventNumber: "2026-90112", nature: "Medical", detail: "Fall - Possible Hip Injury",
    address: "300 Blk W Washington St", city: "Millstadt", crossStreets: "S Monroe St / S Polk St", units: ["M3926"],
    location: WASHINGTON, locatedAt: -30,
    phases: { dispatched: -40, enroute: 25, onscene: 120, transport: 260 },
  },
];

/** Each demo loops after this long, with new event numbers. */
const CYCLE_S = 6 * 60;

export function demoCalls(mode: DemoMode, t0: number, now: number): StationCall[] {
  const elapsed = Math.max(0, (now - t0) / 1000);
  const cycle = Math.floor(elapsed / CYCLE_S);
  const base = t0 + cycle * CYCLE_S * 1000;
  const at = (seconds: number) => base + seconds * 1000;
  const scripts = mode === "demo3" ? THREE : ONE;
  const calls: StationCall[] = [];
  for (const script of scripts) {
    if (at(script.phases.dispatched ?? 0) > now) continue;
    const times: Partial<Record<CallPhase, string>> = {};
    let phase: CallPhase = "dispatched";
    for (const p of CALL_PHASES) {
      const start = script.phases[p];
      if (start === undefined || at(start) > now) continue;
      times[p] = new Date(at(start)).toISOString();
      phase = p;
    }
    const located = at(script.locatedAt) <= now;
    const changed = Math.max(...Object.values(times).map((t) => Date.parse(t!)), located ? at(script.locatedAt) : 0);
    const number = Number(script.eventNumber.slice(5)) + cycle * 100;
    calls.push({
      id: `demo-${script.key}-${cycle}`,
      eventNumber: `2026-${number}`,
      nature: script.nature,
      detail: script.detail,
      address: script.address,
      city: script.city,
      place: null,
      crossStreets: script.crossStreets,
      units: script.units,
      phase,
      phaseAt: times[phase]!,
      times,
      dispatchedAt: times.dispatched!,
      closedAt: phase === "clear" ? times.clear! : null,
      cancelled: false,
      location: located ? script.location : null,
      locating: !located,
      changedAt: new Date(changed).toISOString(),
    });
  }
  return calls;
}
