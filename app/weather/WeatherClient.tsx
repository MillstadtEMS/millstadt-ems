"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";

const RadarMap = dynamic(() => import("./RadarMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full rounded-2xl bg-[#071428] border border-white/8 flex items-center justify-center" style={{ height: "520px" }}>
      <span className="text-slate-500 text-sm uppercase tracking-widest">Loading radar…</span>
    </div>
  ),
});

const NWS_HEADERS = {
  "User-Agent": "(millstadtems.org, millstadtems@gmail.com)",
  Accept: "application/geo+json",
};

function mToMiles(m: number | null): number | null {
  if (m == null) return null;
  return Math.round(m / 1609.34 * 10) / 10;
}
function hPaToInHg(hpa: number | null): number | null {
  if (hpa == null) return null;
  return Math.round(hpa * 0.02953 * 100) / 100;
}
function degToCompass(deg: number | null): string {
  if (deg == null) return "—";
  const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

// WMO weather code → text description
function wmoDescription(code: number): string {
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

interface Alert {
  properties: { event: string; headline: string; severity: string; expires: string };
}
interface Period {
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
interface Observation {
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
interface CurrentConditions {
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
interface MetarData {
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

interface WeatherData {
  alerts: Alert[];
  current: CurrentConditions;
  observation: Observation | null;
  metar: MetarData | null;
  periods: Period[];
  fetchedAt: Date;
}

function alertColor(severity: string, event: string) {
  const e = event.toLowerCase();
  // Event name takes priority — "Tornado Watch" has severity="Severe" from NWS
  if (e.includes("warning"))
    return { bar: "bg-red-950 border-red-800/60", text: "text-red-200", badge: "bg-red-700" };
  if (e.includes("watch") || e.includes("advisory"))
    return { bar: "bg-yellow-950 border-yellow-700/50", text: "text-yellow-200", badge: "bg-yellow-600" };
  if (severity === "Extreme" || severity === "Severe")
    return { bar: "bg-red-950 border-red-800/60", text: "text-red-200", badge: "bg-red-700" };
  if (severity === "Moderate")
    return { bar: "bg-yellow-950 border-yellow-700/50", text: "text-yellow-200", badge: "bg-yellow-600" };
  return { bar: "bg-[#071428] border-[#2563eb]/25", text: "text-blue-200", badge: "bg-[#1d4ed8]" };
}

function ConditionIcon({ desc, size = 32 }: { desc: string; size?: number }) {
  const d = desc.toLowerCase();
  const s = size;
  if (d.includes("tornado")) return (
    <svg viewBox="0 0 24 24" width={s} height={s} className="fill-current shrink-0">
      <path d="M6 4h12v2H6zm2 4h8v2H8zm2 4h4v2h-4zm1 4h2v2h-2zm.5 4h1v2h-1z" />
    </svg>
  );
  if (d.includes("thunder") || d.includes("lightning") || d.includes("t-storm")) return (
    <svg viewBox="0 0 24 24" width={s} height={s} className="fill-current shrink-0">
      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM13 17l-4 5v-4H7l4-5v4h2z" />
    </svg>
  );
  if (d.includes("snow") || d.includes("blizzard") || d.includes("flurr")) return (
    <svg viewBox="0 0 24 24" width={s} height={s} className="fill-current shrink-0">
      <path d="M20 13h-1.05A8.5 8.5 0 0 0 12 5.5 8.5 8.5 0 0 0 4.05 13H3c-.55 0-1 .45-1 1s.45 1 1 1h1.22l-.72 2.16c-.18.54.11 1.12.65 1.3.54.18 1.12-.11 1.3-.65L6.28 16h11.44l.83 2.81c.18.54.76.83 1.3.65.54-.18.83-.76.65-1.3L19.78 16H21c.55 0 1-.45 1-1s-.45-1-1-1zM12 7.5c3.19 0 5.9 2.17 6.77 5.5H5.23A6.503 6.503 0 0 1 12 7.5z" />
    </svg>
  );
  if (d.includes("rain") || d.includes("shower") || d.includes("drizzle") || d.includes("precip")) return (
    <svg viewBox="0 0 24 24" width={s} height={s} className="fill-current shrink-0">
      <path d="M17.66 8L12 2.35 6.34 8C4.78 9.56 4 11.64 4 13.64s.78 4.11 2.34 5.67 3.61 2.35 5.66 2.35 4.1-.79 5.66-2.35S20 15.64 20 13.64 19.22 9.56 17.66 8z" />
    </svg>
  );
  if (d.includes("fog") || d.includes("haze") || d.includes("mist") || d.includes("smoke")) return (
    <svg viewBox="0 0 24 24" width={s} height={s} className="fill-current shrink-0">
      <path d="M3 15h18v-2H3v2zm0 4h18v-2H3v2zm0-8h18V9H3v2zm0-6v2h18V5H3z" />
    </svg>
  );
  if (d.includes("cloud") || d.includes("overcast")) return (
    <svg viewBox="0 0 24 24" width={s} height={s} className="fill-current shrink-0">
      <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
    </svg>
  );
  if (d.includes("partly") || d.includes("mostly")) return (
    <svg viewBox="0 0 24 24" width={s} height={s} className="fill-current shrink-0">
      <path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z" />
    </svg>
  );
  // clear / sunny
  return (
    <svg viewBox="0 0 24 24" width={s} height={s} className="fill-current shrink-0">
      <path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z" />
    </svg>
  );
}

function conditionColor(desc: string): string {
  const d = desc.toLowerCase();
  if (d.includes("tornado")) return "text-red-500";
  if (d.includes("thunder") || d.includes("t-storm")) return "text-purple-400";
  if (d.includes("snow") || d.includes("blizzard")) return "text-sky-300";
  if (d.includes("rain") || d.includes("shower") || d.includes("drizzle")) return "text-blue-400";
  if (d.includes("fog") || d.includes("smoke") || d.includes("haze")) return "text-slate-400";
  if (d.includes("cloud") || d.includes("overcast") || d.includes("mostly")) return "text-slate-300";
  if (d.includes("partly")) return "text-yellow-300";
  return "text-[#f0b429]";
}

// ── Helicopter Flyability ──────────────────────────────────────────────────

const FLYABILITY_THRESHOLDS = {
  minVisibilityFlying: 3,   // statute miles
  minVisibilityNoFly:  2,
  minCeilingFlying:    1200, // feet AGL
  minCeilingNoFly:     800,
  strongWindMph:       35,
  strongGustMph:       45,
};

const FLYABILITY_DISCLAIMER =
  "This is an informational weather-based estimate only and does not represent an official flight acceptance decision. " +
  "Final decisions depend on the aircraft operator, pilot, route, base conditions, and company policy.";

function getCeilingFt(layers?: Observation["cloudLayers"]): number | null {
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
function getMetarCeilingFt(m: MetarData | null): number | null {
  if (!m) return null;
  // Obscured sky (VV) counts as ceiling
  if (m.vertVis != null) return m.vertVis * 100;
  if (!m.clouds?.length) return null;
  for (const { cover, base } of m.clouds) {
    if ((cover === "BKN" || cover === "OVC") && base != null) return base * 100;
  }
  return null; // CLR / SKC / FEW / SCT = no ceiling
}

const FLIGHT_CAT_CONFIG = {
  VFR:  { label: "VFR",  color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/30", desc: "Visual Flight Rules — Favorable for helicopter operations" },
  MVFR: { label: "MVFR", color: "text-blue-400",    bg: "bg-blue-500/15",    border: "border-blue-500/30",    desc: "Marginal VFR — Helicopter may operate with caution" },
  IFR:  { label: "IFR",  color: "text-red-400",     bg: "bg-red-500/15",     border: "border-red-500/30",     desc: "Instrument Flight Rules — Helicopters unlikely to fly" },
  LIFR: { label: "LIFR", color: "text-fuchsia-400", bg: "bg-fuchsia-500/15", border: "border-fuchsia-500/30", desc: "Low IFR — Helicopter operations not expected" },
};

interface FlyabilityResult {
  status: "flying" | "not-flying";
  title: string;
  reason: string;
  details: string[];
  minimums: string[]; // shown only when not-flying to explain what's required
}

function evaluateFlyability(params: {
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

function AviationCeilingCard({ metar }: { metar: MetarData | null }) {
  if (!metar) return null;

  const cat = metar.flightCategory ? FLIGHT_CAT_CONFIG[metar.flightCategory] : null;
  const ceilingFt = getMetarCeilingFt(metar);

  // Build cloud layer string
  const significantLayers = (metar.clouds ?? []).filter(
    l => l.cover && l.cover !== "CLR" && l.cover !== "SKC" && l.cover !== "CAVOK"
  );
  const hasClearSky = (metar.clouds ?? []).some(l => l.cover === "CLR" || l.cover === "SKC");

  const layerStr = significantLayers.length > 0
    ? significantLayers.map(l => `${l.cover}${l.base != null ? ` ${(l.base * 100).toLocaleString()} ft` : ""}`).join("  ·  ")
    : (hasClearSky || !metar.clouds?.length ? "Sky Clear" : "No cloud data");

  // Parse report time to local
  const reportedAt = metar.reportTime
    ? new Date(metar.reportTime + "Z").toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" })
    : null;

  return (
    <section className="wrap mb-20">
      <div className="flex items-center gap-3 mb-6">
        <span className="h-px w-8 bg-[#f0b429]" />
        <span className="text-[#f0b429] text-sm font-black tracking-[0.2em] uppercase">Aviation Ceiling & Flight Category</span>
        <span className="text-slate-600 text-xs ml-auto">{metar.icaoId} METAR{reportedAt ? ` · ${reportedAt}` : ""}</span>
      </div>

      <div className="rounded-2xl bg-[#071428] border border-white/8 overflow-hidden">

        {/* Flight category banner */}
        {cat && (
          <div className={`${cat.bg} border-b ${cat.border} px-8 py-5 flex items-center gap-5`}>
            <span className={`${cat.color} font-black text-3xl tracking-widest`}>{cat.label}</span>
            <div className="h-6 w-px bg-white/10" />
            <span className="text-slate-300 text-sm leading-snug">{cat.desc}</span>
          </div>
        )}

        <div className="p-8 grid sm:grid-cols-3 gap-6">

          {/* Ceiling */}
          <div className="bg-[#040d1a] rounded-xl p-5 border border-white/5">
            <div className="text-slate-500 text-xs uppercase tracking-wider mb-2">Ceiling</div>
            <div className={`font-black text-2xl ${
              ceilingFt == null ? "text-slate-500" :
              ceilingFt < 500  ? "text-fuchsia-400" :
              ceilingFt < 1000 ? "text-red-400" :
              ceilingFt < 3000 ? "text-blue-400" : "text-emerald-400"
            }`}>
              {ceilingFt != null ? `${ceilingFt.toLocaleString()} ft` : "Unlimited"}
            </div>
            <div className="text-slate-500 text-xs mt-1">AGL</div>
          </div>

          {/* Cloud layers */}
          <div className="bg-[#040d1a] rounded-xl p-5 border border-white/5">
            <div className="text-slate-500 text-xs uppercase tracking-wider mb-2">Cloud Layers</div>
            <div className="text-white font-bold text-sm leading-relaxed">{layerStr}</div>
          </div>

          {/* Visibility from METAR */}
          <div className="bg-[#040d1a] rounded-xl p-5 border border-white/5">
            <div className="text-slate-500 text-xs uppercase tracking-wider mb-2">Visibility (METAR)</div>
            <div className={`font-black text-2xl ${
              metar.visib == null ? "text-slate-500" :
              metar.visib < 1   ? "text-fuchsia-400" :
              metar.visib < 3   ? "text-red-400" :
              metar.visib < 5   ? "text-blue-400" : "text-emerald-400"
            }`}>
              {metar.visib != null ? `${metar.visib} mi` : "—"}
            </div>
          </div>

        </div>

        {/* Raw METAR */}
        <div className="px-8 pb-6">
          <div className="text-slate-500 text-xs uppercase tracking-wider mb-2">Raw METAR</div>
          <code className="text-slate-400 text-xs font-mono break-all">{metar.rawOb || "—"}</code>
        </div>

        <div className="px-8 pb-6">
          <p className="text-slate-700 text-[10px]">
            Source: KALN (Southwestern Illinois Airport, Cahokia) — ~5 miles from Millstadt. BKN/OVC layers establish the ceiling. CLR/SKC indicates no ceiling. Ceiling and visibility determine flight category.
          </p>
        </div>
      </div>
    </section>
  );
}

function HelicopterFlyabilityCard({ result }: { result: FlyabilityResult }) {
  const flying = result.status === "flying";

  return (
    <section className="wrap mb-20">
      <div className="flex items-center gap-3 mb-6">
        <span className="h-px w-8 bg-[#f0b429]" />
        <span className="text-[#f0b429] text-sm font-black tracking-[0.2em] uppercase">Medical Helicopter Flyability</span>
      </div>

      <div className="rounded-2xl bg-[#071428] border border-white/8 p-8 md:p-10">
        <p className="text-slate-500 text-xs mb-8 leading-relaxed max-w-2xl">
          Weather-based estimate for likely helicopter operations in the Millstadt area.
        </p>

        {/* Status */}
        <div className="flex items-center gap-5 mb-8">
          {flying ? (
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current text-emerald-400">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </div>
          ) : (
            <div className="w-14 h-14 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current text-red-400">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z" />
              </svg>
            </div>
          )}
          <div>
            <div className={`font-black text-2xl tracking-wide ${flying ? "text-emerald-400" : "text-red-400"}`}>
              {result.title}
            </div>
            <p className="text-slate-300 text-sm leading-relaxed mt-1">{result.reason}</p>
          </div>
        </div>

        {/* Minimums (shown only when not flying) */}
        {!flying && result.minimums.length > 0 && (
          <div className="mb-8">
            <div className="text-slate-500 text-xs font-black tracking-[0.15em] uppercase mb-3">Flight Minimums</div>
            <div className="flex flex-wrap gap-2">
              {result.minimums.map((m, i) => (
                <span key={i} className="px-3 py-1.5 rounded-lg bg-red-500/8 border border-red-500/20 text-red-300 text-xs font-medium">
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Detail chips */}
        <div className="flex flex-wrap gap-2 mb-8">
          {result.details.map((d, i) => (
            <span key={i} className="px-3 py-1.5 rounded-lg bg-[#040d1a] border border-white/8 text-slate-400 text-xs font-medium">
              {d}
            </span>
          ))}
        </div>

        {/* Disclaimer */}
        <p className="text-slate-600 text-xs leading-relaxed border-t border-white/5 pt-6">
          {FLYABILITY_DISCLAIMER}
        </p>
      </div>
    </section>
  );
}

export default function WeatherClient() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [expanded, setExpanded] = useState<number | null>(null);

  const fetchAll = async () => {
    try {
      // Step 1: grid info
      const ptRes = await fetch("https://api.weather.gov/points/38.4578,-89.9776", { headers: NWS_HEADERS });
      if (!ptRes.ok) throw new Error("points failed");
      const pt = await ptRes.json();

      const { forecast: forecastUrl, forecastHourly: _fh, observationStations: stnsUrl } = pt.properties;

      // Open-Meteo — real-time model-based conditions, no API key needed
      const OPEN_METEO_URL =
        "https://api.open-meteo.com/v1/forecast" +
        "?latitude=38.4578&longitude=-89.9776" +
        "&current=temperature_2m,apparent_temperature,dewpoint_2m,relative_humidity_2m" +
        ",wind_speed_10m,wind_gusts_10m,wind_direction_10m" +
        ",visibility,surface_pressure,weather_code" +
        "&wind_speed_unit=mph&temperature_unit=fahrenheit&timezone=America/Chicago";

      // Step 2: parallel fetches
      const [forecastRes, alertsRes, openMeteoRes, obsRes, metarRes] = await Promise.all([
        fetch(forecastUrl, { headers: NWS_HEADERS }),
        fetch("https://api.weather.gov/alerts/active?zone=ILC163", { headers: NWS_HEADERS }),
        fetch(OPEN_METEO_URL),
        fetch("https://api.weather.gov/stations/KCPS/observations/latest", { headers: NWS_HEADERS }),
        fetch("/api/metar"),
      ]);

      const [forecastData, alertsData, openMeteoData] = await Promise.all([
        forecastRes.json(),
        alertsRes.json(),
        openMeteoRes.json(),
      ]);

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
      if (obsRes.ok) {
        const obsData = await obsRes.json();
        observation = obsData.properties ?? null;
      }

      // METAR — primary ceiling source
      let metar: MetarData | null = null;
      if (metarRes.ok) {
        const metarArr = await metarRes.json();
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

      setData({
        alerts: alertsData.features ?? [],
        current,
        observation,
        metar,
        periods: forecastData.properties?.periods ?? [],
        fetchedAt: new Date(),
      });
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  if (status === "loading") return (
    <div className="flex flex-col items-center justify-center gap-4 py-40">
      <div className="w-10 h-10 rounded-full border-2 border-[#f0b429] border-t-transparent animate-spin" />
      <span className="text-slate-500 text-sm uppercase tracking-widest">Fetching weather data…</span>
    </div>
  );

  if (status === "error") return (
    <div className="wrap py-20 text-center">
      <p className="text-slate-400 text-lg">Could not load weather data. NWS may be temporarily unavailable.</p>
      <button onClick={fetchAll} className="mt-6 px-8 py-4 bg-[#071428] border border-white/8 hover:border-[#f0b429]/40 text-white rounded-2xl font-bold transition-colors">
        Try Again
      </button>
    </div>
  );

  if (!data) return null;

  const { alerts, current, observation, metar, periods } = data;
  const tempF        = current.tempF         != null ? Math.round(current.tempF)        : null;
  const feelsLikeF   = current.feelsLikeF    != null ? Math.round(current.feelsLikeF)   : null;
  const dewF         = current.dewpointF      != null ? Math.round(current.dewpointF)    : null;
  const windMph      = current.windMph;
  const gustMph      = current.gustMph;
  const visibMiles   = current.visibilityMiles;
  const pressInHg    = current.pressureInHg;
  const humidity     = current.humidity       != null ? Math.round(current.humidity)     : null;
  const windDir      = degToCompass(current.windDeg);
  const condition    = current.wmoCode != null ? wmoDescription(current.wmoCode) : (periods[0]?.shortForecast ?? "—");
  const color        = conditionColor(condition);

  const today = periods.slice(0, 14);

  return (
    <div className="pb-40">

      {/* ── Active Alerts ── */}
      {alerts.length > 0 && (
        <section className="wrap mb-12">
          <div className="space-y-3">
            {alerts.map((a, i) => {
              const c = alertColor(a.properties.severity, a.properties.event);
              return (
                <div key={i} className={`${c.bar} border rounded-2xl px-8 py-5 flex items-start gap-4`}>
                  <span className={`${c.badge} text-white text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-lg shrink-0 mt-0.5`}>
                    {a.properties.event}
                  </span>
                  <span className={`${c.text} text-sm leading-relaxed`}>{a.properties.headline}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Current Conditions ── */}
      <section className="wrap mb-20">
        <div className="flex items-center gap-3 mb-6">
          <span className="h-px w-8 bg-[#f0b429]" />
          <span className="text-[#f0b429] text-sm font-black tracking-[0.2em] uppercase">Current Conditions</span>
          {data.fetchedAt && (
            <span className="text-slate-600 text-xs ml-auto">
              Updated {data.fetchedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </span>
          )}
        </div>

        <div className="rounded-2xl bg-[#071428] border border-white/8 p-8 md:p-12">
          <div className="flex flex-col md:flex-row md:items-center gap-8 md:gap-16">

            {/* Big temp + condition */}
            <div className="flex items-center gap-6 md:gap-8">
              <div className={`${color} shrink-0`}>
                <ConditionIcon desc={condition} size={64} />
              </div>
              <div>
                <div className="text-white font-black leading-none" style={{ fontSize: "clamp(3.5rem,8vw,6rem)" }}>
                  {tempF != null ? `${tempF}°F` : "—"}
                </div>
                <div className="text-slate-300 text-xl font-semibold mt-2">{condition}</div>
                <div className="text-slate-500 text-sm mt-1">Millstadt, Illinois</div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: "Feels Like", value: feelsLikeF != null ? `${feelsLikeF}°F` : "—" },
                { label: "Humidity",   value: humidity != null ? `${humidity}%` : "—" },
                { label: "Wind",       value: windMph != null ? `${windDir} ${windMph} mph${gustMph ? ` (gust ${gustMph})` : ""}` : "—" },
                { label: "Visibility", value: visibMiles != null ? `${visibMiles} mi` : "—" },
                { label: "Pressure",   value: pressInHg != null ? `${pressInHg} inHg` : "—" },
                { label: "Dewpoint",   value: dewF != null ? `${dewF}°F` : "—" },
              ].map((s) => (
                <div key={s.label} className="bg-[#040d1a] rounded-xl p-4 border border-white/5">
                  <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">{s.label}</div>
                  <div className="text-white font-bold text-sm">{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 7-Day Forecast ── */}
      <section className="wrap mb-20">
        <div className="flex items-center gap-3 mb-6">
          <span className="h-px w-8 bg-[#f0b429]" />
          <span className="text-[#f0b429] text-sm font-black tracking-[0.2em] uppercase">7-Day Forecast</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {today.filter((p) => p.isDaytime).map((period, i) => (
            <button
              key={i}
              onClick={() => setExpanded(expanded === i ? null : i)}
              className={`flex flex-col items-center gap-3 p-5 rounded-2xl border text-center transition-all ${
                expanded === i
                  ? "bg-[#0c1e3d] border-[#f0b429]/50"
                  : "bg-[#071428] border-white/8 hover:border-[#f0b429]/25"
              }`}
            >
              <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">{period.name}</div>
              <Image
                src={period.icon}
                alt={period.shortForecast}
                width={48}
                height={48}
                className="rounded-lg"
                unoptimized
              />
              <div className="text-white font-black text-2xl">{period.temperature}°</div>
              <div className="text-slate-400 text-xs leading-snug">{period.shortForecast}</div>
            </button>
          ))}
        </div>

        {/* Expanded detail */}
        {expanded !== null && today.filter((p) => p.isDaytime)[expanded] && (
          <div className="mt-4 p-8 rounded-2xl bg-[#071428] border border-[#f0b429]/20">
            <div className="flex items-start gap-4">
              <Image
                src={today.filter((p) => p.isDaytime)[expanded].icon}
                alt=""
                width={56}
                height={56}
                className="rounded-xl shrink-0"
                unoptimized
              />
              <div>
                <div className="text-[#f0b429] font-black text-lg mb-2">
                  {today.filter((p) => p.isDaytime)[expanded].name}
                </div>
                <p className="text-slate-300 text-base leading-relaxed">
                  {today.filter((p) => p.isDaytime)[expanded].detailedForecast}
                </p>
                <div className="flex gap-6 mt-4 text-sm text-slate-400">
                  <span>Wind: {today.filter((p) => p.isDaytime)[expanded].windSpeed} {today.filter((p) => p.isDaytime)[expanded].windDirection}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Aviation Ceiling ── */}
      <AviationCeilingCard metar={metar} />

      {/* ── Helicopter Flyability ── */}
      <HelicopterFlyabilityCard result={evaluateFlyability({
        visibilityMiles: visibMiles,
        windMph,
        gustMph,
        ceilingFt: getMetarCeilingFt(metar) ?? getCeilingFt(observation?.cloudLayers),
        ceilingDataAvailable: metar != null || observation?.cloudLayers != null,
        conditionText: condition,
        alerts,
        forecastText: periods[0]?.detailedForecast ?? periods[0]?.shortForecast ?? "",
      })} />

      {/* ── Radar Map ── */}
      <section className="wrap">
        <div className="flex items-center gap-3 mb-6">
          <span className="h-px w-8 bg-[#f0b429]" />
          <span className="text-[#f0b429] text-sm font-black tracking-[0.2em] uppercase">Live Radar</span>
          <span className="text-slate-600 text-xs ml-2">NEXRAD via NWS / Iowa State</span>
        </div>

        <div className="rounded-2xl overflow-hidden border border-white/8 shadow-2xl shadow-black/40">
          <RadarMap />
        </div>

        <p className="text-slate-600 text-xs mt-4 text-center">
          Radar refreshes automatically. Centered on Millstadt, Illinois (St. Clair County).
        </p>
      </section>

    </div>
  );
}
