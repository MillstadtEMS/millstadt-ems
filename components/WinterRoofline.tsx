"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState, useCallback, useSyncExternalStore, type CSSProperties, type RefObject } from "react";
import { createPortal } from "react-dom";
import styles from "./WinterRoofline.module.css";

const bulbs = ["#ff463e", "#ffca48", "#48ef94", "#69caff", "#ff6956", "#ffdf8f", "#57dfab", "#ee80c7"];
const sockets = [0.07, 0.26, 0.47, 0.69, 0.89];
const swags = [21, 11, 17, 13, 16, 21];
type Chief = "jen" | "kenny";
const officers = {
  jen: { name: "Jen", folder: "/images/winter/" },
  kenny: { name: "Kenny", folder: "/images/winter/kenny/" },
} as const;
// This document's two dismissals follow client navigation and reset on reload.
const fallenChiefs = new Set<Chief>();
const controls = [
  "a", "button", "form", "input", "textarea", "select", "label", "summary", "iframe", "video", "audio",
  '[role="button"]', '[role="link"]', '[role="menuitem"]', '[role="switch"]', '[role="slider"]',
  '[role="tab"]', '[role="checkbox"]', '[role="radio"]', '[tabindex="0"]', '[contenteditable="true"]',
].join(",");
const maskWidth = 160, maskHeight = 240;

function HitMap() {
  return <svg className={styles.hitMap} viewBox="0 0 477 716" preserveAspectRatio="none" aria-hidden="true">
    <rect data-chief-ink="" width="477" height="716" fill="transparent" />
  </svg>;
}

