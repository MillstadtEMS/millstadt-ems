"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { isSnowballTimeout, snowballTimeoutEvent } from "@/lib/seasonal/snowballTimeout";
import { tapSlop } from "@/lib/device/profile";
import { claimPerson } from "@/lib/seasonal/cast";
import styles from "./WinterSnowChief.module.css";

const powder = [
  [-57, -37, 0], [-43, -64, 42], [-27, -77, 28], [-16, -53, 65], [-4, -84, 15],
  [11, -66, 47], [23, -80, 31], [34, -58, 72], [49, -65, 22], [62, -40, 52],
];
const people = {
  jen: {
    name: "Jen", surprise: "/images/winter/snow-chief-boo.webp", mad: "/images/winter/snow-chief-mad.webp",
    faceX: .5, faceY: .24, alt: "Jen pops out of a Millstadt snowdrift with wide eyes, a Santa hat and both hands raised.",
    // Her raised right palm (screen right): the site-wide fight packs and throws its snowball there.
    palm: "0.87,0.23",
  },
  kenny: {
    name: "Kenny", surprise: "/images/winter/kenny/snow-boo.webp", mad: "/images/winter/kenny/snow-mad.webp",
    faceX: .53, faceY: .26, alt: "Kenny pops out of another snowdrift in his EMS uniform and Santa hat, holding a lump of coal.",
    // His open, raised palm (screen left; the coal stays in the other hand).
    palm: "0.2,0.235",
  },
} as const;
type Person = keyof typeof people;
type Pose = "waiting" | "out" | "buried";
type Fight = "idle" | "incoming" | "impact" | "windup" | "return" | "splat" | "recover";
type Flight = { startX: number; startY: number; endX: number; endY: number };

function SnowFlight({ phase, line, person }: { phase: Fight; line: Flight; person: Person }) {
  if (phase !== "incoming" && phase !== "return" && phase !== "splat") return null;
  const style = {
    "--x0": line.startX + "px", "--y0": line.startY + "px",
    "--via-x": (line.startX + (line.endX - line.startX) * .48) + "px",
    "--via-y": ((line.startY + line.endY) * .5 - Math.min(78, window.innerHeight * .09)) + "px",
    "--x1": line.endX + "px", "--y1": line.endY + "px",
  } as CSSProperties;
  return createPortal(
    <div className={styles.lens} data-snow-flight={phase} data-person={person} style={style} aria-hidden="true">
      {phase === "splat" ? <div className={styles.splat}><i /><i /><i /><i /><i /><i /></div> : <div className={styles.ball} />}
    </div>, document.body,
  );
}

