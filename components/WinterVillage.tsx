"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useWinterTheme } from "@/lib/seasonal/useWinterTheme";
import WinterStreet, { WinterCocoaControl, WinterCocoaProvider, WinterStreetForeground } from "./WinterStreet";
import { WinterVillageBellControl, WinterVillageBellsProvider, WinterVillageBellTower } from "./WinterVillageBells";
import { WinterVillageHuntControls, WinterVillageHuntProvider, WinterVillageHuntTarget } from "./WinterVillageHunt";
import WinterSnowChief from "./WinterSnowChief";
import styles from "./WinterVillage.module.css";

// Publisher character art: https://www.peanuts.com/about/snoopy and
// https://www.drseuss.com/characters. The winter town and EMS portraits are original.

// Streetlights on the Millstadt postcard, from the corner store to St. James.
const nightLights = [
  { x: 11.3, y: 52.1, delay: "-1.1s", period: "4.8s" },
  { x: 31.9, y: 61.9, delay: "-2.8s", period: "5.7s" },
  { x: 52.2, y: 62.0, delay: "-1.6s", period: "4.2s" },
  { x: 60.2, y: 62.2, delay: "-.7s", period: "5.9s" },
  { x: 97.5, y: 39.3, delay: "-3.1s", period: "5.2s" },
];

const fleet = [
  { unit: "3925", height: 444, description: "white Ford Transit ambulance" },
  { unit: "3935", height: 452, description: "black and yellow paramedic ambulance with the Millstadt water tower on its side" },
  { unit: "3926", height: 465, description: "white Ford box ambulance with blue and gold stripes" },
];

function VillagePostcard() {
  const viewport = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const visibility = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    visibility.observe(el);
    return () => visibility.disconnect();
  }, []);

  return (
    <section className={styles.postcard} aria-labelledby="winter-village-title">
      <div ref={viewport} id="winter-village-picture" role="group" aria-label="Illustrated Millstadt village">
        <div className={styles.artboard} data-visible={inView}>
          <div className={styles.town} data-hunt-scene="">
            <Image className={styles.village} src="/images/winter/millstadt-village.webp"
              alt="A snowy Millstadt Christmas postcard with the old Tin Man water tower, the brick corner store, the former firehouse and St. James Catholic Church. A snowman and Santa flank the street."
              fill sizes="100vw" unoptimized />
            <WinterVillageBellTower />
            <div className={styles.glows} aria-hidden="true">
              {nightLights.map(({ x, y, delay, period }) => (
                <i key={x} className={styles.lamplight} style={{
                  left: `${x}%`, top: `${y}%`, animationDuration: period, animationDelay: delay,
                }} />
              ))}
              <i className={styles.roadLight} />
              <i className={styles.roadLight} />
            </div>
            <h2 className={styles.greeting} id="winter-village-title">
              <span>Christmas in</span>
              Millstadt
            </h2>
            <WinterVillageHuntTarget />
            <WinterStreet active={inView} />
            {fleet.map(({ unit, height, description }) => (
              <div key={unit} className={styles.rig} data-unit={unit}
                style={{ "--rig-art": `url("/images/winter/fleet/${unit}.webp")` } as CSSProperties}>
                <Image src={`/images/winter/fleet/${unit}.webp`} alt={`Millstadt EMS unit ${unit}, ${description}.`}
                  width={760} height={height} sizes="(max-width: 720px) 200px, 27vw" unoptimized />
              </div>
            ))}
            <div className={styles.snoopy}>
              <Image src="/images/winter/rose-beagle.webp" alt="A white beagle lies on his back on a snowy red doghouse, holding a red rose." fill sizes="(max-width: 720px) 100px, 15vw" unoptimized />
            </div>
            <div className={styles.grinch}>
              <Image src="/images/winter/grinch.webp" alt="The Grinch in the snow" fill sizes="(max-width: 720px) 90px, 13vw" unoptimized />
            </div>
            <WinterSnowChief />
            <Image className={styles.bank} src="/images/winter/village-snowbank.webp"
              alt="" width={1500} height={258} sizes="100vw" unoptimized />
          </div>
          <WinterStreetForeground active={inView} />
        </div>
      </div>
      <div className={styles.controls} role="group" aria-label="Explore the Christmas village">
        <WinterVillageBellControl />
        <WinterCocoaControl />
      </div>
      <WinterVillageHuntControls />
    </section>
  );
}

export default function WinterVillage() {
  const winter = useWinterTheme();
  const destination = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = destination.current;
    if (!winter || !target || location.hash !== "#christmas-in-millstadt") return;

    // Live call totals above the postcard can expand after the browser follows the fragment.
    const align = () => {
      const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
      const offset = target.getBoundingClientRect().top - margin;
      if (Math.abs(offset) > 3) window.scrollBy({ top: offset, behavior: "instant" });
    };
    align();
    const timer = window.setInterval(align, 180);
    const deadline = window.setTimeout(stop, 7000);
    const userEvents = ["wheel", "touchstart", "pointerdown", "keydown", "hashchange", "pagehide"] as const;
    function stop() {
      window.clearInterval(timer);
      window.clearTimeout(deadline);
      for (const event of userEvents) window.removeEventListener(event, stop);
    }
    for (const event of userEvents) window.addEventListener(event, stop, { passive: true });
    return stop;
  }, [winter]);

  return (
    <div id="christmas-in-millstadt" ref={destination} className={styles.destination}>
      {winter && (
        <WinterVillageHuntProvider>
          <WinterVillageBellsProvider>
            <WinterCocoaProvider><VillagePostcard /></WinterCocoaProvider>
          </WinterVillageBellsProvider>
        </WinterVillageHuntProvider>
      )}
    </div>
  );
}
