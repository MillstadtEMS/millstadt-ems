"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useWinterTheme } from "@/lib/seasonal/useWinterTheme";
import styles from "./WinterVillage.module.css";

const powderDirections = [-82, -65, -52, -40, -30, -19, 13, 25, 37, 50, 64, 79];
// Publisher character art: https://www.peanuts.com/about/snoopy and
// https://www.drseuss.com/characters. The winter town and EMS portraits are original.

// Positions are measured on the uncropped 1672 × 941 painted village.
const nightLights = [
  { x: 30.5, y: 36.9, delay: "-1.1s", period: "4.8s" },
  { x: 45.0, y: 45.4, delay: "-2.8s", period: "5.7s" },
  { x: 64.7, y: 45.4, delay: "-1.6s", period: "4.2s" },
  { x: 80.9, y: 36.0, delay: "-3.1s", period: "5.2s" },
];

function VillagePostcard() {
  const viewport = useRef<HTMLDivElement>(null);
  const actor = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [hasArrived, setHasArrived] = useState(false);
  const [portraitLoaded, setPortraitLoaded] = useState(false);
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
      <div className={styles.viewport} ref={viewport} onScroll={updatePan} id="winter-village-picture">
        <div className={styles.artboard} data-visible={inView}>
          <Image className={styles.village} src="/images/winter/village.webp"
            alt="A yellow Millstadt ambulance outside a wreath-trimmed station. Santa passes a gingerbread house and a snowman under a starry winter sky."
            fill sizes="(max-width: 720px) 720px, 100vw" unoptimized />
          <div className={styles.glows} aria-hidden="true">
            {nightLights.map(({ x, y, delay, period }) => (
              <i key={x} className={styles.lamplight} style={{
                left: `${x}%`, top: `${y}%`, animationDuration: period, animationDelay: delay,
              }} />
            ))}
            <i className={styles.treeStar} />
            <i className={styles.roadLight} />
            <i className={styles.roadLight} />
          </div>
          <h2 className={styles.greeting} id="winter-village-title">
            <span>Christmas in</span>
            Millstadt
          </h2>
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
      {(pan.left || pan.right) && (
        <div className={styles.controls} role="group" aria-label="Explore the Christmas village">
          {([-1, 1] as const).map((direction) => (
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
      )}
    </section>
  );
}

export default function WinterVillage() {
  return useWinterTheme() ? <VillagePostcard /> : null;
}
