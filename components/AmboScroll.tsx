"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { useWinterTheme } from "@/lib/seasonal/useWinterTheme";
import { isSnowballTimeout, useSnowballTimeout } from "@/lib/seasonal/snowballTimeout";
import { MITTEN_RELEASE, burst, flightTime, visitorStart, visitorThrow, type Point } from "@/lib/seasonal/snowballFlight";
import { isTesla, touchReach, useDeviceProfile } from "@/lib/device/profile";
import EmergencyLights from "./EmergencyLights";
import PoliceTow, { policeTruckWidth, type TowGeometry } from "./WinterDriveByTow";
import styles from "./AmboScroll.module.css";

const EMPLOYEE_PREFIXES = ["/lounge", "/admin", "/board", "/inventory", "/truckcheck"];
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

type NetworkInformation = EventTarget & { saveData?: boolean };

function connection() {
  return (navigator as Navigator & { connection?: NetworkInformation }).connection;
}

function preferStillArtwork() {
  return window.matchMedia(REDUCED_MOTION).matches ||
    connection()?.saveData === true ||
    (navigator.hardwareConcurrency || 4) <= 2;
}

function subscribeToMotionPreference(onChange: () => void) {
  const media = window.matchMedia(REDUCED_MOTION);
  const network = connection();
  media.addEventListener("change", onChange);
  network?.addEventListener("change", onChange);
  return () => {
    media.removeEventListener("change", onChange);
    network?.removeEventListener("change", onChange);
  };
}

const serverStillPreference = () => false;

export default function AmboScroll({ enabled }: { enabled: boolean }) {
  const pathname = usePathname() || "";
  const winter = useWinterTheme();
  const still = useSyncExternalStore(subscribeToMotionPreference, preferStillArtwork, serverStillPreference);
  if (!enabled || EMPLOYEE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;

  if (still) return winter ? <ParkedStill pathname={pathname} /> : null;
  return winter ? <WinterDriveBy /> : <DriveBy />;
}

// Reduced motion, data saver or a low-power device: a still picture instead of the drive-by: the
// police rescue, or Santa with his naughty list (it varies by page).
const PARKED_STILLS = [
  { src: "/images/winter/kit/police-truck/police-tow-reference.webp", width: 1280, height: 310 },
  { src: "/images/winter/kit/santa-naughty-list/naughty_list_reaction.png", width: 680, height: 340 },
] as const;

function ParkedStill({ pathname }: { pathname: string }) {
  let hash = 0;
  for (const c of pathname) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  const art = PARKED_STILLS[hash % PARKED_STILLS.length];
  return (
    <div aria-hidden="true" className={styles.parked}>
      <Image className={styles.parkedArt} src={art.src} alt="" width={art.width} height={art.height} unoptimized loading="lazy" draggable={false} />
    </div>
  );
}

// The rest of the year: the cartoon ambulance drives by once per session when the visitor reaches
// the bottom of the page.
function DriveBy() {
  const sentinel = useRef<HTMLDivElement>(null);
  const shown = useRef(false);
  const [driving, setDriving] = useState(false);

  useEffect(() => {
    const target = sentinel.current;
    if (!target || !("IntersectionObserver" in window)) return;
    const SESSION_KEY = "millstadt:ambulance-drive-by-shown";
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "true") return;
    } catch { /* The component ref also limits play when storage is unavailable. */ }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || shown.current) return;
      shown.current = true;
      observer.disconnect();
      try {
        sessionStorage.setItem(SESSION_KEY, "true");
      } catch { /* Storage can be disabled in privacy mode. */ }
      setDriving(true);
    }, { threshold: 0.5 });

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div aria-hidden="true" className={styles.marker} ref={sentinel} />
      {driving && (
        <div aria-hidden="true" className={styles.normalLane}>
          <SoloConvoy onFinish={() => setDriving(false)} />
        </div>
      )}
    </>
  );
}

