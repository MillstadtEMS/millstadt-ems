"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { holdLane, laneClaimed } from "@/lib/seasonal/driveLane";
import { chicagoDateTimeKey } from "@/lib/seasonal/themes";
import { isSnowballTimeout } from "@/lib/seasonal/snowballTimeout";
import { burst, flightTime, MITTEN_RELEASE, visitorStart, visitorThrow } from "@/lib/seasonal/snowballFlight";
import { themeChangeEvent } from "@/lib/seasonal/useWinterTheme";
import styles from "./TurkeyFlyby.module.css";

// Thanksgiving week: now and then the crew's paramedic turkey (dark-navy uniform, Star of Life patch)
// flaps across the sky over the public site. The sprite is one 600 ms wingbeat flapping in place; the
// pass itself (altitude, gentle wave, pitch, direction, depth) is planned here and run on the
// compositor with the Web Animations API, so a busy page can't make it stutter.

const STAFF_ROUTES = ["/lounge", "/admin", "/inventory", "/truckcheck", "/board"];
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const SPRITE = { src: "/images/seasonal/turkey/paramedic-turkey-navy.webp", width: 240, height: 222 };
// In the source animation the bird covers 178 px per 15-frame wingbeat (600 ms) at sprite size, so
// this airspeed keeps the wings and the ground speed in step (no treading air, no skating).
const AIRSPEED_PER_SPRITE_PX = 178 / 0.6 / SPRITE.width;
const FIRST_PASS = [20_000, 60_000] as const;
const BETWEEN_PASSES = [120_000, 300_000] as const;
const PREVIEW_DELAY = 1_500;

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function isStaffRoute(pathname: string) {
  return STAFF_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

/** ?preview=ve&turkey-preview=now sends a pass 1.5 s after load (cosmetic preview only). */
function isPreview() {
  const params = new URLSearchParams(window.location.search);
  return params.get("preview") === "ve" && params.get("turkey-preview") === "now";
}

/** Nov 18 through the Sunday after US Thanksgiving (fourth Thursday of November), Chicago time. */
function inTurkeyWeek(now = new Date()) {
  const today = chicagoDateTimeKey(now); // YYYY-MM-DDTHH:mm
  const year = Number(today.slice(0, 4));
  const firstWeekday = new Date(Date.UTC(year, 10, 1)).getUTCDay();
  const thanksgiving = 1 + ((4 - firstWeekday + 7) % 7) + 21;
  const sunday = new Date(Date.UTC(year, 10, thanksgiving + 3)); // can roll into December 1
  const last = `${String(sunday.getUTCMonth() + 1).padStart(2, "0")}-${String(sunday.getUTCDate()).padStart(2, "0")}`;
  const monthDay = today.slice(5, 10);
  return monthDay >= "11-18" && monthDay <= last;
}

type NetworkInformation = EventTarget & { saveData?: boolean };
const connection = () => (navigator as Navigator & { connection?: NetworkInformation }).connection;

function subscribe(onChange: () => void) {
  const motion = window.matchMedia(REDUCED_MOTION);
  const network = connection();
  motion.addEventListener("change", onChange);
  network?.addEventListener("change", onChange);
  window.addEventListener(themeChangeEvent, onChange);
  return () => {
    motion.removeEventListener("change", onChange);
    network?.removeEventListener("change", onChange);
    window.removeEventListener(themeChangeEvent, onChange);
  };
}

function canFly() {
  if (window.matchMedia(REDUCED_MOTION).matches || connection()?.saveData === true) return false;
  if (isPreview()) return true;
  // "normal" means the public seasonal decorations are switched off.
  return document.documentElement.dataset.memsSeason !== "normal" && inTurkeyWeek();
}

const serverCanFly = () => false;

export default function TurkeyFlyby() {
  const pathname = usePathname() || "";
  const enabled = useSyncExternalStore(subscribe, canFly, serverCanFly);
  // The staff tools (lounge, admin, inventory, truck check, board portal) stay calm.
  if (!enabled || isStaffRoute(pathname)) return null;
  return <TurkeySky />;
}

type Plan = {
  id: number;
  /** 1 flies left to right (the usual way), -1 is the mirrored right-to-left pass. */
  direction: 1 | -1;
  /** 0..1 within the altitude band (under the site header, inside the upper two-thirds). */
  altitude: number;
  /** Wave height and the climb or descent across the pass, as fractions of the viewport height. */
  amplitude: number;
  drift: number;
  /** Wave cycles across the screen, and where the wave starts. */
  cycles: number;
  phase: number;
  /** Nearer passes are a little larger and quicker, farther ones smaller and slower. */
  depth: number;
  /** Ground speed over the wingbeat-matched airspeed (a light tailwind). */
  pace: number;
};

function planPass(id: number): Plan {
  return {
    id,
    direction: Math.random() < 0.28 ? -1 : 1,
    altitude: Math.random(),
    amplitude: rand(0.016, 0.036),
    drift: rand(-0.05, 0.05),
    cycles: rand(1, 1.8),
    phase: rand(0, Math.PI * 2),
    depth: rand(0.9, 1.06),
    pace: rand(1, 1.14),
  };
}

/** A dialog or the open site menu sits over the sky: the turkey waits rather than fly unseen. */
function skyIsCovered() {
  return document.querySelector(
    'dialog[open],[aria-modal="true"],[aria-controls="site-navigation-panel"][aria-expanded="true"],[data-ladder-rescue]',
  ) !== null;
}

function TurkeySky() {
  const [pass, setPass] = useState<Plan | null>(null);
  const [passes, setPasses] = useState(0);

  // The clock between passes only runs while the tab is visible.
  useEffect(() => {
    if (pass) return;
    const preview = isPreview();
    let remaining = passes === 0
      ? (preview ? PREVIEW_DELAY : rand(FIRST_PASS[0], FIRST_PASS[1]))
      : rand(BETWEEN_PASSES[0], BETWEEN_PASSES[1]);
    let started = 0;
    let timer: number | undefined;
    const run = () => {
      started = performance.now();
      timer = window.setTimeout(launch, remaining);
    };
    function launch() {
      // On a short screen its sky reaches the road: it waits for a drive-by to go by (driveLane).
      if (skyIsCovered() || laneClaimed({ top: Math.max(8, headerBottom() + 10), bottom: (window.innerHeight * 2) / 3 })) {
        remaining = 8_000;
        run();
        return;
      }
      // The page may have stayed open past the Sunday after Thanksgiving.
      if (!preview && !inTurkeyWeek()) return;
      setPass(planPass(passes));
    }
    const onVisibility = () => {
      window.clearTimeout(timer);
      if (document.hidden) remaining = Math.max(0, remaining - (performance.now() - started));
      else run();
    };
    if (!document.hidden) run();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pass, passes]);

  if (!pass) return null;
  return (
    <TurkeyPass
      key={pass.id}
      plan={pass}
      onDone={() => {
        setPass(null);
        setPasses((count) => count + 1);
      }}
    />
  );
}

/** Lowest point of the fixed site header, so the turkey flies beneath it rather than behind it. */
function headerBottom() {
  const header = document.querySelector(".mems-site-nav");
  return header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
}

function flightPath(plan: Plan, bird: { width: number; height: number }) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = Math.max(24, bird.width * 0.14); // room for the pitch so no wingtip pokes in early
  const startX = plan.direction > 0 ? -bird.width - margin : vw + margin;
  const endX = plan.direction > 0 ? vw + margin : -bird.width - margin;
  const distance = Math.abs(endX - startX);

  // Altitude band: below the header, with the whole bird inside the upper two-thirds of the screen.
  const top = Math.max(8, headerBottom() + 10);
  const bottom = Math.max(top, (vh * 2) / 3 - bird.height);
  let amplitude = plan.amplitude * vh;
  let drift = plan.drift * vh;
  const needed = 2 * amplitude + Math.abs(drift);
  if (needed > bottom - top) {
    // Short screens (landscape phones): flatten the wave until it fits.
    const fit = (bottom - top) / Math.max(needed, 1);
    amplitude *= fit;
    drift *= fit;
  }
  const low = top + amplitude + Math.abs(drift) / 2;
  const high = bottom - amplitude - Math.abs(drift) / 2;
  const base = low + plan.altitude * Math.max(0, high - low);

  const keyframes: Keyframe[] = [];
  const steps = 64;
  let highest = Infinity, lowest = -Infinity;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const wave = 2 * Math.PI * plan.cycles * t + plan.phase;
    const x = startX + (endX - startX) * t;
    const y = base + drift * (t - 0.5) + amplitude * Math.sin(wave);
    highest = Math.min(highest, y);
    lowest = Math.max(lowest, y);
    // Nose follows the flight line: up while climbing, down while descending (mirrored for right-to-left).
    const slope = (drift + amplitude * 2 * Math.PI * plan.cycles * Math.cos(wave)) / distance;
    const pitch = Math.max(-9, Math.min(9, plan.direction * Math.atan(slope) * (180 / Math.PI) * 0.85));
    keyframes.push({ transform: `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${pitch.toFixed(2)}deg)` });
  }
  const speed = AIRSPEED_PER_SPRITE_PX * bird.width * plan.pace;
  // The band the bird covers on the way (its pitch tips a wing a little past its box).
  const sky = { top: highest - bird.height * 0.1, bottom: lowest + bird.height * 1.1 };
  return { keyframes, duration: (distance / speed) * 1000, sky };
}

