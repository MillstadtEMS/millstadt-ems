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
  { href: "/community-education", label: "Community" },
  { href: "/contact", label: "Contact" },
];

const moreLinks = [
  { href: "/leadership", label: "Leadership" },
  { href: "/careers", label: "Careers" },
  { href: "/testimonials", label: "Testimonials" },
  { href: "/gallery", label: "Photo Gallery" },
  { href: "/traffic", label: "Traffic" },
  { href: "/events", label: "Events" },
  { href: "/forms", label: "Forms" },
  { href: "/donate", label: "Donate" },
  { href: "/billing", label: "Make a Payment" },
  { href: "/medical-control", label: "Medical Control" },
  { href: "/movies", label: "EMS in Crisis" },
];

export default function Nav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="fixed top-10 left-0 right-0 z-50">

      {/* ── Single unified bar: logo | weather ticker | menu ── */}
      <div className="bg-[#020912] border-b border-white/8">
        <div className="wrap flex items-center justify-between gap-4 py-1">

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
          <div className="flex-1 overflow-hidden flex items-center justify-center min-w-0">
            <WeatherTicker />
          </div>

          {/* Ambulance menu button — desktop only */}
          <div className="hidden md:flex shrink-0 flex-col items-center">
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="relative flex flex-col items-center outline-none focus:outline-none"
              aria-label="Toggle menu"
            >
              {/* Ambulance — top half black, bottom half yellow, lights flash on open */}
              <div
                className={mobileOpen ? "ambo-img-active" : ""}
                style={{ position: "relative", width: "52px" }}
              >
                {/* invisible spacer sets container height */}
                <img src="/images/millstadt-ems/ambo-56-nobg.png" alt="" style={{ width: "100%", display: "block", visibility: "hidden" }} />
                {/* TOP HALF — black */}
                <img
                  src="/images/millstadt-ems/ambo-56-nobg.png"
                  alt=""
                  style={{
                    position: "absolute", top: 0, left: 0, width: "100%", display: "block",
                    clipPath: "inset(0 0 50% 0)",
                    filter: "grayscale(1) contrast(3) brightness(0.2)",
                  }}
                />
                {/* BOTTOM HALF — clean yellow, no red: grayscale first then recolour */}
                <img
                  src="/images/millstadt-ems/ambo-56-nobg.png"
                  alt=""
                  style={{
                    position: "absolute", top: 0, left: 0, width: "100%", display: "block",
                    clipPath: "inset(50% 0 0 0)",
                    filter: "grayscale(1) sepia(1) hue-rotate(10deg) saturate(12) contrast(1.3) brightness(1.1)",
                  }}
                />
              </div>
              <div className="text-center text-[10px] text-slate-300 uppercase tracking-widest font-black mt-0.5">menu</div>
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