function SoloConvoy({ onFinish }: { onFinish: () => void }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={styles.solo} data-moving={loaded ? "true" : undefined}
      onAnimationEnd={(event) => { if (event.target === event.currentTarget) onFinish(); }}>
      <Image className={styles.truck} src="/images/millstadt-ems/cartoon-ambo.png" alt=""
        width={1536} height={1024} sizes="96px" loading="eager"
        onLoad={() => setLoaded(true)} onError={() => setLoaded(true)} />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Winter: Unit 3935 tows a sleigh across the bottom of the screen 12-22s after arriving, then about
// every two minutes of visible time (a refresh starts the clock over). Each pass picks a convoy at
// random, never the same one twice running:
//   classic  - the cartoon 3935 towing Jen's sleigh. Pelt the ambulance and the snow piles up on it
//              in five stages until it's stuck; the Millstadt police and Santa winch it out.
//   chaos    - 3935 dragging a sleigh crammed with the screaming crew, songbooks and hats flying.
//   roof     - 3935 with the crew riding on the roof and swinging off the side, towing Jen's sleigh.
//   engine   - Millstadt Fire's Engine 3911 driving through on its own, in the ambulance's lane.
//   ladder   - Millstadt Fire's Ladder 3919, likewise. Both fire trucks get snowed in and towed
//              exactly like the ambulances.
//   reindeer - Santa's sleigh flying low over the road. Ten hits on Santa, the sleigh or the
//              reindeer and he stops, shakes off the snow and puts you on his naughty list.
// Any sleigh's riders can be buried up to their eyes. Time Out freezes everything where it is.
const FIRST_PASS = [12_000, 22_000] as const;
const BETWEEN_PASSES = 120_000;
const BURY_HITS = 10;
const STUCK_HITS = 12;
const SANTA_HITS = 10;
const rand = (min: number, max: number) => min + Math.random() * (max - min);

type VariantId = "classic" | "chaos" | "roof" | "reindeer" | "engine" | "ladder";
type Pass = { id: number; variant: VariantId; version: 1 | 2; seed: number };
// The fire trucks are the rarest passes (each about one in fifteen), on every device.
const VARIANT_WEIGHTS: ReadonlyArray<readonly [VariantId, number]> = [
  ["classic", .34], ["chaos", .22], ["roof", .22], ["reindeer", .22], ["engine", .07], ["ladder", .07],
];
/** Development only: ?vehicle=ambulance|engine_3911|ladder_3919 pins the drive-by and sends it right away. */
const VEHICLE_FLAG: Readonly<Record<string, VariantId>> = { ambulance: "classic", engine_3911: "engine", ladder_3919: "ladder" };
function devVehicle(params: URLSearchParams): VariantId | null {
  return process.env.NODE_ENV === "development" ? VEHICLE_FLAG[params.get("vehicle") ?? ""] ?? null : null;
}

/** ?preview=ve&driveby-variant=classic|chaos|roof|roof2|reindeer|engine|ladder pins the convoy (cosmetic preview only). */
function previewVariant(): Pick<Pass, "variant" | "version"> | null {
  const params = new URLSearchParams(window.location.search);
  const vehicle = devVehicle(params);
  if (vehicle) return { variant: vehicle, version: 1 };
  if (params.get("preview") !== "ve") return null;
  const asked = params.get("driveby-variant");
  if (asked === "roof2") return { variant: "roof", version: 2 };
  return VARIANT_WEIGHTS.some(([id]) => id === asked) ? { variant: asked as VariantId, version: 1 } : null;
}

function choosePass(id: number, previous: VariantId | null, broken: ReadonlySet<VariantId>): Pass | null {
  const pinned = previewVariant();
  const usable = VARIANT_WEIGHTS.filter(([v]) => !broken.has(v));
  const pool = usable.length > 1 ? usable.filter(([v]) => v !== previous) : usable;
  if (!pool.length && !pinned) return null;
  let roll = Math.random() * pool.reduce((sum, [, w]) => sum + w, 0);
  let variant = pool[0]?.[0] ?? "classic";
  for (const [v, w] of pool) { roll -= w; if (roll <= 0) { variant = v; break; } }
  return {
    id,
    variant: pinned?.variant ?? variant,
    version: pinned?.version ?? (Math.random() < .5 ? 1 : 2),
    seed: Math.floor(Math.random() * 2 ** 31),
  };
}

const JEN = "/images/winter/sleigh.webp";
const DRIVEBY = "/images/winter/driveby";
/** Every image a pass shows at the start: all of it is loaded and decoded before the pass begins. */
function passArt(pass: Pass): string[] {
  switch (pass.variant) {
    case "classic": return [AMBULANCE.art, JEN, AMBULANCE.stages[0]];
    case "chaos": return [`${DRIVEBY}/chaos-ambulance.webp`, `${DRIVEBY}/chaos-sleigh.webp`, `${DRIVEBY}/chaos-legs.webp`, `${DRIVEBY}/chaos-props.webp`];
    case "roof": return [`${DRIVEBY}/roof-ride-${pass.version}.webp`, `${DRIVEBY}/roof-ride-${pass.version}-still.webp`, JEN];
    case "reindeer": return [REINDEER.base, POOF];
    case "engine": return [ENGINE_3911.art, ENGINE_3911.stages[0]];
    case "ladder": return [LADDER_3919.art, LADDER_3919.stages[0]];
  }
}

/** Resolves true once every image has loaded and decoded; false if any fails or it takes too long. */
function preload(urls: string[], ms = 12_000): Promise<boolean> {
  const one = (src: string) => new Promise<boolean>(resolve => {
    const img = new window.Image();
    img.decoding = "async";
    img.onload = () => { img.decode().then(() => resolve(true), () => resolve(true)); };
    img.onerror = () => resolve(false);
    img.src = src;
  });
  const timeout = new Promise<boolean>(resolve => window.setTimeout(() => resolve(false), ms));
  return Promise.race([Promise.all(urls.map(one)).then(all => all.every(Boolean)), timeout]);
}

/** A vehicle that can be snowed in and towed: its five snow-stage overlays and tow geometry. */
type StuckVehicle = {
  id: "ambulance" | "chaos" | "roof" | "engine" | "ladder";
  art: string;
  stages: readonly string[];
  /** Fractions of the art box: front bumper x, body length, road line y, front tow hook, and the
   *  vehicle's own roof line y (under any riders), which sizes the police pickup beside it. */
  front: number; length: number; floor: number; hook: readonly [number, number]; roof: number;
};
const snowStages = (prefix: string) => [1, 2, 3, 4, 5].map(n => `/images/winter/kit/ambulance-snow/${prefix}${n}.webp`);
const AMBULANCE: StuckVehicle = {
  id: "ambulance",
  art: "/images/winter/driveby/cartoon-ambo.webp",
  stages: snowStages("stage"),
  front: .018, length: .97, floor: .918, hook: [.029, .718], roof: .05,
};
// The painted 3935 in the chaos sleigh and roof-ride passes: snow stages traced from each art's own
// outline (drifts from the road, caps on the roof, hood and windshield).
const CHAOS_AMBULANCE: StuckVehicle = {
  id: "chaos",
  art: `${DRIVEBY}/chaos-ambulance.webp`,
  stages: snowStages("chaos-stage"),
  front: .015, length: .97, floor: .985, hook: [.025, .76], roof: .05,
};
const ROOF_AMBULANCE: StuckVehicle = {
  id: "roof",
  art: `${DRIVEBY}/roof-ride-1-still.webp`,
  stages: snowStages("roof-stage"),
  front: .023, length: .96, floor: .993, hook: [.03, .76], roof: .38,
};
// Millstadt Fire's Engine 3911 and Ladder 3919, fitted to the cartoon ambulance's frame (1536 x 1024
// at half size): the same body length, front bumper and road line, so they share its --truck-width,
// lane and speed. Snow stages are traced from each truck's own outline.
const FIRE_TRUCKS = "/images/winter/kit/fire-trucks";
const fireStages = (truck: string) => [1, 2, 3, 4, 5].map(n => `${FIRE_TRUCKS}/${truck}-stage${n}.webp`);
const ENGINE_3911: StuckVehicle = {
  id: "engine",
  art: `${FIRE_TRUCKS}/engine-3911.webp`,
  stages: fireStages("engine-3911"),
  front: .009, length: .983, floor: .918, hook: [.014, .766], roof: .2,
};
const LADDER_3919: StuckVehicle = {
  id: "ladder",
  art: `${FIRE_TRUCKS}/ladder-3919.webp`,
  stages: fireStages("ladder-3919"),
  front: .009, length: .983, floor: .918, hook: [.031, .759], roof: .3,
};
/** Which vehicle gets snowed in on a pass: every ambulance and fire truck can be buried and towed out. */
function pickStuckVehicle(variant: VariantId): StuckVehicle | null {
  switch (variant) {
    case "classic": return AMBULANCE;
    case "chaos": return CHAOS_AMBULANCE;
    case "roof": return ROOF_AMBULANCE;
    case "engine": return ENGINE_3911;
    case "ladder": return LADDER_3919;
    case "reindeer": return null;
  }
}
/** Snow stage 1-5 for a hit count: stage 5 (fully stuck) lands on the STUCK_HITS-th hit. */
const snowStage = (hits: number) => hits <= 0 ? 0 : hits >= STUCK_HITS ? 5 : 1 + Math.floor((hits - 1) * 4 / (STUCK_HITS - 1));

const POOF = "/images/winter/kit/santa-naughty-list/hit_poof.webp";
const REACTION = { src: "/images/winter/kit/santa-naughty-list/naughty_list_reaction.webp", still: "/images/winter/kit/santa-naughty-list/naughty_list_reaction.png", ms: 5300 };
/** Where Santa's own scroll sits in the reaction art (fractions of its 680 x 268 sleigh box). */
const ART_SCROLL = [415 / 680, 88 / 268, 575 / 680, 325 / 268] as const;
const ballSize = () => Math.min(30, Math.max(14, window.innerWidth * .018));

function WinterDriveBy() {
  const timeout = useSnowballTimeout();
  const [count, setCount] = useState(0);
  const [pass, setPass] = useState<Pass | null>(null);
  const [riderHits, setRiderHits] = useState(0);
  const [truckHits, setTruckHits] = useState(0);
  const [santaHits, setSantaHits] = useState(0);
  const [stuck, setStuck] = useState(false);
  const [freed, setFreed] = useState(false);
  const [reaction, setReaction] = useState(false);
  const [ho, setHo] = useState(0);
  const [list, setList] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [tow, setTow] = useState<TowGeometry | null>(null);
  const [policeHits, setPoliceHits] = useState(0);
  const lane = useRef<HTMLDivElement>(null);
  const shift = useRef<HTMLDivElement>(null);
  const convoy = useRef<HTMLDivElement>(null);
  const ambulance = useRef<HTMLSpanElement>(null);
  const sleigh = useRef<HTMLSpanElement>(null);
  const snow = useRef<HTMLSpanElement>(null);
  const aim = useRef<Point | null>(null);
  const pointerType = useRef<string>("mouse");
  const fire = useRef<number | undefined>(undefined);
  const hits = useRef({ variant: null as VariantId | null, rider: 0, truck: 0, santa: 0, stuck: false, reaction: false });
  const shiftX = useRef(0);
  const towStart = useRef({ base: 0, slide: 0 });
  const lastVariant = useRef<VariantId | null>(null);
  const schedule = useRef({ count: -1, remaining: 0 });
  const broken = useRef(new Set<VariantId>());
  const driving = pass !== null;

  // Visible-time clock between passes; it also stands still during Time Out.
  useEffect(() => {
    if (driving || timeout) return;
    if (schedule.current.count !== count) {
      // ?preview=ve&driveby-preview=now (or ?vehicle= in development) sends the first pass right away.
      const params = new URLSearchParams(window.location.search);
      const preview = (params.get("preview") === "ve" && params.get("driveby-preview") === "now") || devVehicle(params) !== null;
      schedule.current = { count, remaining: count === 0 ? (preview ? 1500 : rand(FIRST_PASS[0], FIRST_PASS[1])) : BETWEEN_PASSES + rand(-20_000, 20_000) };
    }
    let started = 0, cancelled = false;
    let timer: number | undefined;
    // Pick a convoy, load and decode its art, then start. A convoy whose art won't load is left out
    // of the draw for this visit, so a pass never drives across with an empty box.
    const launch = async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        const next = choosePass(count + 1, lastVariant.current, broken.current);
        if (!next) break;
        const ok = await preload(passArt(next));
        if (cancelled) return;
        if (ok) {
          hits.current = { variant: next.variant, rider: 0, truck: 0, santa: 0, stuck: false, reaction: false };
          setPass(next);
          return;
        }
        broken.current.add(next.variant);
      }
      if (!cancelled) setCount(value => value + 1);   // try again at the next scheduled time
    };
    const run = () => {
      started = performance.now();
      timer = window.setTimeout(() => { started = 0; schedule.current.remaining = 0; void launch(); }, schedule.current.remaining);
    };
    const hold = () => {
      window.clearTimeout(timer);
      if (started) schedule.current.remaining = Math.max(0, schedule.current.remaining - (performance.now() - started));
      started = 0;
    };
    const onVisibility = () => { if (document.hidden) hold(); else run(); };
    if (!document.hidden) run();
    document.addEventListener("visibilitychange", onVisibility);
    return () => { cancelled = true; hold(); document.removeEventListener("visibilitychange", onVisibility); };
  }, [driving, count, timeout]);

  function stopFire() { window.clearInterval(fire.current); fire.current = undefined; aim.current = null; }
  useEffect(() => stopFire, []);
  useEffect(() => { if (timeout) stopFire(); }, [timeout]);

  function moveShift(x: number) {
    shiftX.current = x;
    if (shift.current) shift.current.style.transform = x ? `translateX(${x}px)` : "";
  }

  function finish() {
    stopFire();
    lastVariant.current = pass?.variant ?? null;
    hits.current = { variant: null, rider: 0, truck: 0, santa: 0, stuck: false, reaction: false };
    setPass(null); setRiderHits(0); setTruckHits(0); setSantaHits(0); setStuck(false); setFreed(false);
    setReaction(false); setList(null); setHo(0); setTow(null); setPoliceHits(0);
    moveShift(0);
    setCount(value => value + 1);
  }

  function driveAnimation() {
    const el = convoy.current;
    // CSS module keyframe names are prefixed, so match the end of the name.
    return el?.getAnimations().find(a => a instanceof CSSAnimation && a.animationName.endsWith(el.dataset.drive ?? "winterDrive"));
  }

  // Where the convoy is heading (px/s); the throw leads the moving target like a real thrower.
  function velocity() {
    const el = convoy.current;
    if (!el || hits.current.stuck || hits.current.reaction) return 0;
    const run = driveAnimation();
    if (run && run.playState !== "running") return 0;
    const duration = Number(run?.effect?.getTiming().duration) || 19_200;
    return -(window.innerWidth + el.offsetWidth + 106) / (duration / 1000) * (run?.playbackRate ?? 1);
  }

  function landed(at: Point) {
    if (isSnowballTimeout() || !lane.current) return;
    const reach = touchReach(pointerType.current);
    const zones = Array.from(lane.current.querySelectorAll<HTMLElement>("[data-hit]"));
    const struck = (kind: string, pad: number) => zones.some(zone => {
      if (zone.dataset.hit !== kind) return false;
      const r = zone.getBoundingClientRect(), p = pad + reach;
      return at.x >= r.left - p && at.x <= r.right + p && at.y >= r.top - p && at.y <= r.bottom + p;
    });
    const h = hits.current;
    // The police truck (and Santa out with the hook) can be pelted during the rescue: its lights go.
    if (struck("police", 4)) {
      burst(at, "powder", ballSize());
      jolt(lane.current.querySelector("[data-police]"));
      setPoliceHits(n => n + 1);
      return;
    }
    if (struck("santa", 6)) {
      // Stopped for his naughty list, he takes no notice of snowballs until he's moving again.
      if (h.reaction) return;
      poofAt(at);
      jolt(lane.current.querySelector("[data-team]"));
      h.santa += 1; setSantaHits(h.santa);
      if (h.santa === 1 || h.santa % 4 === 0) setHo(n => n + 1);
      if (h.santa === 5) new window.Image().src = REACTION.src;   // warm up the reaction
      if (h.santa >= SANTA_HITS) {
        h.reaction = true;
        stopFire();
        setReaction(true);
        // A big, readable copy of his scroll goes exactly over the one in the art and covers it
        // completely, so there's only ever one list (nudged toward the screen where that allows).
        const l = lane.current.getBoundingClientRect();
        const t = (lane.current.querySelector("[data-team]") ?? convoy.current)?.getBoundingClientRect();
        if (t) {
          const [x0, y0, x1, y1] = ART_SCROLL;
          const art = { left: t.left + t.width * x0 - l.left, right: t.left + t.width * x1 - l.left, top: t.top + t.height * y0 - l.top, bottom: t.top + t.height * y1 - l.top };
          const width = Math.min(210, Math.max(120, window.innerWidth * .13)), height = width * .9;
          const onScreen = Math.min(l.width - width - 8, Math.max(8, (art.left + art.right) / 2 - width / 2));
          const x = Math.min(art.left, Math.max(art.right - width, onScreen));
          const y = Math.min(art.top, (art.top + art.bottom) / 2 - height / 2, l.height - height - 2);
          setList({ width, height, x, y });
        }
      }
      return;
    }
    burst(at, "powder", ballSize());
    if (struck("sleigh", 4) && h.rider < BURY_HITS) {
      h.rider += 1; setRiderHits(h.rider);
      jolt(sleigh.current);
    } else if (struck("truck", 6)) {
      jolt(ambulance.current);
      // While it's being rescued, hits just add puffs; they never restart the tow.
      if (!h.variant || h.stuck || !pickStuckVehicle(h.variant)) return;
      h.truck += 1; setTruckHits(h.truck);
      // The new snow settles.
      snow.current?.animate([{ transform: "scaleY(1.04)" }, { transform: "scaleY(1)" }], { duration: 200, easing: "ease-out" });
      if (h.truck >= STUCK_HITS) getStuck();
    }
  }

  function getStuck() {
    const vehicle = hits.current.variant ? pickStuckVehicle(hits.current.variant) : null;
    const l = lane.current?.getBoundingClientRect(), a = ambulance.current?.getBoundingClientRect();
    if (!vehicle || !l || !a) return;
    hits.current.stuck = true;
    setStuck(true);
    // The police truck pulls up in front of the ambulance; if it's stuck near the left edge, the
    // convoy first slides back on the ice so the truck and Santa stay on screen.
    const length = a.width * vehicle.length;
    const front = a.left + a.width * vehicle.front - l.left;
    // A real police pickup stands about two thirds as tall as an ambulance, a bit less beside a fire truck.
    const fire = vehicle.id === "engine" || vehicle.id === "ladder";
    const truck = policeTruckWidth(a.height * (vehicle.floor - vehicle.roof) * (fire ? .62 : .68));
    const room = truck * .8 + Math.max(length * .45, 74);
    const slide = Math.max(0, room - front);
    towStart.current = { base: shiftX.current, slide };
    setTow({
      laneWidth: l.width, laneHeight: l.height, screenTop: l.top,
      floor: a.top + a.height * vehicle.floor - l.top,
      front, hook: { x: a.left + a.width * vehicle.hook[0] - l.left, y: a.top + a.height * vehicle.hook[1] - l.top },
      length, slide, truck,
    });
  }

  // The ambulance pops out of the drift: the snow breaks away and its stages fade.
  function popOut() {
    setFreed(true);
    const a = ambulance.current?.getBoundingClientRect();
    if (a) breakaway(a);
  }

  // Back to normal driving: clickable again, fresh snow count.
  function release() {
    hits.current.stuck = false; hits.current.truck = 0;
    setStuck(false); setTruckHits(0); setFreed(false);
  }

  function shoot() {
    const target = aim.current;
    if (!target || isSnowballTimeout()) return;
    const start = visitorStart(target);
    const lead = { x: target.x + velocity() * (MITTEN_RELEASE + flightTime(start, target)), y: target.y };
    // Every landing is resolved in landed(): a hit poof, a powder burst or a miss.
    void visitorThrow(lead, { onImpact: landed, splat: "none" });
  }

  function down(e: ReactPointerEvent<HTMLDivElement>) {
    if (!e.isPrimary || e.button !== 0 || isSnowballTimeout()) return;
    if (!(e.target instanceof Element) || !e.target.closest("[data-drive-target]")) return;
    e.preventDefault();
    try { e.target.setPointerCapture(e.pointerId); } catch { /* Keeps firing without capture. */ }
    pointerType.current = e.pointerType || "mouse";
    aim.current = { x: e.clientX, y: e.clientY };
    shoot();
    window.clearInterval(fire.current);
    fire.current = window.setInterval(shoot, 135);   // hold to rapid-fire
  }

  return (
    <div ref={lane} aria-hidden="true" className={styles.winterLane}
      data-armed={pass && !timeout ? "true" : undefined}
      data-paused={timeout ? "true" : undefined}
      onPointerDown={down}
      onPointerMove={e => { if (aim.current) aim.current = { x: e.clientX, y: e.clientY }; }}
      onPointerUp={stopFire}
      onPointerCancel={stopFire}
      onLostPointerCapture={stopFire}
      onContextMenu={(event) => { if (pass) event.preventDefault(); }}>
      {pass && (
        <div ref={shift} className={styles.convoyShift}>
          <WinterConvoy key={pass.id} pass={pass} onFinish={finish} convoyRef={convoy} ambulanceRef={ambulance} sleighRef={sleigh} snowRef={snow} drive={{
            stuck, freed, reaction, paused: timeout,
            bury: Math.min(1, riderHits / BURY_HITS), buried: riderHits,
            stage: snowStage(truckHits), truckHits,
            santaStage: Math.min(5, Math.ceil(santaHits / 2)), ho,
            onReactionEnd: () => { hits.current.santa = 0; hits.current.reaction = false; setSantaHits(0); setReaction(false); setList(null); setHo(0); },
          }} />
        </div>
      )}
      {reaction && list && (
        <div className={styles.naughtyList} style={{ left: list.x, top: list.y, width: list.width, height: list.height }} aria-hidden="true">
          <span className={styles.listRoller} />
          <span className={styles.listPaper}>
            <b className={styles.listTitle}>Naughty List</b>
            <span className={styles.listLine}><span className={styles.listName}>Your Name</span></span>
            <span className={styles.listLine} />
            <span className={styles.listLine} />
          </span>
          <span className={styles.listRoller} />
        </div>
      )}
      {tow && <PoliceTow geometry={tow} paused={timeout} hits={policeHits}
        onSlide={dx => moveShift(towStart.current.base + dx)}
        onPull={dx => moveShift(towStart.current.base + towStart.current.slide + dx)}
        onPopOut={popOut}
        onRelease={release}
        onDone={() => setTow(null)} />}
    </div>
  );
}

