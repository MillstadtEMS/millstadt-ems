"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useWinterTheme } from "@/lib/seasonal/useWinterTheme";
import styles from "./WinterPageSurprises.module.css";

const ornaments = {
  lantern: { label: "Light the lantern", title: "Christmas Eve at the station", width: 173, height: 300 },
  engine: { label: "Wind up the engine", title: "Old No. 5 on parade", width: 300, height: 217 },
  globe: { label: "Shake the globe", title: "Skating in Millstadt", width: 193, height: 300 },
  stocking: { label: "Peek inside the stocking", title: "Snoopy’s snow day", width: 162, height: 300 },
  star: { label: "Make the star shine", title: "A star over the village", width: 281, height: 300 },
  gift: { label: "Unwrap the present", title: "Hot cocoa by the rink", width: 265, height: 300 },
} as const;
type Ornament = keyof typeof ornaments;

const routeOrnaments: Record<string, Ornament> = {
  "financials-information-hub": "lantern", "ems-tax-calculator": "lantern", "board-minutes": "lantern",
  "election-information": "lantern", "election-review": "lantern", billing: "lantern", privacy: "lantern",
  fleet: "engine", about: "engine", careers: "engine", leadership: "engine", statistics: "engine", testimonials: "engine",
  weather: "globe", traffic: "globe", events: "globe", "senior-center": "globe", "commercial-club": "globe",
  "kids-club": "stocking", "community-education": "stocking", "medical-control": "stocking", "ecg-challenge": "stocking",
  news: "star", gallery: "star", bulletin: "star", movies: "star", "whats-happening": "star", community: "star",
  donate: "gift", contact: "gift", links: "gift", forms: "gift",
};

const memoryCollection = new Set<string>();
const chicagoYearMonth = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "numeric", year: "numeric" });

function collect(kind: Ornament) {
  const parts = chicagoYearMonth.formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")!.value);
  const january = parts.find((part) => part.type === "month")!.value === "1";
  const prefix = `millstadt:ornaments:${january ? year - 1 : year}:`;
  memoryCollection.add(prefix + kind);
  try {
    localStorage.setItem(prefix + kind, "1");
    for (const id of Object.keys(ornaments)) {
      if (localStorage.getItem(prefix + id) === "1") memoryCollection.add(prefix + id);
    }
  } catch { /* Visiting other pages still collects ornaments for this visit. */ }
  return Object.keys(ornaments).filter((id) => memoryCollection.has(prefix + id)).length;
}

const drift = "/images/winter/village-snowbank.webp";
const village = "/images/winter/village.webp";
const town = "/images/winter/millstadt-village.webp";
const rink = "/images/winter/street/town-rink.webp";

function Miniature({ kind }: { kind: Ornament }) {
  const scene = {
    lantern: village, engine: town, globe: rink, stocking: village, star: village, gift: rink,
  }[kind];
  const item = {
    lantern: null, engine: "/images/winter/street/fire-engine.webp", globe: "/images/winter/street/skating-family.webp",
    stocking: "/images/winter/rose-beagle.webp", star: null, gift: "/images/winter/street/cocoa-stall.webp",
  }[kind];
  return (
    <div className={styles.miniature} data-scene={kind} aria-hidden="true">
      <Image fill src={scene} alt="" sizes="(max-width: 500px) 90vw, 390px" className={styles.scenery} unoptimized />
      {item && <div className={styles.subject}><Image fill src={item} alt="" sizes="155px" unoptimized /></div>}
      {kind === "lantern" && <div className={styles.stationLights} />}
      {kind === "star" && <span className={styles.treeStar} />}
      {kind === "gift" && <div className={styles.steam}><i /><i /><i /></div>}
      {(kind === "stocking" || kind === "globe") && <div className={styles.flurry} />}
      {kind === "stocking" && <Image fill src={drift} alt="" sizes="390px" className={styles.drift} unoptimized />}
      <div className={styles.frame} />
    </div>
  );
}

function OrnamentShelf({ kind }: { kind: Ornament }) {
  const [open, setOpen] = useState(false);
  const [play, setPlay] = useState(0);
  const [collected, setCollected] = useState(0);
  const button = useRef<HTMLButtonElement>(null);
  const { label, title, width, height } = ornaments[kind];

  function reveal() {
    if (!open) {
      setCollected(collect(kind));
      setPlay((n) => n + 1);
    }
    setOpen(!open);
  }
  function close() {
    setOpen(false);
    button.current?.focus({ preventScroll: true });
  }

  return (
    <aside className={styles.shelf} data-winter-ornament={kind} aria-label="Millstadt Christmas ornament">
      <div className={styles.trim} aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
      <button ref={button} className={styles.ornament} onClick={reveal} aria-controls="winter-ornament-card"
        aria-expanded={open} aria-label={open ? "Put the ornament back" : label} title={open ? "Put the ornament back" : label}>
        <Image src={`/images/winter/ornaments/${kind}.webp`} width={width} height={height} sizes="84px" alt="" unoptimized />
        <span>{open ? "Put it back" : label}</span>
      </button>
      <div id="winter-ornament-card" hidden={!open} className={styles.card} role="group" aria-label={title}>
        {open && <>
          <Miniature key={play} kind={kind} />
          <div className={styles.caption}>
            <div><h3>{title}</h3><p aria-live="polite">{collected === 6 ? "All 6 ornaments found" : `${collected} of 6 ornaments found`}</p></div>
            <div className={styles.actions}>
              <button type="button" onClick={() => setPlay((n) => n + 1)} aria-label="Replay the ornament scene" title="Replay">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 10a8 8 0 1 1 0 5M4 4v6h6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button type="button" onClick={close} aria-label="Close the ornament scene" title="Close">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12m0-12L6 18" strokeLinecap="round"/></svg>
              </button>
            </div>
          </div>
        </>}
      </div>
    </aside>
  );
}

export default function WinterPageSurprises({ pathname }: { pathname: string }) {
  const winter = useWinterTheme();
  const section = pathname.split("/")[1];
  if (!winter || !section || ["offline", "weather-test", "ten-eight"].includes(section)) return null;
  return <OrnamentShelf key={pathname} kind={routeOrnaments[section] ?? "gift"} />;
}
