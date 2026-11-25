"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { useWinterTheme } from "@/lib/seasonal/useWinterTheme";
import styles from "./WinterStreetParade.module.css";

// Jen already hangs from the Christmas lights, so the street keeps one of each person (her sleigh
// and snow-pop art aren't used here). The fish stand lives in the big village picture.
const players = {
  beagle: "rose-beagle.webp", grinch: "grinch.webp",
  engine: "street/fire-engine.webp", carolers: "street/carolers.webp", neighbors: "street/neighbors.webp",
  family: "street/skating-family.webp", skater: "street/solo-skater.webp", cocoa: "street/cocoa-stall.webp",
} as const;
type Player = keyof typeof players;
type Bill = readonly [Player, Player, Player, Player, Player];

const bills: Record<string, Bill> = {
  market: ["cocoa", "skater", "carolers", "neighbors", "beagle"],
  fleet: ["carolers", "engine", "neighbors", "family", "beagle"],
  rink: ["beagle", "family", "cocoa", "skater", "neighbors"],
  play: ["grinch", "skater", "beagle", "family", "neighbors"],
  press: ["cocoa", "skater", "neighbors", "family", "grinch"],
  charity: ["beagle", "family", "carolers", "engine", "cocoa"],
};

function sceneFor(pathname: string) {
  const root = pathname.split("/")[1];
  if (["about", "fleet", "careers", "leadership", "statistics", "testimonials"].includes(root)) return "fleet";
  if (["kids-club", "community-education", "medical-control", "ecg-challenge"].includes(root)) return "play";
  if (["weather", "traffic", "events", "senior-center", "commercial-club"].includes(root)) return "rink";
  if (["news", "gallery", "bulletin", "community", "movies", "whats-happening"].includes(root)) return "press";
  if (["donate", "contact", "links", "forms"].includes(root)) return "charity";
  return "market";
}

function Street({ pathname, compact }: { pathname: string; compact: boolean }) {
  const stage = useRef<HTMLDivElement>(null);
  const bill = sceneFor(pathname);
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    let inView = false;
    const mark = () => { el.dataset.playing = String(inView && !document.hidden); };
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; mark(); });
    observer.observe(el);
    document.addEventListener("visibilitychange", mark);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", mark); };
  }, []);
  return (
    <div ref={stage} className={styles.street} data-winter-parade={bill} data-compact={compact} aria-hidden="true">
      <div className={styles.town} />
      <div className={styles.streetLights} />
      <div className={styles.ice} />
      {bills[bill].map((player, slot) => (
        <div className={styles.mark} key={player} data-slot={slot} data-player={player}>
          <div className={styles.lane}>
            {/* Everyone on the street joins the snowball fight (not the fire engine or the cocoa stall). */}
            <div className={styles.player} data-snow-fighter={player === "engine" || player === "cocoa" ? undefined : player}>
              <Image src={`/images/winter/${players[player]}`} alt="" fill
                loading="eager" sizes="(max-width: 520px) 95px, 145px" unoptimized />
              {player === "cocoa" && <span className={styles.steam}><i /><i /></span>}
              {player === "engine" && <span className={styles.runningLights}><i /><i /></span>}
            </div>
          </div>
        </div>
      ))}
      <div className={styles.snow} />
      <div className={styles.drift} />
      <div className={styles.bough} /><div className={styles.bough} />
    </div>
  );
}

export default function WinterStreetParade({ pathname, compact = false }: { pathname: string; compact?: boolean }) {
  const winter = useWinterTheme();
  return winter ? <Street key={pathname} pathname={pathname} compact={compact} /> : null;
}