/** A quick knock when a snowball lands (the translate property leaves the running animations alone). */
function jolt(el: Element | null | undefined) {
  if (!(el instanceof HTMLElement) || window.matchMedia(REDUCED_MOTION).matches) return;
  el.animate([{ translate: "0 0" }, { translate: "2px -1.5px" }, { translate: "-1px .5px" }, { translate: "0 0" }],
    { duration: 220, easing: "ease-out" });
}

/** The hit poof: a quick puff that's gone in about a quarter of a second. */
function poofAt(at: Point) {
  const size = ballSize() * 2.6;
  const el = document.createElement("img");
  el.src = POOF; el.alt = ""; el.setAttribute("aria-hidden", "true");
  Object.assign(el.style, {
    position: "fixed", left: at.x - size / 2 + "px", top: at.y - size / 2 + "px", width: size + "px", height: size + "px",
    zIndex: "44", pointerEvents: "none", objectFit: "contain",
  });
  document.body.appendChild(el);
  el.animate([{ transform: "scale(.45)", opacity: 1 }, { transform: "scale(1.15)", opacity: 0 }], { duration: 240, easing: "ease-out" })
    .finished.then(() => el.remove(), () => el.remove());
}

/** Snow chunks bursting off the ambulance as it comes free. */
function breakaway(box: DOMRect) {
  if (window.matchMedia(REDUCED_MOTION).matches) return;
  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  Object.assign(layer.style, { position: "fixed", inset: "0", zIndex: "31", pointerEvents: "none", overflow: "hidden" });
  document.body.appendChild(layer);
  const flights: Promise<unknown>[] = [];
  for (let i = 0, n = isTesla() ? 8 : 16; i < n; i++) {
    const chunk = document.createElement("i");
    const w = box.width * (.035 + Math.random() * .045), h = w * (.7 + Math.random() * .3);
    const x = box.left + box.width * (.06 + Math.random() * .88), y = box.top + box.height * (.55 + Math.random() * .38);
    Object.assign(chunk.style, {
      position: "absolute", left: x - w / 2 + "px", top: y - h / 2 + "px", width: w + "px", height: h + "px",
      borderRadius: "48% 52% 44% 56% / 60% 55% 45% 40%",
      background: "radial-gradient(circle at 38% 32%, #ffffff 0 40%, #e8f2fc 62%, #c9dcef 88%)",
      boxShadow: "0 1px 1.5px rgb(40 70 110 / 30%)",
    });
    layer.appendChild(chunk);
    const vx = (Math.random() - .35) * box.width * .9, vy = -box.height * (.35 + Math.random() * .6);
    const spin = (Math.random() < .5 ? -1 : 1) * (200 + Math.random() * 300);
    const frames: Keyframe[] = [];
    for (let k = 0; k <= 8; k++) {
      const t = k / 8;
      frames.push({ transform: `translate(${vx * t}px, ${vy * t + box.height * 1.7 * t * t}px) rotate(${spin * t}deg)`, opacity: t < .65 ? 1 : 1 - (t - .65) / .35 });
    }
    flights.push(chunk.animate(frames, { duration: 520 + Math.random() * 220, easing: "linear" }).finished);
  }
  void Promise.allSettled(flights).then(() => layer.remove());
}

