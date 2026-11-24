"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useSyncExternalStore, type CSSProperties, type RefObject } from "react";
import { createPortal } from "react-dom";
import styles from "./WinterRoofline.module.css";

const bulbs = ["#ff463e", "#ffca48", "#48ef94", "#69caff", "#ff6956", "#ffdf8f", "#57dfab", "#ee80c7"];
const sockets = [0.07, 0.26, 0.47, 0.69, 0.89];
const swags = [15, 11, 17, 13, 16, 21];


const noSubscription = () => () => {};
const bodyOnClient = () => document.body;
const noBody = () => null;
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function HangingCrew({ anchor }: { anchor: RefObject<HTMLSpanElement | null> }) {
  const body = useSyncExternalStore<HTMLElement | null>(noSubscription, bodyOnClient, noBody);
  const puppet = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const figure = puppet.current;
    const pin = anchor.current;
    const header = pin?.closest("header");
    if (!body || !figure || !pin || !header) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let rootX = 0, rootY = 0, parkedX = 0, parkedScale = 1;
    let pageY = window.scrollY, lastInput = performance.now(), lastFrame = 0, raf = 0;
    let phase = 0, energy = 0, expression = 0, sign = 1;

    // These transforms move only composited layers. Geometry is cached at
    // resize/header changes so the scroll handler never requests layout.
    function paint() {
      if (!figure) return;
      const progress = clamp01((pageY - 16) / 190);
      const dock = reduced.matches ? Number(pageY > 75) : progress * progress * (3 - 2 * progress);
      const x = rootX + (parkedX - rootX) * dock;
      const scale = 1 + (parkedScale - 1) * dock;
      figure.style.transform = `translate3d(${x.toFixed(2)}px, ${rootY.toFixed(2)}px, 0)`;
      figure.style.setProperty("--puppet-scale", scale.toFixed(3));
      figure.style.setProperty("--tie-opacity", dock.toFixed(2));
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
      const base = Math.max(1, figure.offsetWidth);
      const parked = Math.min(base, Math.max(101, Math.min(178, view * .18)));
      const hidden = !pos.width || getComputedStyle(header).visibility === "hidden";
      rootX = hidden ? view - parked * .45 : pos.left + pos.width / 2;
      rootY = hidden ? 62 : Math.max(62, pos.top);
      parkedX = view - parked * .46;
      parkedScale = parked / base;
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
      phase += dt * (5.5 + 7.5 * energy);
      if (energy < .008 && expression < .009) {
        energy = expression = lastFrame = 0;
        paint(); return;
      }
      paint();
      raf = requestAnimationFrame(frame);
    }

    function scroll() {
      const y = window.scrollY;
      const dy = y - pageY;
      const now = performance.now();
      const elapsed = Math.max(12, Math.min(65, now - lastInput));
      pageY = y; lastInput = now;
      if (reduced.matches || document.hidden) { paint(); return; }
      if (Math.abs(dy) > .1) {
        sign = Math.sign(dy);
        const impulse = clamp01(.05 + Math.abs(dy) / elapsed * .60);
        energy = Math.max(energy, impulse);
      }
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
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    document.addEventListener("visibilitychange", rest);
    reduced.addEventListener("change", rest);
    measure();
    return () => {
      sizing.disconnect(); changing.disconnect();
      cancelAnimationFrame(raf);
      header.removeEventListener("transitionend", measure);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", measure);
      document.removeEventListener("visibilitychange", rest);
      reduced.removeEventListener("change", rest);
    };
  }, [anchor, body]);

  if (!body) return null;
  return createPortal(
    <div ref={puppet} className={styles.cradle} aria-hidden="true">
      <svg className={styles.tether} viewBox="0 0 120 32" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 30C30 32 71 24 119 2" fill="none" stroke="#122a20" strokeWidth="3" />
        <path d="M0 29C30 31 71 23 119 1" fill="none" stroke="#9b9a65" strokeWidth=".75" />
        <path d="m31 29 1 4m39-13 2 4" stroke="#31452b" strokeWidth="2" />
        <ellipse cx="32" cy="33" rx="2.4" ry="3.7" fill="#ffbf65" />
        <ellipse cx="73" cy="25" rx="2.3" ry="3.4" fill="#ea7061" />
      </svg>
      <div className={styles.hanger}><div className={styles.idle}><div className={styles.figure}>
        <span className={styles.legLeft} /><span className={styles.legRight} />
        <div className={styles.torso}>
          <Image src="/images/winter/hanging.webp" alt="" width={477} height={716} unoptimized />
          <Image src="/images/winter/hanging-startled.webp" alt="" width={477} height={716} className={styles.alarmed} unoptimized />
        </div>
      </div></div></div>
    </div>, body,
  );
}

export default function WinterRoofline({ showCharacter }: { showCharacter: boolean }) {
  const roof = useRef<HTMLDivElement>(null);
  const pin = useRef<HTMLSpanElement>(null);

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
    <div ref={roof} className={styles.roof} aria-hidden="true">
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
          {span === swags.length - 1 && <span ref={pin} className={styles.anchor} />}
        </div>
      ))}
      {showCharacter && <HangingCrew anchor={pin} />}
    </div>
  );
}
