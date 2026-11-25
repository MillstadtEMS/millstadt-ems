import { NextResponse } from "next/server";

export const runtime = "nodejs";
// Snow on the site follows real Millstadt weather. Refresh every 10 minutes.
export const revalidate = 600;

// Same point as the public weather page; KCPS (St. Louis Downtown) is the nearest NWS station.
const latitude = 38.4578;
const longitude = -89.9776;
const station = "KCPS";
const userAgent = "(millstadtems.org, millstadtems@gmail.com)";
const cacheHeaders = { "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=300" };

type Level = 0 | 1 | 2 | 3;
const max = (a: Level, b: Level): Level => (a > b ? a : b);

// Open-Meteo WMO codes: 71/73/75 snow (slight/moderate/heavy), 77 snow grains,
// 85/86 snow showers (slight/heavy). `snowfall` is centimetres over the past hour.
function modelLevel(code: unknown, snowfall: unknown): Level {
  let level: Level = 0;
  if (code === 71 || code === 77 || code === 85) level = 1;
  if (code === 73) level = 2;
  if (code === 75 || code === 86) level = 3;
  if (typeof snowfall === "number") {
    if (snowfall >= 2) level = max(level, 3);
    else if (snowfall >= 0.7) level = max(level, 2);
    else if (snowfall > 0) level = max(level, 1);
  }
  return level;
}

type PresentWeather = { intensity?: string | null; weather?: string | null };
// NWS present weather: snow with light / (none = moderate) / heavy intensity.
function observedLevel(present: unknown, observedAt: unknown): Level {
  if (!Array.isArray(present) || typeof observedAt !== "string") return 0;
  const age = Date.now() - Date.parse(observedAt);
  if (!Number.isFinite(age) || age > 2 * 60 * 60 * 1000) return 0;
  let level: Level = 0;
  for (const item of present as PresentWeather[]) {
    if (!item?.weather || !/snow/.test(item.weather)) continue;
    const next: Level = item.intensity === "heavy" ? 3 : item.intensity === "light" ? 1 : 2;
    level = max(level, item.weather === "blowing_snow" ? 1 : next);
  }
  return level;
}

async function json(url: string, headers: Record<string, string>) {
  const res = await fetch(url, { headers, next: { revalidate: 600 }, signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`Weather source returned ${res.status}`);
  return res.json();
}

export async function GET() {
  const [model, observation] = await Promise.allSettled([
    json(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=weather_code,snowfall&timezone=America%2FChicago`,
      { Accept: "application/json" }),
    json(`https://api.weather.gov/stations/${station}/observations/latest`,
      { Accept: "application/geo+json", "User-Agent": userAgent }),
  ]);
  const current = model.status === "fulfilled" ? model.value?.current : undefined;
  const props = observation.status === "fulfilled" ? observation.value?.properties : undefined;
  const fromModel = current ? modelLevel(current.weather_code, current.snowfall) : 0;
  const fromStation = props ? observedLevel(props.presentWeather, props.timestamp) : 0;
  return NextResponse.json({
    level: max(fromModel, fromStation),
    sources: { model: current ? fromModel : null, station: props ? fromStation : null },
    observedAt: props?.timestamp ?? current?.time ?? null,
  }, { headers: cacheHeaders });
}