function WeatherTicker() {
  const trackRef  = useRef<HTMLDivElement>(null);
  const posRef    = useRef(0);
  const rafRef    = useRef<number>(0);
  const colorRef  = useRef("#34d399");
  const textRef   = useRef("NO ACTIVE WEATHER ALERTS FOR MILLSTADT, ILLINOIS");

  // JS-driven animation — never resets on content updates
  useEffect(() => {
    function animate() {
      const track = trackRef.current;
      if (!track) { rafRef.current = requestAnimationFrame(animate); return; }
      const halfW = track.scrollWidth / 2;
      if (halfW <= 0)  { rafRef.current = requestAnimationFrame(animate); return; }
      posRef.current -= 0.6; // px per frame (~36px/s at 60fps)
      if (posRef.current <= -halfW) posRef.current = 0;
      track.style.transform = `translateX(${posRef.current}px)`;
      rafRef.current = requestAnimationFrame(animate);
    }
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  function applyUpdate(text: string, color: string) {
    textRef.current  = text;
    colorRef.current = color;
    const padded = text + "\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0";
    const track = trackRef.current;
    if (!track) return;
    track.querySelectorAll("span").forEach((s) => {
      s.textContent = padded;
      (s as HTMLElement).style.color = color;
    });
  }

  useEffect(() => {
    function update(alerts: NWSAlert[]) {
      let text: string;
      let color: string;
      if (alerts.length === 0) {
        text  = "NO ACTIVE WEATHER ALERTS FOR MILLSTADT, ILLINOIS";
        color = "#34d399";
      } else {
        const top = alerts.reduce<"red" | "yellow" | "green">((acc, a) => {
          const lvl = getAlertLevel(a.properties.event, a.properties.severity, a.properties.headline, a.properties.description);
          if (lvl === "red") return "red";
          if (lvl === "yellow" && acc !== "red") return "yellow";
          return acc;
        }, "green");
        color = top === "red" ? "#f87171" : top === "yellow" ? "#facc15" : "#34d399";
        text  = alerts.map((a) => {
          const h = (a.properties.headline + " " + (a.properties.description ?? "")).toLowerCase();
          const e = a.properties.event.toLowerCase();
          let label = a.properties.event.toUpperCase();
          if (e.includes("warning") && h.includes("tornado emergency")) label = "⚠ TORNADO EMERGENCY";
          else if (e.includes("watch") && (h.includes("particularly dangerous situation") || h.includes("pds"))) label = "⚠ PDS TORNADO WATCH";
          return `${label} \u2014 ${a.properties.headline.toUpperCase()}`;
        }).join("     \u00b7     ");
      }
      applyUpdate(text, color);
    }

    async function fetchAlerts() {
      try {
        const res  = await fetch("https://api.weather.gov/alerts/active?zone=ILC163", {
          headers: { "User-Agent": "(millstadtems.org, millstadtems@gmail.com)", Accept: "application/geo+json" },
        });
        const data = await res.json();
        update(data.features ?? []);
      } catch {
        update([]);
      }
    }

    fetchAlerts();
    const id = setInterval(fetchAlerts, 5 * 60 * 1000);

    const MOCK_ALERTS: Record<string, { event: string; headline: string; description: string; severity: string }[]> = {
      thunderstorm_watch:   [{ event: "Severe Thunderstorm Watch",   headline: "Severe Thunderstorm Watch issued for St. Clair County until 10:00 PM CDT.",          description: "", severity: "Moderate" }],
      thunderstorm_warning: [{ event: "Severe Thunderstorm Warning", headline: "Severe Thunderstorm Warning issued for St. Clair County.",                            description: "", severity: "Severe"  }],
      tornado_watch:        [{ event: "Tornado Watch",               headline: "Tornado Watch issued for St. Clair County until midnight CDT.",                       description: "", severity: "Severe"  }],
      tornado_pds_watch:    [{ event: "Tornado Watch",               headline: "Particularly Dangerous Situation — Tornado Watch for St. Clair County.",              description: "THIS IS A PARTICULARLY DANGEROUS SITUATION", severity: "Extreme" }],
      tornado_warning:      [{ event: "Tornado Warning",             headline: "Tornado Warning issued for St. Clair County. TAKE SHELTER IMMEDIATELY.",              description: "", severity: "Extreme" }],
      tornado_emergency:    [{ event: "Tornado Warning",             headline: "Tornado Emergency for Millstadt. CONFIRMED LARGE TORNADO. SEEK SHELTER NOW.",         description: "THIS IS A TORNADO EMERGENCY", severity: "Extreme" }],
      clear:                [],
    };
    function handleTest(e: Event) {
      const scenario = (e as CustomEvent<string>).detail;
      update((MOCK_ALERTS[scenario] ?? []).map((a) => ({ properties: a })));
    }
    window.addEventListener("weather-test-scenario", handleTest);
    return () => { clearInterval(id); window.removeEventListener("weather-test-scenario", handleTest); };
  }, []);

  const spanStyle: React.CSSProperties = {
    color: "#34d399",
    fontSize: "0.82rem",
    fontWeight: 700,
    whiteSpace: "nowrap",
    textTransform: "uppercase",
    paddingRight: "0",
  };

  const padded = textRef.current + "\u00a0".repeat(20);

  return (
    <div style={{ overflow: "hidden", width: "100%" }}>
      <div ref={trackRef} style={{ display: "flex", willChange: "transform" }}>
        <span style={spanStyle}>{padded}</span>
        <span style={spanStyle} aria-hidden>{padded}</span>
      </div>
    </div>
  );
}