/** Elements WinterDriveBy measures and knocks about: the convoy, its ambulance, sleigh and snow. */
type SpanRef = RefObject<HTMLSpanElement | null>;

type DriveProps = {
  stuck: boolean; freed: boolean; reaction: boolean; paused: boolean;
  /** 0-1 how deep the sleigh riders are buried, and the hit count (replays the thump per hit). */
  bury: number; buried: number;
  /** Snow stage on the ambulance (0-5). */
  stage: number; truckHits: number;
  /** Snow stage on Santa's team (0-5) and the "Ho ho ho!" count. */
  santaStage: number; ho: number;
  onReactionEnd: () => void;
};

// ---------------------------------------------------------------------------------------------
// Geometry. Every layer is placed from its own painting's pixel coordinates, so the art scales as
// one piece. Each convoy is sized to the lane the drive-by has always used: Unit 3935's body is
// about one --truck-width long on desktop and phones.
type Box = readonly [number, number, number, number];

const pct = (v: number) => `${+(v * 100).toFixed(3)}%`;
function place(box: Box, frame: Box): CSSProperties {
  const fw = frame[2] - frame[0], fh = frame[3] - frame[1];
  return {
    left: pct((box[0] - frame[0]) / fw), top: pct((box[1] - frame[1]) / fh),
    width: pct((box[2] - box[0]) / fw), height: pct((box[3] - box[1]) / fh),
  };
}
const shiftBox = (box: Box, dx: number): Box => [box[0] + dx, box[1], box[2] + dx, box[3]];