export default function WinterSnowChief({ person }: { person: Person }) {
  const chief = people[person];
  const actor = useRef<HTMLDivElement>(null);
  const figure = useRef<HTMLDivElement>(null);
  const palm = useRef<HTMLSpanElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const poseRef = useRef<Pose>("waiting");
  const busy = useRef(false);
  const timers = useRef<number[]>([]);
  const gesture = useRef({ x: 0, y: 0, drag: false });
  const [pose, setPose] = useState<Pose>("waiting");
  const [phase, setPhase] = useState<Fight>("idle");
  const [flight, setFlight] = useState<Flight | null>(null);
  const [status, setStatus] = useState("");

  const cancelFight = useCallback(() => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    busy.current = false;
    setPhase("idle");
    setFlight(null);
    setStatus("");
  }, []);

  useEffect(() => {
    const element = actor.current;
    const portrait = image.current;
    if (!element || !portrait) return;
    let lastY = window.scrollY, intent = 0, touchX = 0, touchY = 0;
    let holdingScrollbar = false, waitingForPortrait = false;

    function onScreen() {
      const box = element!.getBoundingClientRect();
      const bottomClearance = window.innerWidth < 768 ? 84 : 24;
      return box.top + Math.min(28, box.height * .25) < window.innerHeight - bottomClearance &&
        box.bottom > 130 && box.right > 0 && box.left < window.innerWidth;
    }
    // One act per person at a time: if they're already out in another act, they wait their turn.
    let release: (() => void) | null = null;
    function popUp() {
      if (isSnowballTimeout() || poseRef.current === "out" || !onScreen()) return;
      waitingForPortrait = !portrait!.complete || !portrait!.naturalWidth;
      if (waitingForPortrait) return;
      release ??= claimPerson(person);
      if (!release) return;
      poseRef.current = "out"; setPose("out");
    }
    function bury() {
      waitingForPortrait = false;
      if (poseRef.current !== "out") return;
      poseRef.current = "buried";
      cancelFight();
      setPose("buried");
      release?.(); release = null;
    }
    function onScroll() {
      const y = window.scrollY;
      const distance = y - lastY;
      const movement = Math.sign(distance);
      lastY = y;
      if (holdingScrollbar && Math.abs(distance) < 2) return;
      // Ignore fragment alignment, viewport changes, layout shifts and camera panning.
      if (!movement || (!holdingScrollbar && movement !== intent)) return;
      if (movement < 0) bury();
      else if (busy.current && !onScreen()) cancelFight();
      else popUp();
    }
    function direction(down: boolean) { intent = down ? 1 : -1; if (!down) waitingForPortrait = false; }
    function clearIntent() { intent = 0; }
    function wheel(event: WheelEvent) {
      if (event.isTrusted && !event.ctrlKey && Math.abs(event.deltaY) > Math.abs(event.deltaX)) direction(event.deltaY > 0);
    }
    function touchStart(event: TouchEvent) {
      touchX = event.touches[0]?.clientX ?? 0;
      touchY = event.touches[0]?.clientY ?? 0;
      clearIntent();
    }
    function touchMove(event: TouchEvent) {
      if (!event.isTrusted || event.touches.length !== 1) { clearIntent(); return; }
      const { clientX: x, clientY: y } = event.touches[0];
      const dy = y - touchY;
      if (Math.abs(dy) < 2) return;
      if (Math.abs(dy) > Math.abs(x - touchX)) direction(dy < 0); else clearIntent();
      touchX = x; touchY = y;
    }
    function key(event: KeyboardEvent) {
      if (!event.isTrusted || event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey ||
          (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable=true], dialog"))) return;
      if (["ArrowDown", "PageDown", "End"].includes(event.key)) direction(true);
      else if (["ArrowUp", "PageUp", "Home"].includes(event.key)) direction(false);
      else if (event.key === " " && !(event.target instanceof HTMLElement && event.target.closest("button, a"))) direction(!event.shiftKey);
    }
    function pointerDown(event: PointerEvent) {
      clearIntent();
      holdingScrollbar = event.isTrusted && event.pointerType === "mouse" && event.clientX >= document.documentElement.clientWidth - 2;
    }
    function pointerUp() { holdingScrollbar = false; }
    function imageReady() { if (waitingForPortrait) popUp(); }

    const listeners = new AbortController();
    const options = { passive: true, signal: listeners.signal };
    window.addEventListener("scroll", onScroll, options);
    window.addEventListener("scrollend", clearIntent, options);
    window.addEventListener("wheel", wheel, options);
    window.addEventListener("touchstart", touchStart, options);
    window.addEventListener("touchmove", touchMove, options);
    window.addEventListener("keydown", key, options);
    window.addEventListener("pointerdown", pointerDown, options);
    window.addEventListener("pointerup", pointerUp, options);
    window.addEventListener("pointercancel", pointerUp, options);
    window.addEventListener("blur", pointerUp, options);
    window.addEventListener("hashchange", () => { clearIntent(); waitingForPortrait = false; }, options);
    document.addEventListener("visibilitychange", () => { if (document.hidden && busy.current) cancelFight(); }, options);
    window.addEventListener(snowballTimeoutEvent, () => { if (isSnowballTimeout()) bury(); }, options);
    portrait.addEventListener("load", imageReady, options);
    return () => {
      listeners.abort();
      release?.(); release = null;
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
      busy.current = false;
    };
  }, [cancelFight, person]);

  function throwSnow(event: MouseEvent<HTMLButtonElement>) {
    if (poseRef.current !== "out" || busy.current || !figure.current || (event.detail !== 0 && gesture.current.drag)) return;
    const area = figure.current.getBoundingClientRect();
    const faceX = area.left + area.width * chief.faceX, faceY = area.top + area.height * chief.faceY;
    busy.current = true;
    setFlight({
      startX: window.innerWidth * .59,
      startY: Math.min(window.innerHeight - 20, Math.max(faceY + 100, window.innerHeight * .91)),
      endX: faceX, endY: faceY,
    });
    setPhase("incoming");
    setStatus(`You threw a snowball at ${chief.name}!`);
    const after = (ms: number, action: () => void) => {
      timers.current.push(window.setTimeout(() => { if (busy.current && poseRef.current === "out") action(); }, ms));
    };
    after(400, () => { setPhase("impact"); setStatus(`Direct hit! ${chief.name} is getting a snowball ready.`); });
    after(650, () => setPhase("windup"));
    after(1230, () => {
      const hand = palm.current?.getBoundingClientRect();
      if (!hand) { cancelFight(); return; }
      setFlight({
        startX: hand.left + hand.width / 2, startY: hand.top + hand.height / 2,
        endX: window.innerWidth * .52, endY: window.innerHeight * .46,
      });
      setPhase("return");
    });
    after(1740, () => { setPhase("splat"); setStatus(`${chief.name} got you back!`); });
    after(2200, () => setPhase("recover"));
    after(2560, () => { busy.current = false; timers.current = []; setPhase("idle"); setFlight(null); });
  }

  const angry = phase !== "idle" && phase !== "incoming" && phase !== "recover";
  return (
    <div ref={actor} className={styles.chief} data-snow-chief="" data-person={person}
      data-snow-fighter={person} data-snow-own-click="" data-snow-off={pose !== "out"} data-snow-hand={chief.palm} data-snow-windup={chief.palm}
      style={{ "--throw-art": `url("${chief.mad}")` } as CSSProperties} data-revealed={pose === "out"}
      data-ducked={pose === "buried"} data-fight={phase} data-angry={angry}>
      <div className={styles.pose}>
        <div ref={figure} className={styles.figure}>
          <div className={styles.action}>
            <div className={styles.body}>
              <Image ref={image} className={styles.portrait} src={chief.surprise}
                alt={chief.alt} width={661} height={600} loading="eager" unoptimized />
              <Image className={styles.mad} src={chief.mad} alt="" width={661} height={600} loading="eager" unoptimized />
            </div>
            <div className={styles.arm} aria-hidden="true">
              <span ref={palm} className={styles.palm} />
            </div>
            {person === "jen" && <Image className={styles.hat} src="/images/winter/snow-chief-hat.webp" alt="" width={661} height={600} loading="eager" unoptimized />}
            <div className={styles.impactPuff} aria-hidden="true" />
          </div>
          {pose === "out" && <button type="button" className={styles.hit} aria-label={`Throw a snowball at ${chief.name} in the snowbank`}
            aria-disabled={phase !== "idle"} data-snow-target={phase === "idle" ? "" : undefined} onClick={throwSnow}
            onPointerDown={(e) => { gesture.current = { x: e.clientX, y: e.clientY, drag: false }; }}
            onPointerMove={(e) => { if (e.buttons && Math.hypot(e.clientX - gesture.current.x, e.clientY - gesture.current.y) > tapSlop(e.pointerType)) gesture.current.drag = true; }}
            onPointerCancel={() => { gesture.current.drag = true; }} />}
        </div>
      </div>
      <div className={styles.powder} aria-hidden="true">
        {powder.map(([x, y, delay], i) => (
          <i key={x} style={{
            "--x": x + "cqw", "--y": y + "cqw", "--delay": delay + "ms",
            "--start": (15 + i * 7.7) + "%", "--size": (2 + i % 3) + "cqw",
          } as CSSProperties} />
        ))}
      </div>
      <span role="status" className={styles.sr}>{status}</span>
      {flight && <SnowFlight phase={phase} line={flight} person={person} />}
    </div>
  );
}
