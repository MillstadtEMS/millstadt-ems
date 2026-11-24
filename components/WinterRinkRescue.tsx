"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import styles from "./WinterRinkRescue.module.css";

const sprites = {
  blue: ["blues-skater", 400, 384],
  red: ["red-skater", 400, 391],
  down: ["blues-down", 400, 129],
  empty: ["medics-cot-empty", 768, 384],
  loaded: ["medics-cot-loaded", 768, 384],
} as const;
const directory = "/images/winter/hockey/";
const rollKey = "millstadt:rink-hockey:last-roll:v1";
const showKey = "millstadt:rink-hockey:last-show:v1";
const minute = 60_000;
const remembered = new Map<string, number>();
let decidedOnThisVisit = false;

function lastTime(key: string) {
  let time = remembered.get(key) ?? 0;
  for (const storage of ["localStorage", "sessionStorage"] as const) {
    try {
      time = Math.max(time, Number(window[storage].getItem(key)) || 0);
    } catch { /* Some browsers disable one or both stores. */ }
  }
  return time;
}

function remember(key: string, time: number) {
  remembered.set(key, time);
  for (const storage of ["localStorage", "sessionStorage"] as const) {
    try { window[storage].setItem(key, String(time)); } catch { /* Keep the in-memory clock. */ }
  }
}

function draw() {
  if (decidedOnThisVisit) return false;
  decidedOnThisVisit = true;
  const now = Date.now();
  if (now - lastTime(rollKey) < 45 * minute || now - lastTime(showKey) < 18 * 60 * minute) return false;
  remember(rollKey, now);
  return Math.random() < 1 / 12;
}

function Sprite({ name, className }: { name: keyof typeof sprites; className: string }) {
  const [file, width, height] = sprites[name];
  return <Image src={directory + file + ".webp"} alt="" width={width} height={height}
    loading="eager" unoptimized draggable={false} className={className} />;
}

export default function WinterRinkRescue() {
  const stage = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const rink = stage.current?.parentElement;
    if (!rink || !("IntersectionObserver" in window) || decidedOnThisVisit) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let disposed = false;
    let running = false;
    let pending = false;
    let dwell: number | undefined;
    let finish: number | undefined;
    const eligible = () => !disposed && visible && !document.hidden && !motion.matches;

    function stop() {
      window.clearTimeout(finish);
      if (running) setPlaying(false);
      running = false;
    }

    async function tryScene() {
      dwell = undefined;
      if (!eligible() || pending) return;
      pending = true;
      const claim = () => eligible() && draw();
      try {
        const winner = navigator.locks ? await navigator.locks.request(rollKey, claim) : claim();
        if (!winner || !eligible()) return;
        await Promise.all(Object.values(sprites).map(async ([file]) => {
          const image = new window.Image();
          image.src = directory + file + ".webp";
          await image.decode();
        }));
        if (!eligible()) return;
        remember(showKey, Date.now());
        running = true;
        setPlaying(true);
        finish = window.setTimeout(stop, 11_800);
      } catch { /* A missing frame skips this cameo and leaves the rink skating. */ }
      finally { pending = false; }
    }

    function update() {
      if (!eligible()) {
        window.clearTimeout(dwell);
        dwell = undefined;
        stop();
      } else if (!decidedOnThisVisit && !pending && dwell === undefined) {
        dwell = window.setTimeout(tryScene, 1600);
      }
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= .42;
      update();
    }, { threshold: [0, .42], rootMargin: "-50px 0px -35px" });
    observer.observe(rink);
    document.addEventListener("visibilitychange", update);
    motion.addEventListener("change", update);
    return () => {
      disposed = true;
      window.clearTimeout(dwell);
      window.clearTimeout(finish);
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
      motion.removeEventListener("change", update);
    };
  }, []);

  return (
    <div className={styles.stage} ref={stage} aria-hidden="true" data-rink-rescue={playing ? "playing" : "idle"}>
      {playing && <>
        <div className={styles.redLane}>
          <Sprite name="red" className={styles.red} />
        </div>
        <div className={styles.blueLane}>
          <Sprite name="blue" className={styles.blue} />
        </div>
        <div className={styles.cotLane}>
          <div className={styles.crew}>
            <Sprite name="empty" className={styles.empty} />
            <Sprite name="loaded" className={styles.loaded} />
          </div>
        </div>
        <div className={styles.downLane}>
          <Sprite name="down" className={styles.down} />
        </div>
        <i className={styles.spray} />
      </>}
    </div>
  );
}