type VariantSpec = {
  stage: Box;
  /** Road line (source px); below the stage's bottom means the art flies above the road. */
  floor: number;
  /** --truck-width per source pixel. */
  unit: number;
  /** Fractions of the ambulance layer used to place the police tow. */
  ambulance: Pick<StuckVehicle, "front" | "length" | "floor" | "hook"> | null;
  /** Images that must load before the pass starts. */
  images: number;
};

// Classic: the cartoon ambulance and Jen's sleigh exactly where the drive-by has always had them
// (1536 px of the cartoon = one truck width).
const CLASSIC = {
  art: [0, 0, 1536, 1024] as Box,
  sleigh: [1736, -103, 2827, 917] as Box,
  rope: [1444, 704, 1906, 861] as Box,
};
// Chaos sleigh: ambulance_pulling_sleigh_chaos.png split into the ambulance, the sleigh and crew,
// the dragged crew member's legs and the flying songbooks and hats. The sleigh rides 160px back on
// its tow rope so it can bounce and fishtail behind the steady ambulance.
const CHAOS_SHIFT = 160;
const CHAOS = {
  ambulance: [1, 88, 798, 557] as Box,
  sleigh: [699, 1, 1267, 568] as Box,
  legs: [1141, 459, 1259, 607] as Box,
  rope: [588, 282, 818, 432] as Box,
};
// Snow pile in the chaos sleigh: it rises from the rim until only the top row's eyes and hats (and
// the sombrero) are left above it; lumps rise between the faces, never over their eyes.
type Pile = { x: number[]; top: number[]; base: number[]; face: boolean[] };
const CHAOS_PILE: Pile = {
  x: [760, 800, 842, 868, 897, 912, 932, 952, 975, 998, 1015, 1037, 1059, 1084, 1106, 1127, 1134, 1152, 1171, 1195, 1220, 1242],
  top: [302, 250, 170, 164, 168, 98, 95, 98, 86, 82, 80, 78, 80, 106, 106, 108, 176, 180, 180, 215, 258, 296],
  base: [304, 309, 316, 322, 332, 338, 345, 352, 361, 370, 377, 386, 394, 401, 405, 404, 402, 396, 386, 368, 334, 298],
  // Segment i runs from x[i-1] to x[i]; true where it crosses a face (a flat dip under the eyes).
  face: [false, false, false, true, true, false, true, true, false, false, false, true, true, false, true, true, false, true, true, false, false, false],
};
// Flying props on the sprite sheet: sheet x, width and height, and the source box.
const PROP_SHEET = { w: 294, h: 37 };
const PROPS: ReadonlyArray<{ name: string; sx: number; sw: number; sh: number; box: Box; from: "hand" | "head" | "back" }> = [
  { name: "book1", sx: 0, sw: 28, sh: 29, box: [806, 62, 853, 111], from: "hand" },
  { name: "book2", sx: 30, sw: 27, sh: 31, box: [851, 34, 896, 85], from: "hand" },
  { name: "paper1", sx: 59, sw: 23, sh: 23, box: [777, 104, 816, 142], from: "hand" },
  { name: "hat1", sx: 84, sw: 34, sh: 25, box: [1060, 3, 1117, 45], from: "head" },
  { name: "hat2", sx: 120, sw: 51, sh: 32, box: [1145, 34, 1230, 88], from: "head" },
  { name: "book3", sx: 173, sw: 26, sh: 29, box: [1212, 112, 1255, 161], from: "back" },
  { name: "paper2", sx: 201, sw: 24, sh: 22, box: [1221, 253, 1261, 290], from: "back" },
  { name: "book4", sx: 227, sw: 32, sh: 37, box: [1208, 316, 1262, 377], from: "back" },
  { name: "paper3", sx: 261, sw: 33, sh: 25, box: [1185, 398, 1240, 440], from: "back" },
];
const TESLA_PROPS = new Set(["book1", "hat2", "paper2", "book4"]);

// Roof ride: the animated 3935 with the crew on the roof and swinging off the side, towing Jen's
// sleigh. Coordinates are the cropped animation frame (874 x 688) with the sleigh behind it.
const ROOF = {
  art: [0, 0, 874, 688] as Box,
  sleigh: [884, 318, 1252, 662] as Box,
  rope: [730, 540, 920, 620] as Box,
};
// Santa's reindeer sleigh (the kit's 680 x 268 art, measured here in its 1235 x 487 source pixels).
const REINDEER = {
  art: [0, 0, 1235, 487] as Box,
  base: "/images/winter/kit/santa-naughty-list/reindeer-sleigh.webp",
  stages: [1, 2, 3, 4, 5].map(n => `/images/winter/kit/santa-naughty-list/stage${n}.webp`),
};
const HO_LINES = ["Ho ho ho!", "Ho ho... HO!", "Ho ho ho! Watch it!"];

const VARIANTS: Record<VariantId, VariantSpec> = {
  classic: {
    stage: [0, -105, 2830, 1024], floor: 940, unit: 1 / 1536, images: 2,
    ambulance: AMBULANCE,
  },
  chaos: {
    stage: [0, 0, 1430, 612], floor: 557, unit: .98 / 797, images: 3,
    ambulance: { front: 0, length: 1, floor: 1, hook: [.024, .815] },
  },
  roof: {
    stage: [0, 0, 1256, 688], floor: 683, unit: .98 / 748, images: 3,
    ambulance: { front: .002, length: .856, floor: .993, hook: [.017, .872] },
  },
  reindeer: {
    // Flies about 150px (source) above the road.
    stage: [0, 0, 1235, 487], floor: 637, unit: .6984 / 585, images: 1,
    ambulance: null,
  },
  // The fire trucks drive alone in the cartoon ambulance's own frame (1536 px = one truck width).
  engine: { stage: [0, 0, 1536, 1024], floor: 940, unit: 1 / 1536, images: 1, ambulance: ENGINE_3911 },
  ladder: { stage: [0, 0, 1536, 1024], floor: 940, unit: 1 / 1536, images: 1, ambulance: LADDER_3919 },
};

function stageVars(spec: VariantSpec): CSSProperties {
  const [x0, y0, x1, y1] = spec.stage;
  return {
    "--w": ((x1 - x0) * spec.unit).toFixed(4),
    "--ar": `${x1 - x0} / ${y1 - y0}`,
    "--below": ((y1 - spec.floor) * spec.unit).toFixed(4),
  } as CSSProperties;
}

