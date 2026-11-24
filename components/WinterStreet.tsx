"use client";

import Image from "next/image";
import { Coffee } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState, type MouseEvent, type ReactNode, type RefObject } from "react";
import styles from "./WinterStreet.module.css";
import WinterRinkRescue from "./WinterRinkRescue";

type StreetProps = { active: boolean };

const CocoaContext = createContext<{
  pour: () => void;
  serving: number;
  stallButton: RefObject<HTMLButtonElement | null>;
} | null>(null);

export function WinterCocoaProvider({ children }: { children: ReactNode }) {
  const stallButton = useRef<HTMLButtonElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const pours = useRef(0);
  const [serving, setServing] = useState(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function pour() {
    const stand = stallButton.current;
    if (!stand) return;
    const viewport = stand.closest("#winter-village-picture");
    if (viewport instanceof HTMLElement) {
      const screen = viewport.getBoundingClientRect();
      const booth = stand.getBoundingClientRect();
      if (booth.left < screen.left || booth.right > screen.right) {
        const prefersStill = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        viewport.scrollBy({ left: booth.left - screen.left - screen.width * .15, behavior: prefersStill ? "instant" : "smooth" });
      }
    }
    window.clearTimeout(timer.current);
    setServing(++pours.current);
    timer.current = window.setTimeout(() => setServing(0), 4200);
  }

  return (
    <CocoaContext.Provider value={{ pour, serving, stallButton }}>
      {children}
      <span className={styles.announcement} role="status">
        {serving ? <span key={serving}>Your hot cocoa is ready. Extra marshmallows!</span> : null}
      </span>
    </CocoaContext.Provider>
  );
}

export function WinterCocoaControl({ className }: { className?: string }) {
  const cocoa = useContext(CocoaContext);
  return (
    <button type="button" className={`${styles.pour} ${className ?? ""}`} disabled={!cocoa}
      onClick={cocoa?.pour} aria-label="Pour cocoa at the village stand">
      <Coffee size={17} aria-hidden="true" />
      Pour cocoa
    </button>
  );
}

function CocoaStall() {
  const cocoa = useContext(CocoaContext);
  return (
    <div className={styles.stall} data-serving={Boolean(cocoa?.serving)}>
      <Image src="/images/winter/street/cocoa-stall.webp" alt=""
        width={398} height={500} sizes="(max-width: 720px) 100px, 13vw" unoptimized />
      <span className={styles.steam} aria-hidden="true"><i /><i /></span>
      <button type="button" ref={cocoa?.stallButton} className={styles.stallButton} disabled={!cocoa}
        title="Pour hot cocoa" aria-label="Pour a mug of hot cocoa at the striped village stand" onClick={cocoa?.pour}>
        <span className={styles.cocoaBadge}><Coffee size={14} aria-hidden="true" /></span>
      </button>
      {cocoa?.serving ? (
        <div key={cocoa.serving} className={styles.delivery} aria-hidden="true">
          <span className={styles.cup}><i /></span>
          <span className={styles.speech}>Hot cocoa!</span>
        </div>
      ) : null}
    </div>
  );
}

export default function WinterStreet({ active }: StreetProps) {
  return (
    <div className={styles.street} data-active={active}>
      <div className={styles.carolers}>
        <Image src="/images/winter/street/carolers.webp" alt="Three bundled carolers sing by lantern light at the corner store."
          width={347} height={490} sizes="7vw" unoptimized />
        <i className={styles.lantern} aria-hidden="true" />
      </div>
      <div className={styles.fireEngine}>
        <Image src="/images/winter/street/fire-engine.webp" alt="Millstadt’s Old No. 5 parade fire engine, decorated with garland and Christmas lights."
          width={720} height={362} sizes="(max-width: 720px) 165px, 22vw" unoptimized />
        <span className={styles.lamps} aria-hidden="true"><i /><i /><i /><i /></span>
      </div>
    </div>
  );
}

function Skater({ solo = false }: { solo?: boolean }) {
  const src = solo ? "/images/winter/street/solo-skater.webp" : "/images/winter/street/skating-family.webp";
  const width = solo ? 373 : 410;
  const height = solo ? 500 : 488;
  const person = solo ? "solo" : "family";
  const art = useRef<HTMLImageElement>(null);
  const nextShot = useRef(0);
  const drag = useRef({ x: 0, y: 0, moved: false });
  const [snow, setSnow] = useState<number[]>([]);
  function throwSnowball(event: MouseEvent<HTMLButtonElement>) {
    if (!art.current || (event.detail && drag.current.moved)) return;
    const rink = event.currentTarget.closest("[data-winter-rink]");
    if (!rink) return;
    const ground = rink.getBoundingClientRect(), player = art.current.getBoundingClientRect();
    const request = new CustomEvent("winter-rink-shot", { cancelable: true, detail: {
      person, x: (player.left + player.width * (solo ? .51 : .29) - ground.left) / ground.width,
      floor: (ground.bottom - player.top - player.height * (solo ? .98 : .85)) / ground.height,
    } });
    if (!window.dispatchEvent(request)) {
      const id = ++nextShot.current;
      setSnow(previous => [...previous.slice(-3), id]);
    }
  }
  return (
    <div className={solo ? styles.soloLane : styles.familyLane} data-skater={person}>
      <div className={styles.skater}>
        <span className={styles.skateShadow} aria-hidden="true" />
        <div className={styles.reflection} aria-hidden="true">
          <Image src={src} alt="" width={width} height={height} sizes="14vw" unoptimized />
        </div>
        <Image ref={art} className={styles.person} src={src}
          alt={solo ? "A young skater glides past in a golden scarf." : "A father steadies his daughter as she skates across the ice."}
          width={width} height={height} sizes="(max-width: 720px) 100px, 14vw" unoptimized />
        <button type="button" className={styles.skateTarget} aria-describedby="rink-snowball-instructions" aria-label={solo ? "Throw a snowball at the skater in the golden scarf" : "Throw a snowball at the skating father"}
          onPointerDown={e => { drag.current = { x: e.clientX, y: e.clientY, moved: false }; }}
          onPointerMove={e => { if (e.buttons && Math.hypot(e.clientX - drag.current.x, e.clientY - drag.current.y) > 8) drag.current.moved = true; }}
          onPointerCancel={() => { drag.current.moved = true; }} onClick={throwSnowball} />
        {snow.map(id => <span key={id} className={styles.skateShot} aria-hidden="true"
          onAnimationEnd={e => { if (e.target === e.currentTarget) setSnow(previous => previous.filter(shot => shot !== id)); }}><i /></span>)}
      </div>
    </div>
  );
}

export function WinterStreetForeground({ active }: StreetProps) {
  return (
    <div className={styles.rink} data-winter-rink="" data-active={active} role="group" aria-label="The Christmas skating rink">
      <div className={styles.rinkLights} aria-hidden="true"><i /><i /><i /></div>
      <CocoaStall />
      <div className={styles.neighbors}>
        <Image src="/images/winter/street/neighbors.webp" alt="Five neighbors with cocoa, wrapped presents and a lantern watch from the snowy edge of the rink."
          width={600} height={469} sizes="(max-width: 720px) 130px, 16vw" unoptimized />
      </div>
      <span id="rink-snowball-instructions" className={styles.announcement}>Land three snowballs on the same skater within two seconds for a visit from the Millstadt medics.</span>
      <Skater solo />
      <Skater />
      <WinterRinkRescue />
    </div>
  );
}
