"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";

const mainLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "Who We Are" },
  { href: "/fleet", label: "Fleet" },
  { href: "/community-education", label: "Community" },
  { href: "/contact", label: "Contact" },
];

const moreLinks = [
  { href: "/careers", label: "Careers" },
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
    <header className="fixed top-0 left-0 right-0 z-50">

      {/* ── Single unified bar: logo | weather ticker | menu ── */}
      <div className="bg-[#020912] border-b border-white/8">
        <div className="wrap flex items-center justify-between gap-4 py-2">

          {/* Logo */}
          <Link href="/" className="shrink-0 group">
            <Image
              src="/images/millstadt-ems/logo.png"
              alt="Millstadt EMS"
              width={180}
              height={80}
              className="h-20 w-auto object-contain group-hover:opacity-80 transition-opacity"
            />
          </Link>

          {/* Weather ticker — centered, fills remaining space */}
          <div className="flex-1 overflow-hidden flex items-center justify-center min-w-0">
            <WeatherTicker />
          </div>

          {/* Ambulance menu button */}
          <div className="shrink-0 flex flex-col items-center">
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="relative flex flex-col items-center outline-none focus:outline-none"
              aria-label="Toggle menu"
            >
              {/* Ambulance — top half black, bottom half yellow, lights flash on open */}
              <div
                className={mobileOpen ? "ambo-img-active" : ""}
                style={{ position: "relative", width: "72px" }}
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
              <div className="text-center text-xs text-slate-300 uppercase tracking-widest font-black mt-1">menu</div>
            </button>
          </div>

        </div>
      </div>

      {/* Dropdown menu */}
      <div className={`overflow-hidden transition-all duration-300 ${mobileOpen ? "max-h-[900px]" : "max-h-0"}`}>
        <div className="bg-[#040d1a]/99 backdrop-blur-md border-t border-white/8">
        <div className="wrap flex flex-col gap-2 py-4">
          {mainLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`px-6 py-5 rounded-xl text-xl font-black transition-colors ${
                isActive(link.href)
                  ? "text-[#f0b429] bg-[#f0b429]/8"
                  : "text-slate-200 hover:text-white hover:bg-white/5"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="h-px bg-white/8 my-2" />
          {moreLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="px-6 py-5 rounded-xl text-xl font-black text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
        </div>
      </div>

    </header>
  );
}

/* ── Inline weather ticker ── */

interface NWSAlert {
  properties: {
    event: string;
    headline: string;
    severity: string;
  };
}

function getAlertLevel(event: string, severity: string): "red" | "yellow" | "green" {
  const e = event.toLowerCase();
  if (e.includes("warning") || severity === "Extreme" || severity === "Severe") return "red";
  if (e.includes("watch") || e.includes("advisory") || severity === "Moderate") return "yellow";
  return "green";
}

function WeatherTicker() {
  const span1 = useRef<HTMLSpanElement>(null);
  const span2 = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    function update(alerts: NWSAlert[]) {
      let text: string;
      let color: string;

      if (alerts.length === 0) {
        text = "NO ACTIVE WEATHER ALERTS FOR MILLSTADT, ILLINOIS";
        color = "#34d399";
      } else {
        const top = alerts.reduce<"red" | "yellow" | "green">((acc, a) => {
          const lvl = getAlertLevel(a.properties.event, a.properties.severity);
          if (lvl === "red") return "red";
          if (lvl === "yellow" && acc !== "red") return "yellow";
          return acc;
        }, "green");
        color = top === "red" ? "#f87171" : top === "yellow" ? "#facc15" : "#34d399";
        text = alerts.map((a) =>
          `${a.properties.event.toUpperCase()} \u2014 ${a.properties.headline.toUpperCase()}`
        ).join("     \u00b7     ");
      }

      // pad end so the loop gap is invisible
      const padded = text + "\u00a0".repeat(20);
      [span1, span2].forEach((ref) => {
        if (ref.current) {
          ref.current.textContent = padded;
          ref.current.style.color = color;
        }
      });
    }

    async function fetchAlerts() {
      try {
        const res = await fetch("https://api.weather.gov/alerts/active?zone=ILC163", {
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
    return () => clearInterval(id);
  }, []);

  const spanStyle: React.CSSProperties = {
    color: "#34d399",
    fontSize: "1.25rem",
    fontWeight: 700,
    whiteSpace: "nowrap",
    textTransform: "uppercase",
  };

  return (
    <div style={{ overflow: "hidden", width: "100%" }}>
      <div className="ticker-scroll">
        <span ref={span1} style={spanStyle}>
          NO ACTIVE WEATHER ALERTS FOR MILLSTADT, ILLINOIS&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        </span>
        <span ref={span2} aria-hidden style={spanStyle}>
          NO ACTIVE WEATHER ALERTS FOR MILLSTADT, ILLINOIS&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        </span>
      </div>
    </div>
  );
}
