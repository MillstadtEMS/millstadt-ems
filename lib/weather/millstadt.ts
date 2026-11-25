// Millstadt weather, shared by the public weather page (/weather) and the station TV (/station):
// one fetch path (National Weather Service forecast, alerts and observations, Open-Meteo current
// conditions, and the KALN METAR through /api/metar) and one medical-helicopter flight-acceptance
// estimate, so both screens always show the same answer.

export const NWS_HEADERS = {
  "User-Agent": "(millstadtems.org, millstadtems@gmail.com)",
  Accept: "application/geo+json",
};

/** Millstadt, Illinois (the forecast grid point). */
export const MILLSTADT_POINT = { latitude: 38.4578, longitude: -89.9776 } as const;
export const MILLSTADT_ALERT_ZONE = "ILC163";
export const MILLSTADT_OBSERVATION_STATION = "KCPS";

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`Weather request failed with ${response.status}`);
  return response.json();
}

export function mToMiles(m: number | null): number | null {
  if (m == null) return null;
  return Math.round(m / 1609.34 * 10) / 10;
}
export function hPaToInHg(hpa: number | null): number | null {
  if (hpa == null) return null;
  return Math.round(hpa * 0.02953 * 100) / 100;
}
export function degToCompass(deg: number | null): string {
  if (deg == null) return "—";
  const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

// WMO weather code → text description
export function wmoDescription(code: number): string {
  if (code === 0)               return "Clear Sky";
  if (code === 1)               return "Mainly Clear";
  if (code === 2)               return "Partly Cloudy";
  if (code === 3)               return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 55) return "Drizzle";
  if (code >= 61 && code <= 65) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain Showers";
  if (code >= 85 && code <= 86) return "Snow Showers";
  if (code === 95)              return "Thunderstorm";
  if (code === 96 || code === 99) return "Thunderstorm with Hail";
  return "Unknown";
}

export interface Alert {
  properties: { event: string; headline: string; severity: string; expires: string };
}
export interface Period {
  name: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: string;
  windSpeed: string;
  windDirection: string;
  shortForecast: string;
  icon: string;
  detailedForecast: string;
}
export interface Observation {
  textDescription: string;
  temperature: { value: number | null };
  dewpoint: { value: number | null };
  windDirection: { value: number | null };
  windSpeed: { value: number | null };
  windGust: { value: number | null };
  barometricPressure: { value: number | null };
  relativeHumidity: { value: number | null };
  visibility: { value: number | null };
  cloudLayers?: Array<{ amount: string; base: { value: number | null } }>;
}

// Open-Meteo current conditions (accurate, no API key, model-based)
export interface CurrentConditions {
  tempF: number | null;
  feelsLikeF: number | null;
  dewpointF: number | null;
  humidity: number | null;
  windMph: number | null;
  gustMph: number | null;
  windDeg: number | null;
  visibilityMiles: number | null;
  pressureInHg: number | null;
  wmoCode: number | null;
}

// METAR data from aviationweather.gov
export interface MetarData {
  icaoId: string;
  name: string;
  rawOb: string;
  reportTime: string;
  flightCategory: "VFR" | "MVFR" | "IFR" | "LIFR" | null;
  visib: number | null;       // statute miles
  wspd: number | null;        // knots
  wgst: number | null;        // knots
  wdir: number | null;        // degrees
  clouds: Array<{ cover: string; base: number | null }> | null; // base in hundreds of feet AGL
  vertVis: number | null;     // hundreds of feet (obscured sky)
}

export interface WeatherData {
  alerts: Alert[];
  current: CurrentConditions;
  observation: Observation | null;
  metar: MetarData | null;
  periods: Period[];
  fetchedAt: Date;
}

