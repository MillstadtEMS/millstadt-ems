"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./WinterSnowballAmbush.module.css";

type Person = "jen" | "kenny";
type Phase = "rise" | "throw" | "ready" | "return" | "retreat";
type Spot = { x: number; y: number; w: number; h: number };
type Encounter = { person: Person; phase: Phase; spot: Spot; hit: boolean };
const art = {
  jen: { name: "Jen", boo: "/images/winter/snow-chief-boo.webp", mad: "/images/winter/snow-chief-mad.webp", hat: "/images/winter/snow-chief-hat.webp", hand: [.86, .30] },
  kenny: { name: "Kenny", boo: "/images/winter/kenny/snow-boo.webp", mad: "/images/winter/kenny/snow-mad.webp", hat: "", hand: [.198, .288] },
} as const;
const positions = [[.05,.13],[.43,.08],[.93,.20],[.23,.36],[.63,.41],[.03,.60],[.9,.62],[.39,.67],[.14,.92],[.73,.93]];
const controls = 'a,button,input,textarea,select,label,summary,form,iframe,video,audio,canvas,nav,[role="application"],[role="grid"],[role="button"],[role="tab"],[role="menuitem"],[role="switch"],[role="slider"],[role="link"],[tabindex="0"],[contenteditable="true"]';
const excluded = '[data-hunt-scene],[data-winter-rink],[data-hanging-chief] img:first-child,footer,[data-snow-chief],[data-winter-player]';
const stillArt = new Map<Person, Promise<Uint8ClampedArray | null>>();
const delay = (min: number, max: number) => min + Math.random() * (max - min);

function artwork(person: Person) {
  let pending = stillArt.get(person);
  if (pending) return pending;
  const costume = art[person];
  pending = Promise.all([costume.boo, costume.mad, costume.hat].filter(Boolean).map(async src => {
    const image = new window.Image();
    image.src = src;
    await image.decode();
    return image;
  })).then(([image]) => {
    const canvas = document.createElement("canvas");
    canvas.width = 96; canvas.height = 88;
    const brush = canvas.getContext("2d", { willReadFrequently: true });
    if (!brush) return null;
    try {
      brush.drawImage(image, 0, 0, 96, 88);
      return brush.getImageData(0, 0, 96, 88).data;
    } catch { return null; }
  }).catch(error => { stillArt.delete(person); throw error; });
  stillArt.set(person, pending);
  return pending;
}

function guarded() {
  if (document.hidden || document.activeElement?.matches('input:not([type="button"]):not([type="submit"]),textarea,select,[contenteditable="true"]')) return true;
  return [...document.querySelectorAll('dialog[open],[aria-modal="true"],[aria-controls="site-navigation-panel"][aria-expanded="true"]')]
    .some(el => el.getClientRects().length && getComputedStyle(el).visibility !== "hidden");
}

function findSpot(last: Spot | null): Spot | null {
  const viewportWidth = document.documentElement.clientWidth, viewportHeight = window.innerHeight;
  const nav = document.querySelector(".mems-nav-bar")?.getBoundingClientRect();
  const top = Math.max(16, (nav?.bottom ?? 5) + 13);
  const bottom = viewportHeight - (viewportWidth < 768 ? 87 : 31);
  const width = Math.min(190, Math.max(99, viewportWidth * (viewportWidth < 700 ? .3 : .15)), (bottom - top - 12) * 661 / 600);
  if (width < 82) return null;
  const height = width * 600 / 661;
  const obstacles = [...document.querySelectorAll(excluded)].map(node => node.getBoundingClientRect())
    .filter(box => box.width && box.height && box.top < viewportHeight && box.bottom > 0);
  const offset = Math.floor(Math.random() * positions.length);
  for (let i = 0; i < positions.length; i++) {
    const [rx, ry] = positions[(i + offset) % positions.length];
    const jitter = (v: number) => Math.max(0, Math.min(1, v + delay(-.08,.08)));
    const x = Math.round(10 + jitter(rx) * (viewportWidth - width - 20));
    const y = Math.round(top + jitter(ry) * (bottom - top - height));
    if (last && Math.hypot((x-last.x) / viewportWidth, (y-last.y) / viewportHeight) < .18) continue;
    if (obstacles.some(box => box.right > x+width*.12 && box.left < x+width*.88 && box.bottom > y+height*.04 && box.top < y+height*.96)) continue;
    const safe = [[.5,.10],[.23,.35],[.78,.35],[.5,.42],[.37,.72],[.66,.73],[.5,.9]].every(([px,py]) =>
      !document.elementFromPoint(x+px*width,y+py*height)?.closest(controls));
    if (safe) return { x, y, w: width, h: height };
  }
  return null;
}

