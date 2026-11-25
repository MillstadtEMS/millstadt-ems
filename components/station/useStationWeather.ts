"use client";

import { useEffect, useState } from "react";
import { fetchMillstadtWeather, type WeatherData } from "@/lib/weather/millstadt";

export type StationWeather = {
  data: WeatherData | null;
  /** ok: fresh; stale: the last good report is showing while a refresh fails; error: nothing yet. */
  status: "loading" | "ok" | "stale" | "error";
  updatedAt: number | null;
};

const REFRESH = 10 * 60_000;
const RETRY = 2 * 60_000;

/** Live Millstadt weather for the station TV, the same fetch as /weather, every ten minutes. A failed
 *  refresh keeps the last good report on screen and tries again sooner. */
export function useStationWeather(): StationWeather {
  const [weather, setWeather] = useState<StationWeather>({ data: null, status: "loading", updatedAt: null });

  useEffect(() => {
    let alive = true, timer: number | undefined, busy = false;
    async function load() {
      if (busy) return;
      busy = true;
      window.clearTimeout(timer);
      let ok = false;
      try {
        const data = await fetchMillstadtWeather();
        ok = true;
        if (alive) setWeather({ data, status: "ok", updatedAt: Date.now() });
      } catch {
        if (alive) setWeather((last) => ({ ...last, status: last.data ? "stale" : "error" }));
      } finally {
        busy = false;
        if (alive) timer = window.setTimeout(load, ok ? REFRESH : RETRY);
      }
    }
    void load();
    const online = () => void load();
    window.addEventListener("online", online);
    return () => { alive = false; window.clearTimeout(timer); window.removeEventListener("online", online); };
  }, []);

  return weather;
}
