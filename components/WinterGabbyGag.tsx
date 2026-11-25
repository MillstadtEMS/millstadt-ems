"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ALL_FILES, GAG_ART, ROOM_CUTS } from "./gabby-gag/art";
import { GabbyRig, handWorld, headTop, legKnee } from "./gabby-gag/gabby";
import { Dust, MilkAndCookies, Streaks, drawBang } from "./gabby-gag/props";
import { SantaRig, santaHeadWorld } from "./gabby-gag/santa";
import { buildGag, FLOOR, type Bubble, type SceneState, type Stage } from "./gabby-gag/script";
import { el, f, img, show } from "./gabby-gag/svg";
import styles from "./WinterGabbyGag.module.css";

// Gabby's chimney gag as a live cut-out puppet show (gabby-gag/*): one requestAnimationFrame clock
// drives the script, which poses Gabby, a big fat Santa, the milk and cookies, the dust and the speech
// bubbles for every frame. It draws over the living-room picture in the TV's layer (so the bubbles sit
// in front of the TV), in room px, reaching out to the banner's real left edge on every screen.
// Decorative only: nothing here takes clicks.

/** Every part of the show decoded and ready (so nothing pops in mid-scene). */
export function preloadGag(): Promise<void> {
  return Promise.all(ALL_FILES.map(src => new Promise<void>(done => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => void image.decode().catch(() => {}).finally(() => done());
    image.onerror = () => done();
    image.src = `${GAG_ART}/${src}`;
  }))).then(() => {});
}

type Props = { aside: HTMLElement; room: HTMLElement; onDone: () => void; preview?: boolean };

const SAY_PX = 12.5, SFX_PX = 15, MIN_SAY = 11.5, MIN_SFX = 12.5;

