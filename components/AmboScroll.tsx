"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useWinterTheme } from "@/lib/seasonal/useWinterTheme";
import styles from "./AmboScroll.module.css";

const EMPLOYEE_PREFIXES = ["/lounge", "/admin", "/board", "/inventory", "/truckcheck"];
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

type NetworkInformation = EventTarget & { saveData?: boolean };

function connection() {
  return (navigator as Navigator & { connection?: NetworkInformation }).connection;
}

function preferStillArtwork() {
  return window.matchMedia(REDUCED_MOTION).matches ||
    connection()?.saveData === true ||
    (navigator.hardwareConcurrency || 4) <= 2;
}

function subscribeToMotionPreference(onChange: () => void) {
  const media = window.matchMedia(REDUCED_MOTION);
  const network = connection();
  media.addEventListener("change", onChange);
  network?.addEventListener("change", onChange);
  return () => {
    media.removeEventListener("change", onChange);
    network?.removeEventListener("change", onChange);
  };
}

const serverStillPreference = () => false;

export default function AmboScroll({ enabled }: { enabled: boolean }) {
  const pathname = usePathname() || "";
  const winter = useWinterTheme();
  const still = useSyncExternalStore(subscribeToMotionPreference, preferStillArtwork, serverStillPreference);
  if (!enabled || EMPLOYEE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;

  if (still) {
    return winter ? (
      <div aria-hidden="true" className={styles.parked}>
        <Convoy winter parked />
      </div>
    ) : null;
  }
  return <DriveBy key={winter ? "winter" : "normal"} winter={winter} />;
}

function DriveBy({ winter }: { winter: boolean }) {
  const sentinel = useRef<HTMLDivElement>(null);
  const shown = useRef(false);
  const [driving, setDriving] = useState(false);

  useEffect(() => {
    const target = sentinel.current;
    if (!target || !("IntersectionObserver" in window)) return;
    const SESSION_KEY = winter ? "millstadt:winter-sleigh-drive-by-shown" : "millstadt:ambulance-drive-by-shown";
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "true") return;
    } catch { /* The component ref also limits play when storage is unavailable. */ }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || shown.current) return;
      shown.current = true;
      observer.disconnect();
      try {
        sessionStorage.setItem(SESSION_KEY, "true");
      } catch { /* Storage can be disabled in privacy mode. */ }
      setDriving(true);
    }, { threshold: 0.5 });

    observer.observe(target);
    return () => observer.disconnect();
  }, [winter]);

  return (
    <>
      <div aria-hidden="true" className={styles.marker} ref={sentinel} />
      {driving && (
        <div aria-hidden="true" className={winter ? styles.winterLane : styles.normalLane}>
          <Convoy winter={winter} onFinish={() => setDriving(false)} />
        </div>
      )}
    </>
  );
}

function Convoy({ winter, parked = false, onFinish }: { winter: boolean; parked?: boolean; onFinish?: () => void }) {
  const [truckLoaded, setTruckLoaded] = useState(false);
  const [sleighLoaded, setSleighLoaded] = useState(false);
  const ready = truckLoaded && (!winter || sleighLoaded);

  return (
    <div
      className={winter ? styles.convoy : styles.solo}
      data-moving={!parked && ready ? "true" : undefined}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) onFinish?.();
      }}
    >
      {winter && (
        <>
          <svg width="0" height="0" className={styles.filterDefinitions} aria-hidden="true" focusable="false">
            <defs>
              <filter id="winter-truck-alpha" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
                <feComponentTransfer>
                  <feFuncA type="linear" slope="1.2" intercept="-.2" />
                </feComponentTransfer>
              </filter>
            </defs>
          </svg>
          <span className={styles.sleighShadow} />
          <svg className={styles.towline} viewBox="0 0 120 34" preserveAspectRatio="none" focusable="false" aria-hidden="true">
            <path d="M 0 17 Q 63 35 120 6" stroke="#372924" strokeWidth="5" fill="none" />
            <path d="M 0 16 Q 63 34 120 5" stroke="#e7bf69" strokeWidth="2.3" fill="none" />
            <g className={styles.towLights}>
              <circle cx="30" cy="22" r="3.2" fill="#ff7262" />
              <circle cx="59" cy="23" r="3.2" fill="#ffda75" />
              <circle cx="86" cy="17" r="3.2" fill="#6ef1cd" />
            </g>
          </svg>
          <span className={styles.sleigh}>
            <span className={styles.rider}>
              <Image
                className={parked ? undefined : styles.riderBody}
                src="/images/winter/sleigh.webp" alt="" fill
                sizes="(max-width: 767px) 110px, 170px"
                loading={parked ? "lazy" : "eager"}
                onLoad={() => setSleighLoaded(true)}
                onError={() => setSleighLoaded(true)}
              />
              {!parked && (
                <Image className={styles.wavingHand}
                  src="/images/winter/sleigh.webp" alt="" fill
                  sizes="(max-width: 767px) 110px, 170px" loading="eager"
                />
              )}
            </span>
          </span>
          {!parked && <span className={styles.powder} />}
        </>
      )}
      <Image
        className={styles.truck}
        src="/images/millstadt-ems/cartoon-ambo.png" alt=""
        width={1536} height={1024}
        sizes={winter ? "(max-width: 767px) 155px, 220px" : "96px"}
        loading={parked ? "lazy" : "eager"}
        onLoad={() => setTruckLoaded(true)}
        onError={() => setTruckLoaded(true)}
      />
    </div>
  );
}