/** Everything the weather page shows. Throws when neither the forecast nor current conditions load. */
export async function fetchMillstadtWeather(): Promise<WeatherData> {
  const { latitude, longitude } = MILLSTADT_POINT;
  // Step 1: grid info
  const ptRes = await fetch(`https://api.weather.gov/points/${latitude},${longitude}`, { headers: NWS_HEADERS });
  if (!ptRes.ok) throw new Error("points failed");
  const pt = await ptRes.json();

  const forecastUrl = pt.properties.forecast;

  // Open-Meteo — real-time model-based conditions, no API key needed
  const OPEN_METEO_URL =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${latitude}&longitude=${longitude}` +
    "&current=temperature_2m,apparent_temperature,dewpoint_2m,relative_humidity_2m" +
    ",wind_speed_10m,wind_gusts_10m,wind_direction_10m" +
    ",visibility,surface_pressure,weather_code" +
    "&wind_speed_unit=mph&temperature_unit=fahrenheit&timezone=America/Chicago";

  // Step 2: parallel fetches
  const [forecastResult, alertsResult, openMeteoResult, observationResult, metarResult] = await Promise.allSettled([
    fetchJson(forecastUrl, { headers: NWS_HEADERS }),
    fetchJson(`https://api.weather.gov/alerts/active?zone=${MILLSTADT_ALERT_ZONE}`, { headers: NWS_HEADERS }),
    fetchJson(OPEN_METEO_URL),
    fetchJson(`https://api.weather.gov/stations/${MILLSTADT_OBSERVATION_STATION}/observations/latest`, { headers: NWS_HEADERS }),
    fetchJson("/api/metar"),
  ]);

  const forecastData = forecastResult.status === "fulfilled" ? forecastResult.value as { properties?: { periods?: Period[] } } : null;
  const alertsData = alertsResult.status === "fulfilled" ? alertsResult.value as { features?: Alert[] } : null;
  const openMeteoData = openMeteoResult.status === "fulfilled" ? openMeteoResult.value as { current?: Record<string, number | null> } : null;

  if (!forecastData && !openMeteoData) {
    throw new Error("Primary weather services unavailable");
  }

  // Parse Open-Meteo current conditions
  const om = openMeteoData?.current ?? {};
  const current: CurrentConditions = {
    tempF:           om.temperature_2m         ?? null,
    feelsLikeF:      om.apparent_temperature   ?? null,
    dewpointF:       om.dewpoint_2m            ?? null,
    humidity:        om.relative_humidity_2m   ?? null,
    windMph:         om.wind_speed_10m != null ? Math.round(om.wind_speed_10m) : null,
    gustMph:         om.wind_gusts_10m != null ? Math.round(om.wind_gusts_10m) : null,
    windDeg:         om.wind_direction_10m     ?? null,
    visibilityMiles: om.visibility != null ? mToMiles(om.visibility) : null,
    pressureInHg:    hPaToInHg(om.surface_pressure ?? null),
    wmoCode:         om.weather_code           ?? null,
  };

  // NWS observation — cloudLayers fallback
  let observation: Observation | null = null;
  if (observationResult.status === "fulfilled") {
    const obsData = observationResult.value as { properties?: Observation };
    observation = obsData.properties ?? null;
  }

  // METAR — primary ceiling source
  let metar: MetarData | null = null;
  if (metarResult.status === "fulfilled") {
    const metarArr = metarResult.value;
    const m = Array.isArray(metarArr) ? metarArr[0] : null;
    if (m) {
      metar = {
        icaoId:         m.icaoId ?? "KALN",
        name:           m.name ?? "Southwestern Illinois Airport",
        rawOb:          m.rawOb ?? "",
        reportTime:     m.reportTime ?? "",
        flightCategory: m.flightCategory ?? null,
        visib:          m.visib ?? null,
        wspd:           m.wspd ?? null,
        wgst:           m.wgst ?? null,
        wdir:           m.wdir ?? null,
        clouds:         Array.isArray(m.clouds) ? m.clouds : null,
        vertVis:        m.vertVis ?? null,
      };
    }
  }

  return {
    alerts: alertsData?.features ?? [],
    current,
    observation,
    metar,
    periods: forecastData?.properties?.periods ?? [],
    fetchedAt: new Date(),
  };
}

/** The current-conditions headline: Open-Meteo's weather code, else the first forecast period. */
export function currentConditionText(data: Pick<WeatherData, "current" | "periods">): string {
  return data.current.wmoCode != null ? wmoDescription(data.current.wmoCode) : (data.periods[0]?.shortForecast ?? "—");
}

