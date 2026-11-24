"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./WinterSnowChief.module.css";

const SHOW_MS = 4100;
const powder = [
  [-57, -37, 0], [-43, -64, 42], [-27, -77, 28], [-16, -53, 65], [-4, -84, 15],
  [11, -66, 47], [23, -80, 31], [34, -58, 72], [49, -65, 22], [62, -40, 52],
];

export default function WinterSnowChief() {
  const actor = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const element = actor.current;
    const portrait = image.current;
    if (!element || !portrait) return;
    let lastY = window.scrollY;
    let deepestY = lastY;
    let intentUntil = 0;
    let touchY = 0;
    let holdingScrollbar = false;
    let armed = true;
    let waitingForPortrait = false;
    let finishTimer = 0;

    function onScreen() {
      const box = element!.getBoundingClientRect();
      const bottomClearance = window.innerWidth < 768 ? 84 : 24;
      return box.top + Math.min(28, box.height * .25) < window.innerHeight - bottomClearance &&
        box.bottom > 130 && box.right > 0 && box.left < window.innerWidth;
    }

    function play() {
      if (!armed || finishTimer || !onScreen()) return;
      if (!portrait!.complete || !portrait!.naturalWidth) {
        waitingForPortrait = true;
        return;
      }
      armed = false;
      waitingForPortrait = false;
      deepestY = window.scrollY;
      setRevealed(true);
      finishTimer = window.setTimeout(() => {
        finishTimer = 0;
        setRevealed(false);
      }, SHOW_MS);
    }

    function onScroll() {
      const y = window.scrollY;
      const previous = lastY;
      lastY = y;
      deepestY = Math.max(deepestY, y);
      if (y < previous) {
        waitingForPortrait = false;
        if (deepestY - y >= 56) {
          armed = true;
          deepestY = y;
        }
        return;
      }
      // Browser fragment alignment, focus changes, and layout shifts can also scroll the document.
      if (y > previous && (holdingScrollbar || performance.now() < intentUntil)) play();
    }

    function direction(down: boolean) {
      intentUntil = down ? performance.now() + 1250 : 0;
      if (!down) waitingForPortrait = false;
    }
    function wheel(event: WheelEvent) {
      if (event.isTrusted && !event.ctrlKey && Math.abs(event.deltaY) > Math.abs(event.deltaX)) direction(event.deltaY > 0);
    }
    function touchStart(event: TouchEvent) {
      touchY = event.touches[0]?.clientY ?? 0;
      intentUntil = 0;
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
      direction(false);
      holdingScrollbar = event.isTrusted && event.pointerType === "mouse" && event.clientX >= document.documentElement.clientWidth - 2;
    }
    function pointerUp() { holdingScrollbar = false; }
    function imageReady() { if (waitingForPortrait) play(); }

    const listeners = new AbortController();
    const options = { passive: true, signal: listeners.signal };
    window.addEventListener("scroll", onScroll, options);
    window.addEventListener("wheel", wheel, options);
    window.addEventListener("touchstart", touchStart, options);
    window.addEventListener("touchmove", touchMove, options);
    window.addEventListener("keydown", key, options);
    window.addEventListener("pointerdown", pointerDown, options);
    window.addEventListener("pointerup", pointerUp, options);
    window.addEventListener("pointercancel", pointerUp, options);
    window.addEventListener("hashchange", () => direction(false), options);
    portrait.addEventListener("load", imageReady, options);
    return () => {
      window.clearTimeout(finishTimer);
      listeners.abort();
    };
  }, []);

  return (
    <div ref={actor} className={styles.chief} data-snow-chief="" data-revealed={revealed}
      style={{ "--show-duration": SHOW_MS + "ms" } as CSSProperties}>
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