function TurkeyPass({ plan, onDone }: { plan: Plan; onDone: () => void }) {
  const bird = useRef<HTMLDivElement>(null);
  const tumbler = useRef<HTMLSpanElement>(null);
  const flightRef = useRef<{ flight: Animation; speed: number } | null>(null);
  const done = useRef(onDone);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    done.current = onDone;
  });

  // Fly once the first frame is decoded (next/image decodes before onLoad); until then the bird
  // waits off-screen.
  useEffect(() => {
    const element = bird.current;
    if (!ready || !element) return;
    const { width, height } = element.getBoundingClientRect();
    const { keyframes, duration, sky } = flightPath(plan, { width, height });
    const flight = element.animate(keyframes, { duration, easing: "linear", fill: "both" });
    // Flying low over a short screen, it has the road until it's across: a drive-by waits for it.
    const unhold = holdLane("turkey", sky, duration);
    flight.onfinish = () => { unhold(); done.current(); };
    flightRef.current = { flight, speed: (plan.direction * (window.innerWidth + width * 2.3)) / (duration / 1000) };
    return () => { unhold(); flight.cancel(); };
  }, [ready, plan]);

  // Snowballs: a visitor's tap throws at where the turkey is heading; a hit (or one from the
  // site-wide fight) sends it tumbling in a puff of feathers, then it flaps off faster.
  const [hits, setHits] = useState(0);
  const react = useCallback(() => {
    setHits((count) => count + 1);
    // Knocked back head over tail feathers, then it rights itself.
    const turn = plan.direction > 0 ? -360 : 360;
    tumbler.current?.animate([
      { transform: "rotate(0deg) translateY(0)" },
      { transform: `rotate(${turn * 0.55}deg) translateY(22px)`, offset: 0.42 },
      { transform: `rotate(${turn}deg) translateY(6px)`, offset: 0.8 },
      { transform: `rotate(${turn}deg) translateY(0)` },
    ], { duration: 760, easing: "cubic-bezier(.3,.7,.4,1)" });
    const flight = flightRef.current?.flight;
    if (flight && flight.playbackRate < 1.7) flight.updatePlaybackRate(Math.min(1.7, flight.playbackRate + 0.35));
  }, [plan.direction]);
  useEffect(() => {
    const element = bird.current;
    if (!element) return;
    element.addEventListener("mems:snow-hit", react);
    return () => element.removeEventListener("mems:snow-hit", react);
  }, [react]);
  function throwAt(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    const element = bird.current;
    if (!element || isSnowballTimeout()) return;
    const box = element.getBoundingClientRect();
    const now = { x: box.left + box.width / 2, y: box.top + box.height * 0.5 };
    const lead = (flightRef.current?.speed ?? 0) * (flightRef.current?.flight.playbackRate ?? 1);
    const eta = MITTEN_RELEASE + flightTime(visitorStart(now), now);
    const aim = { x: now.x + lead * eta, y: now.y };
    void visitorThrow(aim, {
      splat: "none",
      onImpact: (at) => {
        const hitBox = bird.current?.getBoundingClientRect();
        if (hitBox && at.x > hitBox.left - 18 && at.x < hitBox.right + 18 && at.y > hitBox.top - 18 && at.y < hitBox.bottom + 18) {
          burst(at, "powder", 14);
          react();
        } else burst(at, "powder", 12);
      },
    });
  }

  return (
    <div className={styles.sky} aria-hidden="true">
      <div
        ref={bird}
        className={styles.bird}
        data-direction={plan.direction > 0 ? "right" : "left"}
        data-snow-fighter="turkey"
        data-snow-role="target"
        data-snow-own-click=""
        data-snow-target=""
        onPointerDown={throwAt}
        onClick={(event) => { event.preventDefault(); event.stopPropagation(); }}
        style={{ "--turkey-depth": plan.depth.toFixed(3) } as React.CSSProperties}
      >
        {hits > 0 && (
          <span key={hits} className={styles.ruffle} aria-hidden="true">
            {Array.from({ length: 9 }, (_, i) => <i key={i} style={{ "--feather": i } as React.CSSProperties} />)}
            <b>Gobble!</b>
          </span>
        )}
        {/* Requested only now that a pass has begun; eager because the bird starts off-screen. */}
        <span ref={tumbler} className={styles.tumbler}>
        <Image
          className={styles.sprite}
          src={SPRITE.src}
          alt=""
          width={SPRITE.width}
          height={SPRITE.height}
          unoptimized
          loading="eager"
          fetchPriority="low"
          draggable={false}
          onLoad={() => setReady(true)}
          onError={() => done.current()}
        />
        </span>
      </div>
    </div>
  );
}
