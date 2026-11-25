"use client";

import { useEffect } from "react";
import { useWinterTheme } from "@/lib/seasonal/useWinterTheme";
import { useSnowballTimeout, isSnowballTimeout } from "@/lib/seasonal/snowballTimeout";
import { flinch, throwSnowball, visitorThrow, windUp, type Point } from "@/lib/seasonal/snowballFlight";

// One big snowball fight across the site each winter. Any element tagged data-snow-fighter can
// throw and be hit: the parade crowd, Snoopy and the Grinch, carolers, skaters, the snowbank
// chiefs (data-snow-role="target" ones only get hit, like the crew hanging from the lights).
// Throws go at each other, at Santa (data-snow-santa) and at the visitor's screen. Visitors join
// in by clicking a character. "Call time out" stops it all.

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
const controls = 'a,button,input,textarea,select,label,summary,iframe,video,audio,[role="button"],[role="link"],[contenteditable="true"]';

function guarded() {
  if (isSnowballTimeout() || document.hidden) return true;
  if (document.activeElement?.matches('input:not([type="button"]):not([type="submit"]),textarea,select,[contenteditable="true"]')) return true;
  return [...document.querySelectorAll('dialog[open],[aria-modal="true"],[aria-controls="site-navigation-panel"][aria-expanded="true"]')]
    .some(el => el.getClientRects().length && getComputedStyle(el).visibility !== "hidden");
}

function onScreen(el: Element) {
  const r = el.getBoundingClientRect();
  if (r.width < 10 || r.height < 10 || r.bottom < 70 || r.top > window.innerHeight - 24 || r.right < 0 || r.left > window.innerWidth) return false;
  if (el.closest('[data-snow-off="true"]')) return false;
  const style = getComputedStyle(el);
  return style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity) > .2;
}

function handOf(el: HTMLElement): Point {
  const r = el.getBoundingClientRect();
  const [hx, hy] = (el.dataset.snowHand || "0.6,0.3").split(",").map(Number);
  return { x: r.left + r.width * hx, y: r.top + r.height * hy };
}

function bodyOf(el: HTMLElement): Point {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width * rand(.38, .62), y: r.top + r.height * rand(.2, .48) };
}

function hoHoHo(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const bubble = document.createElement("span");
  bubble.textContent = "Ho ho ho!";
  bubble.setAttribute("aria-hidden", "true");
  Object.assign(bubble.style, {
    position: "fixed", left: r.left + r.width / 2 + "px", top: r.top - 6 + "px", zIndex: "45", pointerEvents: "none",
    padding: ".25em .6em", borderRadius: "999px", background: "#fff8ea", color: "#a3141f", whiteSpace: "nowrap",
    font: "800 clamp(.72rem, 1vw, 1rem)/1.2 Georgia, serif", boxShadow: "0 2px 6px #0b1a3555", translate: "-50% -100%",
  });
  document.body.appendChild(bubble);
  bubble.animate([
    { transform: "scale(.6)", opacity: 0 }, { transform: "scale(1.06)", opacity: 1, offset: .12 },
    { transform: "scale(1)", opacity: 1, offset: .8 }, { transform: "translateY(-8px)", opacity: 0 },
  ], { duration: 1500, easing: "ease-out" }).finished.then(() => bubble.remove(), () => bubble.remove());
}

/** Everyone hit reacts: a knock-back, plus an event components can use (startled faces, swinging). */
const struck = new WeakMap<HTMLElement, number>();
export function snowHit(el: HTMLElement, from: Point) {
  if (el.dataset.snowRole !== "target") flinch(el, from);
  // A short-lived marker any character's CSS can react to (ducking, startled faces).
  window.clearTimeout(struck.get(el));
  el.removeAttribute("data-snow-struck");
  void el.offsetWidth;
  el.setAttribute("data-snow-struck", "");
  struck.set(el, window.setTimeout(() => el.removeAttribute("data-snow-struck"), 950));
  el.dispatchEvent(new CustomEvent("mems:snow-hit", { bubbles: true, detail: { from } }));
  if (el.hasAttribute("data-snow-santa")) hoHoHo(el);
}