export default function WinterGabbyGag({ aside, room, onDone, preview = false }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wordsRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(onDone);
  useEffect(() => { doneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    const svg = svgRef.current, words = wordsRef.current;
    if (!svg || !words) return;
    // sit exactly over the room picture, wherever the room is placed in the TV's layer
    const cs = getComputedStyle(room);
    for (const node of [svg, words] as (HTMLElement | SVGSVGElement)[]) {
      node.style.left = cs.left; node.style.top = cs.top; node.style.width = cs.width; node.style.height = cs.height;
    }
    // ---- build the stage
    const defs = el("defs", {}, svg);
    const clip = el("clipPath", { id: "gag-chimney", clipPathUnits: "userSpaceOnUse" }, defs);
    // below the firebox arch (everything up the chimney stays hidden behind the bricks)
    el("path", { d: "M-4000 125 L579 125 C581 114 600 111 617.5 111 C635 111 654 114 656 125 L4000 125 L4000 4000 L-4000 4000 Z" }, clip);
    const shadowGrad = el("radialGradient", { id: "gag-shadow" }, defs);
    el("stop", { offset: 0, "stop-color": "#1b0d07", "stop-opacity": .9 }, shadowGrad);
    el("stop", { offset: .6, "stop-color": "#1b0d07", "stop-opacity": .45 }, shadowGrad);
    el("stop", { offset: 1, "stop-color": "#1b0d07", "stop-opacity": 0 }, shadowGrad);
    // the room's own fire glow and fire-out dimming, repeated on the cut-outs so they match the room
    const glowGrad = el("radialGradient", { id: "gag-glow", gradientUnits: "userSpaceOnUse", cx: 617, cy: 147, r: 240, gradientTransform: "translate(617 147) scale(1 .6667) translate(-617 -147)" }, defs);
    el("stop", { offset: 0, "stop-color": "rgb(255,165,80)", "stop-opacity": .5 }, glowGrad);
    el("stop", { offset: .55, "stop-color": "rgb(255,130,50)", "stop-opacity": .2 }, glowGrad);
    el("stop", { offset: 1, "stop-color": "rgb(255,130,50)", "stop-opacity": 0 }, glowGrad);
    const dimGrad = el("radialGradient", { id: "gag-dim", gradientUnits: "userSpaceOnUse", cx: 617, cy: 147, r: 560, gradientTransform: "translate(617 147) scale(1 .5714) translate(-617 -147)" }, defs);
    el("stop", { offset: 0, "stop-color": "rgb(16,9,26)", "stop-opacity": .4 }, dimGrad);
    el("stop", { offset: .55, "stop-color": "rgb(16,9,26)", "stop-opacity": .26 }, dimGrad);
    el("stop", { offset: 1, "stop-color": "rgb(16,9,26)", "stop-opacity": .2 }, dimGrad);
    const cut = (c: { src: string; x: number; y: number; w: number; h: number }, id: string, glow: boolean) => {
      const g = el("g", {}, svg);
      const mask = el("mask", { id, maskUnits: "userSpaceOnUse", x: c.x, y: c.y, width: c.w, height: c.h, style: "mask-type:alpha" }, defs);
      const m = img(`${GAG_ART}/${c.src}`, c.w, c.h, mask);
      m.setAttribute("x", f(c.x)); m.setAttribute("y", f(c.y));
      const pic = img(`${GAG_ART}/${c.src}`, c.w, c.h, g);
      pic.setAttribute("x", f(c.x)); pic.setAttribute("y", f(c.y));
      if (glow) {
        const wrap = el("g", { class: styles.glow, mask: `url(#${id})` }, g);
        el("rect", { class: styles.flicker, x: 377, y: -13, width: 480, height: 320, fill: "url(#gag-glow)" }, wrap);
      }
      const dim = el("g", { class: styles.dim, mask: `url(#${id})` }, g);
      el("rect", { x: c.x, y: c.y, width: c.w, height: c.h, fill: "url(#gag-dim)" }, dim);
      return g;
    };
    const santaIn = el("g", { "clip-path": "url(#gag-chimney)" }, svg);
    const stockings = cut(ROOM_CUTS.stockings, "gag-stockings", true);
    const treatsLayer = el("g", {}, svg);
    const treats = new MilkAndCookies(treatsLayer);
    const shadows = el("g", {}, svg);
    const shadowEls = [0, 1].map(() => el("ellipse", { rx: 0, ry: 0, fill: "url(#gag-shadow)" }, shadows));
    const santaOut = el("g", {}, svg);
    const santa = new SantaRig(santaIn, defs, "gag-santa");
    const gabby = new GabbyRig(svg);
    const chair = cut(ROOM_CUTS.chair, "gag-chair", false);
    const fx = el("g", {}, svg);
    const dusts = [0, 1, 2].map(() => new Dust(fx));
    const streaks = new Streaks(fx);
    const bang = drawBang(fx);
    const zzz = el("g", { class: styles.zzz }, fx);
    const zs = [0, 1, 2].map(() => {
      const z = el("text", { "text-anchor": "middle" }, zzz);
      z.textContent = "Z";
      return z;
    });
    // never smaller than about 7, 9 and 11 CSS px (the room is drawn at 62% on phones)
    const sizeZ = () => zs.forEach((z, i) => z.setAttribute("font-size", f((10 + i * 3) * Math.max(1, .72 / stage.k))));
    // ---- the room video's fire flicker, in step with the room's own
    const syncFlicker = () => {
      const theirs = aside.querySelector("[data-living-room] i i")?.getAnimations?.()[0];
      svg.querySelectorAll(`.${styles.flicker}`).forEach(node => {
        const mine = (node as SVGElement).getAnimations?.()[0];
        if (theirs && mine && theirs.currentTime !== null) mine.currentTime = theirs.currentTime;
      });
    };
    // ---- geometry: the banner's visible edges in room px
    let stage: Stage = { left: 0, right: 760, top: 0, k: 1 };
    const measure = () => {
      const r = room.getBoundingClientRect(), banner = aside.parentElement?.getBoundingClientRect();
      const k = r.width / 760 || 1;
      const left = Math.max(banner?.left ?? 0, 0), right = Math.min(banner?.right ?? innerWidth, innerWidth);
      stage = { left: (left - r.left) / k, right: (right - r.left) / k, top: ((banner?.top ?? r.top) - r.top) / k, k };
    };
    measure();
    sizeZ();
    let gag = buildGag(stage);
    const pool = new Map<string, HTMLDivElement>();
    const sizes = new Map<string, [number, number]>();

    const paint = (s: SceneState) => {
      // Santa: behind the arch while he's in the chimney, out in the room after the pop
      if (s.santa) {
        const host = s.santaInside ? santaIn : santaOut;
        if (santa.root.parentNode !== host) host.appendChild(santa.root);
        show(santa.root, true);
        santa.pose(s.santa);
      } else show(santa.root, false);
      show(stockings, s.santaInside && Boolean(s.santa));
      show(chair, s.chair);
      if (s.gabby) { show(gabby.root, true); gabby.pose(s.gabby); } else show(gabby.root, false);
      // milk and cookies
      const tr = s.treats;
      show(treats.root, tr.o > 0);
      treats.root.setAttribute("opacity", f(tr.o));
      treats.plate.setAttribute("transform", `translate(${f(tr.plate[0])} ${f(tr.plate[1])}) rotate(${f(tr.plate[2])})`);
      treats.cookie.setAttribute("transform", `translate(${f(tr.cookie[0])} ${f(tr.cookie[1])}) rotate(${f(tr.cookie[2])})`);
      treats.glass.setAttribute("transform", `translate(${f(tr.glass[0])} ${f(tr.glass[1])}) rotate(${f(tr.glass[2])})`);
      treats.splash.setAttribute("opacity", f(tr.splash));
      treats.splash.setAttribute("transform", `translate(${f(tr.glass[0] + 8)} ${f(FLOOR - 2)}) scale(${f(.6 + tr.splash * .7)})`);
      treats.puddle.setAttribute("opacity", f(tr.puddle > 0 ? .95 : 0));
      treats.puddle.setAttribute("cx", f(tr.glass[0] + 6)); treats.puddle.setAttribute("cy", f(FLOOR + .5));
      treats.puddle.setAttribute("rx", f(10 * tr.puddle)); treats.puddle.setAttribute("ry", f(2.2 * tr.puddle));
      // floor shadows
      shadowEls.forEach((e, i) => {
        const sh = s.shadows[i];
        show(e, Boolean(sh));
        if (!sh) return;
        e.setAttribute("cx", f(sh.x)); e.setAttribute("cy", f(FLOOR + .6));
        e.setAttribute("rx", f(sh.w)); e.setAttribute("ry", f(Math.max(2, sh.w * .16)));
        e.setAttribute("opacity", f(sh.o * 2.2));
      });
      dusts.forEach((d, i) => { const p = s.dust[i]; if (p) d.draw(p.x, p.y, p.u, p.spread, p.dir); else d.draw(0, 0, 0); });
      if (s.streak) streaks.draw(s.streak.x, s.streak.y, s.streak.dir, s.streak.amount, s.streak.height); else streaks.draw(0, 0, 1, 0);
      show(bang, Boolean(s.bang && s.bang.s > 0));
      if (s.bang) bang.setAttribute("transform", `translate(${f(s.bang.x)} ${f(s.bang.y)}) scale(${f(Math.max(.01, s.bang.s))})`);
      show(zzz, Boolean(s.zzz));
      if (s.zzz) zs.forEach((z, i) => {
        const u = (s.zzz!.u + i / 3) % 1;
        const k = Math.max(1, .72 / stage.k);
        z.setAttribute("x", f(s.zzz!.x - 4 - u * 16 * k));
        z.setAttribute("y", f(s.zzz!.y - 4 - u * 26 * k));
        z.setAttribute("opacity", f(Math.sin(u * Math.PI)));
      });
      paintWords(s.bubbles);
    };

    const paintWords = (list: Bubble[]) => {
      const live = new Set(list.map(b => b.id));
      for (const [id, node] of pool) if (!live.has(id)) { node.remove(); pool.delete(id); }
      for (const b of list) {
        let node = pool.get(b.id);
        const say = b.kind === "say";
        const px = say ? Math.max(SAY_PX, MIN_SAY / stage.k) : Math.max(SFX_PX * (b.kind === "pop" ? 1.5 : b.kind === "beep" ? .8 : 1), (b.kind === "beep" ? MIN_SAY : MIN_SFX) / stage.k);
        if (!node) {
          node = document.createElement("div");
          node.className = styles.word;
          node.dataset.kind = b.kind;
          node.innerHTML = `<span></span>${say ? `<i></i>` : ""}`;
          node.firstElementChild!.textContent = b.text;
          node.style.fontSize = `${f(px)}px`;
          if (say) node.style.maxWidth = `${f(px * 13.5)}px`;
          words.appendChild(node);
          pool.set(b.id, node);
          sizes.set(b.id, [node.offsetWidth, node.offsetHeight]);
        }
        const [w, h] = sizes.get(b.id)!;
        // pop in, hold, pop out
        const pin = b.age < 150 ? backOutIn(b.age / 150) : 1;
        const pout = b.rest < 120 ? b.rest / 120 : 1;
        const scale = Math.max(.01, pin * (.6 + .4 * pout));
        const margin = 4 / stage.k;
        if (say) {
          // above the speaker's head, kept wholly on screen; the tail still points at her
          let left = b.x - w / 2;
          left = Math.min(Math.max(left, stage.left + margin), stage.right - margin - w);
          let top = b.y - 9 / stage.k - h;
          top = Math.max(top, stage.top + margin);
          const tail = Math.min(Math.max(b.x - left, 12), w - 12);
          node.style.transform = `translate(${f(left)}px, ${f(top)}px) scale(${f(scale)})`;
          node.style.transformOrigin = `${f(tail)}px ${f(h + 6)}px`;
          (node.lastElementChild as HTMLElement).style.left = `${f(tail)}px`;
        } else {
          let left = b.x - w / 2, top = b.y - h / 2;
          left = Math.min(Math.max(left, stage.left + margin), stage.right - margin - w);
          top = Math.max(top, stage.top + margin);
          node.style.transform = `translate(${f(left)}px, ${f(top)}px) rotate(${f(b.tilt ?? 0)}deg) scale(${f(scale)})`;
          node.style.transformOrigin = "50% 50%";
        }
        node.style.opacity = f(Math.min(1, pout * 1.4));
      }
    };

    // ---- the clock (preview builds can pause and seek it)
    let start = performance.now(), paused: number | null = null, frame = 0, finished = false;
    const tick = () => {
      frame = 0;
      const t = paused ?? performance.now() - start;
      paint(gag.sample(Math.min(t, gag.duration)));
      if (t >= gag.duration && paused === null) {
        if (!finished) { finished = true; doneRef.current(); }
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    syncFlicker();
    frame = requestAnimationFrame(tick);
    const onResize = () => { measure(); sizeZ(); gag = buildGag(stage); sizes.clear(); pool.forEach(n => n.remove()); pool.clear(); };
    window.addEventListener("resize", onResize, { passive: true });
    const hooks = preview ? {
      duration: () => gag.duration,
      marks: () => gag.marks,
      stage: () => stage,
      state: (ms: number) => gag.sample(ms),
      /** Key points in the world at a moment (for checking that nothing jumps between frames). */
      probe: (ms: number) => {
        const st = gag.sample(ms), g = st.gabby, sp = st.santa;
        return {
          act: st.act,
          g: g && { p: [g.x, g.y], dir: g.dir, head: headTop(g), hn: handWorld(g, true), hf: handWorld(g, false), fn: [g.legN.x, g.legN.y], ff: [g.legF.x, g.legF.y], kn: legKnee(g, true), kf: legKnee(g, false) },
          s: sp && { p: [sp.x, sp.y], head: santaHeadWorld(sp), rot: sp.rot },
        };
      },
      seek: (ms: number) => { paused = ms; if (!frame) frame = requestAnimationFrame(tick); },
      pause: () => { paused = performance.now() - start; },
      play: (from?: number) => { start = performance.now() - (from ?? paused ?? 0); paused = null; finished = false; if (!frame) frame = requestAnimationFrame(tick); },
    } : null;
    if (hooks) (window as unknown as { __gabbyGag?: typeof hooks }).__gabbyGag = hooks;
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      if (hooks) delete (window as unknown as { __gabbyGag?: typeof hooks }).__gabbyGag;
      pool.forEach(n => n.remove());
      while (svg.firstChild) svg.firstChild.remove();
    };
  }, [aside, room, preview]);

  return createPortal(<>
    <svg ref={svgRef} className={styles.scene} viewBox="0 0 760 200" aria-hidden="true" focusable="false" />
    <div ref={wordsRef} className={styles.words} aria-hidden="true" />
  </>, aside);
}

/** A springy pop-in (overshoots a touch, then settles). */
function backOutIn(u: number) {
  const s = 2.2;
  return 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2);
}
