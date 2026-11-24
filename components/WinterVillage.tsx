"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useWinterTheme } from "@/lib/seasonal/useWinterTheme";
import styles from "./WinterVillage.module.css";

const powderDirections = [-82, -65, -52, -40, -30, -19, 13, 25, 37, 50, 64, 79];
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
  const actor = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [hasArrived, setHasArrived] = useState(false);
  const [portraitLoaded, setPortraitLoaded] = useState(false);
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

  useEffect(() => {
    if (!actor.current) return;
    const arrival = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setHasArrived(true);
        arrival.disconnect();
      }
    }, { threshold: 0.35, rootMargin: "0px 0px -3% 0px" });
    arrival.observe(actor.current);
    return () => arrival.disconnect();
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
          if (!zoomed || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
          event.preventDefault();
          panVillage(event.key === "ArrowLeft" ? -1 : 1);
        }}>
        <div className={styles.artboard} data-visible={inView}>
          <Image className={styles.village} src="/images/winter/millstadt-village.webp"
            alt="A snowy Millstadt Christmas postcard with the old Tin Man water tower, the brick corner store, the former firehouse and St. James Catholic Church. A snowman and Santa flank the street."
            fill sizes="(max-width: 720px) 720px, 100vw" unoptimized />
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
          {fleet.map(({ unit, height, description }) => (
            <div key={unit} className={styles.rig} data-unit={unit}
              style={{ "--rig-art": `url("/images/winter/fleet/${unit}.webp")` } as CSSProperties}>
              <Image src={`/images/winter/fleet/${unit}.webp`} alt={`Millstadt EMS unit ${unit}, ${description}.`}
                width={760} height={height} sizes="(max-width: 720px) 200px, 27vw" unoptimized />
            </div>
          ))}
          <div className={styles.snoopy}>
            <Image src="/images/winter/snoopy.webp" alt="Snoopy wearing a scarf atop his red doghouse" fill sizes="(max-width: 720px) 100px, 15vw" unoptimized />
          </div>
          <div className={styles.grinch}>
            <Image src="/images/winter/grinch.webp" alt="The Grinch in the snow" fill sizes="(max-width: 720px) 90px, 13vw" unoptimized />
          </div>
          <div ref={actor} className={styles.actor} data-revealed={hasArrived && portraitLoaded}>
            <Image className={styles.portrait} src="/images/winter/snow-pop.webp"
              alt="A Millstadt EMS crew member in a Santa hat pops out of a snowdrift, tossing snow with both hands."
              fill sizes="(max-width: 720px) 140px, 19vw" loading="eager" unoptimized onLoad={() => setPortraitLoaded(true)} />
            <div className={styles.powder} aria-hidden="true">
              {powderDirections.map((degrees, i) => (
                <i key={degrees} style={{
                  "--angle": `${degrees}deg`,
                  "--height": `${3.6 + (i * 7 % 5) * 0.7}em`,
                  "--delay": `${i * 13 % 53}ms`,
                  "--size": `${2 + i * 3 % 5}px`,
                } as CSSProperties} />
              ))}
            </div>
          </div>
          <Image className={styles.bank} src="/images/winter/village-snowbank.webp"
            alt="" width={1500} height={258} sizes="100vw" unoptimized />
        </div>
      </div>
      <div className={styles.controls} role="group" aria-label="Explore the Christmas village">
        <button type="button" className={styles.zoom} onClick={() => setZoomed((current) => !current)}
          aria-controls="winter-village-picture">
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
      </div>
    </section>
  );
}

export default function WinterVillage() {
  const winter = useWinterTheme();
  return <div id="christmas-in-millstadt" className={styles.destination}>{winter && <VillagePostcard />}</div>;
}