export default function WinterSnowballFight() {
  const winter = useWinterTheme();
  const timeout = useSnowballTimeout();

  // Characters throw at each other, at Santa and at the screen.
  useEffect(() => {
    if (!winter || timeout || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer: number | undefined;
    let disposed = false;
    let busy = false;
    const schedule = (ms?: number) => {
      window.clearTimeout(timer);
      if (disposed) return;
      // Lively but not overbearing: a throw every ~2-4.5s, a little calmer on phones.
      timer = window.setTimeout(volley, ms ?? rand(1900, 4400) * (window.innerWidth < 700 ? 1.35 : 1));
    };
    async function volley() {
      if (disposed) return;
      if (busy || guarded()) { schedule(1600); return; }
      const all = [...document.querySelectorAll<HTMLElement>("[data-snow-fighter]")].filter(onScreen);
      const throwers = all.filter(el => el.dataset.snowRole !== "target");
      if (!throwers.length) { schedule(3000); return; }
      busy = true;
      const thrower = pick(throwers);
      const from = handOf(thrower);
      const santas = [...document.querySelectorAll<HTMLElement>("[data-snow-santa]")].filter(onScreen);
      const others = all.filter(el => el !== thrower);
      const roll = Math.random();
      try {
        if (roll < .22 || !others.length) {
          const to = { x: rand(.18, .82) * window.innerWidth, y: rand(.22, .7) * window.innerHeight };
          const motion = windUp(thrower, to.x >= from.x ? 1 : -1);
          await motion.release;
          await throwSnowball({ from, to, toward: "viewer", splat: "glass" });
        } else {
          const target = roll < .32 && santas.length ? santas[0] : pick(others);
          const aim = bodyOf(target);
          const miss = Math.random() < .17;
          const to = miss ? { x: aim.x + rand(-70, 70), y: aim.y + rand(35, 80) } : aim;
          const motion = windUp(thrower, to.x >= from.x ? 1 : -1);
          await motion.release;
          await throwSnowball({ from, to, splat: miss ? "ground" : "powder",
            onImpact: () => { if (!miss && target.isConnected) snowHit(target, from); } });
        }
      } finally {
        busy = false;
        schedule();
      }
    }
    const onVisibility = () => { if (document.hidden) window.clearTimeout(timer); else schedule(rand(1200, 2600)); };
    schedule(rand(2200, 3800));
    document.addEventListener("visibilitychange", onVisibility);
    return () => { disposed = true; window.clearTimeout(timer); document.removeEventListener("visibilitychange", onVisibility); };
  }, [winter, timeout]);

  // Visitors fight back. While the fight is on, the page is a snowball range: a click anywhere in
  // the page content throws (links and buttons there wait for a time out), and holding the mouse
  // button rapid-fires. Time Out hands the page back. The Time Out signs, the music player, form
  // fields, dialogs, the trinkets, the village's own buttons and characters with their own throw
  // handling keep working, and the public forms are never intercepted.
  useEffect(() => {
    if (!winter) return;
    const passThrough = '[data-winter-signs],[data-winter-video],[data-winter-trinkets],[data-snow-own-click],[data-snow-target],[data-drive-target],dialog,[role="dialog"],[aria-modal="true"],input,textarea,select,option,label,[contenteditable="true"],#christmas-in-millstadt a,#christmas-in-millstadt button';
    const inRange = (target: EventTarget | null) => target instanceof Element && !isSnowballTimeout() && Boolean(target.closest("main"))
      && !target.closest(passThrough) && !/^\/(forms|careers\/apply)(\/|$)/.test(location.pathname);
    const throwAt = (at: Point) => {
      const target = document.elementFromPoint(at.x, at.y)?.closest<HTMLElement>("[data-snow-fighter]:not([data-snow-own-click]),[data-snow-santa]");
      void visitorThrow(at, { onImpact: () => { if (target?.isConnected && onScreen(target)) snowHit(target, { x: window.innerWidth / 2, y: window.innerHeight }); } });
    };
    let startX = 0, startY = 0, rapid = 0, aim: Point = { x: 0, y: 0 };
    const stop = () => { window.clearInterval(rapid); rapid = 0; };
    const down = (e: PointerEvent) => {
      startX = e.clientX; startY = e.clientY;
      // Mouse: throw at once and keep throwing while the button is held (the crew on the lights
      // take their own hits).
      if (e.pointerType !== "mouse" || e.button !== 0 || !inRange(e.target) || document.documentElement.hasAttribute("data-snow-aim")) return;
      e.preventDefault();
      aim = { x: e.clientX, y: e.clientY };
      throwAt(aim);
      stop();
      rapid = window.setInterval(() => { if (isSnowballTimeout()) stop(); else throwAt(aim); }, 150);
    };
    const move = (e: PointerEvent) => { if (rapid) aim = { x: e.clientX, y: e.clientY }; };
    function click(e: MouseEvent) {
      if (e.button !== 0 || e.defaultPrevented || isSnowballTimeout()) return;
      // Aiming at someone on the lights or a medic behind a truck: they take the click themselves
      // (whichever order the listeners were added in, say after Gabby climbs back up).
      if (document.documentElement.hasAttribute("data-snow-aim")) return;
      if (inRange(e.target)) {
        // The page waits for a time out; mouse throws already happened on press.
        e.preventDefault();
        e.stopPropagation();
        if (e.detail && Math.hypot(e.clientX - startX, e.clientY - startY) <= 14 && !matchMedia("(pointer: fine)").matches) throwAt({ x: e.clientX, y: e.clientY });
        return;
      }
      if (!e.detail || Math.hypot(e.clientX - startX, e.clientY - startY) > 14) return;
      if (!(e.target instanceof Element) || e.target.closest(controls)) return;
      const target = e.target.closest<HTMLElement>("[data-snow-fighter]:not([data-snow-own-click]),[data-snow-santa]");
      if (!target || !onScreen(target)) return;
      const at = { x: e.clientX, y: e.clientY };
      void visitorThrow(at, { onImpact: () => { if (target.isConnected) snowHit(target, { x: window.innerWidth / 2, y: window.innerHeight }); } });
    }
    document.addEventListener("pointerdown", down, { capture: true });
    document.addEventListener("pointermove", move, { capture: true, passive: true });
    document.addEventListener("pointerup", stop, true);
    document.addEventListener("pointercancel", stop, true);
    window.addEventListener("blur", stop);
    document.addEventListener("click", click, true);
    return () => {
      stop();
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerup", stop, true);
      document.removeEventListener("pointercancel", stop, true);
      window.removeEventListener("blur", stop);
      document.removeEventListener("click", click, true);
    };
  }, [winter]);

  return null;
}
