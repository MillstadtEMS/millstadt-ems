"use client";

import { useEffect, useState } from "react";

interface NWSAlert {
  id: string;
  properties: {
    event: string;
    headline: string;
    severity: "Extreme" | "Severe" | "Moderate" | "Minor" | "Unknown";
    urgency: string;
    effective: string;
    expires: string;
    areaDesc: string;
  };
}

const NWS_ZONE = "ILC163";
const REFRESH_MS = 5 * 60 * 1000;

function getColorLevel(event: string, severity: string): "red" | "yellow" | "blue" {
  const lower = event.toLowerCase();
  if (lower.includes("warning") || severity === "Extreme" || severity === "Severe") return "red";
  if (lower.includes("watch") || severity === "Moderate") return "yellow";
  return "blue";
}

function alertStyles(level: "red" | "yellow" | "blue") {
  switch (level) {
    case "red":
      return {
        bar: "bg-red-950 border-red-800/60",
        badge: "bg-red-700 text-white",
        text: "text-red-200",
        countText: "text-red-300",
        dot: "bg-red-400",
        label: "WARNING",
      };
    case "yellow":
      return {
        bar: "bg-yellow-950 border-yellow-700/50",
        badge: "bg-yellow-600 text-white",
        text: "text-yellow-200",
        countText: "text-yellow-300",
        dot: "bg-yellow-400",
        label: "WATCH",
      };
    default:
      return {
        bar: "bg-[#071428] border-[#2563eb]/25",
        badge: "bg-[#1d4ed8] text-white",
        text: "text-blue-200",
        countText: "text-blue-300",
        dot: "bg-blue-400",
        label: "ALERT",
      };
  }
}

function AlertIcon({ event }: { event: string }) {
  const lower = event.toLowerCase();

  if (lower.includes("tornado")) {
    // Tornado funnel shape
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0" aria-hidden>
        <path d="M6 4h12v2H6zm2 4h8v2H8zm2 4h4v2h-4zm1 4h2v2h-2zm.5 4h1v2h-1z" />
      </svg>
    );
  }

  if (lower.includes("thunderstorm") || lower.includes("lightning") || lower.includes("thunder")) {
    // Cloud with lightning bolt
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0" aria-hidden>
        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM13 17l-4 5v-4H7l4-5v4h2z" />
      </svg>
    );
  }

  if (lower.includes("flood")) {
    // Water waves
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0" aria-hidden>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V8h2v4zm4 4h-2v-2h2v2zm0-4h-2V8h2v4z" />
      </svg>
    );
  }

  // Generic warning triangle
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0" aria-hidden>
      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
    </svg>
  );
}

export default function WeatherAlertBar() {
  const [alerts, setAlerts] = useState<NWSAlert[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  const fetchAlerts = async () => {
    try {
      const res = await fetch(
        `https://api.weather.gov/alerts/active?zone=${NWS_ZONE}`,
        {
          headers: {
            "User-Agent": "(millstadtems.org, millstadtems@gmail.com)",
            Accept: "application/geo+json",
          },
          next: { revalidate: 0 },
        }
      );
      if (!res.ok) throw new Error("NWS fetch failed");
      const data = await res.json();
      setAlerts(data.features ?? []);
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    fetchAlerts();
    const id = setInterval(fetchAlerts, REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  /* ── No active alerts ── */
  if (status !== "loading" && alerts.length === 0) {
    return (
      <div className="bg-[#020912] border-b border-white/5 h-14 flex items-center justify-center gap-3">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
        <span className="text-slate-300 text-sm font-semibold uppercase tracking-[0.18em]">
          No active weather alerts for the Millstadt area
        </span>
      </div>
    );
  }

  /* ── Alerts present ── */
  const topAlert = alerts[0];
  const topEvent = topAlert?.properties?.event ?? "";
  const topSeverity = topAlert?.properties?.severity ?? "Minor";
  const level = getColorLevel(topEvent, topSeverity);
  const styles = alertStyles(level);

  const tickerText = alerts
    .map((a) => `${a.properties.event.toUpperCase()}  —  ${a.properties.headline}`)
    .join("          ·          ");

  return (
    <div className={`${styles.bar} border-b h-14 flex items-center overflow-hidden`}>
      {/* Left badge */}
      <div className={`${styles.badge} shrink-0 h-full flex items-center gap-2 px-5 font-black text-[11px] tracking-[0.2em] uppercase`}>
        <AlertIcon event={topEvent} />
        <span className="hidden sm:inline">{styles.label}</span>
      </div>

      {/* Vertical divider */}
      <div className="w-px h-full bg-white/10 shrink-0" />

      {/* Scrolling ticker */}
      <div className="flex-1 overflow-hidden h-full flex items-center">
        <div className="ticker-scroll flex items-center gap-0">
          <span className={`${styles.text} text-sm font-semibold whitespace-nowrap px-10`}>
            {tickerText}
          </span>
          <span className={`${styles.text} text-sm font-semibold whitespace-nowrap px-10`} aria-hidden>
            {tickerText}
          </span>
        </div>
      </div>

      {/* Right: count pill */}
      <div className="shrink-0 h-full flex items-center gap-2 px-5 border-l border-white/10">
        <span className={`w-2 h-2 rounded-full ${styles.dot} animate-pulse`} />
        <span className={`${styles.countText} text-[11px] font-bold`}>
          {alerts.length}&nbsp;Alert{alerts.length !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
