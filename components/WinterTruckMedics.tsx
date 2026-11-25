"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { claimPerson } from "@/lib/seasonal/cast";
import { isSnowballTimeout, snowballTimeoutEvent } from "@/lib/seasonal/snowballTimeout";
import { isTesla, reachSamples, tapSlop, touchReach } from "@/lib/device/profile";
import { throwSnowball, visitorThrow, type Point } from "@/lib/seasonal/snowballFlight";
import { snowHit } from "./WinterSnowballFight";
import { crewNames, crewRig, loadArt, paintedAt, type Crew, type Rig, type XY } from "./WinterSnowballAmbush";
import styles from "./WinterTruckMedics.module.css";

// Medics pop up from behind the parked rigs in the village picture. One at a time, every few
// seconds, a crew member who is free (not hanging on the Christmas lights; lib/seasonal/cast) rises
// behind a hood or roof line, looks around, winds up and throws: at the visitor's screen or at
// another snowball fighter in the scene. Then they duck back down. Visitors can hit them back; the
// vehicle is in front, so only the part showing above it counts. Time Out, a hidden tab or the
// village scrolling offscreen pause it.
// Preview: ?preview=ve&medic-preview=now (optional medic-unit=3925|3935|3926|fire, medic-person=<crew>).

type Unit = "3925" | "3935" | "3926" | "fire";
// Each vehicle's box in the picture, as WinterVillage and WinterStreet place them: percent of the
// picture's width (the picture is twice as wide as tall, so its height is 50 of these units).
const vehicles: Record<Unit, { src: string; left: number; width: number; bottom: number; ratio: number; name: string }> = {
  "3925": { src: "/images/winter/fleet/3925.webp", left: 5.8, width: 18.2, bottom: 17.6, ratio: 444 / 760, name: "ambulance 3925" },
  "3935": { src: "/images/winter/fleet/3935.webp", left: 26.7, width: 22, bottom: 16.2, ratio: 452 / 760, name: "ambulance 3935" },
  "3926": { src: "/images/winter/fleet/3926.webp", left: 72.5, width: 19.9, bottom: 17.2, ratio: 465 / 760, name: "ambulance 3926" },
  fire: { src: "/images/winter/street/fire-engine.webp", left: 50, width: 21.4, bottom: 20.2, ratio: 362 / 720, name: "Old No. 5" },
};
function boxOf(unit: Unit) {
  const v = vehicles[unit], height = v.width * v.ratio;
  return { left: v.left, top: 50 - v.bottom / 2 - height, width: v.width, height };
}
// Where they peek: across the vehicle (x), the top of its painted outline there (line), and a body
// line above the gaps under the chassis (clip), all as fractions of the vehicle's box.
type Spot = { unit: Unit; x: number; line: number; clip: number };
const spots: Spot[] = [
  { unit: "3925", x: .12, line: .38, clip: .66 }, // behind the Transit's hood
  { unit: "3925", x: .74, line: .05, clip: .52 }, // over its high roof
  { unit: "3935", x: .12, line: .45, clip: .7 }, // behind the hood
  { unit: "3935", x: .62, line: .03, clip: .55 }, // over the box
  { unit: "3926", x: .13, line: .45, clip: .7 }, // behind the hood
  { unit: "3926", x: .27, line: .35, clip: .62 }, // beside the cab
  { unit: "fire", x: .22, line: .21, clip: .55 }, // in Old No. 5's hose bed
  { unit: "fire", x: .88, line: .3, clip: .6 }, // behind its hood
];
const crew: Crew[] = ["kalista", "braeden", "dylan", "medical-director"];
// A standing adult is about as tall as the Ford ambulance (3925); the crew's standing poses are drawn
// 1.72 times their stage. Up, this share of the stage shows above the line: head, shoulders, chest.
const STAGE = boxOf("3925").height / 1.72;
const SHOWN = .64;
// The fight's aim box: the part above the line, the middle of the stage.
const AIM_LEFT = .18;

type Phase = "rise" | "look" | "throw" | "hold" | "hit" | "duck";
type Medic = {
  id: number; person: Crew; name: string; vehicle: string; spot: Spot; rig: Rig;
  x: number; y: number; w: number; h: number; clip: number; cut: number; down: number;
  phase: Phase; frame: string; up: boolean;
};
type Wait = (ms: number) => Promise<void>;
type Env = { layer: () => HTMLDivElement | null; show: (medic: Medic | null) => void; say: (text: string) => void };

