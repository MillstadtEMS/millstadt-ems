"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronRight, X } from "lucide-react";

// ── Menu structure ──────────────────────────────────────────────────────────

const MENU_GROUPS = [
  {
    heading: "About Us",
    description: "Our agency, people, capabilities, and service.",
    color: "text-blue-400",
    links: [
      { href: "/about",               label: "Who We Are" },
      { href: "/statistics",          label: "Call Statistics" },
      { href: "/leadership",          label: "Leadership" },
      { href: "/fleet",               label: "Our Fleet" },
      { href: "/medical-control",     label: "Medical Control" },
      { href: "/community-education", label: "Community Education" },
      { href: "/ecg-challenge",        label: "ECG Challenge" },
      { href: "/testimonials",        label: "Testimonials" },
      { href: "/careers",             label: "Careers" },
      { href: "/gallery",             label: "Photo Gallery" },
    ],
  },
  {
    heading: "What's Happening",
    description: "Community programs, events, news, and notices.",
    color: "text-[#f0b429]",
    links: [
      { href: "/community/today", label: "Today Around Millstadt" },
      { href: "/events",          label: "Events Calendar" },
      { href: "/kids-club",        label: "Kids Club" },
      { href: "/kids-club/games",  label: "Kids Club Games" },
      { href: "/senior-center",   label: "Senior Center" },
      { href: "/commercial-club", label: "Commercial Club" },
      { href: "/bulletin",        label: "Bulletin Board" },
      { href: "/news",            label: "Millstadt News" },
    ],
  },
  {
    heading: "Help & Resources",
    description: "Billing, forms, public information, and local resources.",
    color: "text-purple-400",
    links: [
      { href: "/weather",  label: "Weather" },
      { href: "/traffic",  label: "Traffic" },
      { href: "/donate",   label: "Donate" },
      { href: "/billing",  label: "Pay My Bill" },
      { href: "/financials-information-hub", label: "Financial Information" },
      { href: "/forms",    label: "Forms" },
      { href: "/links",    label: "Important Links" },
      { href: "/movies",   label: "EMS in Crisis" },
      { href: "/contact",  label: "Contact Us" },
    ],
  },
];

