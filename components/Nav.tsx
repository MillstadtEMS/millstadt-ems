"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";

const mainLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "Who We Are" },
  { href: "/weather", label: "Weather" },
  { href: "/fleet", label: "Fleet" },
  { href: "/community-education", label: "Community Education" },
  { href: "/contact", label: "Contact" },
];

const moreLinks = [
  { href: "/leadership", label: "Leadership" },
  { href: "/careers", label: "Careers" },
  { href: "/testimonials", label: "Testimonials" },
  { href: "/gallery", label: "Photo Gallery" },
  { href: "/traffic", label: "Traffic" },
  { href: "/events", label: "Events" },
  { href: "/bulletin", label: "Bulletin Board" },
  { href: "/senior-center", label: "Millstadt Senior Center" },
  { href: "/forms", label: "Forms" },
  { href: "/donate", label: "Donate" },
  { href: "/billing", label: "Make a Payment" },
  { href: "/medical-control", label: "Medical Control" },
  { href: "/movies", label: "EMS in Crisis" },
];

export default function Nav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dispatchFlash, setDispatchFlash] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  useEffect(() => {
    function onNewDispatch() {
      setDispatchFlash(true);
      setTimeout(() => setDispatchFlash(false), 5000);
    }
    window.addEventListener("new-dispatch", onNewDispatch);
    return () => window.removeEventListener("new-dispatch", onNewDispatch);
  }, []);

  return (
    <header className="fixed top-[46px] left-0 right-0 z-50">

      {/* ── Single unified bar: logo | weather ticker | menu ── */}
      <div className="bg-[#020912] border-b border-white/8" style={{ overflow: "visible" }}>
        <div className="wrap flex items-center justify-between gap-4 py-3" style={{ overflow: "visible" }}>

          {/* Logo */}
          <Link href="/" className="shrink-0 group">
            <Image
              src="/images/millstadt-ems/logo.png"
              alt="Millstadt EMS"
              width={140}
              height={60}
              className="h-14 w-auto object-contain group-hover:opacity-80 transition-opacity"
            />
          </Link>

          {/* Weather ticker — centered, fills remaining space */}
          <div className="flex-1 flex items-center justify-center min-w-0" style={{ overflow: "hidden" }}>
            <WeatherTicker />
          </div>

          {/* Ambulance — flashes on new dispatch; opens menu on desktop, decorative on mobile (bottom nav handles menu) */}
          <div className="flex shrink-0 flex-col items-center">
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="relative flex flex-col items-center outline-none focus:outline-none"
              aria-label="Toggle menu"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/millstadt-ems/cartoon-ambo.png"
                alt=""
                className={mobileOpen || dispatchFlash ? "ambo-img-active" : ""}
                style={{ height: "clamp(30px, 4vw, 44px)", width: "auto", display: "block" }}
              />
              <div className="text-center text-[9px] text-slate-300 uppercase tracking-widest font-black mt-0.5">menu</div>
            </button>
          </div>

        </div>
      </div>

      {/* Dropdown menu */}
      <div className={`overflow-hidden transition-all duration-300 ${mobileOpen ? "max-h-[600px]" : "max-h-0"}`}>
        <div className="bg-[#040d1a]/99 backdrop-blur-md border-t border-white/8">
          <div className="wrap py-3">
            {[...mainLinks, null, ...moreLinks].map((link, i) => {
              if (!link) return <div key="divider" className="h-px bg-white/8 my-2" />;
              const isMore = i > mainLinks.length;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    opacity: mobileOpen ? 1 : 0,
                    transform: mobileOpen ? "none" : "translateY(-5px)",
                    transition: mobileOpen
                      ? `opacity 0.2s ease ${i * 30}ms, transform 0.2s ease ${i * 30}ms`
                      : "opacity 0.1s ease, transform 0.1s ease",
                  }}
                  className={`flex items-center px-5 py-3 rounded-xl font-black transition-colors text-lg ${
                    isActive(link.href)
                      ? "text-[#f0b429] bg-[#f0b429]/8"
                      : "text-slate-200 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Mobile bottom tab bar ── */}
      <MobileBottomNav pathname={pathname} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

    </header>
  );
}

/* ── Mobile bottom tab bar ── */

function MobileBottomNav({
  pathname,
  mobileOpen,
  setMobileOpen,
}: {
  pathname: string;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
}) {
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const tabs = [
    {
      href: "/",
      label: "Home",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden>
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
      ),
    },
    {
      href: "/weather",
      label: "Weather",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden>
          <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
        </svg>
      ),
    },
    {
      href: "/traffic",
      label: "Traffic",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden>
          <path d="M20 10c0-4.42-3.58-8-8-8s-8 3.58-8 8c0 3.54 2.29 6.53 5.47 7.59L12 22l2.53-4.41C17.71 16.53 20 13.54 20 10zm-8 3c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
        </svg>
      ),
    },
    {
      href: "/donate",
      label: "Donate",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden>
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="bg-[#020912]/95 backdrop-blur-md border-t border-white/8">
        <div className="flex items-stretch" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={() => setMobileOpen(false)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors ${
                isActive(tab.href) ? "text-[#f0b429]" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab.icon}
              <span className="text-[10px] font-bold uppercase tracking-widest leading-none">{tab.label}</span>
            </Link>
          ))}
          {/* More / Menu */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors ${
              mobileOpen ? "text-[#f0b429]" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden>
              <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-widest leading-none">More</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Inline weather ticker ── */

interface NWSAlert {
  properties: {
    event: string;
    headline: string;
    description: string;
    severity: string;
  };
}

function getAlertLevel(event: string, severity: string, headline = "", description = ""): "red" | "yellow" | "green" {
  const e = event.toLowerCase();
  const h = (headline + " " + description).toLowerCase();
  // Tornado Emergency and PDS are still labeled as Watch/Warning by NWS —
  // the distinction is in the headline or description text.
  if (e.includes("warning") && (h.includes("tornado emergency"))) return "red";
  if (e.includes("warning")) return "red";
  if (e.includes("watch") || e.includes("advisory")) return "yellow";
  if (severity === "Extreme" || severity === "Severe") return "red";
  if (severity === "Moderate") return "yellow";
  return "green";
}

interface ProcessedAlert {
  text: string;
  level: "red" | "yellow" | "green";
}

function WeatherTicker() {
  const [alerts, setAlerts]       = useState<ProcessedAlert[]>([]);
  const [idx, setIdx]             = useState(0);

  // Cycle through multiple alerts every 5 seconds
  useEffect(() => {
    if (alerts.length <= 1) return;
    const id = setInterval(() => setIdx(i => (i + 1) % alerts.length), 5000);
    return () => clearInterval(id);
  }, [alerts.length]);

  useEffect(() => {
    function processAlerts(raw: NWSAlert[]): ProcessedAlert[] {
      if (raw.length === 0) {
        return [{ text: "NO ACTIVE WEATHER ALERTS — MILLSTADT, ILLINOIS", level: "green" }];
      }
      return raw.map(a => {
        const h = (a.properties.headline + " " + (a.properties.description ?? "")).toLowerCase();
        const e = a.properties.event.toLowerCase();
        const level = getAlertLevel(a.properties.event, a.properties.severity, a.properties.headline, a.properties.description);
        let label = a.properties.event.toUpperCase();
        if (e.includes("warning") && h.includes("tornado emergency")) label = "⚠ TORNADO EMERGENCY";
        else if (e.includes("watch") && (h.includes("particularly dangerous situation") || h.includes("pds"))) label = "⚠ PDS TORNADO WATCH";
        const text = `${label} — ${a.properties.headline.toUpperCase()}`;
        return { text, level };
      });
    }

    async function fetchAlerts() {
      try {
        const res  = await fetch("https://api.weather.gov/alerts/active?zone=ILC163", {
          headers: { "User-Agent": "(millstadtems.org, millstadtems@gmail.com)", Accept: "application/geo+json" },
        });
        const data = await res.json();
        setAlerts(processAlerts(data.features ?? []));
        setIdx(0);
      } catch {
        setAlerts([{ text: "NO ACTIVE WEATHER ALERTS — MILLSTADT, ILLINOIS", level: "green" }]);
      }
    }

    fetchAlerts();
    const id = setInterval(fetchAlerts, 5 * 60 * 1000);

    const MOCK_ALERTS: Record<string, NWSAlert[]> = {
      thunderstorm_watch:   [{ properties: { event: "Severe Thunderstorm Watch",   headline: "Severe Thunderstorm Watch issued for St. Clair County until 10:00 PM CDT.", description: "", severity: "Moderate" } }],
      thunderstorm_warning: [{ properties: { event: "Severe Thunderstorm Warning", headline: "Severe Thunderstorm Warning issued for St. Clair County.", description: "", severity: "Severe" } }],
      tornado_watch:        [{ properties: { event: "Tornado Watch",               headline: "Tornado Watch issued for St. Clair County until midnight CDT.", description: "", severity: "Severe" } }],
      tornado_pds_watch:    [{ properties: { event: "Tornado Watch",               headline: "Particularly Dangerous Situation — Tornado Watch for St. Clair County.", description: "THIS IS A PARTICULARLY DANGEROUS SITUATION", severity: "Extreme" } }],
      tornado_warning:      [{ properties: { event: "Tornado Warning",             headline: "Tornado Warning issued for St. Clair County. TAKE SHELTER IMMEDIATELY.", description: "", severity: "Extreme" } }],
      tornado_emergency:    [{ properties: { event: "Tornado Warning",             headline: "Tornado Emergency for Millstadt. CONFIRMED LARGE TORNADO. SEEK SHELTER NOW.", description: "THIS IS A TORNADO EMERGENCY", severity: "Extreme" } }],
      multi:                [
        { properties: { event: "Tornado Warning", headline: "Tornado Warning for St. Clair County.", description: "", severity: "Extreme" } },
        { properties: { event: "Severe Thunderstorm Warning", headline: "Severe Thunderstorm Warning until 9:00 PM.", description: "", severity: "Severe" } },
      ],
      clear: [],
    };
    function handleTest(e: Event) {
      const scenario = (e as CustomEvent<string>).detail;
      const processed = processAlerts(MOCK_ALERTS[scenario] ?? []);
      setAlerts(processed);
      setIdx(0);
    }
    window.addEventListener("weather-test-scenario", handleTest);
    return () => { clearInterval(id); window.removeEventListener("weather-test-scenario", handleTest); };
  }, []);

  const current  = alerts[idx] ?? { text: "NO ACTIVE WEATHER ALERTS — MILLSTADT, ILLINOIS", level: "green" as const };
  const color    = current.level === "red" ? "#f87171" : current.level === "yellow" ? "#facc15" : "#34d399";
  const pulseKey = current.level; // changing key resets animation when level changes

  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: "0 1rem" }}>
      <span
        key={pulseKey}
        className="text-[10px] sm:text-[14px]"
        style={{
          color,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          overflow: "hidden",
          maxWidth: "100%",
          animation: `weather-pulse-${current.level} 2.5s ease-in-out infinite`,
        }}
      >
        {current.text}
      </span>
    </div>
  );
}