/** METAR visibility in statute miles: aviationweather.gov sends a number or text such as "10+" or "1 1/2". */
function metarVisibilityMiles(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const text = value.replace(/[+SM]/gi, " ").replace(/^P/i, "").trim();
  let miles = 0, any = false;
  for (const part of text.split(/\s+/)) {
    const fraction = part.match(/^(\d+)\/(\d+)$/);
    if (fraction) { miles += Number(fraction[1]) / Number(fraction[2]); any = true; }
    else if (/^\d+(\.\d+)?$/.test(part)) { miles += Number(part); any = true; }
  }
  return any ? miles : null;
}

/** The METAR's flight category: as reported, else worked out from its ceiling and visibility by the
 *  FAA's bands (the same ones aviationweather.gov uses). Used by the station TV. */
export function metarFlightCategory(m: MetarData | null): MetarData["flightCategory"] {
  if (!m) return null;
  if (m.flightCategory) return m.flightCategory;
  const ceiling = getMetarCeilingFt(m);
  const visibility = metarVisibilityMiles(m.visib);
  if (ceiling == null && visibility == null) return null;
  const below = (limitFt: number, limitMi: number) => (ceiling != null && ceiling < limitFt) || (visibility != null && visibility < limitMi);
  if (below(500, 1)) return "LIFR";
  if (below(1000, 3)) return "IFR";
  if ((ceiling != null && ceiling <= 3000) || (visibility != null && visibility <= 5)) return "MVFR";
  return "VFR";
}

// ── Helicopter Flyability ──────────────────────────────────────────────────

export const FLYABILITY_THRESHOLDS = {
  minVisibilityFlying: 3,   // statute miles
  minVisibilityNoFly:  2,
  minCeilingFlying:    1200, // feet AGL
  minCeilingNoFly:     800,
  strongWindMph:       35,
  strongGustMph:       45,
};

export const FLYABILITY_DISCLAIMER =
  "This is an informational weather-based estimate only and does not represent an official flight acceptance decision. " +
  "Final decisions depend on the aircraft operator, pilot, route, base conditions, and company policy.";

export function getCeilingFt(layers?: Observation["cloudLayers"]): number | null {
  if (!layers?.length) return null;
  for (const layer of layers) {
    const amt = layer.amount?.toUpperCase();
    if ((amt === "BKN" || amt === "OVC") && layer.base?.value != null) {
      return Math.round(layer.base.value * 3.281);
    }
  }
  return null;
}

/** Extract ceiling from METAR cloud layers. Base is in hundreds of feet. */
export function getMetarCeilingFt(m: MetarData | null): number | null {
  if (!m) return null;
  // Obscured sky (VV) counts as ceiling
  if (m.vertVis != null) return m.vertVis * 100;
  if (!m.clouds?.length) return null;
  for (const { cover, base } of m.clouds) {
    if ((cover === "BKN" || cover === "OVC") && base != null) return base * 100;
  }
  return null; // CLR / SKC / FEW / SCT = no ceiling
}

export interface FlyabilityResult {
  status: "flying" | "not-flying";
  title: string;
  reason: string;
  details: string[];
  minimums: string[]; // shown only when not-flying to explain what's required
}

