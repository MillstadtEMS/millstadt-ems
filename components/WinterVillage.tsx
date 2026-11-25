"use client";

import Image from "next/image";
import { Smartphone, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { useWinterTheme } from "@/lib/seasonal/useWinterTheme";
import WinterStreet, { WinterCocoaProvider, WinterStreetForeground } from "./WinterStreet";
import { WinterVillageBellTower } from "./WinterVillageBells";
import { WinterVillageHuntControls, WinterVillageHuntProvider, WinterVillageHuntTarget } from "./WinterVillageHunt";
import WinterSnowChief from "./WinterSnowChief";
import WinterTruckMedics from "./WinterTruckMedics";
import EmergencyLights from "./EmergencyLights";
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

// The fish Santa's rod rests on his shoulder behind his raised arm (drawn in his art's own
// coordinates, 276x640, extending to the right); the trout swings on the line from the tip.
function FishingPole() {
  return (
    <svg className={styles.fishingPole} viewBox="0 0 480 640" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="fishRod" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#5b3b1d" /><stop offset=".55" stopColor="#3a2412" /><stop offset="1" stopColor="#1a0f06" />
        </linearGradient>
        <linearGradient id="fishTrout" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4d6a2c" /><stop offset=".38" stopColor="#8fa36a" /><stop offset=".5" stopColor="#e39a92" />
          <stop offset=".62" stopColor="#dfe5dc" /><stop offset="1" stopColor="#f6f7f2" />
        </linearGradient>
      </defs>
      <path d="M141.8 328.7 L422.4 21.7 L427.6 26.3 L158.3 343.3 Z" fill="url(#fishRod)" stroke="#120a04" strokeWidth="3" strokeLinejoin="round" />
      <path d="M150 324 L420 27" stroke="#c99a62" strokeWidth="2.4" opacity=".55" strokeLinecap="round" />
      <path d="M163.8 320.4 L205 273.6" stroke="#2b1a0c" strokeWidth="31" strokeLinecap="round" />
      <path d="M163.8 320.4 L205 273.6" stroke="#c79a5e" strokeWidth="25" strokeLinecap="round" />
      <path d="M170 309 L178 300 M182 296 L190 287 M194 283 L200 276" stroke="#8a6232" strokeWidth="3" strokeLinecap="round" />
      <circle cx="229" cy="267" r="17" fill="#a7b0b8" stroke="#262b31" strokeWidth="4" />
      <circle cx="229" cy="267" r="6" fill="#3c434a" />
      {[0.42, 0.58, 0.72, 0.86].map(t => (
        <circle key={t} cx={150 + 275 * t + 7} cy={336 - 312 * t + 6} r="6" fill="none" stroke="#d6dbe0" strokeWidth="3" />
      ))}
      <g className={styles.fishLine}>
        <path d="M425 24 V244" stroke="#f4f8fa" strokeWidth="5" />
        <g className={styles.trout}><g transform="translate(425 240) scale(2) translate(-423 -250)">
          <path d="M423 250 C437 262 441 291 435 317 L429 331 C434 341 441 347 446 356 L400 356 C405 347 412 341 417 331 L411 317 C405 291 409 262 423 250 Z"
            fill="url(#fishTrout)" stroke="#1d2614" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M412 300 Q423 296 434 300" fill="none" stroke="#d9837a" strokeWidth="3" opacity=".8" />
          <path d="M435 288 L447 296 L436 302 Z M411 288 L399 296 L410 302 Z" fill="#6f8a45" stroke="#1d2614" strokeWidth="1" />
          <circle cx="417" cy="266" r="3.3" fill="#111" /><circle cx="416" cy="265" r="1" fill="#fff" />
          <g fill="#2c3b1a" opacity=".7"><circle cx="420" cy="283" r="1.4" /><circle cx="428" cy="290" r="1.2" /><circle cx="418" cy="312" r="1.3" /><circle cx="427" cy="318" r="1.1" /></g>
        </g></g>
      </g>
    </svg>
  );
}

// Click an ambulance to run its red and blue emergency lights; click again to switch them off.
function FleetRig({ unit, height, description }: (typeof fleet)[number]) {
  const [lit, setLit] = useState(false);
  return (
    <button type="button" className={styles.rig} data-unit={unit} data-lit={lit} aria-pressed={lit}
      aria-label={`Emergency lights on Millstadt EMS unit ${unit}, the ${description}`}
      onClick={() => setLit(on => !on)}
      style={{ "--rig-art": `url("/images/winter/fleet/${unit}.webp")` } as CSSProperties}>
      <Image src={`/images/winter/fleet/${unit}.webp`} alt=""
        width={760} height={height} sizes="(max-width: 720px) 200px, 27vw" unoptimized />
      <EmergencyLights unit={unit} on={lit} />
    </button>
  );
}

// The countdown to Christmas morning (midnight December 25 in Millstadt, Central time), under the
// wordmark. One shared one-second clock; the server and the first paint show dashes.
let clockSecond = 0;
let clockTimer: number | undefined;
const clockListeners = new Set<() => void>();
function subscribeClock(listener: () => void) {
  clockListeners.add(listener);
  if (clockListeners.size === 1) {
    clockSecond = Math.floor(Date.now() / 1000);
    clockTimer = window.setInterval(() => {
      clockSecond = Math.floor(Date.now() / 1000);
      clockListeners.forEach((hear) => hear());
    }, 1000);
  }
  return () => {
    clockListeners.delete(listener);
    if (!clockListeners.size) window.clearInterval(clockTimer);
  };
}
const readClock = () => clockSecond;
const serverClock = () => 0;
const centralDate = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", year: "numeric", month: "numeric", day: "numeric" });

/** Seconds until midnight on Christmas morning in Millstadt; null from Christmas Day through New Year's. */
function untilChristmas(second: number): number | null {
  const parts = centralDate.formatToParts(new Date(second * 1000));
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  const year = part("year"), month = part("month"), day = part("day");
  if (month === 1 || (month === 12 && day >= 25)) return null;
  return Math.max(0, Date.UTC(year, 11, 25, 6) / 1000 - second); // December is CST, UTC-6
}

const countdownUnits = ["Days", "Hours", "Min", "Sec"] as const;
function ChristmasCountdown() {
  const second = useSyncExternalStore(subscribeClock, readClock, serverClock);
  const left = second ? untilChristmas(second) : undefined;
  if (left === null) {
    return <p className={styles.countdown} data-merry=""><span className={styles.countdownMerry}>Merry Christmas from Millstadt EMS!</span></p>;
  }
  const values = left === undefined ? null : [Math.floor(left / 86400), Math.floor(left / 3600) % 24, Math.floor(left / 60) % 60, left % 60];
  return (
    <div className={styles.countdown} role="timer"
      aria-label={values ? `${values[0]} days, ${values[1]} hours and ${values[2]} minutes until Christmas` : "Countdown to Christmas"}>
      <span className={styles.countdownCaption} aria-hidden="true">Countdown to Christmas</span>
      <span className={styles.countdownTiles} aria-hidden="true">
        {countdownUnits.map((unit, i) => (
          <span key={unit} className={styles.countdownTile}>
            <b>{values ? String(values[i]).padStart(i ? 2 : 1, "0") : "--"}</b>
            <small>{unit}</small>
          </span>
        ))}
      </span>
    </div>
  );
}

type LockableOrientation = ScreenOrientation & { lock?: (orientation: "landscape") => Promise<void> };

function VillagePostcard() {
  const viewport = useRef<HTMLDivElement>(null);
  const postcard = useRef<HTMLElement>(null);
  const globeButton = useRef<HTMLButtonElement>(null);
  const [inView, setInView] = useState(false);
  // Snow globe mode: the village fills the screen sideways, like a game on a phone or tablet.
  const [globe, setGlobe] = useState(false);
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const visibility = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    visibility.observe(el);
    return () => visibility.disconnect();
  }, []);

  async function enterGlobe() {
    setGlobe(true);
    const section = postcard.current;
    try {
      // Android and tablets: real full screen, turned to landscape. Phones without these APIs
      // (iPhone Safari) get the CSS version, which turns the scene sideways to fill the screen.
      if (section?.requestFullscreen && !document.fullscreenElement) await section.requestFullscreen({ navigationUI: "hide" });
      await (screen.orientation as LockableOrientation | undefined)?.lock?.("landscape");
    } catch { /* The CSS fallback already fills the screen. */ }
  }
  const exitGlobe = useCallback(() => {
    setGlobe(false);
    try { screen.orientation?.unlock?.(); } catch { /* Not locked. */ }
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    requestAnimationFrame(() => globeButton.current?.focus({ preventScroll: true }));
  }, []);
  useEffect(() => {
    if (!globe) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") exitGlobe(); };
    // Leaving full screen with the system back gesture also leaves snow globe mode.
    let entered = Boolean(document.fullscreenElement);
    const onFullscreen = () => {
      if (document.fullscreenElement) entered = true;
      else if (entered) exitGlobe();
    };
    const scrolling = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      document.documentElement.style.overflow = scrolling;
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFullscreen);
    };
  }, [globe, exitGlobe]);

  return (
    <section ref={postcard} className={styles.postcard} data-globe={globe || undefined} aria-labelledby="winter-village-title">
      <div ref={viewport} id="winter-village-picture" className={styles.globeStage} role="group" aria-label="Illustrated Millstadt village">
        {globe && (
          <button type="button" className={styles.globeExit} onClick={exitGlobe} aria-label="Leave snow globe mode">
            <X size={18} aria-hidden="true" />
          </button>
        )}
        <div className={styles.artboard} data-visible={inView}>
          <div className={styles.town} data-hunt-scene="">
            <Image className={styles.village} src="/images/winter/millstadt-village.webp"
              alt="A snowy Millstadt Christmas postcard with the old Tin Man water tower, the brick corner store, the former firehouse and St. James Catholic Church. A snowman and Santa flank the street."
              fill sizes="100vw" unoptimized />
            {/* Every painted Christmas bulb on the buildings and trees twinkles: four glow layers
                cut from the painting itself, blinking out of step. */}
            {[0, 1, 2, 3].map(layer => (
              <Image key={layer} className={styles.twinkle} data-layer={layer} src={`/images/winter/twinkle/village-${layer}.webp`}
                alt="" fill sizes="100vw" unoptimized aria-hidden="true" />
            ))}
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
            {/* The heading and the countdown under it. Pop-ups never cover the village (it's off-limits
                to them), and the countdown sits above everything painted in the scene. */}
            <div className={styles.greetingBlock}>
              <h2 className={styles.greeting} id="winter-village-title">
                <span>Christmas in</span>
                {/* The official millStadt windmill wordmark from the Millstadt EMS logo. */}
                <Image className={styles.wordmark} src="/images/winter/kit/millstadt-wordmark.png" alt="Millstadt"
                  width={900} height={368} sizes="(max-width: 720px) 60vw, 34vw" unoptimized priority={false} />
              </h2>
              <ChristmasCountdown />
            </div>
            <WinterVillageHuntTarget />
            <WinterTruckMedics active={inView} />
            <WinterStreet active={inView} />
            {fleet.map(rig => <FleetRig key={rig.unit} {...rig} />)}
            <div className={styles.snoopy} data-snow-fighter="snoopy" data-snow-hand="0.55,0.35">
              <Image src="/images/winter/rose-beagle.webp" alt="A white beagle lies on his back on a snowy red doghouse, holding a red rose." fill sizes="(max-width: 720px) 100px, 15vw" unoptimized />
            </div>
            <div className={styles.grinch} data-snow-fighter="grinch" data-snow-hand="0.7,0.38">
              <Image src="/images/winter/grinch.webp" alt="The Grinch in the snow" fill sizes="(max-width: 720px) 90px, 13vw" unoptimized />
            </div>
            {/* Santa is painted into the village beside his presents; snowballs that reach him get a laugh. */}
            <span className={styles.santa} data-snow-santa="" aria-hidden="true" />
            <WinterSnowChief person="jen" />
            <WinterSnowChief person="kenny" />
            <Image className={styles.bank} src="/images/winter/village-snowbank.webp"
              alt="" width={1500} height={258} sizes="100vw" unoptimized />
            {/* The Best Fish in Town: the real red fish stand on the front snowbank. Its Santa cheers
                with his sign, a fishing pole over his shoulder and a trout swinging on the line;
                a snowball makes him duck. */}
            <div className={styles.fishStand} aria-hidden="true">
              <Image className={styles.fishHouse} src="/images/winter/kit/fish-stand-building.webp" alt=""
                width={917} height={709} sizes="(max-width: 720px) 170px, 20vw" unoptimized />
              {[0, 1].map(layer => (
                <Image key={layer} className={`${styles.fishHouse} ${styles.twinkle}`} data-layer={layer + 1}
                  src={`/images/winter/twinkle/fish-stand-${layer}.webp`} alt="" width={917} height={709}
                  sizes="(max-width: 720px) 170px, 20vw" unoptimized />
              ))}
              <span className={styles.fishSanta} data-snow-fighter="fish-santa" data-snow-role="target" data-snow-santa="">
                <span className={styles.fishCheer}>
                  <FishingPole />
                  <Image src="/images/winter/kit/fish-santa-full.webp" alt="" width={276} height={640}
                    sizes="(max-width: 720px) 50px, 5vw" unoptimized />
                </span>
              </span>
            </div>
          </div>
          <WinterStreetForeground active={inView} />
        </div>
      </div>
      {/* Snow globe mode is sideways only: held upright, the scene turns with it and this asks the
          visitor to turn the phone (it fades away for phones whose screen rotation is locked). */}
      {globe && (
        <div className={styles.globeHint} aria-hidden="true">
          <Smartphone size={42} />
          <span>Turn your phone sideways</span>
        </div>
      )}
      <div className={styles.controls} role="group" aria-label="Explore the Christmas village">
        <button type="button" ref={globeButton} className={styles.globeButton} onClick={() => void enterGlobe()}
          aria-label="Play the snowball fight in snow globe mode, full screen and sideways">
          <Smartphone size={17} aria-hidden="true" />
          Snow globe mode
        </button>
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
          <WinterCocoaProvider><VillagePostcard /></WinterCocoaProvider>
        </WinterVillageHuntProvider>
      )}
    </div>
  );
}