const between = (min: number, max: number) => min + Math.random() * (max - min);
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function place(spot: Spot, rig: Rig) {
  const v = boxOf(spot.unit), h = STAGE, w = h * rig.W / rig.H;
  const line = v.top + spot.line * v.height, clip = v.top + spot.clip * v.height;
  const x = v.left + spot.x * v.width - w / 2, y = line - SHOWN * h;
  // Down means the whole figure is below the body line (out of sight behind the vehicle).
  return { x, y, w, h, clip, cut: y + h - clip, down: ((clip - y) / h + .08) * 100 };
}

function previewSettings() {
  try {
    const query = new URLSearchParams(window.location.search);
    if (query.get("preview") !== "ve" || query.get("medic-preview") !== "now") return null;
    const unit = query.get("medic-unit"), person = query.get("medic-person");
    return { unit: (Object.keys(vehicles) as Unit[]).find(u => u === unit) ?? null, person: crew.find(p => p === person) ?? null };
  } catch { return null; }
}

function visible(el: Element) {
  const r = el.getBoundingClientRect();
  if (r.width < 8 || r.height < 8 || r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) return false;
  const style = getComputedStyle(el);
  return style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity) > .2;
}

function runMedics(env: Env) {
  const preview = previewSettings();
  let active = false, disposed = false, loading = false, aiming = false, serial = 0, lastSaid = -1e9;
  let medic: Medic | null = null, release: (() => void) | null = null;
  let timer: number | undefined, hoverFrame = 0, run: { dead: boolean; timers: Set<number> } | null = null;
  let lastPerson: Crew | null = null, lastUnit: Unit | null = null;
  let startX = 0, startY = 0, startType = "mouse", hoverX = 0, hoverY = 0, hoverType = "";
  const gap = () => preview ? 2000 : between(3500, 7000) * (isTesla() ? 1.5 : 1);
  const firstGap = () => preview ? 600 : between(1500, 3500);
  const blocked = () => disposed || !active || isSnowballTimeout() || document.hidden;
  const root = () => env.layer()?.querySelector<HTMLElement>("[data-medic]") ?? null;
  function set(patch: Partial<Medic>) {
    if (!medic) return;
    medic = { ...medic, ...patch };
    env.show(medic);
  }

  // Each visit is a little script; a hit or a pause cancels it mid-step.
  function play(script: (wait: Wait) => Promise<void>) {
    halt();
    const current = { dead: false, timers: new Set<number>() };
    run = current;
    const wait: Wait = ms => new Promise(resolve => {
      const t = window.setTimeout(() => { current.timers.delete(t); if (!current.dead) resolve(); }, ms);
      current.timers.add(t);
    });
    void script(wait).catch(() => {});
  }
  function halt() {
    if (!run) return;
    run.dead = true;
    run.timers.forEach(t => window.clearTimeout(t));
    run = null;
  }

  function schedule(ms = gap()) {
    window.clearTimeout(timer);
    if (blocked() || medic || loading) return;
    timer = window.setTimeout(() => void appear(), ms);
  }
  function remove(next = gap()) {
    halt();
    release?.();
    release = null;
    medic = null;
    aim(false);
    env.show(null);
    schedule(next);
  }

  async function appear() {
    if (blocked() || medic || loading) return;
    // Someone free: never anyone already out in another act.
    const order = preview?.person ? [preview.person] : [...crew.filter(p => p !== lastPerson).sort(() => Math.random() - .5), ...(lastPerson ? [lastPerson] : [])];
    let person: Crew | null = null;
    for (const candidate of order) {
      const claim = claimPerson(candidate);
      if (claim) { person = candidate; release = claim; break; }
    }
    if (!person) { schedule(preview ? 1000 : 4000); return; }
    const choices = spots.filter(s => preview?.unit ? s.unit === preview.unit : s.unit !== lastUnit);
    const spot = choices[Math.floor(Math.random() * choices.length)];
    const rig = crewRig(person), id = ++serial;
    loading = true;
    try {
      await Promise.all([...Object.values(rig.frames).map(f => loadArt(f.src)), loadArt(vehicles[spot.unit].src)]);
    } catch {
      loading = false;
      release?.(); release = null;
      schedule(6000);
      return;
    }
    loading = false;
    if (blocked() || medic || id !== serial) { release?.(); release = null; schedule(); return; }
    lastPerson = person;
    lastUnit = spot.unit;
    medic = { id, person, name: crewNames[person], vehicle: vehicles[spot.unit].name, spot, rig, ...place(spot, rig), phase: "rise", frame: "wave", up: false };
    env.show(medic);
    perform();
  }

  function perform() {
    play(async wait => {
      await wait(reducedMotion() ? 60 : 540);
      set({ phase: "look", up: true });
      if (medic && performance.now() - lastSaid > 30000) {
        lastSaid = performance.now();
        env.say(`${medic.name} peeks up from behind ${medic.vehicle} with a snowball.`);
      }
      await wait(1300);
      set({ phase: "throw", frame: "windup" });
      await wait(280);
      set({ frame: "release" });
      // The ball leaves the release pose's hand the moment that picture is up.
      window.requestAnimationFrame(() => { if (medic?.frame === "release") volley(); });
      await wait(430);
      set({ phase: "hold" });
      await wait(650);
      await duck(wait);
    });
  }
  async function duck(wait: Wait) {
    set({ phase: "duck", up: false });
    aim(false);
    await wait(reducedMotion() ? 60 : 380);
    remove();
  }

  // Positions on screen of a point on the medic's stage, through the rise, lean and jolt.
  function anchor([x, y]: XY): Point | null {
    const matrix = root()?.querySelector<SVGGraphicsElement>("[data-stage-ref]")?.getScreenCTM();
    if (!matrix) return null;
    const p = new DOMPoint(x, y).matrixTransform(matrix);
    return { x: p.x, y: p.y };
  }
  /** At the screen's viewer, or at another fighter in the scene (preferably ahead of the throwing arm). */
  function volley() {
    if (!medic?.rig.ball) return;
    const from = anchor(medic.rig.ball);
    if (!from) return;
    const scene = env.layer()?.closest("[data-visible]") ?? env.layer()?.parentElement;
    const mine = root();
    const fighters = scene ? [...scene.querySelectorAll<HTMLElement>("[data-snow-fighter]")].filter(el => !mine?.contains(el) && visible(el)) : [];
    const ahead = fighters.filter(el => { const r = el.getBoundingClientRect(); return r.left + r.width / 2 > from.x + 20; });
    const pool = ahead.length ? ahead : fighters;
    if (!pool.length || Math.random() < .4) {
      void throwSnowball({ from, to: { x: window.innerWidth * between(.3, .7), y: window.innerHeight * between(.3, .62) }, toward: "viewer", splat: "glass" });
      return;
    }
    const target = pool[Math.floor(Math.random() * pool.length)], r = target.getBoundingClientRect();
    const to = { x: r.left + r.width * between(.38, .62), y: r.top + r.height * between(.2, .48) };
    void throwSnowball({ from, to, splat: "powder", onImpact: () => { if (target.isConnected) snowHit(target, from); } });
  }

  /** Is the medic's painted figure (not the vehicle in front of it) at this point on screen? */
  function inkAt(x: number, y: number) {
    if (!medic?.up || medic.phase === "hit") return false;
    const ref = env.layer()?.querySelector<SVGGraphicsElement>("[data-town-ref]")?.getScreenCTM();
    if (!ref) return false;
    const p = new DOMPoint(x, y).matrixTransform(ref.inverse());
    if (p.y > medic.clip) return false;
    const v = boxOf(medic.spot.unit);
    if (paintedAt(vehicles[medic.spot.unit].src, (p.x - v.left) / v.width, (p.y - v.top) / v.height)) return false;
    const figure = root();
    if (!figure) return false;
    for (const picture of figure.querySelectorAll<SVGSVGElement>("svg[data-frame]")) {
      if (Number(getComputedStyle(picture).opacity) < .5) continue;
      const pose = medic.rig.frames[picture.dataset.frame ?? ""];
      const matrix = picture.querySelector("image")?.getScreenCTM();
      if (!pose || !matrix) continue;
      const q = new DOMPoint(x, y).matrixTransform(matrix.inverse());
      const painted = paintedAt(pose.src, q.x / pose.w, q.y / pose.h);
      if (painted ?? (q.x >= 0 && q.y >= 0 && q.x < pose.w && q.y < pose.h)) return true;
    }
    return false;
  }
  // The vehicle (a button) is in front, so the medic takes clicks and shows the reticle through a
  // page-level test of their painted pixels, like the crew on the Christmas lights.
  function aim(on: boolean) {
    if (on === aiming) return;
    aiming = on;
    document.documentElement.toggleAttribute("data-snow-aim", on);
  }
  function hover(event: PointerEvent) {
    hoverX = event.clientX; hoverY = event.clientY; hoverType = event.pointerType;
    if (!medic?.up && !aiming) return;
    if (!hoverFrame) hoverFrame = window.requestAnimationFrame(() => {
      hoverFrame = 0;
      aim((hoverType === "mouse" || hoverType === "pen") && !isSnowballTimeout() && inkAt(hoverX, hoverY));
    });
  }
  function pointer(event: PointerEvent) { startX = event.clientX; startY = event.clientY; startType = event.pointerType; }
  function click(event: MouseEvent) {
    if (!medic?.up || !event.detail || event.button || event.defaultPrevented || isSnowballTimeout() ||
        Math.hypot(event.clientX - startX, event.clientY - startY) > tapSlop(startType)) return;
    if (!reachSamples(touchReach(startType)).some(([dx, dy]) => inkAt(event.clientX + dx, event.clientY + dy))) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const at = { x: event.clientX, y: event.clientY };
    void visitorThrow(at, { onImpact: () => struck(at) });
  }
  /** The keyboard button: throw at the medic's face. */
  function shoot() {
    if (!medic?.up || medic.phase === "hit" || isSnowballTimeout()) return;
    const face = anchor(medic.rig.faces[0]);
    if (face) void visitorThrow(face, { onImpact: () => struck(face) });
  }
  /** Hit (by the visitor or another fighter): flinch with a startled face, then a mad one, and duck. */
  function struck(from?: Point) {
    if (!medic?.up || medic.phase === "hit") return;
    const { name, vehicle } = medic;
    play(async wait => {
      set({ phase: "hit", frame: "boo" });
      aim(false);
      ragdoll(from);
      env.say(`Direct hit! ${name} ducks behind ${vehicle}.`);
      await wait(300);
      set({ frame: "mad" });
      await wait(560);
      await duck(wait);
    });
  }
  function ragdoll(from?: Point) {
    const stage = root()?.querySelector<HTMLElement>("[data-stage]");
    if (!stage || reducedMotion()) return;
    const box = stage.getBoundingClientRect();
    const away = from && from.x > box.left + box.width / 2 ? -1 : 1;
    stage.animate([
      { rotate: "0deg", translate: "0 0" },
      { rotate: `${11 * away}deg`, translate: `${6 * away}% -2%`, offset: .16 },
      { rotate: `${-7 * away}deg`, translate: `${-3 * away}% 0`, offset: .4 },
      { rotate: `${3 * away}deg`, translate: "0 0", offset: .66 },
      { rotate: "0deg", translate: "0 0" },
    ], { duration: 760, easing: "cubic-bezier(.2,.7,.3,1)" });
  }
  function caught(event: Event) {
    if (event.target instanceof Node && env.layer()?.contains(event.target)) struck((event as CustomEvent<{ from?: Point }>).detail?.from);
  }

  function conditions() {
    if (blocked()) {
      window.clearTimeout(timer);
      if (!medic) return;
      // Time Out: they duck away. Offscreen or a hidden tab: gone at once.
      if (!disposed && active && !document.hidden && medic.up && medic.phase !== "duck" && !reducedMotion()) play(wait => duck(wait));
      else remove();
    } else if (!medic) schedule(firstGap());
  }

  const abort = new AbortController(), signal = abort.signal;
  document.addEventListener("pointerdown", pointer, { signal, passive: true, capture: true });
  document.addEventListener("pointermove", hover, { signal, passive: true, capture: true });
  // On the window: a tap on the medic is theirs before the site-wide fight's document listener
  // can take it as a plain throw (phones have no hover to mark the aim first).
  window.addEventListener("click", click, { signal, capture: true });
  document.addEventListener("visibilitychange", conditions, { signal });
  document.addEventListener("mems:snow-hit", caught, { signal });
  window.addEventListener(snowballTimeoutEvent, conditions, { signal });

  return {
    shoot,
    setActive(on: boolean) { active = on; conditions(); },
    stop() {
      disposed = true;
      halt();
      window.clearTimeout(timer);
      window.cancelAnimationFrame(hoverFrame);
      abort.abort();
      release?.();
      release = null;
      medic = null;
      aim(false);
    },
  };
}