// Seeded so a pass's random choices come from the pass itself and render stays pure.
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A lumpy snow pile between two contours: `b` = 0 sits on the rim, 1 reaches the eye line. */
function pileTop(pile: Pile, b: number) {
  const pts = pile.x.map((x, i) => [x, pile.base[i] + (pile.top[i] - pile.base[i]) * b] as const);
  const lump = Math.min(1, b * 2.5);
  let d = `${pts[0][0]} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    // Between faces the snow heaps up in lumps; across a face it dips a little under the eyes.
    const cy = pile.face[i] ? Math.max(y0, y1) + 3 * lump : Math.min(y0, y1) - (x1 - x0) * .38 * lump;
    d += ` Q ${((x0 + x1) / 2).toFixed(1)} ${cy.toFixed(1)} ${x1} ${y1.toFixed(1)}`;
  }
  return d;
}

function SnowPile({ pile, bury, buried, viewBox }: { pile: Pile; bury: number; buried: number; viewBox: string }) {
  if (bury <= 0) return null;
  const top = pileTop(pile, bury);
  let fill = `M ${pile.x[0]} ${pile.base[0]} L ${top}`;
  for (let i = pile.x.length - 1; i >= 0; i--) fill += ` L ${pile.x[i]} ${pile.base[i]}`;
  return (
    <svg key={buried} className={styles.pile} viewBox={viewBox} preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="drivebyPileShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" /><stop offset=".7" stopColor="#eef5fc" /><stop offset="1" stopColor="#d4e3f1" />
        </linearGradient>
      </defs>
      <path d={`${fill} Z`} fill="url(#drivebyPileShade)" />
      <path d={`M ${top}`} className={styles.pileEdge} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// ---------------------------------------------------------------------------------------------
function WinterConvoy({ pass, onFinish, drive, convoyRef, ambulanceRef, sleighRef, snowRef }: {
  pass: Pass; onFinish: () => void; drive: DriveProps;
  convoyRef: RefObject<HTMLDivElement | null>; ambulanceRef: SpanRef; sleighRef: SpanRef; snowRef: SpanRef;
}) {
  const spec = VARIANTS[pass.variant];
  const [loaded, setLoaded] = useState(0);
  const ready = loaded >= spec.images;
  const onArt = () => setLoaded(n => n + 1);

  // The art was preloaded, so this is instant; if it somehow isn't there, skip the pass rather
  // than drive an empty box across the screen.
  const finishRef = useRef(onFinish);
  useEffect(() => { finishRef.current = onFinish; });
  useEffect(() => {
    if (ready) return;
    const timer = window.setTimeout(() => finishRef.current(), 8_000);
    return () => window.clearTimeout(timer);
  }, [ready]);

  return (
    <div
      ref={convoyRef}
      className={styles.convoy}
      style={stageVars(spec)}
      data-variant={pass.variant}
      data-moving={ready ? "true" : undefined}
      data-stuck={drive.stuck ? "true" : undefined}
      data-reaction={drive.reaction ? "true" : undefined}
      data-drive="winterDrive"
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) onFinish();
      }}
    >
      {pass.variant === "classic" && <ClassicConvoy drive={drive} ambulanceRef={ambulanceRef} sleighRef={sleighRef} snowRef={snowRef} onArt={onArt} />}
      {pass.variant === "chaos" && <ChaosConvoy pass={pass} drive={drive} ambulanceRef={ambulanceRef} sleighRef={sleighRef} snowRef={snowRef} lit={ready} onArt={onArt} />}
      {pass.variant === "roof" && <RoofConvoy pass={pass} drive={drive} ambulanceRef={ambulanceRef} sleighRef={sleighRef} snowRef={snowRef} lit={ready} onArt={onArt} />}
      {pass.variant === "reindeer" && <ReindeerConvoy drive={drive} sleighRef={sleighRef} onArt={onArt} />}
      {pass.variant === "engine" && <FireTruckConvoy vehicle={ENGINE_3911} name="engine" drive={drive} ambulanceRef={ambulanceRef} snowRef={snowRef} onArt={onArt} />}
      {pass.variant === "ladder" && <FireTruckConvoy vehicle={LADDER_3919} name="ladder" drive={drive} ambulanceRef={ambulanceRef} snowRef={snowRef} onArt={onArt} />}
    </div>
  );
}

function Hit({ kind, box, frame }: { kind: "truck" | "sleigh" | "santa"; box: Box; frame: Box }) {
  return <span className={styles.hit} data-hit={kind} data-drive-target={kind} data-snow-target="" style={place(box, frame)} />;
}

/** Jen waving from her sleigh, buried by snowballs up to her eyes. */
function JenSleigh({ drive, sleighRef, box, frame, onArt }: { drive: DriveProps; sleighRef: SpanRef; box: Box; frame: Box; onArt: () => void }) {
  return (
    <span ref={sleighRef} className={styles.jenSleigh} style={place(box, frame)}>
      <span className={styles.rider}>
        <Image className={styles.riderBody} src={JEN} alt="" fill unoptimized
          sizes="(max-width: 767px) 110px, 160px" loading="eager" draggable={false} onLoad={onArt} onError={onArt} />
        <Image className={styles.wavingHand} src={JEN} alt="" fill unoptimized
          sizes="(max-width: 767px) 110px, 160px" loading="eager" draggable={false} />
        {drive.bury > 0 && (
          <svg key={drive.buried} className={styles.burial} viewBox="0 0 100 100" preserveAspectRatio="none" style={{ height: `${83 * drive.bury}%` }}>
            <path d="M0 100 L0 34 Q6 22 14 27 Q20 14 29 19 Q33 4 41 7 Q47 0 53 6 Q60 3 63 15 Q71 10 76 22 Q85 17 89 30 Q96 27 100 36 L100 100 Z"
              fill="#f8fbff" stroke="#bcd3ea" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
            <path d="M8 46 Q22 40 34 47 M54 38 Q68 33 80 41 M18 70 Q36 63 52 71 M60 66 Q76 60 92 68" fill="none" stroke="#d3e4f4" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
          </svg>
        )}
        <Hit kind="sleigh" box={[30, 40, 711, 690]} frame={[0, 0, 741, 693]} />
      </span>
    </span>
  );
}

/** The light-strung tow line between an ambulance and Jen's sleigh (the drive-by's original). */
function Towline({ box, frame }: { box: Box; frame: Box }) {
  return (
    <svg className={styles.towline} style={place(box, frame)} viewBox="0 0 120 34" preserveAspectRatio="none" focusable="false" aria-hidden="true">
      <path d="M 0 17 Q 63 35 120 6" stroke="#372924" strokeWidth="5" fill="none" vectorEffect="non-scaling-stroke" />
      <path d="M 0 16 Q 63 34 120 5" stroke="#e7bf69" strokeWidth="2.3" fill="none" vectorEffect="non-scaling-stroke" />
      <g className={styles.towLights}>
        <circle cx="30" cy="22" r="3.2" fill="#ff7262" />
        <circle cx="59" cy="23" r="3.2" fill="#ffda75" />
        <circle cx="86" cy="17" r="3.2" fill="#6ef1cd" />
      </g>
    </svg>
  );
}

/** Snow piling up on an ambulance stage by stage, stacked exactly over its art. Each stage loads a
 *  step ahead so the next one is ready when it lands; the pile breaks away when the tow frees it. */
function SnowStages({ vehicle, drive, snowRef }: { vehicle: StuckVehicle; drive: DriveProps; snowRef: SpanRef }) {
  const loadUpTo = drive.truckHits > 0 ? Math.min(5, drive.stage + 1) : 0;
  return (
    <span ref={snowRef} className={styles.snowStages} data-freed={drive.freed ? "true" : undefined}>
      {vehicle.stages.slice(0, loadUpTo).map((src, i) => (
        <Image key={src} className={styles.snowStage} data-on={drive.stage === i + 1 ? "true" : undefined}
          src={src} alt="" fill unoptimized sizes="(max-width: 767px) 155px, 220px" loading="eager" draggable={false} />
      ))}
    </span>
  );
}

function ClassicConvoy({ drive, ambulanceRef, sleighRef, snowRef, onArt }: { drive: DriveProps; ambulanceRef: SpanRef; sleighRef: SpanRef; snowRef: SpanRef; onArt: () => void }) {
  const stage = VARIANTS.classic.stage;
  const vehicle = AMBULANCE;
  return (
    <>
      <span className={styles.groundShadow} style={place([60, 900, 2780, 960], stage)} />
      <JenSleigh drive={drive} sleighRef={sleighRef} box={CLASSIC.sleigh} frame={stage} onArt={onArt} />
      <Towline box={CLASSIC.rope} frame={stage} />
      <span className={styles.powder} style={place([2700, 820, 3080, 960], stage)} />
      <span ref={ambulanceRef} className={styles.ambulance} data-classic="" style={place(CLASSIC.art, stage)}>
        <Image className={styles.layerArt} src={vehicle.art} alt="" fill unoptimized
          sizes="(max-width: 767px) 155px, 220px" loading="eager" draggable={false} onLoad={onArt} onError={onArt} />
        <SnowStages vehicle={vehicle} drive={drive} snowRef={snowRef} />
        <Hit kind="truck" box={[30, 60, 1520, 900]} frame={CLASSIC.art} />
      </span>
    </>
  );
}

/** Engine 3911 or Ladder 3919 driving through on its own, every light on: the Christmas lights
 *  twinkle in two sets, the engine's red light bar flashes and the headlights wig-wag. Buried by
 *  snowballs and towed like the ambulances. */
const TRUCK_GLOWS = {
  engine: ["twinkle-0", "twinkle-1", "bar", "left", "right"],
  ladder: ["twinkle-0", "twinkle-1", "left", "right"],
} as const;
function FireTruckConvoy({ vehicle, name, drive, ambulanceRef, snowRef, onArt }: {
  vehicle: StuckVehicle; name: "engine" | "ladder"; drive: DriveProps; ambulanceRef: SpanRef; snowRef: SpanRef; onArt: () => void;
}) {
  const frame: Box = [0, 0, 1536, 1024];
  const truck = name === "engine" ? "engine-3911" : "ladder-3919";
  return (
    <>
      <span className={styles.groundShadow} style={place([40, 905, 1520, 965], frame)} />
      <span className={styles.powder} style={place([1300, 820, 1680, 960], frame)} />
      <span ref={ambulanceRef} className={styles.ambulance} data-fire-truck={name} style={place(frame, frame)}>
        <Image className={styles.layerArt} src={vehicle.art} alt="" fill unoptimized
          sizes="(max-width: 767px) 155px, 220px" loading="eager" draggable={false} onLoad={onArt} onError={onArt} />
        {TRUCK_GLOWS[name].map(glow => (
          <Image key={glow} className={styles.truckGlow} data-glow={glow.replace(/-\d$/, "")} data-set={glow.endsWith("-1") ? "1" : undefined}
            src={`${FIRE_TRUCKS}/${truck}-${glow}.webp`} alt="" fill unoptimized sizes="(max-width: 767px) 155px, 220px" loading="eager" draggable={false} />
        ))}
        <SnowStages vehicle={vehicle} drive={drive} snowRef={snowRef} />
        <Hit kind="truck" box={name === "engine" ? [20, 200, 1520, 940] : [20, 280, 1520, 940]} frame={frame} />
      </span>
    </>
  );
}

function ChaosConvoy({ pass, drive, ambulanceRef, sleighRef, snowRef, lit, onArt }: { pass: Pass; drive: DriveProps; ambulanceRef: SpanRef; sleighRef: SpanRef; snowRef: SpanRef; lit: boolean; onArt: () => void }) {
  const tesla = useDeviceProfile() === "tesla";
  const stage = VARIANTS.chaos.stage;
  const sleighBox = CHAOS.sleigh;
  const random = seeded(pass.seed);
  const props = PROPS.filter(p => !tesla || TESLA_PROPS.has(p.name)).map(p => {
    const w = p.box[2] - p.box[0], h = p.box[3] - p.box[1];
    const cx = (p.box[0] + p.box[2]) / 2, cy = (p.box[1] + p.box[3]) / 2;
    // Each one leaves a hand, a head or the back of the sleigh and blows back over the crew.
    const start = p.from === "hand" ? [835 - cx + random() * 20, 195 - cy + random() * 20]
      : p.from === "head" ? [-40 - random() * 30, 14 + random() * 16]
        : [-55 - random() * 25, random() * 24 - 12];
    const end = p.from === "hand" ? [150 + random() * 90, -40 - random() * 40]
      : p.from === "head" ? [100 + random() * 60, 10 + random() * 40]
        : [110 + random() * 70, 30 + random() * 70];
    const spin = (random() < .5 ? -1 : 1) * (260 + random() * 300);
    const r0 = random() * 50 - 25;
    const lift = 30 + random() * 40;
    const vars = {
      "--x0": pct(start[0] / w), "--x1": pct(end[0] / w),
      "--y0": pct(start[1] / h), "--y1": pct(end[1] / h), "--yt": pct((Math.min(start[1], end[1]) - lift) / h),
      "--r0": `${r0.toFixed(0)}deg`, "--rm": `${(r0 + spin * .45).toFixed(0)}deg`, "--r1": `${(r0 + spin).toFixed(0)}deg`,
      "--dur": `${(1.25 + random() * .9).toFixed(2)}s`, "--delay": `${(-random() * 2.2).toFixed(2)}s`,
      "--sheet-size": `${pct(PROP_SHEET.w / p.sw)} ${pct(PROP_SHEET.h / p.sh)}`,
      "--sheet-pos": `${pct(p.sx / (PROP_SHEET.w - p.sw))} 0%`,
    } as CSSProperties;
    return { ...p, style: { ...place(p.box, sleighBox), ...vars } };
  });

  return (
    <>
      <span className={styles.groundShadow} style={place([60, 540, 1380, 572], stage)} />
      <span ref={sleighRef} className={styles.chaosSleigh} style={place(shiftBox(sleighBox, CHAOS_SHIFT), stage)}>
        {/* Tow rope: from the front rider's fist to a hitch tucked behind the ambulance's back corner. */}
        <svg className={styles.rope} style={place(CHAOS.rope, sleighBox)} viewBox="588 282 230 150" aria-hidden="true" focusable="false">
          <path d="M 793 300 Q 700 376 604 404" stroke="#3a2416" strokeWidth="6.5" fill="none" strokeLinecap="round" />
          <path d="M 793 300 Q 700 376 604 404" stroke="#a0703f" strokeWidth="2.6" strokeDasharray="5 4" fill="none" strokeLinecap="round" />
        </svg>
        <Image className={styles.layerArt} src="/images/winter/driveby/chaos-sleigh.webp" alt="" fill unoptimized
          sizes="(max-width: 767px) 110px, 160px" loading="eager" draggable={false} onLoad={onArt} onError={onArt} />
        <span className={styles.chaosLegs} style={place(CHAOS.legs, sleighBox)}>
          <Image className={styles.layerArt} src="/images/winter/driveby/chaos-legs.webp" alt="" fill unoptimized
            sizes="40px" loading="eager" draggable={false} onLoad={onArt} onError={onArt} />
        </span>
        <SnowPile pile={CHAOS_PILE} bury={drive.bury} buried={drive.buried} viewBox="699 1 568 567" />
        {props.map(p => <span key={p.name} className={styles.prop} style={p.style}><i /></span>)}
        <span className={styles.powder} style={place([1040, 498, 1150, 550], sleighBox)} />
        <Hit kind="sleigh" box={[752, 30, 1245, 548]} frame={sleighBox} />
        <Hit kind="sleigh" box={[1140, 455, 1262, 607]} frame={sleighBox} />
      </span>
      <span ref={ambulanceRef} className={styles.ambulance} style={place(CHAOS.ambulance, stage)}>
        <Image className={styles.layerArt} src="/images/winter/driveby/chaos-ambulance.webp" alt="" fill unoptimized
          sizes="(max-width: 767px) 150px, 216px" loading="eager" draggable={false} onLoad={onArt} onError={onArt} />
        <span className={styles.lights}><EmergencyLights unit="driveby-chaos" on={lit} /></span>
        <SnowStages vehicle={CHAOS_AMBULANCE} drive={drive} snowRef={snowRef} />
        <Hit kind="truck" box={[240, 105, 798, 492]} frame={CHAOS.ambulance} />
        <Hit kind="truck" box={[1, 230, 495, 557]} frame={CHAOS.ambulance} />
      </span>
    </>
  );
}

function RoofConvoy({ pass, drive, ambulanceRef, sleighRef, snowRef, lit, onArt }: { pass: Pass; drive: DriveProps; ambulanceRef: SpanRef; sleighRef: SpanRef; snowRef: SpanRef; lit: boolean; onArt: () => void }) {
  const stage = VARIANTS.roof.stage;
  return (
    <>
      <span className={styles.groundShadow} style={place([40, 650, 1240, 694], stage)} />
      <JenSleigh drive={drive} sleighRef={sleighRef} box={ROOF.sleigh} frame={stage} onArt={onArt} />
      <span className={styles.powder} style={place([1196, 610, 1290, 668], stage)} />
      <svg className={styles.towline} style={place(ROOF.rope, stage)} viewBox="730 540 190 80" aria-hidden="true" focusable="false">
        <path d="M 742 569 Q 822 606 904 584" stroke="#372924" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M 742 568 Q 822 605 904 583" stroke="#e7bf69" strokeWidth="2.3" fill="none" strokeLinecap="round" />
        <g className={styles.towLights}>
          <circle cx="772" cy="583" r="3.6" fill="#ff7262" />
          <circle cx="815" cy="590" r="3.6" fill="#ffda75" />
          <circle cx="860" cy="590" r="3.6" fill="#6ef1cd" />
        </g>
      </svg>
      <span ref={ambulanceRef} className={styles.ambulance} style={place(ROOF.art, stage)}>
        {/* The riders bounce in the animation; Time Out swaps in its first frame. */}
        <Image className={`${styles.layerArt} ${styles.roofMoving}`} src={`/images/winter/driveby/roof-ride-${pass.version}.webp`} alt="" fill unoptimized
          sizes="(max-width: 767px) 180px, 252px" loading="eager" draggable={false} onLoad={onArt} onError={onArt} />
        <Image className={`${styles.layerArt} ${styles.roofStill}`} src={`/images/winter/driveby/roof-ride-${pass.version}-still.webp`} alt="" fill unoptimized
          sizes="(max-width: 767px) 180px, 252px" loading="eager" draggable={false} onLoad={onArt} onError={onArt} />
        <span className={styles.lights}><EmergencyLights unit={`driveby-roof-${pass.version}`} on={lit} /></span>
        <SnowStages vehicle={ROOF_AMBULANCE} drive={drive} snowRef={snowRef} />
        <Hit kind="truck" box={[0, 250, 760, 684]} frame={ROOF.art} />
        <Hit kind="truck" box={[240, 0, 640, 280]} frame={ROOF.art} />
        <Hit kind="truck" box={[740, 470, 874, 580]} frame={ROOF.art} />
      </span>
    </>
  );
}

function ReindeerConvoy({ drive, sleighRef, onArt }: { drive: DriveProps; sleighRef: SpanRef; onArt: () => void }) {
  const art = REINDEER.art;
  return (
    <>
      <span className={styles.flightShadow} />
      <span className={styles.team} data-team="">
        <span className={styles.gallop}>
          <span className={styles.santaArt} data-hidden={drive.reaction ? "true" : undefined}>
            <Image className={styles.layerArt} src={REINDEER.base} alt="" fill unoptimized
              sizes="(max-width: 767px) 230px, 330px" loading="eager" draggable={false} onLoad={onArt} onError={onArt} />
            {/* Snow builds up in five stages, stacked exactly over the art. */}
            {REINDEER.stages.slice(0, drive.santaStage).map((src, i) => (
              <Image key={src} className={styles.santaStage} data-on={drive.santaStage === i + 1 ? "true" : undefined}
                src={src} alt="" fill unoptimized sizes="(max-width: 767px) 230px, 330px" loading="eager" draggable={false} />
            ))}
          </span>
          {drive.reaction && <NaughtyList paused={drive.paused} onEnd={drive.onReactionEnd} />}
          {drive.ho > 0 && !drive.reaction && (
            <span key={drive.ho} className={styles.hoBubble}>{HO_LINES[(drive.ho - 1) % HO_LINES.length]}</span>
          )}
          <span ref={sleighRef} className={styles.santaSleigh} style={place([640, 0, 1235, 487], art)} />
          <Hit kind="santa" box={[0, 20, 640, 480]} frame={art} />
          <Hit kind="santa" box={[655, 0, 1235, 480]} frame={art} />
        </span>
      </span>
    </>
  );
}

type DecodedFrame = { image: CanvasImageSource & { duration: number | null; close(): void } };
type ImageDecoderLike = {
  tracks: { ready: Promise<void>; selectedTrack: { frameCount: number } | null };
  completed: Promise<void>;
  decode(options: { frameIndex: number }): Promise<DecodedFrame>;
  close(): void;
};
type ImageDecoderClass = {
  new (init: { data: ArrayBuffer; type: string }): ImageDecoderLike;
  isTypeSupported(type: string): Promise<boolean>;
};

/**
 * Santa's naughty-list reaction (680 x 340, its top 680 x 268 over the sleigh art). The animated WebP
 * is decoded frame by frame and played on a clock that Time Out can stop; browsers without
 * ImageDecoder show the animation as an image and keep time with the same clock.
 */
function NaughtyList({ paused, onEnd }: { paused: boolean; onEnd: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<"canvas" | "image">("canvas");
  const live = useRef({ paused, onEnd });
  useEffect(() => { live.current = { paused, onEnd }; });

  useEffect(() => {
    let cancelled = false, raf = 0;
    let frames: DecodedFrame["image"][] = [];
    let decoder: ImageDecoderLike | null = null;
    const play = (ends: number[], draw?: (i: number) => void) => {
      let clock = 0, last = performance.now(), shown = -1;
      const tick = (now: number) => {
        const dt = Math.min(100, now - last);
        last = now;
        if (!live.current.paused) clock += dt;
        const i = ends.findIndex(end => clock < end);
        if (i < 0) { live.current.onEnd(); return; }
        if (i !== shown) { shown = i; draw?.(i); }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    (async () => {
      const Decoder = (window as unknown as { ImageDecoder?: ImageDecoderClass }).ImageDecoder;
      try {
        if (!Decoder || !(await Decoder.isTypeSupported("image/webp"))) throw new Error("no ImageDecoder");
        const data = await (await fetch(REACTION.src)).arrayBuffer();
        decoder = new Decoder({ data, type: "image/webp" });
        await decoder.tracks.ready;
        await decoder.completed;
        const count = decoder.tracks.selectedTrack?.frameCount ?? 0;
        if (!count) throw new Error("no frames");
        for (let i = 0; i < count; i++) frames.push((await decoder.decode({ frameIndex: i })).image);
        if (cancelled) return;
        const ctx = canvas.current?.getContext("2d");
        if (!ctx || !canvas.current) throw new Error("no canvas");
        const ends: number[] = [];
        let total = 0;
        for (const f of frames) { total += (f.duration ?? 100_000) / 1000; ends.push(total); }
        play(ends, i => { ctx.clearRect(0, 0, 680, 340); ctx.drawImage(frames[i], 0, 0, 680, 340); });
      } catch {
        if (cancelled) return;
        setMode("image");
        play([REACTION.ms]);
      }
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      frames.forEach(f => f.close());
      frames = [];
      decoder?.close();
    };
  }, []);

  return mode === "canvas"
    ? <canvas ref={canvas} className={styles.reaction} width={680} height={340} aria-hidden="true" />
    : <Image className={styles.reaction} src={paused ? REACTION.still : REACTION.src} alt="" width={680} height={340} unoptimized draggable={false} />;
}