export function evaluateFlyability(params: {
  visibilityMiles: number | null;
  windMph: number | null;
  gustMph: number | null;
  ceilingFt: number | null;
  ceilingDataAvailable: boolean;
  conditionText: string;
  alerts: Alert[];
  forecastText: string;
}): FlyabilityResult {
  const { visibilityMiles, windMph, gustMph, ceilingFt, ceilingDataAvailable, conditionText, alerts, forecastText } = params;
  const T = FLYABILITY_THRESHOLDS;
  const cond = conditionText.toLowerCase();
  const fcst = forecastText.toLowerCase();

  // ── Hazard checks ──
  const hasTornadoWarning      = alerts.some(a => a.properties.event.toLowerCase().includes("tornado") && a.properties.event.toLowerCase().includes("warning"));
  const hasSevereThunderstorm  = alerts.some(a => a.properties.event.toLowerCase().includes("severe thunderstorm") && a.properties.event.toLowerCase().includes("warning"));
  const hasThunderstorm        = cond.includes("thunder") || cond.includes("t-storm") || fcst.includes("thunder");
  const hasIcing               = cond.includes("freez") || cond.includes("ice pellet") || cond.includes("sleet") || fcst.includes("freezing");

  const noFly: string[] = [];
  const minimums: string[] = [];

  if (hasTornadoWarning)     { noFly.push("Active tornado warning in the area."); }
  if (hasSevereThunderstorm) { noFly.push("Active severe thunderstorm warning."); }
  if (hasThunderstorm)       { noFly.push("Thunderstorm hazard affecting the area."); minimums.push("No active thunderstorm over route"); }
  if (hasIcing)              { noFly.push("Icing or freezing precipitation present."); minimums.push("No freezing precipitation"); }
  if (visibilityMiles != null && visibilityMiles < T.minVisibilityNoFly) {
    noFly.push(`Visibility ${visibilityMiles} mi — below minimums.`);
    minimums.push(`Visibility minimum: ${T.minVisibilityFlying} mi`);
  }
  if (ceilingFt != null && ceilingFt < T.minCeilingNoFly) {
    noFly.push(`Ceiling ${ceilingFt.toLocaleString()} ft — below minimums.`);
    minimums.push(`Ceiling minimum: ${T.minCeilingFlying.toLocaleString()} ft AGL`);
  }
  if (windMph != null && windMph >= T.strongWindMph) {
    noFly.push(`Sustained winds ${windMph} mph — too strong.`);
    minimums.push(`Wind maximum: ${T.strongWindMph} mph sustained`);
  }
  if (gustMph != null && gustMph >= T.strongGustMph) {
    noFly.push(`Wind gusts ${gustMph} mph — too high.`);
    minimums.push(`Gust maximum: ${T.strongGustMph} mph`);
  }

  // ── Details chips ──
  const details: string[] = [];
  if (visibilityMiles != null) details.push(`Visibility ${visibilityMiles} mi`);
  if (ceilingFt != null)          details.push(`Ceiling ${ceilingFt.toLocaleString()} ft`);
  else if (ceilingDataAvailable)  details.push("Ceiling: Unlimited (Clear Sky)");
  else                            details.push("Ceiling data unavailable");
  if (windMph != null)         details.push(`Wind ${windMph} mph${gustMph ? ` (gust ${gustMph})` : ""}`);
  if (alerts.length > 0)       details.push(`${alerts.length} active alert${alerts.length > 1 ? "s" : ""}`);
  else                         details.push("No active severe alerts");
  if (!hasThunderstorm)        details.push("No thunderstorm hazard detected");

  if (noFly.length > 0) {
    return { status: "not-flying", title: "UNLIKELY TO ACCEPT FLIGHT", reason: noFly[0], details, minimums };
  }

  // ── All-clear check ──
  const visOk   = visibilityMiles == null || visibilityMiles >= T.minVisibilityFlying;
  const ceilOk  = ceilingFt      == null || ceilingFt      >= T.minCeilingFlying;
  const windsOk = (windMph == null || windMph < T.strongWindMph) && (gustMph == null || gustMph < T.strongGustMph);

  if (visOk && ceilOk && windsOk) {
    return {
      status: "flying",
      title:  "LIKELY TO ACCEPT FLIGHT",
      reason: "Visibility and ceilings are currently favorable for helicopter operations.",
      details,
      minimums: [],
    };
  }

  // Marginal → conservative
  return {
    status: "not-flying",
    title:  "UNLIKELY TO ACCEPT FLIGHT",
    reason: "Marginal conditions suggest possible flight restrictions.",
    details,
    minimums: [`Visibility minimum: ${T.minVisibilityFlying} mi`, `Ceiling minimum: ${T.minCeilingFlying.toLocaleString()} ft AGL`],
  };
}

/** The medical-helicopter flight-acceptance estimate for a fetch, exactly as the weather page computes it. */
export function flightAcceptance(data: WeatherData): FlyabilityResult {
  const { alerts, current, observation, metar, periods } = data;
  return evaluateFlyability({
    visibilityMiles: current.visibilityMiles,
    windMph: current.windMph,
    gustMph: current.gustMph,
    ceilingFt: getMetarCeilingFt(metar) ?? getCeilingFt(observation?.cloudLayers),
    ceilingDataAvailable: metar != null || observation?.cloudLayers != null,
    conditionText: currentConditionText(data),
    alerts,
    forecastText: periods[0]?.detailedForecast ?? periods[0]?.shortForecast ?? "",
  });
}