function routeMatches(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function linksForMenuGroup(heading: string, showBoardMinutes: boolean) {
  const group = MENU_GROUPS.find(item => item.heading === heading) ?? MENU_GROUPS[0];
  return group.heading === "What's Happening" && showBoardMinutes
    ? [...group.links, { href: "/board-minutes", label: "Board Minutes" }]
    : group.links;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen]               = useState(false);
  const [activeGroup, setActiveGroup] = useState(MENU_GROUPS[0].heading);
  const [expandedMobileGroup, setExpandedMobileGroup] = useState<string | null>(MENU_GROUPS[0].heading);
  const [dispatchFlash, setDispatchFlash] = useState(false);
  const [showBoardMinutes, setShowBoardMinutes] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const activeHref = MENU_GROUPS
    .flatMap((group) => linksForMenuGroup(group.heading, showBoardMinutes))
    .filter((link) => routeMatches(pathname, link.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const isActive = (href: string) => activeHref === href;

  useEffect(() => {
    function onNewDispatch() {
      setDispatchFlash(true);
      setTimeout(() => setDispatchFlash(false), 5000);
    }
    window.addEventListener("new-dispatch", onNewDispatch);
    return () => window.removeEventListener("new-dispatch", onNewDispatch);
  }, []);

  // Close on route change
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setOpen(false);
      const currentGroup = MENU_GROUPS.find(group =>
        linksForMenuGroup(group.heading, showBoardMinutes).some(link => routeMatches(pathname, link.href)),
      );
      if (currentGroup) {
        setActiveGroup(currentGroup.heading);
        setExpandedMobileGroup(currentGroup.heading);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, showBoardMinutes]);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      menuButtonRef.current?.focus();
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    let alive = true;
    fetch("/api/public/board-minutes/has-published", { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (alive) setShowBoardMinutes(data?.hasMinutes === true); })
      .catch(() => { if (alive) setShowBoardMinutes(false); });
    return () => { alive = false; };
  }, []);

  const selectedGroup = MENU_GROUPS.find(group => group.heading === activeGroup) ?? MENU_GROUPS[0];

  function toggleMenu() {
    if (!open) {
      const currentGroup = MENU_GROUPS.find(group =>
        linksForMenuGroup(group.heading, showBoardMinutes).some(link =>
          routeMatches(pathname, link.href),
        ),
      );
      if (currentGroup) {
        setActiveGroup(currentGroup.heading);
        setExpandedMobileGroup(currentGroup.heading);
      }
    }
    setOpen(current => !current);
  }

  return (
    <header ref={navRef} className="mems-site-nav fixed top-[46px] left-0 right-0 z-50">

      {/* ── Nav bar ── */}
      <div className="mems-nav-bar bg-[#020912] border-b border-white/8" style={{ overflow: "visible" }}>
        <div className="wrap flex items-center gap-4 py-3" style={{ overflow: "visible" }}>

          {/* Left group (flex-1) — balances the right group so the weather
              ticker in the middle sits at the TRUE center of the bar. */}
          <div className="flex-1 flex items-center justify-start min-w-0">
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
          </div>

          {/* Center group (flex-1) — weather ticker. Wrapper must NOT clip;
              the hover popup drops below the bar. Truncation handled inside. */}
          <div className="flex-1 flex items-center justify-center min-w-0">
            <WeatherTicker />
          </div>

          {/* Right group (flex-1) — mirrors the left group's width. */}
          <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
          {/* Employee Lounge button (left of menu) */}
          <Link
            href="/lounge"
            aria-label="Employee Lounge"
            className="lounge-hover-expand shrink-0 flex flex-col items-center group relative"
            style={{ marginRight: 6 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/lounge/lounge-button.png"
              alt=""
              className="lounge-hover-expand-img"
              style={{ height: "clamp(36px, 4.6vw, 52px)", width: "auto", display: "block", transition: "transform 0.22s cubic-bezier(0.22,1.2,0.36,1), filter 0.22s" }}
            />
            <div className="text-[9px] text-[#f0b429] uppercase tracking-widest font-black mt-0.5">Lounge</div>
          </Link>

          {/* Ambulance menu button */}
          <div className="flex shrink-0 flex-col items-center">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={toggleMenu}
              className="ambo-menu-btn relative flex flex-col items-center outline-none"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="site-navigation-panel"
            >
              {/* Lights animate while the menu is open or a dispatch flashes.
                  Desktop hover glow is CSS-only (.ambo-menu-btn:hover under
                  @media hover:hover) so they can't stick on after a touch. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/millstadt-ems/cartoon-ambo.png"
                alt=""
                className={`ambo-menu-img ${open || dispatchFlash ? "ambo-img-active" : ""}`}
                style={{ height: "clamp(30px, 4vw, 44px)", width: "auto", display: "block" }}
              />
              <div className="text-[9px] text-slate-300 uppercase tracking-widest font-black mt-0.5">menu</div>
            </button>
          </div>
          </div>

        </div>
      </div>

      {/* ── Dropdown menu ── */}
      <div className={`overflow-hidden transition-all duration-300 ${open ? "max-h-[90vh]" : "max-h-0"}`}>
        <nav
          id="site-navigation-panel"
          aria-label="Primary navigation"
          className="mems-nav-panel bg-[#030c1a]/99 backdrop-blur-md border-b border-white/8 overflow-y-auto"
          style={{ maxHeight: "80vh" }}
        >
          <div className="wrap py-4 md:py-5">
            {/* Desktop: compact vertical category rail with one visible group. */}
            <div className="mx-auto hidden max-w-[980px] overflow-hidden rounded-lg border border-white/10 bg-[#061120] shadow-[0_24px_70px_rgba(0,0,0,0.48)] md:grid md:grid-cols-[260px_minmax(0,1fr)]">
              <div className="border-r border-white/10 bg-[#020912] p-3">
                <div className="mb-3 flex items-center justify-between px-2 py-1">
                  <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Explore</span>
                </div>
                <div className="grid gap-2">
                  {MENU_GROUPS.map(group => {
                    const selected = group.heading === activeGroup;
                    return (
                      <button
                        key={group.heading}
                        type="button"
                        onClick={() => setActiveGroup(group.heading)}
                        aria-expanded={selected}
                        aria-controls="desktop-navigation-links"
                        className={`group min-h-[72px] w-full rounded-md border px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0b429] ${
                          selected
                            ? "border-[#f0b429]/35 bg-[#f0b429]/10 text-white"
                            : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <span className="flex items-center justify-between gap-3 text-[17px] font-extrabold">
                          {group.heading}
                          <ChevronRight aria-hidden size={18} className={selected ? "text-[#f0b429]" : "text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-300"} />
                        </span>
                        <span className="mt-1 block text-[13px] leading-5 text-slate-500 group-hover:text-slate-400">
                          {group.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div id="desktop-navigation-links" className="min-w-0 p-6 lg:p-7">
                <div className="mb-5 flex items-start justify-between gap-5 border-b border-white/8 pb-4">
                  <div>
                    <div className={`text-xs font-black uppercase tracking-[0.18em] ${selectedGroup.color}`}>Directory</div>
                    <h2 className="mt-1 text-2xl font-black text-white">{selectedGroup.heading}</h2>
                    <p className="mt-1 text-[15px] leading-6 text-slate-400">{selectedGroup.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      menuButtonRef.current?.focus();
                    }}
                    aria-label="Close menu"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-white/10 text-slate-400 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0b429]"
                  >
                    <X aria-hidden size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {linksForMenuGroup(selectedGroup.heading, showBoardMinutes).map(link => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      aria-current={isActive(link.href) ? "page" : undefined}
                      className={`group flex min-h-12 items-center justify-between gap-3 rounded-md border px-4 py-3 text-[17px] font-bold leading-6 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0b429] ${
                        isActive(link.href)
                          ? "border-[#f0b429]/30 bg-[#f0b429]/10 text-[#f0b429]"
                          : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span>{link.label}</span>
                      <ChevronRight aria-hidden size={17} className="shrink-0 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-[#f0b429]" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile/tablet: the same categories become one-open-at-a-time accordions. */}
            <div className="mx-auto max-w-xl overflow-hidden rounded-lg border border-white/10 bg-[#061120] shadow-[0_20px_55px_rgba(0,0,0,0.48)] md:hidden">
              <div className="flex items-center justify-between border-b border-white/10 bg-[#020912] px-4 py-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f0b429]">Navigation</div>
                  <div className="text-lg font-black text-white">Explore Millstadt EMS</div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="grid h-11 w-11 place-items-center rounded-md border border-white/10 text-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0b429]"
                >
                  <X aria-hidden size={20} />
                </button>
              </div>

              {MENU_GROUPS.map(group => {
                const selected = group.heading === expandedMobileGroup;
                return (
                  <div key={group.heading} className="border-b border-white/8 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setExpandedMobileGroup(current => current === group.heading ? null : group.heading)}
                      aria-expanded={selected}
                      aria-controls={`mobile-navigation-${group.heading.replace(/[^a-z]+/gi, "-").toLowerCase()}`}
                      className={`flex min-h-14 w-full items-center justify-between gap-4 px-4 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#f0b429] ${selected ? "bg-white/5 text-white" : "text-slate-300"}`}
                    >
                      <span>
                        <span className="block text-[17px] font-extrabold">{group.heading}</span>
                        <span className="mt-0.5 block text-[13px] leading-5 text-slate-500">{group.description}</span>
                      </span>
                      <ChevronDown aria-hidden size={19} className={`shrink-0 transition-transform ${selected ? "rotate-180 text-[#f0b429]" : "text-slate-500"}`} />
                    </button>
                    {selected ? (
                      <div
                        id={`mobile-navigation-${group.heading.replace(/[^a-z]+/gi, "-").toLowerCase()}`}
                        className="grid gap-1 bg-[#020912]/55 px-3 py-3"
                      >
                        {linksForMenuGroup(group.heading, showBoardMinutes).map(link => (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setOpen(false)}
                            aria-current={isActive(link.href) ? "page" : undefined}
                            className={`flex min-h-12 items-center justify-between gap-3 rounded-md px-3 py-2.5 text-[16px] font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0b429] ${
                              isActive(link.href) ? "bg-[#f0b429]/10 text-[#f0b429]" : "text-slate-300"
                            }`}
                          >
                            {link.label}
                            <ChevronRight aria-hidden size={17} className="shrink-0 text-slate-600" />
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </nav>
      </div>

      {/* ── Mobile bottom tab bar ── */}
      <MobileBottomNav pathname={pathname} open={open} setOpen={setOpen} />

    </header>
  );
}

// ── Mobile bottom tab bar ──────────────────────────────────────────────────

function MobileBottomNav({
  pathname, open, setOpen,
}: {
  pathname: string;
  open: boolean;
  setOpen: (v: boolean | ((p: boolean) => boolean)) => void;
}) {
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const tabs = [
    { href: "/", label: "Home", icon: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg> },
    { href: "/weather", label: "Weather", icon: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg> },
    { href: "/whats-happening", label: "Community", icon: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg> },
    { href: "/lounge", label: "Lounge", icon: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M4 18v-2a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v2h1v2H3v-2h1zm2 0h12v-2a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v2zm1-7V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v4h-2V7a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v4H7z"/></svg> },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="bg-[#020912]/95 backdrop-blur-md border-t border-white/8">
        <div className="flex items-stretch" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {tabs.map(tab => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors ${
                isActive(tab.href) ? "text-[#f0b429]" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab.icon}
              <span className="text-[10px] font-bold uppercase tracking-widest leading-none">{tab.label}</span>
            </Link>
          ))}
          <button
            onClick={() => setOpen(v => !v)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors ${
              open ? "text-[#f0b429]" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>
            <span className="text-[10px] font-bold uppercase tracking-widest leading-none">More</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Weather ticker ─────────────────────────────────────────────────────────

interface NWSAlert {
  properties: { event: string; headline: string; description: string; severity: string };
}
interface ProcessedAlert { text: string; level: "red" | "yellow" | "green"; rank: number; headline: string; description: string }

/** Split an NWS alert description into its "* WHAT... * WHERE..." sections
 * so the hover popup can render them as neat labeled blocks. Returns [] when
 * the text isn't in that bulleted format (caller falls back to raw text). */
function parseAlertSections(description: string): { label: string; text: string }[] {
  if (!description) return [];
  const re = /\*\s*([A-Z][A-Z0-9 /&-]*?)\.\.\.\s*([\s\S]*?)(?=\*\s*[A-Z][A-Z0-9 /&-]*?\.\.\.|$)/g;
  const out: { label: string; text: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(description)) !== null) {
    const raw = m[1].trim();
    const label = raw.charAt(0) + raw.slice(1).toLowerCase(); // WHAT → What
    const text = m[2].replace(/\s+/g, " ").trim();
    if (text) out.push({ label, text });
  }
  return out;
}

function getAlertLevel(event: string, severity: string, headline = "", description = ""): "red" | "yellow" | "green" {
  const e = event.toLowerCase();
  const h = (headline + " " + description).toLowerCase();
  if (e.includes("warning") && h.includes("tornado emergency")) return "red";
  if (e.includes("warning")) return "red";
  if (e.includes("watch") || e.includes("advisory")) return "yellow";
  if (severity === "Extreme" || severity === "Severe") return "red";
  if (severity === "Moderate") return "yellow";
  return "green";
}

/** Higher = more life-threatening. Drives the alert ordering so the worst
 * alert leads the rotation and tops the hover list. Placeholder = 0. */
function getAlertRank(event: string, severity: string, headline = "", description = ""): number {
  const e = event.toLowerCase();
  const h = (headline + " " + description).toLowerCase();
  if (e.includes("warning") && h.includes("tornado emergency")) return 100;
  if (e.includes("tornado") && e.includes("warning")) return 95;
  if (e.includes("flash flood") && e.includes("warning")) return 88;
  if (e.includes("severe thunderstorm") && e.includes("warning")) return 82;
  if (e.includes("warning")) return 72;
  if (e.includes("watch") && (h.includes("particularly dangerous") || h.includes("pds"))) return 67;
  if (e.includes("tornado") && e.includes("watch")) return 63;
  if (e.includes("watch")) return 55;
  if (e.includes("advisory")) return 42;
  if (severity === "Extreme") return 78;
  if (severity === "Severe") return 66;
  if (severity === "Moderate") return 46;
  return 12;
}

function WeatherTicker() {
  const pathname = usePathname();
  const [alerts, setAlerts] = useState<ProcessedAlert[]>([]);
  const [idx, setIdx]       = useState(0);
  const [hover, setHover]   = useState(false);
  const [compact, setCompact] = useState(false);

  // On phones/tablets the full alert headline is too wide and spills over the
  // logos — collapse it to a short "tap for details" chip instead.
  useEffect(() => {
    const check = () => setCompact(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setHover(false));
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    if (alerts.length <= 1) return;
    const id = setInterval(() => setIdx(i => (i + 1) % alerts.length), 5000);
    return () => clearInterval(id);
  }, [alerts.length]);

  useEffect(() => {
    function processAlerts(raw: NWSAlert[]): ProcessedAlert[] {
      if (raw.length === 0) return [{ text: "NO ACTIVE WEATHER ALERTS — MILLSTADT, ILLINOIS", level: "green", rank: 0, headline: "No active weather alerts for Millstadt, Illinois.", description: "" }];
      return raw.map(a => {
        const desc = (a.properties.description ?? "").trim();
        const h = (a.properties.headline + " " + desc).toLowerCase();
        const e = a.properties.event.toLowerCase();
        const level = getAlertLevel(a.properties.event, a.properties.severity, a.properties.headline, a.properties.description);
        const rank = getAlertRank(a.properties.event, a.properties.severity, a.properties.headline, a.properties.description);
        let label = a.properties.event.toUpperCase();
        if (e.includes("warning") && h.includes("tornado emergency")) label = "⚠ TORNADO EMERGENCY";
        else if (e.includes("watch") && (h.includes("particularly dangerous situation") || h.includes("pds"))) label = "⚠ PDS TORNADO WATCH";
        return { text: `${label} — ${a.properties.headline.toUpperCase()}`, level, rank, headline: a.properties.headline, description: desc };
      })
      // Most life-threatening first → leads the rotation and tops the list.
      .sort((x, y) => y.rank - x.rank);
    }
    async function fetchAlerts() {
      try {
        const res  = await fetch("https://api.weather.gov/alerts/active?zone=ILC163", { headers: { "User-Agent": "(millstadtems.org, millstadtems@gmail.com)", Accept: "application/geo+json" } });
        const data = await res.json();
        setAlerts(processAlerts(data.features ?? []));
        setIdx(0);
      } catch {
        setAlerts([{ text: "NO ACTIVE WEATHER ALERTS — MILLSTADT, ILLINOIS", level: "green", rank: 0, headline: "No active weather alerts for Millstadt, Illinois.", description: "" }]);
      }
    }
    fetchAlerts();
    const id = setInterval(fetchAlerts, 5 * 60 * 1000);
    const MOCK: Record<string, NWSAlert[]> = {
      thunderstorm_watch:   [{ properties: { event: "Severe Thunderstorm Watch",   headline: "Severe Thunderstorm Watch issued for St. Clair County until 10:00 PM CDT.", description: "", severity: "Moderate" } }],
      thunderstorm_warning: [{ properties: { event: "Severe Thunderstorm Warning", headline: "Severe Thunderstorm Warning issued for St. Clair County.", description: "", severity: "Severe" } }],
      tornado_watch:        [{ properties: { event: "Tornado Watch",               headline: "Tornado Watch issued for St. Clair County until midnight CDT.", description: "", severity: "Severe" } }],
      tornado_pds_watch:    [{ properties: { event: "Tornado Watch",               headline: "Particularly Dangerous Situation — Tornado Watch for St. Clair County.", description: "THIS IS A PARTICULARLY DANGEROUS SITUATION", severity: "Extreme" } }],
      tornado_warning:      [{ properties: { event: "Tornado Warning",             headline: "Tornado Warning issued for St. Clair County. TAKE SHELTER IMMEDIATELY.", description: "", severity: "Extreme" } }],
      tornado_emergency:    [{ properties: { event: "Tornado Warning",             headline: "Tornado Emergency for Millstadt. CONFIRMED LARGE TORNADO. SEEK SHELTER NOW.", description: "THIS IS A TORNADO EMERGENCY", severity: "Extreme" } }],
      multi: [
        { properties: { event: "Tornado Warning", headline: "Tornado Warning for St. Clair County.", description: "", severity: "Extreme" } },
        { properties: { event: "Severe Thunderstorm Warning", headline: "Severe Thunderstorm Warning until 9:00 PM.", description: "", severity: "Severe" } },
      ],
      clear: [],
    };
    function handleTest(e: Event) { const s = (e as CustomEvent<string>).detail; setAlerts(processAlerts(MOCK[s] ?? [])); setIdx(0); }
    window.addEventListener("weather-test-scenario", handleTest);
    return () => { clearInterval(id); window.removeEventListener("weather-test-scenario", handleTest); };
  }, []);

  const current = alerts[idx] ?? { text: "NO ACTIVE WEATHER ALERTS — MILLSTADT, ILLINOIS", level: "green" as const, rank: 0, headline: "No active weather alerts for Millstadt, Illinois.", description: "" };
  const color   = current.level === "red" ? "#f87171" : current.level === "yellow" ? "#facc15" : "#34d399";
  const levelColor = (lvl: "red" | "yellow" | "green") => lvl === "red" ? "#f87171" : lvl === "yellow" ? "#facc15" : "#34d399";

  const realAlerts = alerts.filter(a => a.rank > 0);
  const canExpand = realAlerts.length >= 1;

  // Phone/tablet: collapse the long headline to a short tappable chip so it
  // never spills over the logos. Desktop shows just the event name as a clean
  // pill (e.g. "EXTREME HEAT WARNING") — full details live in the hover popup,
  // so the bar never carries the long redundant headline string.
  const eventLabel = current.text.split(" — ")[0];
  const displayText = compact
    ? (canExpand ? `⚠ ${realAlerts.length} Alert${realAlerts.length > 1 ? "s" : ""} · Tap for more` : "No Weather Alerts")
    : eventLabel;

  return (
    <div
      style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => compact && canExpand && setHover(v => !v)}
    >
      {/* ── Rotating ticker line — must stay constrained so the long text
          truncates with an ellipsis and never spills over the nav buttons. ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, overflow: "hidden", padding: "0 28px", minWidth: 0, cursor: canExpand ? "pointer" : "default" }}>
        {compact ? (
          // Mobile/tablet: single compact chip (unchanged).
          <span key={current.level} className="text-[10px]" style={{ color, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden", maxWidth: "100%", animation: `weather-pulse-${current.level} 2.5s ease-in-out infinite` }}>
            {displayText}
          </span>
        ) : canExpand ? (
          // Desktop: one pill per active alert, side by side. The 28px wrapper
          // padding keeps them clear of the logo / menu buttons either side.
          realAlerts.map((a, i) => {
            const c = levelColor(a.level);
            return (
              <span key={i} className="text-[13px]" style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0, color: c, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap", padding: "3px 12px", border: `1px solid ${c}59`, borderRadius: 999, background: `${c}14`, boxShadow: `0 0 0 1px ${c}1a`, animation: `weather-pulse-${a.level} 2.5s ease-in-out infinite` }}>
                <span style={{ fontSize: "0.95em", flexShrink: 0, lineHeight: 1 }}>⚠</span>
                {a.text.split(" — ")[0]}
              </span>
            );
          })
        ) : (
          // Desktop, all-clear: subtle green "no alerts" pill.
          <span key="clear" className="text-[13px]" style={{ display: "inline-flex", alignItems: "center", gap: 6, color, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap", maxWidth: "100%", animation: `weather-pulse-${current.level} 2.5s ease-in-out infinite` }}>
            <span style={{ fontSize: "0.95em", flexShrink: 0, lineHeight: 1 }}>✓</span>
            {eventLabel}
          </span>
        )}
      </div>


      {/* ── Hover / tap popup: full text of every active alert ── */}
      {hover && canExpand && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 7px)", left: "50%", transform: "translateX(-50%)",
            width: "min(620px, 94vw)", maxHeight: "60vh", overflowY: "auto", textAlign: "left",
            background: "linear-gradient(165deg, rgba(10,22,40,0.985) 0%, rgba(2,9,18,0.985) 60%)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.10)", borderTop: `3px solid ${levelColor(realAlerts[0]?.level ?? "yellow")}`,
            borderRadius: 14, boxShadow: `0 20px 55px rgba(0,0,0,0.65), 0 0 0 1px ${levelColor(realAlerts[0]?.level ?? "yellow")}22`,
            padding: "0 0 12px", zIndex: 80,
          }}
        >
          <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: "11px 16px 10px",
            background: `linear-gradient(90deg, ${levelColor(realAlerts[0]?.level ?? "yellow")}24 0%, transparent 78%)`,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}>
            <span style={{ fontSize: 13 }}>⚠</span>
            <span style={{ color: "#cbd5e1", fontSize: 10.5, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              {realAlerts.length} Active Alert{realAlerts.length === 1 ? "" : "s"}
            </span>
          </div>
          <div style={{ display: "grid", gap: 16, padding: "13px 16px 0" }}>
            {realAlerts.map((a, i) => {
              const sections = parseAlertSections(a.description);
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "10px 1fr", gap: 10, alignItems: "start", paddingBottom: i < realAlerts.length - 1 ? 14 : 0, borderBottom: i < realAlerts.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: levelColor(a.level), marginTop: 6, boxShadow: `0 0 8px ${levelColor(a.level)}` }} />
                  <div style={{ minWidth: 0 }}>
                    {/* Event label */}
                    <div style={{ color: levelColor(a.level), fontSize: 11.5, fontWeight: 900, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
                      {a.text.split(" — ")[0]}
                    </div>
                    {/* Issued / headline line */}
                    {a.headline && (
                      <div style={{ color: "#94a3b8", fontSize: 11.5, lineHeight: 1.5, marginBottom: sections.length ? 8 : 0 }}>{a.headline}</div>
                    )}
                    {/* Neat WHAT / WHERE / WHEN / IMPACTS sections */}
                    {sections.length > 0 ? (
                      <div style={{ display: "grid", gap: 7 }}>
                        {sections.map((s, j) => (
                          <div key={j} style={{ lineHeight: 1.5 }}>
                            <span style={{ color: "#e2e8f0", fontSize: 10.5, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase" }}>{s.label}</span>
                            <span style={{ color: "#cbd5e1", fontSize: 12.5 }}> — {s.text}</span>
                          </div>
                        ))}
                      </div>
                    ) : a.description ? (
                      <div style={{ color: "#cbd5e1", fontSize: 12.5, lineHeight: 1.5 }}>{a.description}</div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ color: "#5b6675", fontSize: 9.5, lineHeight: 1.5, margin: "11px 16px 0", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            Source: National Weather Service (api.weather.gov), zone ILC163. Always follow official guidance and local emergency instructions.
          </div>
        </div>
      )}
    </div>
  );
}