const noSubscription = () => () => {};
const bodyOnClient = () => document.body;
const noBody = () => null;
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function HangingCrew({ chief, anchor, menuOpen }: { chief: Chief; anchor: RefObject<HTMLSpanElement | null>; menuOpen: boolean }) {
  const body = useSyncExternalStore<HTMLElement | null>(noSubscription, bodyOnClient, noBody);
  const puppet = useRef<HTMLDivElement>(null);
  const target = useRef<HTMLButtonElement>(null);
  const alpha = useRef<Uint8ClampedArray | null>(null);
  const retire = useRef<number | undefined>(undefined);
  const [gone, setGone] = useState(() => fallenChiefs.has(chief));
  const [shot, setShot] = useState<{ x: number; y: number } | null>(null);
  const officer = officers[chief];

  function loadMask(image: HTMLImageElement) {
    const canvas = document.createElement("canvas");
    canvas.width = maskWidth; canvas.height = maskHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    try {
      context.drawImage(image, 0, 0, maskWidth, maskHeight);
      alpha.current = context.getImageData(0, 0, maskWidth, maskHeight).data;
    } catch { /* Browsers that restrict canvas reads use the uniform's center below. */ }
  }

  const throwSnowball = useCallback((x: number, y: number) => {
    if (fallenChiefs.has(chief)) return;
    fallenChiefs.add(chief);
    setShot({ x, y });
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    retire.current = window.setTimeout(() => setGone(true), still ? 750 : 1460);
    if (!still) anchor.current?.parentElement?.animate([
      { transform: "translateY(0)" }, { transform: "translateY(-3px)" },
      { transform: "translateY(1px)" }, { transform: "translateY(0)" },
    ], { duration: 460, delay: 560, easing: "ease-out" });
  }, [anchor, chief]);

  useEffect(() => () => window.clearTimeout(retire.current), []);

  useEffect(() => {
    const figure = puppet.current;
    if (!body || !figure || shot || gone) return;
    let startX = 0, startY = 0;
    const start = (event: PointerEvent) => { startX = event.clientX; startY = event.clientY; };
    function hit(event: MouseEvent) {
      const mask = alpha.current;
      if (!figure || event.defaultPrevented || !event.detail || event.button !== 0 ||
          fallenChiefs.has(chief) || Math.hypot(event.clientX - startX, event.clientY - startY) > 9) return;
      if (!(event.target instanceof Element) || event.target.closest(controls)) return;
      // Ask the browser which rotated/clipped costume pieces are at this point.
      // The overlay only participates in hit-testing during this synchronous lookup,
      // so page links, form fields, text selection and touch scrolling retain priority.
      figure.dataset.sampling = "";
      let visibleInk = false;
      try {
        for (const element of document.elementsFromPoint(event.clientX, event.clientY)) {
          if (!(element instanceof SVGRectElement) || !element.hasAttribute("data-chief-ink") || !figure.contains(element)) continue;
          const matrix = element.getScreenCTM();
          if (!matrix) continue;
          const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
          if (point.y < 84) {
            const nearGrip = chief === "kenny" ? Math.abs(point.x - 238) < 25
              : Math.abs(point.x - 187) < 24 || Math.abs(point.x - 284) < 25;
            if (!nearGrip) continue;
          }
          const x = Math.floor(point.x * maskWidth / 477), y = Math.floor(point.y * maskHeight / 716);
          const shirtCenter = chief === "kenny" ? 94 : 81;
          const ink = mask ? mask[(y * maskWidth + x) * 4 + 3] > 70
            : Math.abs(x - shirtCenter) < 10 && y > 78 && y < 115;
          if (x >= 0 && x < maskWidth && y > 9 && y < maskHeight && ink) {
            visibleInk = true; break;
          }
        }
      } finally { delete figure.dataset.sampling; }
      if (visibleInk) {
        event.preventDefault();
        event.stopImmediatePropagation();
        throwSnowball(event.clientX, event.clientY);
      }
    }
    document.addEventListener("pointerdown", start, { passive: true, capture: true });
    document.addEventListener("click", hit, true);
    return () => {
      document.removeEventListener("pointerdown", start, true);
      document.removeEventListener("click", hit, true);
    };
  }, [body, chief, gone, shot, throwSnowball]);

  useLayoutEffect(() => {
    const figure = puppet.current;
    const pin = anchor.current;
    const header = pin?.closest("header") ?? pin?.closest<HTMLElement>("[data-winter-roof]");
    if (!body || !figure || !pin || !header || gone) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const scrollPositions = new WeakMap<Element, number>();
    let pageY = window.scrollY, lastInput = performance.now(), lastFrame = 0, raf = 0;
    let phase = chief === "kenny" ? 2.2 : 0, energy = 0, expression = 0, sign = 1;

    // These transforms move only composited layers. Geometry is cached at
    // resize/header changes so the scroll handler never requests layout.
    function paint() {
      if (!figure) return;
      figure.style.setProperty("--panic", reduced.matches ? "0" : Math.min(1, expression * 1.25).toFixed(3));
      const swing = energy * (Math.sin(phase) * 9.8 + sign * 1.9);
      const kickLeft = energy * (Math.sin(phase * 1.31 + .5) * 15 + 10);
      const kickRight = energy * (Math.sin(phase * 1.57 + 2) * 13 - 9);
      figure.style.setProperty("--swing", swing.toFixed(2) + "deg");
      figure.style.setProperty("--kick-left", kickLeft.toFixed(2) + "deg");
      figure.style.setProperty("--kick-right", kickRight.toFixed(2) + "deg");
    }

    function measure() {
      if (!figure || !pin || !header) return;
      const pos = pin.getBoundingClientRect();
      const view = document.documentElement.clientWidth;
      const hidden = !pos.width || pos.top < 5 || getComputedStyle(header).visibility === "hidden";
      const inset = figure.offsetWidth / 2 + 8;
      const x = hidden ? (chief === "kenny" ? inset : view - inset) : pos.left + pos.width / 2;
      const y = hidden ? Math.max(24, figure.offsetWidth * .076) : pos.top;
      figure.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      figure.style.setProperty("--tie-opacity", hidden ? "1" : "0");
      pageY = window.scrollY;
      paint();
      figure.dataset.ready = "";
    }

    function frame(now: number) {
      raf = 0;
      if (document.hidden || reduced.matches) return;
      const dt = Math.min(.045, Math.max(.001, (now - (lastFrame || now - 16)) / 1000));
      lastFrame = now;
      energy *= Math.exp(-dt * 2.25);
      expression += (energy - expression) * (1 - Math.exp(-dt * (energy > expression ? 18 : 2.3)));
      phase += dt * ((chief === "kenny" ? 4.9 : 5.5) + 7.5 * energy);
      if (energy < .008 && expression < .009) {
        energy = expression = lastFrame = 0;
        paint(); return;
      }
      paint();
      raf = requestAnimationFrame(frame);
    }

    function scroll(event: Event) {
      const scroller = event.target instanceof Element && event.target !== document.scrollingElement ? event.target : null;
      const y = scroller ? scroller.scrollTop : window.scrollY;
      const dy = y - (scroller ? scrollPositions.get(scroller) ?? 0 : pageY);
      if (scroller) scrollPositions.set(scroller, y);
      else pageY = y;
      if (Math.abs(dy) <= .1 || reduced.matches || document.hidden) return;
      const now = performance.now();
      const elapsed = Math.max(12, Math.min(65, now - lastInput));
      lastInput = now;
      sign = Math.sign(dy);
      const impulse = clamp01(.05 + Math.abs(dy) / elapsed * .60);
      energy = Math.max(energy, impulse);
      if (!raf) raf = requestAnimationFrame(frame);
    }
    function rest() {
      cancelAnimationFrame(raf); raf = energy = expression = lastFrame = 0;
      pageY = window.scrollY; paint();
    }
    const sizing = new ResizeObserver(measure);
    sizing.observe(header); sizing.observe(figure); sizing.observe(document.documentElement);
    const changing = new MutationObserver(measure);
    changing.observe(header, { attributes: true, attributeFilter: ["class", "style", "hidden", "aria-hidden"] });
    header.addEventListener("transitionend", measure);
    document.addEventListener("scroll", scroll, { passive: true, capture: true });
    window.addEventListener("resize", measure, { passive: true });
    document.addEventListener("visibilitychange", rest);
    reduced.addEventListener("change", rest);
    measure();
    return () => {
      sizing.disconnect(); changing.disconnect();
      cancelAnimationFrame(raf);
      header.removeEventListener("transitionend", measure);
      document.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", measure);
      document.removeEventListener("visibilitychange", rest);
      reduced.removeEventListener("change", rest);
    };
  }, [anchor, body, chief, gone]);

  if (!body) return null;
  if (gone) return shot ? createPortal(<span role="status" className={styles.announcement}>{officer.name} fell from the Christmas lights!</span>, body) : null;
  return createPortal(<>
    <div ref={puppet} className={styles.cradle} data-hanging-chief={chief} data-phase={shot ? "hit" : "hanging"}
      data-menu-open={menuOpen} style={{ "--chief-image": `url("${officer.folder}hanging.webp")` } as CSSProperties}>
      <svg className={styles.tether} viewBox="0 0 120 32" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 30C30 32 71 24 119 2" fill="none" stroke="#122a20" strokeWidth="3" />
        <path d="M0 29C30 31 71 23 119 1" fill="none" stroke="#9b9a65" strokeWidth=".75" />
        <path d="m31 29 1 4m39-13 2 4" stroke="#31452b" strokeWidth="2" />
        <ellipse cx="32" cy="33" rx="2.4" ry="3.7" fill="#ffbf65" />
        <ellipse cx="73" cy="25" rx="2.3" ry="3.4" fill="#ea7061" />
      </svg>
      <div className={styles.hanger}><div className={styles.drop}><div className={styles.idle}><div className={styles.figure}>
        <span className={styles.legLeft}><HitMap /></span><span className={styles.legRight}><HitMap /></span>
        {chief === "kenny" && <span className={styles.coal}><HitMap /></span>}
        <div className={styles.torso}>
          <Image src={officer.folder + "hanging.webp"} alt="" width={477} height={716} unoptimized
            loading="eager" onLoad={event => loadMask(event.currentTarget)} />
          <Image src={officer.folder + "hanging-startled.webp"} alt="" width={477} height={716} className={styles.alarmed} unoptimized loading="eager" />
          <HitMap />
        </div>
        <button type="button" ref={target} className={styles.aim} aria-label={`Throw a snowball at ${officer.name}`}
          aria-disabled={Boolean(shot)} onClick={() => {
            const box = target.current?.getBoundingClientRect();
            if (box) throwSnowball(box.left + box.width / 2, box.top + box.height / 2);
          }} />
      </div></div></div></div>
    </div>
    {shot && <div className={styles.volley} data-roof-snowball={chief} aria-hidden="true" style={{
      left: shot.x, top: shot.y,
      "--launch-x": `${window.innerWidth / 2 - shot.x}px`,
      "--launch-y": `${Math.max(120, window.innerHeight * .87 - shot.y)}px`,
    } as CSSProperties}>
      <span className={styles.snowball} /><span className={styles.powder}>
        {Array.from({ length: 8 }, (_, i) => <i key={i} style={{ "--flake-angle": `${i * 45}deg` } as CSSProperties} />)}
      </span>
    </div>}
    <span role="status" className={styles.announcement}>{shot ? `Snowball hit! ${officer.name} is falling from the lights.` : ""}</span>
  </>, body,
  );
}

