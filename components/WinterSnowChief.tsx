"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import styles from "./WinterSnowChief.module.css";

const powder = [
  [-57, -37, 0], [-43, -64, 42], [-27, -77, 28], [-16, -53, 65], [-4, -84, 15],
  [11, -66, 47], [23, -80, 31], [34, -58, 72], [49, -65, 22], [62, -40, 52],
];
type Pose = "waiting" | "out" | "buried";
type Fight = "idle" | "incoming" | "impact" | "windup" | "return" | "splat" | "recover";
type Flight = { startX: number; startY: number; endX: number; endY: number };

function SnowFlight({ phase, line }: { phase: Fight; line: Flight }) {
  if (phase !== "incoming" && phase !== "return" && phase !== "splat") return null;
  const style = {
    "--x0": line.startX + "px", "--y0": line.startY + "px",
    "--via-x": (line.startX + (line.endX - line.startX) * .48) + "px",
    "--via-y": ((line.startY + line.endY) * .5 - Math.min(78, window.innerHeight * .09)) + "px",
    "--x1": line.endX + "px", "--y1": line.endY + "px",
  } as CSSProperties;
  return createPortal(
    <div className={styles.lens} data-snow-flight={phase} style={style} aria-hidden="true">
      {phase === "splat" ? <div className={styles.splat}><i /><i /><i /><i /><i /><i /></div> : <div className={styles.ball} />}
    </div>, document.body,
  );
}

export default function WinterSnowChief() {
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
    function popUp() {
      if (poseRef.current === "out" || !onScreen()) return;
      waitingForPortrait = !portrait!.complete || !portrait!.naturalWidth;
      if (!waitingForPortrait) { poseRef.current = "out"; setPose("out"); }
    }
    function bury() {
      waitingForPortrait = false;
      if (poseRef.current !== "out") return;
      poseRef.current = "buried";
      cancelFight();
      setPose("buried");
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
    portrait.addEventListener("load", imageReady, options);
    return () => {
      listeners.abort();
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
      busy.current = false;
    };
  }, [cancelFight]);

  function throwSnow(event: MouseEvent<HTMLButtonElement>) {
    if (poseRef.current !== "out" || busy.current || !figure.current || (event.detail !== 0 && gesture.current.drag)) return;
    const area = figure.current.getBoundingClientRect();
    const faceX = area.left + area.width * .5, faceY = area.top + area.height * .24;
    busy.current = true;
    setFlight({
      startX: window.innerWidth * .59,
      startY: Math.min(window.innerHeight - 20, Math.max(faceY + 100, window.innerHeight * .91)),
      endX: faceX, endY: faceY,
    });
    setPhase("incoming");
    setStatus("You threw a snowball!");
    const after = (ms: number, action: () => void) => {
      timers.current.push(window.setTimeout(() => { if (busy.current && poseRef.current === "out") action(); }, ms));
    };
    after(400, () => { setPhase("impact"); setStatus("Direct hit! The chief is getting a snowball ready."); });
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
    after(1740, () => { setPhase("splat"); setStatus("The chief got you back!"); });
    after(2200, () => setPhase("recover"));
    after(2560, () => { busy.current = false; timers.current = []; setPhase("idle"); setFlight(null); });
  }

  const angry = phase !== "idle" && phase !== "incoming" && phase !== "recover";
  return (
    <div ref={actor} className={styles.chief} data-snow-chief="" data-revealed={pose === "out"}
      data-ducked={pose === "buried"} data-fight={phase} data-angry={angry}>
      <div className={styles.pose}>
        <div ref={figure} className={styles.figure}>
          <div className={styles.action}>
            <div className={styles.body}>
              <Image ref={image} className={styles.portrait} src="/images/winter/snow-chief-boo.webp"
                alt="The Millstadt EMS chief pops out of a snowdrift with wide eyes and both hands raised." width={661} height={600} loading="eager" unoptimized />
              <Image className={styles.mad} src="/images/winter/snow-chief-mad.webp" alt="" width={661} height={600} loading="eager" unoptimized />
            </div>
            <div className={styles.arm} aria-hidden="true">
              <span ref={palm} className={styles.palm} />
            </div>
            <Image className={styles.hat} src="/images/winter/snow-chief-hat.webp" alt="" width={661} height={600} loading="eager" unoptimized />
            <div className={styles.impactPuff} aria-hidden="true" />
          </div>
          {pose === "out" && <button type="button" className={styles.hit} aria-label="Throw a snowball at the chief"
            aria-disabled={phase !== "idle"} onClick={throwSnow}
            onPointerDown={(e) => { gesture.current = { x: e.clientX, y: e.clientY, drag: false }; }}
            onPointerMove={(e) => { if (e.buttons && Math.hypot(e.clientX - gesture.current.x, e.clientY - gesture.current.y) > 8) gesture.current.drag = true; }}
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
      {flight && <SnowFlight phase={phase} line={flight} />}
    </div>
  );
}