const pct = (n: number) => `${(n * 100).toFixed(3)}%`;

function MedicFigure({ medic, onShoot }: { medic: Medic; onShoot: () => void }) {
  const { rig } = medic;
  const face = rig.faces[0], ball = rig.ball ?? [rig.W * .9, rig.H * .2];
  const hand = `${Math.min(1, Math.max(0, (ball[0] / rig.W - AIM_LEFT) / (1 - 2 * AIM_LEFT))).toFixed(2)},${Math.min(1, ball[1] / (rig.H * SHOWN)).toFixed(2)}`;
  const style = {
    "--x": String(medic.x), "--y": String(medic.y), "--w": String(medic.w), "--h": String(medic.h),
    "--cut": String(medic.cut), "--down": medic.down.toFixed(2) + "%", "--shown": pct(SHOWN),
    "--cx": pct(face[0] / rig.W), "--cy": pct(face[1] / rig.H),
  } as CSSProperties;
  return (
    <div className={styles.medic} data-medic={medic.person} data-unit={medic.spot.unit} data-phase={medic.phase} data-frame={medic.frame} style={style}>
      <div className={styles.clip} aria-hidden="true"><div className={styles.rise}><div className={styles.motion}>
        <div className={styles.stage} data-stage="">
          {Object.entries(rig.frames).map(([key, pose]) => (
            <svg key={key} className={styles.frame} data-frame={key} data-on={medic.frame === key || undefined} viewBox={`0 0 ${pose.w} ${pose.h}`}
              preserveAspectRatio="none" focusable="false"
              style={{ left: pct(pose.x / rig.W), top: pct(pose.y / rig.H), width: pct(pose.w * pose.s / rig.W), height: pct(pose.h * pose.s / rig.H) }}>
              <image href={pose.src} width={pose.w} height={pose.h} preserveAspectRatio="none" />
            </svg>
          ))}
          <svg className={styles.stageRef} viewBox={`0 0 ${rig.W} ${rig.H}`} preserveAspectRatio="none" focusable="false">
            <rect data-stage-ref="" width={rig.W} height={rig.H} fill="none" />
          </svg>
        </div>
      </div></div></div>
      {medic.up && <i className={styles.fighter} style={{ left: pct(AIM_LEFT), right: pct(AIM_LEFT) }} data-snow-fighter={`medic-${medic.person}`}
        data-snow-target="" data-snow-own-click="" data-snow-hand={hand} aria-hidden="true" />}
      {medic.up && medic.phase !== "hit" && <button type="button" className={styles.counter}
        aria-label={`Throw a snowball at ${medic.name} behind ${medic.vehicle}`} onClick={onShoot} />}
    </div>
  );
}

export default function WinterTruckMedics({ active }: { active: boolean }) {
  const [medic, setMedic] = useState<Medic | null>(null);
  const [notice, setNotice] = useState("");
  const layer = useRef<HTMLDivElement>(null);
  const engine = useRef<ReturnType<typeof runMedics> | null>(null);

  useEffect(() => {
    const medics = runMedics({ layer: () => layer.current, show: setMedic, say: setNotice });
    engine.current = medics;
    return () => { engine.current = null; medics.stop(); };
  }, []);
  useEffect(() => { engine.current?.setActive(active); }, [active]);

  return (
    <div ref={layer} className={styles.layer} data-truck-medics="">
      <svg className={styles.townRef} viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <rect data-town-ref="" width="100" height="50" fill="none" />
      </svg>
      {medic && <MedicFigure key={medic.id} medic={medic} onShoot={() => engine.current?.shoot()} />}
      <span role="status" className={styles.sr}>{notice}</span>
    </div>
  );
}
