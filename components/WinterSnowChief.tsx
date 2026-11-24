"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./WinterSnowChief.module.css";

const powder = [
  [-57, -37, 0], [-43, -64, 42], [-27, -77, 28], [-16, -53, 65], [-4, -84, 15],
  [11, -66, 47], [23, -80, 31], [34, -58, 72], [49, -65, 22], [62, -40, 52],
];

export default function WinterSnowChief() {
  const actor = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const [pose, setPose] = useState<"waiting" | "out" | "buried">("waiting");

  useEffect(() => {
    const element = actor.current;
    const portrait = image.current;
    if (!element || !portrait) return;
    let lastY = window.scrollY;
    let intent = 0;
    let touchY = 0;
    let holdingScrollbar = false;
    let waitingForPortrait = false;

    function onScreen() {
      const box = element!.getBoundingClientRect();
      const bottomClearance = window.innerWidth < 768 ? 84 : 24;
      return box.top + Math.min(28, box.height * .25) < window.innerHeight - bottomClearance &&
        box.bottom > 130 && box.right > 0 && box.left < window.innerWidth;
    }

    function popUp() {
      if (!onScreen()) return;
      waitingForPortrait = !portrait!.complete || !portrait!.naturalWidth;
      if (!waitingForPortrait) setPose("out");
    }

    function onScroll() {
      const y = window.scrollY;
      const distance = y - lastY;
      const movement = Math.sign(distance);
      lastY = y;
      // Native thumbs can nudge the page by a fractional pixel after a drag stops.
      if (holdingScrollbar && Math.abs(distance) < 2) return;
      // Focus, fragment alignment and layout shifts also move the document.
      if (!movement || (!holdingScrollbar && movement !== intent)) return;
      if (movement > 0) {
        popUp();
      } else {
        waitingForPortrait = false;
        setPose((previous) => previous === "out" ? "buried" : previous);
      }
    }

    function direction(down: boolean) {
      intent = down ? 1 : -1;
      if (!down) waitingForPortrait = false;
    }
    function clearIntent() { intent = 0; }
    function wheel(event: WheelEvent) {
      if (event.isTrusted && !event.ctrlKey && Math.abs(event.deltaY) > Math.abs(event.deltaX)) direction(event.deltaY > 0);
    }
    function touchStart(event: TouchEvent) {
      touchY = event.touches[0]?.clientY ?? 0;
      clearIntent();
    }
    function touchMove(event: TouchEvent) {
      if (!event.isTrusted) return;
      const y = event.touches[0]?.clientY;
      if (y === undefined || Math.abs(y - touchY) < 2) return;
      direction(y < touchY);
      touchY = y;
    }
    function key(event: KeyboardEvent) {
      if (!event.isTrusted || event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey ||
          (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable=true], dialog"))) return;
      if (["ArrowDown", "PageDown", "End"].includes(event.key)) direction(true);
      else if (["ArrowUp", "PageUp", "Home"].includes(event.key)) direction(false);
      else if (event.key === " ") direction(!event.shiftKey);
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
    portrait.addEventListener("load", imageReady, options);
    return () => listeners.abort();
  }, []);

  return (
    <div ref={actor} className={styles.chief} data-snow-chief="" data-revealed={pose === "out"} data-ducked={pose === "buried"}>
      <div className={styles.pose}>
        <Image ref={image} className={styles.portrait} src="/images/winter/snow-pop.webp"
          alt="The Millstadt EMS chief in a Santa hat throws snow from both hands as she pops out of the drift."
          fill sizes="(max-width: 720px) 140px, 19vw" loading="eager" unoptimized />
      </div>
      <div className={styles.powder} aria-hidden="true">
        {powder.map(([x, y, delay], i) => (
          <i key={x} style={{
            "--x": x + "cqw", "--y": y + "cqw", "--delay": delay + "ms",
            "--start": (15 + i * 7.7) + "%", "--size": (2 + i % 3) + "cqw",
          } as CSSProperties} />
        ))}
      </div>
    </div>
  );
}
