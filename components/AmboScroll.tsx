"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { useWinterTheme } from "@/lib/seasonal/useWinterTheme";
import { isSnowballTimeout, useSnowballTimeout } from "@/lib/seasonal/snowballTimeout";
import { MITTEN_RELEASE, burst, flightTime, visitorStart, visitorThrow, type Point } from "@/lib/seasonal/snowballFlight";
import { useDriveByLane } from "@/lib/seasonal/useDriveByLane";
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
//              Mylie drives (waving from behind the windshield) or rides in the back of Jen's sleigh.
//   chaos    - 3935 dragging a sleigh crammed with the screaming crew, songbooks and hats flying.
//              Mylie is calm at the wheel, or squeezed into the back of the sleigh waving at you.
//   roof     - 3935 with the crew riding on the roof and swinging off the side, Gabby dancing on the
//              roof with them, towing Jen's sleigh with Mylie and her coffee in the back. Hit Gabby
//              and she's knocked off the roof; she climbs back up fuming, then dances again.
// About three classic passes in ten, Engine 3911 or Ladder 3919 follows behind Jen's sleigh. The fire
// trucks never drive through on their own (the engine and ladder variants are kept for development
// previews, ?vehicle=engine_3911|ladder_3919).
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
/** Where Mylie rides on a pass: at the wheel of 3935, or in the back of Jen's sleigh. */
type MylieSeat = "drive" | "sleigh";
type Pass = { id: number; variant: VariantId; version: 1 | 2; seed: number; follower?: "engine" | "ladder"; mylie?: MylieSeat };
const VARIANT_WEIGHTS: ReadonlyArray<readonly [VariantId, number]> = [["classic", .34], ["chaos", .22], ["roof", .22], ["reindeer", .22]];
const FOLLOWER_CHANCE = .3;
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
  const chosen = pinned?.variant ?? variant;
  const params = new URLSearchParams(window.location.search);
  const forced = params.get("preview") === "ve" ? params.get("driveby-follower") : null;
  const follower = chosen !== "classic" ? undefined
    : forced === "engine" || forced === "ladder" ? forced
      : Math.random() < FOLLOWER_CHANCE ? (Math.random() < .5 ? "engine" : "ladder") : undefined;
  // Mylie rides with Jen behind the roof crew; on a classic or chaos pass she drives 3935 or rides in
  // the sleigh (?preview=ve&driveby-mylie=drive|sleigh pins it).
  const seat = params.get("preview") === "ve" ? params.get("driveby-mylie") : null;
  const mylie: MylieSeat | undefined = chosen === "roof" ? "sleigh"
    : chosen !== "classic" && chosen !== "chaos" ? undefined
      : seat === "drive" || seat === "sleigh" ? seat : Math.random() < .5 ? "drive" : "sleigh";
  return {
    id,
    variant: chosen,
    version: pinned?.version ?? (Math.random() < .5 ? 1 : 2),
    seed: Math.floor(Math.random() * 2 ** 31),
    follower,
    mylie,
  };
}