export default function WinterRoofline({ menuOpen = false, standalone = false }: { menuOpen?: boolean; standalone?: boolean }) {
  const roof = useRef<HTMLDivElement>(null);
  const jenPin = useRef<HTMLSpanElement>(null);
  const kennyPin = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const garland = roof.current;
    const header = garland?.closest("header");
    if (!garland || !header) return;

    let warm: HTMLElement | undefined;
    function illuminate(x: number) {
      const next = Array.from(garland!.children).find((element) => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && x >= box.left && x <= box.right;
      }) as HTMLElement | undefined;
      if (warm === next) return;
      warm?.removeAttribute("data-warm");
      next?.setAttribute("data-warm", "");
      warm = next;
    }

    const onPointer = (event: PointerEvent) => illuminate(event.clientX);
    const onFocus = (event: FocusEvent) => {
      if (!(event.target instanceof HTMLElement)) return;
      const box = event.target.getBoundingClientRect();
      illuminate(box.left + box.width / 2);
    };
    const clear = () => { warm?.removeAttribute("data-warm"); warm = undefined; };

    header.addEventListener("pointermove", onPointer, { passive: true });
    header.addEventListener("pointerleave", clear);
    header.addEventListener("focusin", onFocus);
    header.addEventListener("focusout", clear);

    return () => {
      header.removeEventListener("pointermove", onPointer);
      header.removeEventListener("pointerleave", clear);
      header.removeEventListener("focusin", onFocus);
      header.removeEventListener("focusout", clear);
    };
  }, []);

  return (
    <div ref={roof} className={styles.roof} data-winter-roof="" data-standalone={standalone || undefined} aria-hidden="true">
      {swags.map((sag, span) => (
        <div key={span} className={styles.swag} style={{ "--sag": sag + "px" } as CSSProperties}>
          <span className={styles.wire} />
          {sockets.map((position, socket) => {
            const index = span * sockets.length + socket;
            const cableY = sag * Math.sqrt(1 - (2 * position - 1) ** 2);
            return (
              <span key={socket} className={styles.lamp} style={{
                left: position * 100 + "%",
                top: cableY - 2 + "px",
                "--bulb": bulbs[index % bulbs.length],
                "--angle": (position - 0.5) * -29 + (index % 3 - 1) * 4 + "deg",
                "--period": 2.8 + (index * 7 % 13) * 0.27 + "s",
                "--delay": -((index * 37 % 31) * 0.37) + "s",
              } as CSSProperties}>
                <span className={styles.bloom} />
                <span className={styles.socket} />
                <span className={styles.glass} />
              </span>
            );
          })}
          {span === 0 && <span ref={kennyPin} className={styles.anchor} />}
          {span === swags.length - 1 && <span ref={jenPin} className={styles.anchor} />}
        </div>
      ))}
      <HangingCrew chief="jen" anchor={jenPin} menuOpen={menuOpen} />
      <HangingCrew chief="kenny" anchor={kennyPin} menuOpen={menuOpen} />
    </div>
  );
}