export default function WinterSnowballAmbush({ pathname }: { pathname: string }) {
  const [actor, setActor] = useState<Encounter | null>(null);
  const [dismissed, setDismissed] = useState<Person[]>([]);
  const [notice, setNotice] = useState("");
  const shoot = useRef<() => void>(() => {});
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let first: Person = Math.random() < .5 ? "jen" : "kenny";
    const gone = new Set<Person>();
    let current: Encounter | null = null, last: Spot | null = null;
    let mask: Uint8ClampedArray | null = null, disposed = false, stamp = 0;
    let waiting = delay(6000,10000), clock: number | null = null;
    let wake: number | undefined, action: number | undefined, scrollCheck: number | undefined;
    let startX = 0, startY = 0;

    function pause() {
      window.clearTimeout(wake);
      if (clock !== null) waiting = Math.max(0, waiting - (performance.now() - clock));
      clock = null;
    }
    function schedule(ms?: number) {
      pause();
      if (ms !== undefined) waiting = ms;
      if (disposed || gone.size === 2 || current || guarded()) return;
      clock = performance.now();
      wake = window.setTimeout(() => { clock = null; void appear(); }, waiting);
    }
    function remove(nextDelay = delay(3200,6200)) {
      stamp++;
      window.clearTimeout(action);
      current = null;
      setActor(null);
      schedule(nextDelay);
    }
    function phase(value: Phase) {
      if (!current) return;
      current = { ...current, phase: value };
      setActor(current);
    }
    function retreat() {
      if (current?.phase === "ready" && host.current?.contains(document.activeElement)) {
        action = window.setTimeout(retreat, 1200);
        return;
      }
      phase("retreat");
      action = window.setTimeout(() => remove(), 520);
    }
    async function appear() {
      if (current) return;
      if (disposed || guarded() || gone.size === 2) { schedule(850); return; }
      const person = gone.has(first) ? (first === "jen" ? "kenny" : "jen") : first;
      const proposed = findSpot(last);
      if (!proposed) { schedule(1700); return; }
      const token = ++stamp;
      try { mask = await artwork(person); }
      catch { if (!disposed && token === stamp) schedule(6000); return; }
      if (disposed || token !== stamp) return;
      if (guarded()) { schedule(1200); return; }
      const spot = findSpot(last);
      if (!spot) { schedule(1700); return; }
      pause();
      last = spot;
      first = person === "jen" ? "kenny" : "jen";
      current = { person, spot, phase: "rise", hit: false };
      setActor(current);
      setNotice(`${art[person].name} pops out of the snow and winds up a snowball.`);
      action = window.setTimeout(() => {
        phase("throw");
        action = window.setTimeout(() => {
          phase("ready");
          setNotice(`${art[person].name} threw a snowball at you. Use the throw-back button or press Alt Shift S to return it.`);
          action = window.setTimeout(retreat, 8500);
        }, 620);
      }, 720);
    }
    function counter() {
      if (!current || current.phase !== "ready" || guarded()) return;
      window.clearTimeout(action);
      gone.add(current.person);
      setDismissed([...gone]);
      setNotice(`Direct hit! ${art[current.person].name} dives back into the snow.`);
      current = { ...current, phase: "return", hit: true };
      setActor(current);
      action = window.setTimeout(retreat, 400);
    }
    shoot.current = counter;

    function conditions() {
      if (guarded()) {
        if (current) remove(2500);
        else { stamp++; pause(); }
      } else if (!current) schedule();
    }
    function resize() { if (current) remove(1600); else conditions(); }
    function afterScroll() {
      window.clearTimeout(scrollCheck);
      if (!current) return;
      scrollCheck = window.setTimeout(() => {
        if (!current) return;
        const { x,y,w,h } = current.spot;
        const beneath = document.elementFromPoint(x+w*.5,y+h*.4);
        if (beneath?.closest(controls + ",[data-winter-rink],[data-hunt-scene],footer")) remove(1800);
      }, 160);
    }
    const pointer = (event: PointerEvent) => { startX = event.clientX; startY = event.clientY; };
    function click(event: MouseEvent) {
      if (!current || current.phase !== "ready" || !event.detail || event.button || event.defaultPrevented ||
          !(event.target instanceof Element) || event.target.closest(controls + ",[data-winter-rink],[data-hunt-scene],footer") || Math.hypot(event.clientX-startX,event.clientY-startY)>9) return;
      const { x, y, w, h } = current.spot;
      const u = (event.clientX-x)/w, v = (event.clientY-y)/h;
      if (u<0 || u>=1 || v<0 || v>.85) return;
      const ink = mask ? mask[(Math.floor(v*88)*96+Math.floor(u*96))*4+3]>70 : u>.34 && u<.63 && v>.19 && v<.75;
      if (ink) { event.preventDefault(); event.stopImmediatePropagation(); counter(); }
    }
    const abort = new AbortController(), signal = abort.signal;
    const focusOut = () => queueMicrotask(() => { if (!disposed) conditions(); });
    document.addEventListener("visibilitychange", conditions, { signal });
    document.addEventListener("focusin", event => { if (!host.current?.contains(event.target as Node)) conditions(); }, { signal });
    document.addEventListener("focusout", focusOut, { signal });
    document.addEventListener("keydown", event => {
      if (event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.repeat &&
          event.code === "KeyS" && current?.phase === "ready" && !guarded()) {
        event.preventDefault();
        counter();
      }
    }, { signal });
    document.addEventListener("pointerdown", pointer, { signal, passive: true, capture: true });
    document.addEventListener("click", click, { signal, capture: true });
    document.addEventListener("scroll", afterScroll, { signal, passive: true, capture: true });
    window.addEventListener("resize", resize, { signal, passive: true });
    const dialogs = new MutationObserver(changes => {
      const changed = changes.some(change => change.type === "attributes" ||
        [...change.addedNodes, ...change.removedNodes].some(node => node instanceof Element &&
          (node.matches('dialog,[aria-modal="true"]') || node.querySelector('dialog,[aria-modal="true"]'))));
      if (changed) conditions();
    });
    dialogs.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["open","aria-modal","aria-expanded"] });
    schedule();
    return () => {
      disposed = true; stamp++; pause(); window.clearTimeout(action); window.clearTimeout(scrollCheck);
      abort.abort(); dialogs.disconnect(); shoot.current = () => {};
    };
  }, []);

  if (typeof document === "undefined") return null;
  const person = actor ? art[actor.person] : null;
  const view = actor && person ? {
    "--actor-x": actor.spot.x + "px", "--actor-y": actor.spot.y + "px", "--actor-w": actor.spot.w + "px",
    "--hand-x": actor.spot.x + actor.spot.w * person.hand[0] + "px", "--hand-y": actor.spot.y + actor.spot.h * person.hand[1] + "px",
    "--face-x": actor.spot.x + actor.spot.w * .51 + "px", "--face-y": actor.spot.y + actor.spot.h * .26 + "px",
  } as CSSProperties : undefined;
  return createPortal(<div ref={host} className={styles.overlay} data-snow-ambush-host="" data-route={pathname} data-dismissed={dismissed.join(" ")} style={view}>
    {actor && person && <>
      <div className={styles.cast} data-snow-ambush={actor.person} data-phase={actor.phase} data-hit={actor.hit}>
        <div className={styles.drift} /><div className={styles.reveal}><div className={styles.pose}>
          <Image className={styles.sprite} src={person.boo} width={661} height={600} alt="" loading="eager" unoptimized />
          {actor.hit && <Image className={styles.mad} src={person.mad} width={661} height={600} loading="eager" unoptimized alt="" />}
          {person.hat && <Image className={styles.hat} src={person.hat} width={661} height={600} loading="eager" unoptimized alt="" />}
          <i className={styles.gloveBall} />
        </div></div>
        {actor.phase === "ready" && <button className={styles.counter} type="button" aria-keyshortcuts="Alt+Shift+S" aria-label={`Throw a snowball back at ${person.name}`} onClick={() => shoot.current()} />}
      </div>
      {(actor.phase === "throw" || actor.phase === "return") && <div data-ambush-flight={actor.phase} className={styles.flight}><i /><b /></div>}
    </>}
    <span role="status" className={styles.sr}>{notice}</span>
  </div>, document.body);
}