const JEN = "/images/winter/sleigh.webp";
const DRIVEBY = "/images/winter/driveby";
const RIDERS = "/images/winter/kit/driveby-riders";
const roofRide = (version: 1 | 2, still = false) => `${DRIVEBY}/roof-ride-${version}${still ? "-still" : ""}.webp`;
/** Mylie's art for a pass: at the wheel of this truck, or in the sleigh it tows. */
const mylieArt = (pass: Pass, cab: Cab, sleigh: readonly string[]) => pass.mylie === "drive" ? cabArt(cab) : pass.mylie === "sleigh" ? [...sleigh] : [];
/** Every image a pass shows at the start: all of it is loaded and decoded before the pass begins. */
function passArt(pass: Pass): string[] {
  switch (pass.variant) {
    case "classic": return [AMBULANCE.art, JEN, AMBULANCE.stages[0], ...(pass.follower ? [pass.follower === "engine" ? ENGINE_3911.art : LADDER_3919.art] : []), ...mylieArt(pass, CARTOON_CAB, [MYLIE_SLEIGH.art])];
    case "chaos": return [`${DRIVEBY}/chaos-ambulance.webp`, `${DRIVEBY}/chaos-sleigh.webp`, `${DRIVEBY}/chaos-legs.webp`, `${DRIVEBY}/chaos-props.webp`, ...mylieArt(pass, CHAOS_CAB, [MYLIE_CHAOS.body, MYLIE_CHAOS.wink, MYLIE_CHAOS.hand])];
    case "roof": return [roofRide(pass.version), roofRide(pass.version, true), JEN, GABBY.sheet, ...mylieArt(pass, CARTOON_CAB, [MYLIE_SLEIGH.art])];
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
  const [followerHits, setFollowerHits] = useState(0);
  const [santaHits, setSantaHits] = useState(0);
  const [stuck, setStuck] = useState(false);
  const [freed, setFreed] = useState(false);
  const [reaction, setReaction] = useState(false);
  const [ho, setHo] = useState(0);
  const [list, setList] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [tow, setTow] = useState<TowGeometry | null>(null);
  const [policeHits, setPoliceHits] = useState(0);
  const [gabbyKnocks, setGabbyKnocks] = useState(0);
  const lane = useRef<HTMLDivElement>(null);
  const shift = useRef<HTMLDivElement>(null);
  const convoy = useRef<HTMLDivElement>(null);
  const ambulance = useRef<HTMLSpanElement>(null);
  const sleigh = useRef<HTMLSpanElement>(null);
  const snow = useRef<HTMLSpanElement>(null);
  const aim = useRef<Point | null>(null);
  const pointerType = useRef<string>("mouse");
  const fire = useRef<number | undefined>(undefined);
  const hits = useRef({ variant: null as VariantId | null, rider: 0, truck: 0, follower: 0, santa: 0, stuck: false, reaction: false, gabbyOff: false });
  const shiftX = useRef(0);
  const towStart = useRef({ base: 0, slide: 0 });
  const lastVariant = useRef<VariantId | null>(null);
  const schedule = useRef({ count: -1, remaining: 0 });
  const broken = useRef(new Set<VariantId>());
  const driving = pass !== null;
  // Each pass is announced on the shared drive-by lane before it enters, so pop-ups and other
  // decorations clear the road in time (lib/seasonal/driveLane).
  const driveLane = useDriveByLane({ lane, convoy, pass, halted: stuck || reaction || timeout, tow });

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
        const ok = await driveLane.clearRoad(preload(passArt(next)), () => cancelled);
        if (cancelled) return;
        if (ok) {
          hits.current = { variant: next.variant, rider: 0, truck: 0, follower: 0, santa: 0, stuck: false, reaction: false, gabbyOff: false };
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
  }, [driving, count, timeout, driveLane]);

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
    hits.current = { variant: null, rider: 0, truck: 0, follower: 0, santa: 0, stuck: false, reaction: false, gabbyOff: false };
    setPass(null); setRiderHits(0); setTruckHits(0); setFollowerHits(0); setSantaHits(0); setStuck(false); setFreed(false);
    setReaction(false); setList(null); setHo(0); setTow(null); setPoliceHits(0); setGabbyKnocks(0);
    moveShift(0);
    setCount(value => value + 1);
  }

  function driveAnimation() {
    return driveRun(convoy.current);
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
    // Gabby dancing on the roof: one hit knocks her off (she's out of reach until she's back up).
    if (struck("gabby", 2)) {
      if (!h.gabbyOff) {
        h.gabbyOff = true;
        poofAt(at);
        setGabbyKnocks(n => n + 1);
      }
      return;
    }
    if (struck("sleigh", 4) && h.rider < BURY_HITS) {
      h.rider += 1; setRiderHits(h.rider);
      jolt(sleigh.current);
    } else if (struck("follower", 6)) {
      // The fire truck following the ambulance gets snowed in too; buried, it stops the whole convoy
      // and the police tow everyone out together.
      jolt(lane.current.querySelector("[data-fire-truck]"));
      if (!h.variant || h.stuck) return;
      h.follower += 1; setFollowerHits(h.follower);
      if (h.follower >= STUCK_HITS) getStuck();
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
    hits.current.stuck = false; hits.current.truck = 0; hits.current.follower = 0;
    setStuck(false); setTruckHits(0); setFollowerHits(0); setFreed(false);
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
    <div ref={lane} aria-hidden="true" className={styles.winterLane} data-lane=""
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
            stage: snowStage(truckHits), truckHits, followerStage: snowStage(followerHits), followerHits,
            santaStage: Math.min(5, Math.ceil(santaHits / 2)), ho,
            onReactionEnd: () => { hits.current.santa = 0; hits.current.reaction = false; setSantaHits(0); setReaction(false); setList(null); setHo(0); },
            gabbyKnocks, onGabbyBack: () => { hits.current.gabbyOff = false; },
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

/** A convoy's drive across the screen (CSS module keyframe names are prefixed, so match the end). */
function driveRun(el: HTMLElement | null) {
  return el?.getAnimations().find(a => a instanceof CSSAnimation && a.animationName.endsWith(el.dataset.drive ?? "winterDrive"));
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
  /** The same for a fire truck following the ambulance. */
  followerStage: number; followerHits: number;
  /** Snow stage on Santa's team (0-5) and the "Ho ho ho!" count. */
  santaStage: number; ho: number;
  onReactionEnd: () => void;
  /** Times Gabby has been knocked off the roof this pass; called once she's back up and dancing. */
  gabbyKnocks: number; onGabbyBack: () => void;
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
type Pile = {
  x: number[]; top: number[]; base: number[]; face: boolean[];
  /** How deep the burial (0-1) has to be before snow starts rising at each point (default 0). */
  delay?: number[];
};
const CHAOS_PILE: Pile = {
  x: [760, 800, 842, 868, 897, 912, 932, 952, 975, 998, 1015, 1037, 1059, 1084, 1106, 1127, 1134, 1152, 1171, 1195, 1220, 1242],
  top: [302, 250, 170, 164, 168, 98, 95, 98, 86, 82, 80, 78, 80, 106, 106, 108, 176, 180, 180, 215, 258, 296],
  base: [304, 309, 316, 322, 332, 338, 345, 352, 361, 370, 377, 386, 394, 401, 405, 404, 402, 396, 386, 368, 334, 298],
  // Segment i runs from x[i-1] to x[i]; true where it crosses a face (a flat dip under the eyes).
  face: [false, false, false, true, true, false, true, true, false, false, false, true, true, false, true, true, false, true, true, false, false, false],
};
// With Mylie leaning in at the back, the pile heaps up over her too, to just under her eyes, on the
// guitar neck where there's no sleigh under her (her waving hand stays out of it). That part only
// starts once the pile has climbed to the back of the sleigh, so the snow rises up over her instead
// of appearing in mid-air at guitar height.
const withMylie = (pile: Pile, from: number, tail: Required<Pile>): Pile => ({
  x: [...pile.x.slice(0, from), ...tail.x], top: [...pile.top.slice(0, from), ...tail.top],
  base: [...pile.base.slice(0, from), ...tail.base], face: [...pile.face.slice(0, from), ...tail.face],
  delay: [...pile.x.slice(0, from).map(() => 0), ...tail.delay],
});
const CHAOS_PILE_MYLIE = withMylie(CHAOS_PILE, 19, {
  x: [1186, 1200, 1213, 1226, 1240, 1253, 1266, 1280, 1294],
  top: [150, 128, 112, 98, 100, 108, 120, 140, 178],
  base: [375, 355, 340, 250, 244, 236, 232, 230, 228],
  face: [false, false, false, true, true, true, false, false, false],
  delay: [0, 0, .1, .48, .53, .57, .61, .65, .69],
});
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

// Gabby and Mylie ride along (art in kit/driveby-riders). Gabby dances on the roof with the crew in
// both roof rides. Mylie drives 3935, seen through its windshield, or rides in the back of Jen's
// sleigh with her coffee, or squeezes into the chaos sleigh with the screaming crew.
type Cab = {
  /** The windshield region in the vehicle layer's frame: Mylie's layers and the glass fill it. */
  box: Box;
  /** Image prefix (-smile, -wave with the hand cut away, -hand) and the windshield glass. */
  art: string; glass: string;
  /** The windshield opening (clip-path) and the waving hand's pivot, in % of the box. */
  clip: string; pivot: string;
};
const cabArt = (cab: Cab) => [`${cab.art}-smile.webp`, `${cab.art}-wave.webp`, `${cab.art}-hand.webp`, cab.glass];
// The cartoon 3935 (its 1152 x 768 art fills the classic 1536 x 1024 frame).
const CARTOON_CAB: Cab = {
  box: [528, 186.67, 816, 368], art: `${RIDERS}/mylie-drive-cartoon`, glass: `${RIDERS}/cab-glass-cartoon.webp`,
  clip: "polygon(0% 11.76%, 15.74% 8.82%, 89.81% 6.62%, 51.85% 91.18%, 15.74% 86.03%, 0% 84.56%)", pivot: "16.71% 115.79%",
};
// The painted 3935 in the chaos run, in the chaos stage's pixels (its art sits at 1, 88).
const CHAOS_CAB: Cab = {
  box: [237, 192, 393, 302], art: `${RIDERS}/mylie-drive-chaos`, glass: `${RIDERS}/cab-glass-chaos.webp`,
  clip: "polygon(0% 16.36%, 41.03% 11.82%, 90.38% 12.73%, 68.59% 91.82%, 41.03% 93.64%, 0% 95.45%)", pivot: "24.18% 109.85%",
};
/** Seconds between Mylie's waves from the driver's seat (the CSS cycle). */
const WAVE_CYCLE = 6.4;
const polygonPct = (pts: ReadonlyArray<readonly [number, number]>, w: number, h: number) =>
  `polygon(${pts.map(([x, y]) => `${pct(x / w)} ${pct(y / h)}`).join(", ")})`;
// Mylie in Jen's sleigh, in the sleigh art's pixels (741 x 693; the sleigh is drawn flipped, so the art
// faces right here and left on screen). She shows only through the seat between the presents, the
// rail and Jen, so the sleigh's side and Jen stay in front of her.
const MYLIE_SLEIGH = {
  art: `${RIDERS}/mylie-sleigh-coffee.webp`,
  box: [-13.4, 102.5, 236.6, 473.5] as Box,
  steam: [164, 146, 202, 223] as Box,
  seat: polygonPct([[-120, -40], [202, -40], [202, 148], [233, 152], [232, 190], [234, 216], [228, 240], [223, 270], [225, 300],
    [228, 330], [223, 350], [214, 385], [209, 420], [210, 444], [198, 433], [184, 411], [171, 388], [157, 370], [134, 352],
    [103, 333], [71, 320], [40, 308], [9, 302], [-120, 298]], 741, 693),
};
// Mylie in the chaos sleigh, in its art's pixels (the art sits at 699, 1): she leans in at the back
// behind the sombrero and the guitar, head up clear of the crowd, smiling and waving while everyone
// screams (now and then she winks: the winking body swaps in crisply). She sits under the art, so the
// crew stay in front of her, and shows only above the guitar neck; the hand turns on a pivot hidden
// behind the sombrero.
const CHAOS_SEAT: Box = [1100, -20, 1340, 300];
const MYLIE_CHAOS = {
  body: `${RIDERS}/mylie-chaos-open.webp`,
  wink: `${RIDERS}/mylie-chaos-wink.webp`,
  hand: `${RIDERS}/mylie-chaos-wave.webp`,
  box: [1100, -10, 1340, 300] as Box,
  pivot: "23.44% 52.75%",
  // Everything above the guitar neck and the sombrero guy's hand on it.
  clip: polygonPct(([[1100, -20], [1340, -20], [1340, 231], [1260, 233], [1240, 244], [1222, 240], [1216, 252], [1212, 265], [1205, 282], [1195, 300], [1100, 300]] as const)
    .map(([x, y]) => [x - CHAOS_SEAT[0], y - CHAOS_SEAT[1]] as const), CHAOS_SEAT[2] - CHAOS_SEAT[0], CHAOS_SEAT[3] - CHAOS_SEAT[1]),
};

// Gabby on the roof: a sprite sheet of 36 frames, each 240 x 270 at the 720 px roof-ride animation's
// scale (drawn at 1.4x that, so she stays crisp at roof ride 2's bigger scale) with her ground point
// (between the boots) at 120, 250. Frames 0-31 are her dance (a fist pump with a knee bounce, a wave
// with a hip sway, a pump swaying side to side, a kick and its landing), 32-34 knocked off with a mad
// face (the hit, then flailing arms and kicking legs), 35 her mad pose.
const GABBY = {
  sheet: `${RIDERS}/gabby-roof-dance.webp`,
  frames: 36,
  px: 1.4,
  frame: [0, 0, 240, 270] as Box,
  hit: [78, 50, 166, 254] as Box,
};
/** Her knocked-off gag (4.6 s in the CSS): when her grumble shows, and when it's gone. */
const GAG_SECONDS = 4.6;
const GRUMBLE = [GAG_SECONDS * .52, GAG_SECONDS * .9] as const;
type Pts = ReadonlyArray<readonly [number, number]>;
type RoofSpot = {
  /** Her sprite frame in the roof ride's 874 px still's pixels, and its scale against the riders' 720 px frames. */
  box: Box; scale: number;
  /** What shows of her (a clip-path in % of the box): while she dances and climbs back on, and while she's knocked off. */
  clip: string; fallClip: string;
  /** "back": she drops behind the roof's back edge; "off": she topples over the far corner and down behind the cab. */
  fall: "back" | "off";
  /** Mirrored (so her kick goes out over open air), and drawn behind the roof-ride art (the riders nearer
   *  the viewer, the light string and the roof's rim stay in front of her). */
  mirror: boolean; under: boolean;
  /** Where she peeks back up before hopping on (a fraction of her box width), and her grumble's side. */
  peek: number; bubble: "left" | "right";
  /** Her contact shadow on the roof's rim: its centre and width as fractions of her box. */
  shadow: readonly [number, number];
};
/** A clip-path showing everything above `edge` (points right to left, in still px), carried level past its ends. */
function clipAbove(box: Box, edge: Pts) {
  const w = box[2] - box[0], h = box[3] - box[1];
  const far = 4 * w, high = 4 * h;
  const pts = [[box[0] - far, box[1] - high], [box[2] + far, box[1] - high], [box[2] + far, edge[0][1]], ...edge, [box[0] - far, edge[edge.length - 1][1]]] as const;
  return polygonPct(pts.map(([x, y]) => [x - box[0], y - box[1]] as const), w, h);
}
/** Gabby's spot on a roof ride: her ground point and scale, and the edges that hide her. */
function roofSpot(at: readonly [number, number], scale: number, o: Omit<RoofSpot, "box" | "scale" | "clip" | "fallClip" | "mirror" | "peek" | "shadow">
  & { edge: Pts; fallEdge?: Pts; mirror?: boolean; peek?: number; shadow?: readonly [number, number] }): RoofSpot {
  const k = 874 / 720 * scale;
  const box: Box = [at[0] - 120 * k, at[1] - 250 * k, at[0] + 120 * k, at[1] + 20 * k];
  return {
    box, scale, clip: clipAbove(box, o.edge), fallClip: clipAbove(box, o.fallEdge ?? o.edge),
    fall: o.fall, mirror: !!o.mirror, under: o.under, peek: o.peek ?? 0, bubble: o.bubble, shadow: o.shadow ?? [.5, .34],
  };
}
const GABBY_ROOF: Record<1 | 2, RoofSpot> = {
  // Roof 1: at the back of the roof beside the three standing riders and at their scale, boots on the
  // roof's rim behind the light string. Knocked off, she drops behind the roof's back edge (the clip).
  1: roofSpot([694.4, 278], 1, {
    edge: [[745, 293], [700, 284], [650, 274], [600, 264], [540, 252], [455, 242]],
    fall: "back", under: true, bubble: "right",
  }),
  // Roof 2: the two riders up front are painted much bigger, so she stands on the box's far front
  // corner at their scale, just behind the nearer rider's raised hand. Mirrored, her kick goes out
  // over the corner. Knocked off, she topples over the corner and drops out of sight behind the cab;
  // she peeks back up clear of her neighbour's elbow, then hops back onto her corner. Her shadow sits
  // under the boot on the corner (the other is behind her neighbour).
  2: roofSpot([256, 264], 1.5, {
    edge: [[874, 520], [212, 520], [212, 266]], fallEdge: [[874, 505], [0, 505]],
    fall: "off", mirror: true, under: true, peek: -.127, bubble: "left", shadow: [.44, .2],
  }),
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

/** How far each point of a pile has risen (0-1) at burial depth `b`. */
const pileRise = (pile: Pile, b: number) => pile.x.map((_, i) => {
  const d = pile.delay?.[i] ?? 0;
  return Math.max(0, Math.min(1, (b - d) / (1 - d)));
});

/** A lumpy snow pile between two contours: 0 sits on the rim, 1 reaches the eye line. Only the points
 *  that have started to rise are drawn, so a later part grows out of the pile instead of a sliver. */
function pileTop(pile: Pile, rise: number[], n: number) {
  const pts = pile.x.slice(0, n).map((x, i) => [x, pile.base[i] + (pile.top[i] - pile.base[i]) * rise[i]] as const);
  let d = `${pts[0][0]} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const lump = Math.min(1, 2.5 * Math.min(rise[i - 1], rise[i]));
    // Between faces the snow heaps up in lumps; across a face it dips a little under the eyes.
    const cy = pile.face[i] ? Math.max(y0, y1) + 3 * lump : Math.min(y0, y1) - (x1 - x0) * .38 * lump;
    d += ` Q ${((x0 + x1) / 2).toFixed(1)} ${cy.toFixed(1)} ${x1} ${y1.toFixed(1)}`;
  }
  return d;
}

function SnowPile({ pile, bury, buried, viewBox }: { pile: Pile; bury: number; buried: number; viewBox: string }) {
  if (bury <= 0) return null;
  const rise = pileRise(pile, bury);
  // The points still waiting their turn come last: leave them out (the pile ends at its base there).
  let n = rise.length;
  while (n > 2 && rise[n - 1] <= 0) n--;
  const top = pileTop(pile, rise, n);
  let fill = `M ${pile.x[0]} ${pile.base[0]} L ${top}`;
  for (let i = n - 1; i >= 0; i--) fill += ` L ${pile.x[i]} ${pile.base[i]}`;
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
// A fire truck following the classic convoy rides in the same stage, 270 source px behind Jen's sleigh.
const FOLLOW_GAP = 270;
function convoySpec(pass: Pass): VariantSpec {
  const spec = VARIANTS[pass.variant];
  if (!pass.follower) return spec;
  const [x0, y0, x1, y1] = spec.stage;
  return { ...spec, stage: [x0, y0, x1 + FOLLOW_GAP + 1536, y1], images: spec.images + 1 };
}
/** The pass keeps the classic convoy's speed with a longer stage: its run takes proportionally longer. */
function driveSeconds(pass: Pass) {
  if (typeof window === "undefined" || !pass.follower) return undefined;
  const truck = Math.min(300, Math.max(165, window.innerWidth * .21));
  const base = VARIANTS[pass.variant], long = convoySpec(pass);
  const width = (s: VariantSpec) => (s.stage[2] - s.stage[0]) * s.unit * truck;
  const travel = (s: VariantSpec) => window.innerWidth + 16 + width(s) + 90;
  return 19.2 * travel(long) / travel(base);
}

function WinterConvoy({ pass, onFinish, drive, convoyRef, ambulanceRef, sleighRef, snowRef }: {
  pass: Pass; onFinish: () => void; drive: DriveProps;
  convoyRef: RefObject<HTMLDivElement | null>; ambulanceRef: SpanRef; sleighRef: SpanRef; snowRef: SpanRef;
}) {
  const spec = convoySpec(pass);
  const [seconds] = useState(() => driveSeconds(pass));
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
      style={{ ...stageVars(spec), ...(seconds ? { animationDuration: `${seconds.toFixed(2)}s` } : {}) }}
      data-variant={pass.variant}
      data-moving={ready ? "true" : undefined}
      data-stuck={drive.stuck ? "true" : undefined}
      data-reaction={drive.reaction ? "true" : undefined}
      data-drive="winterDrive"
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) onFinish();
      }}
    >
      {pass.variant === "classic" && <ClassicConvoy drive={drive} ambulanceRef={ambulanceRef} sleighRef={sleighRef} snowRef={snowRef} onArt={onArt}
        stage={spec.stage} follower={pass.follower} mylie={pass.mylie} seed={pass.seed} />}
      {pass.variant === "chaos" && <ChaosConvoy pass={pass} drive={drive} ambulanceRef={ambulanceRef} sleighRef={sleighRef} snowRef={snowRef} lit={ready} onArt={onArt} />}
      {pass.variant === "roof" && <RoofConvoy pass={pass} drive={drive} ambulanceRef={ambulanceRef} sleighRef={sleighRef} snowRef={snowRef} lit={ready} onArt={onArt} />}
      {pass.variant === "reindeer" && <ReindeerConvoy drive={drive} sleighRef={sleighRef} onArt={onArt} />}
      {pass.variant === "engine" && <FireTruckConvoy vehicle={ENGINE_3911} name="engine" drive={drive} ambulanceRef={ambulanceRef} snowRef={snowRef} onArt={onArt} />}
      {pass.variant === "ladder" && <FireTruckConvoy vehicle={LADDER_3919} name="ladder" drive={drive} ambulanceRef={ambulanceRef} snowRef={snowRef} onArt={onArt} />}
    </div>
  );
}

function Hit({ kind, box, frame }: { kind: "truck" | "sleigh" | "santa" | "follower" | "gabby"; box: Box; frame: Box }) {
  return <span className={styles.hit} data-hit={kind} data-drive-target={kind} data-snow-target="" style={place(box, frame)} />;
}

/** Jen waving from her sleigh (with Mylie in the back on some passes), buried by snowballs up to her eyes. */
function JenSleigh({ drive, sleighRef, box, frame, onArt, mylie = false }: { drive: DriveProps; sleighRef: SpanRef; box: Box; frame: Box; onArt: () => void; mylie?: boolean }) {
  return (
    <span ref={sleighRef} className={styles.jenSleigh} style={place(box, frame)}>
      <span className={styles.rider}>
        <Image className={styles.riderBody} src={JEN} alt="" fill unoptimized
          sizes="(max-width: 767px) 110px, 160px" loading="eager" draggable={false} onLoad={onArt} onError={onArt} />
        {mylie && <MylieInSleigh />}
        <Image className={styles.wavingHand} src={JEN} alt="" fill unoptimized
          sizes="(max-width: 767px) 110px, 160px" loading="eager" draggable={false} />
        {drive.bury > 0 && (
          <svg key={drive.buried} className={styles.burial} viewBox="0 0 100 100" preserveAspectRatio="none" style={{ height: `${83 * drive.bury}%` }}>
            {/* With Mylie aboard the drift heaps up over her too, to just under her eyes. */}
            <path d={mylie
              ? "M0 100 L0 22 Q3 9 8 12 Q14 14.5 20 12 Q24 9.5 26 15 Q27.5 20 29 19 Q33 4 41 7 Q47 0 53 6 Q60 3 63 15 Q71 10 76 22 Q85 17 89 30 Q96 27 100 36 L100 100 Z"
              : "M0 100 L0 34 Q6 22 14 27 Q20 14 29 19 Q33 4 41 7 Q47 0 53 6 Q60 3 63 15 Q71 10 76 22 Q85 17 89 30 Q96 27 100 36 L100 100 Z"}
              fill="#f8fbff" stroke="#bcd3ea" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
            <path d="M8 46 Q22 40 34 47 M54 38 Q68 33 80 41 M18 70 Q36 63 52 71 M60 66 Q76 60 92 68" fill="none" stroke="#d3e4f4" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
          </svg>
        )}
        <Hit kind="sleigh" box={[30, 40, 711, 690]} frame={[0, 0, 741, 693]} />
      </span>
    </span>
  );
}

/** Mylie in the back of Jen's sleigh with her coffee: she sways along, steam curls off the cup and
 *  every few seconds she gives a happy little bounce. Laid out in the sleigh art's own pixels. */
function MylieInSleigh() {
  const frame: Box = [0, 0, 741, 693];
  return (
    <span className={styles.seat} style={{ clipPath: MYLIE_SLEIGH.seat }}>
      <span className={styles.seated} style={place(MYLIE_SLEIGH.box, frame)}>
        <Image className={styles.layerArt} src={MYLIE_SLEIGH.art} alt="" fill unoptimized
          sizes="(max-width: 767px) 60px, 90px" loading="eager" draggable={false} />
        <svg className={styles.steam} style={place(MYLIE_SLEIGH.steam, MYLIE_SLEIGH.box)} viewBox="0 0 38 77" aria-hidden="true" focusable="false">
          <path d="M19 75 C 12 63, 26 55, 19 43 S 12 23, 20 9" />
          <path d="M23 73 C 30 61, 16 51, 24 39 S 30 21, 22 5" />
        </svg>
      </span>
    </span>
  );
}

/** Mylie squeezed into the back of the chaos sleigh, leaning in to wave (and now and then wink) while
 *  everyone screams; she rides the sleigh's bounces with a little bob of her own. Laid out in the
 *  sleigh art's pixels and drawn under it, so the crew stay in front of her. */
function MylieInChaos({ frame }: { frame: Box }) {
  return (
    <span className={styles.chaosSeat} style={{ ...place(CHAOS_SEAT, frame), clipPath: MYLIE_CHAOS.clip }}>
      <span className={styles.chaosRider} style={place(MYLIE_CHAOS.box, CHAOS_SEAT)}>
        <Image className={`${styles.layerArt} ${styles.chaosEyes}`} src={MYLIE_CHAOS.body} alt="" fill unoptimized sizes="(max-width: 767px) 50px, 80px" loading="eager" draggable={false} />
        <Image className={`${styles.layerArt} ${styles.chaosWink}`} src={MYLIE_CHAOS.wink} alt="" fill unoptimized sizes="(max-width: 767px) 50px, 80px" loading="eager" draggable={false} />
        <Image className={`${styles.layerArt} ${styles.chaosWave}`} src={MYLIE_CHAOS.hand} alt="" fill unoptimized sizes="(max-width: 767px) 50px, 80px" loading="eager" draggable={false}
          style={{ transformOrigin: MYLIE_CHAOS.pivot }} />
      </span>
    </span>
  );
}

/** Gabby dancing on the roof among the crew (frames 0-31 of her sprite sheet, stepped at the roof
 *  ride's own 70 ms a frame). A snowball knocks her off: she flails and topples off the roof, a beat
 *  later peeks back up glaring with an anger mark, hops on, fumes with a grumble and then dances again.
 *  One CSS timeline drives the whole gag, so Time Out freezes it where it is; she can't be hit again
 *  until she's back. Her grumble is kept fully on screen for as long as it shows. */
function RoofGabby({ version, knocks, onBack }: { version: 1 | 2; knocks: number; onBack: () => void }) {
  const spot = GABBY_ROOF[version];
  const [settled, setSettled] = useState(0);
  const root = useRef<HTMLSpanElement>(null);
  const fume = useRef<HTMLSpanElement>(null);
  const grumble = useRef<HTMLElement>(null);
  const gag = knocks > settled;

  useEffect(() => {
    const box = root.current, layer = fume.current, bubble = grumble.current;
    if (!gag || !box || !layer || !bubble) return;
    // Her grumble goes on the side that stays on screen for its whole hold, judged by where the truck
    // will have carried her by the time it appears and by the time it's gone.
    const convoy = box.closest<HTMLElement>("[data-drive]");
    const run = driveRun(convoy);
    const speed = convoy && !convoy.dataset.stuck && run?.playState === "running"
      ? (window.innerWidth + convoy.offsetWidth + 106) / ((Number(run.effect?.getTiming().duration) || 19_200) / 1000) * run.playbackRate : 0;
    const r = box.getBoundingClientRect(), vw = window.innerWidth;
    const head = r.left + r.width / 2, gap = r.width * .1, width = bubble.offsetWidth;
    const spill = (side: "left" | "right") => {
      // How far the bubble would stick out past either screen edge (8 px margin), at the start and end of its hold.
      const at = (t: number) => {
        const x = head - speed * t, left = side === "right" ? x + gap : x - gap - width;
        return Math.max(0, 8 - left) + Math.max(0, left + width - (vw - 8));
      };
      return Math.max(at(GRUMBLE[0]), at(GRUMBLE[1]));
    };
    const other = spot.bubble === "right" ? "left" : "right";
    layer.dataset.side = spill(spot.bubble) <= spill(other) ? spot.bubble : other;
    // If the truck will have carried her off the screen within half a second of her starting to grumble,
    // she keeps it to herself rather than leave a bubble at the edge with nobody saying it.
    if (head - speed * (GRUMBLE[0] + .5) < 0) { layer.dataset.mute = "true"; return; }
    // And whatever the screen does meanwhile (a narrow phone, a resize, the truck stopping or going on),
    // it's nudged back inside the screen and the lane every frame while it shows.
    const lane = box.closest<HTMLElement>("[data-lane]");
    let raf = 0;
    const keep = () => {
      const f = layer.getBoundingClientRect(), top = lane?.getBoundingClientRect().top ?? -Infinity;
      const left = f.left + bubble.offsetLeft, right = left + bubble.offsetWidth, y = f.top + bubble.offsetTop;
      const dx = left < 8 ? 8 - left : right > window.innerWidth - 8 ? window.innerWidth - 8 - right : 0;
      const dy = y < top + 3 ? top + 3 - y : 0;
      bubble.style.translate = dx || dy ? `${dx.toFixed(1)}px ${dy.toFixed(1)}px` : "";
      raf = requestAnimationFrame(keep);
    };
    keep();
    return () => cancelAnimationFrame(raf);
  }, [gag, knocks, spot.bubble]);

  const hit: Box = spot.mirror ? [240 - GABBY.hit[2], GABBY.hit[1], 240 - GABBY.hit[0], GABBY.hit[3]] : GABBY.hit;
  return (
    <span ref={root} className={styles.gabbyRoof} data-gag={gag ? "true" : undefined} data-fall={spot.fall}
      data-mirror={spot.mirror ? "true" : undefined}
      style={{ ...place(spot.box, ROOF.art), "--clip": spot.clip, "--fall-clip": spot.fallClip, "--peek-x": pct(spot.peek) } as CSSProperties}>
      {/* Her contact shadow on the roof's rim (laid over the art even when she's under it): it shrinks
          as she's knocked up and off, and lands with her. */}
      <span key={`shadow-${knocks}`} className={styles.gabbyShadow} style={{ left: pct(spot.shadow[0]), width: pct(spot.shadow[1]) }} />
      <span key={`clip-${knocks}`} className={styles.gabbyClip}>
        <span key={knocks} className={styles.gabbyMover}
          onAnimationEnd={(event) => { if (event.target === event.currentTarget && gag) { setSettled(knocks); onBack(); } }}>
          <span className={styles.gabbyFlip}>
            <Image className={styles.gabbySheet} src={GABBY.sheet} alt="" width={Math.round(240 * GABBY.px) * GABBY.frames}
              height={Math.round(270 * GABBY.px)} unoptimized loading="eager" draggable={false} />
          </span>
          {gag && (
            <svg className={styles.gabbyAnger} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
              <path d="M17 4 C 17 11, 13 15, 5 16 M23 4 C 23 11, 27 15, 35 16 M17 36 C 17 29, 13 25, 5 24 M23 36 C 23 29, 27 25, 35 24" />
            </svg>
          )}
        </span>
      </span>
      {gag && (
        <span key={knocks} ref={fume} className={styles.gabbyFume} data-side={spot.bubble} aria-hidden="true">
          <i /><i /><i />
          {/* Fuming, not cussing (the owner's call for Gabby). */}
          <b ref={grumble} className={styles.gabbyGrumble}>HMPH!</b>
        </span>
      )}
      {!gag && <Hit kind="gabby" box={hit} frame={GABBY.frame} />}
    </span>
  );
}

/** Mylie at the wheel, seen through the windshield: she bobs on her seat and every few seconds lifts a
 *  hand off the wheel to wave (with a wink). The windshield's own glass lies over her and the pillars
 *  and dash hide the rest; snow piling up on the truck covers her with it. */
function MylieDriver({ cab, frame, seed }: { cab: Cab; frame: Box; seed: number }) {
  const delay = -seeded(seed)() * WAVE_CYCLE;
  return (
    <span className={styles.cab} style={{ ...place(cab.box, frame), "--wave-delay": `${delay.toFixed(2)}s` } as CSSProperties}>
      <span className={styles.cabWindow} style={{ clipPath: cab.clip }}>
        <span className={styles.driver}>
          <Image className={styles.driverSmile} src={`${cab.art}-smile.webp`} alt="" fill unoptimized sizes="90px" loading="eager" draggable={false} />
          <Image className={styles.driverWave} src={`${cab.art}-wave.webp`} alt="" fill unoptimized sizes="90px" loading="eager" draggable={false} />
          <Image className={styles.driverHand} src={`${cab.art}-hand.webp`} alt="" fill unoptimized sizes="90px" loading="eager" draggable={false}
            style={{ transformOrigin: cab.pivot }} />
        </span>
      </span>
      <Image className={styles.cabGlass} src={cab.glass} alt="" fill unoptimized sizes="90px" loading="eager" draggable={false} />
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

function ClassicConvoy({ drive, ambulanceRef, sleighRef, snowRef, onArt, stage, follower, mylie, seed }: {
  drive: DriveProps; ambulanceRef: SpanRef; sleighRef: SpanRef; snowRef: SpanRef; onArt: () => void; stage: Box; follower?: "engine" | "ladder";
  mylie?: MylieSeat; seed: number;
}) {
  const vehicle = AMBULANCE;
  const followX = VARIANTS.classic.stage[2] + FOLLOW_GAP;
  return (
    <>
      <span className={styles.groundShadow} style={place([60, 900, 2780, 960], stage)} />
      <JenSleigh drive={drive} sleighRef={sleighRef} box={CLASSIC.sleigh} frame={stage} onArt={onArt} mylie={mylie === "sleigh"} />
      <Towline box={CLASSIC.rope} frame={stage} />
      <span className={styles.powder} style={place([2700, 820, 3080, 960], stage)} />
      <span ref={ambulanceRef} className={styles.ambulance} data-classic="" style={place(CLASSIC.art, stage)}>
        <Image className={styles.layerArt} src={vehicle.art} alt="" fill unoptimized
          sizes="(max-width: 767px) 155px, 220px" loading="eager" draggable={false} onLoad={onArt} onError={onArt} />
        {mylie === "drive" && <MylieDriver cab={CARTOON_CAB} frame={CLASSIC.art} seed={seed} />}
        <SnowStages vehicle={vehicle} drive={drive} snowRef={snowRef} />
        <Hit kind="truck" box={[30, 60, 1520, 900]} frame={CLASSIC.art} />
      </span>
      {follower && <FollowerTruck name={follower} box={[followX, 0, followX + 1536, 1024]} frame={stage} onArt={onArt} drive={drive} />}
    </>
  );
}

/** Engine 3911 or Ladder 3919 following the ambulance, every light on; it can be snowed in like the ambulance. */
function FollowerTruck({ name, box, frame, onArt, drive }: { name: "engine" | "ladder"; box: Box; frame: Box; onArt: () => void; drive: DriveProps }) {
  const snow = useRef<HTMLSpanElement>(null);
  const vehicle = name === "engine" ? ENGINE_3911 : LADDER_3919;
  const truck = name === "engine" ? "engine-3911" : "ladder-3919";
  return (
    <span className={styles.follower} data-fire-truck={name} style={place(box, frame)}>
      <span className={styles.groundShadow} style={place([40, 905, 1520, 965], [0, 0, 1536, 1024])} />
      <Image className={styles.layerArt} src={vehicle.art} alt="" fill unoptimized
        sizes="(max-width: 767px) 155px, 300px" loading="eager" draggable={false} onLoad={onArt} onError={onArt} />
      {TRUCK_GLOWS[name].map(glow => (
        <Image key={glow} className={styles.truckGlow} data-glow={glow.replace(/-\d$/, "")} data-set={glow.endsWith("-1") ? "1" : undefined}
          src={`${FIRE_TRUCKS}/${truck}-${glow}.webp`} alt="" fill unoptimized sizes="(max-width: 767px) 155px, 300px" loading="eager" draggable={false} />
      ))}
      <SnowStages vehicle={vehicle} drive={{ ...drive, stage: drive.followerStage, truckHits: drive.followerHits }} snowRef={snow} />
      <Hit kind="follower" box={name === "engine" ? [20, 200, 1520, 940] : [20, 280, 1520, 940]} frame={[0, 0, 1536, 1024]} />
    </span>
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
        {/* Mylie, squeezed in at the back, sits under the crew. */}
        {pass.mylie === "sleigh" && <MylieInChaos frame={sleighBox} />}
        <Image className={styles.layerArt} src="/images/winter/driveby/chaos-sleigh.webp" alt="" fill unoptimized
          sizes="(max-width: 767px) 110px, 160px" loading="eager" draggable={false} onLoad={onArt} onError={onArt} />
        <span className={styles.chaosLegs} style={place(CHAOS.legs, sleighBox)}>
          <Image className={styles.layerArt} src="/images/winter/driveby/chaos-legs.webp" alt="" fill unoptimized
            sizes="40px" loading="eager" draggable={false} onLoad={onArt} onError={onArt} />
        </span>
        <SnowPile pile={pass.mylie === "sleigh" ? CHAOS_PILE_MYLIE : CHAOS_PILE} bury={drive.bury} buried={drive.buried} viewBox="699 1 568 567" />
        {props.map(p => <span key={p.name} className={styles.prop} style={p.style}><i /></span>)}
        <span className={styles.powder} style={place([1040, 498, 1150, 550], sleighBox)} />
        <Hit kind="sleigh" box={[752, 30, 1245, 548]} frame={sleighBox} />
        <Hit kind="sleigh" box={[1140, 455, 1262, 607]} frame={sleighBox} />
      </span>
      <span ref={ambulanceRef} className={styles.ambulance} style={place(CHAOS.ambulance, stage)}>
        <Image className={styles.layerArt} src="/images/winter/driveby/chaos-ambulance.webp" alt="" fill unoptimized
          sizes="(max-width: 767px) 150px, 216px" loading="eager" draggable={false} onLoad={onArt} onError={onArt} />
        {/* Or Mylie at the wheel, calm as anything while the crew screams behind her. */}
        {pass.mylie === "drive" && <MylieDriver cab={CHAOS_CAB} frame={CHAOS.ambulance} seed={pass.seed} />}
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
  // Gabby dancing on the roof with them; where riders nearer the viewer stand beside her she's drawn
  // under the art, so they stay in front (the drift's roof cap settles over her boots too).
  const gabby = <RoofGabby version={pass.version} knocks={drive.gabbyKnocks} onBack={drive.onGabbyBack} />;
  const under = GABBY_ROOF[pass.version].under;
  return (
    <>
      <span className={styles.groundShadow} style={place([40, 650, 1240, 694], stage)} />
      <JenSleigh drive={drive} sleighRef={sleighRef} box={ROOF.sleigh} frame={stage} onArt={onArt} mylie={pass.mylie === "sleigh"} />
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
        {under && gabby}
        {/* The riders bounce in the animation; Time Out swaps in its first frame. */}
        <Image className={`${styles.layerArt} ${styles.roofMoving}`} src={roofRide(pass.version)} alt="" fill unoptimized
          sizes="(max-width: 767px) 180px, 252px" loading="eager" draggable={false} onLoad={onArt} onError={onArt} />
        <Image className={`${styles.layerArt} ${styles.roofStill}`} src={roofRide(pass.version, true)} alt="" fill unoptimized
          sizes="(max-width: 767px) 180px, 252px" loading="eager" draggable={false} onLoad={onArt} onError={onArt} />
        <span className={styles.lights}><EmergencyLights unit={`driveby-roof-${pass.version}`} on={lit} /></span>
        {!under && gabby}
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
