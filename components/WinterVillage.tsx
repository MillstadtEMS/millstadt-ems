"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useWinterTheme } from "@/lib/seasonal/useWinterTheme";
import WinterStreet, { WinterCocoaControl, WinterCocoaProvider, WinterStreetForeground } from "./WinterStreet";
import { WinterVillageBellControl, WinterVillageBellsProvider, WinterVillageBellTower } from "./WinterVillageBells";
import { WinterVillageHuntControls, WinterVillageHuntProvider, WinterVillageHuntTarget } from "./WinterVillageHunt";
import WinterTowerDetail from "./WinterTowerDetail";
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
  const [zoomed, setZoomed] = useState(false);
  const [pan, setPan] = useState({ left: false, right: false });

  function updatePan() {
    const el = viewport.current;
    if (!el) return;
    const left = el.scrollLeft > 2;
    const right = el.scrollWidth - el.clientWidth - el.scrollLeft > 2;
    setPan((previous) => previous.left === left && previous.right === right ? previous : { left, right });
  }

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    let wasWideEnough = true;
    function frameVillage() {
      if (!el) return;
      const travel = el.scrollWidth - el.clientWidth;
      if (travel > 2 && wasWideEnough) el.scrollLeft = travel / 2;
      wasWideEnough = travel <= 2;
      updatePan();
    }
    frameVillage();
    const resize = new ResizeObserver(frameVillage);
    resize.observe(el);
    if (el.firstElementChild) resize.observe(el.firstElementChild);
    const visibility = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    visibility.observe(el);
    return () => {
      resize.disconnect();
      visibility.disconnect();
    };
  }, []);

  function panVillage(direction: -1 | 1) {
    const el = viewport.current;
    if (!el) return;
    el.scrollBy({
      left: direction * el.clientWidth * 0.72,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }

  return (
    <section className={styles.postcard} aria-labelledby="winter-village-title">
      <div className={styles.viewport} ref={viewport} onScroll={updatePan} id="winter-village-picture"
        data-zoomed={zoomed} tabIndex={zoomed && (pan.left || pan.right) ? 0 : undefined}
        role="group" aria-label="Illustrated Millstadt village"
        onKeyDown={(event) => {
          if (event.defaultPrevented || event.target !== event.currentTarget || !zoomed || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
          event.preventDefault();
          panVillage(event.key === "ArrowLeft" ? -1 : 1);
        }}>
        <div className={styles.artboard} data-visible={inView}>
          <div className={styles.town} data-hunt-scene="">
            <Image className={styles.village} src="/images/winter/millstadt-village.webp"
              alt="A snowy Millstadt Christmas postcard with the old Tin Man water tower, the brick corner store, the former firehouse and St. James Catholic Church. A snowman and Santa flank the street."
              fill sizes="(max-width: 720px) 720px, 100vw" unoptimized />
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
        <button type="button" className={styles.zoom} onClick={() => setZoomed((current) => !current)}
          aria-controls="winter-village-picture" aria-pressed={zoomed}>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round">
            <circle cx="10" cy="10" r="6.5" /><path d="m15 15 5.5 5.5M7 10h6" />
            {!zoomed && <path d="M10 7v6" />}
          </svg>
          {zoomed ? "Zoom out" : "Zoom in"}
        </button>
        {zoomed && ([-1, 1] as const).map((direction) => (
            <button key={direction} type="button" disabled={direction === -1 ? !pan.left : !pan.right}
              onClick={() => panVillage(direction)} aria-controls="winter-village-picture"
              aria-label={direction === -1 ? "View the left side of the village" : "View the right side of the village"}>
              <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={direction === -1 ? "m14 5-7 7 7 7" : "m10 5 7 7-7 7"} />
              </svg>
            </button>
        ))}
        <WinterTowerDetail />
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
