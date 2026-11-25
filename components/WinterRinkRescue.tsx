"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import EmergencyLights from "./EmergencyLights";
import styles from "./WinterRinkRescue.module.css";

// The Millstadt medics answer every fall on the Christmas rink: they wheel the stretcher in, lower
// it, bend to lift the patient on, raise it and wheel out. A skater knocked flat on the ice (three
// quick snowballs, or the hockey pair's collision) sends "winter-rink-knockdown"; the village hunt
// sends "winter-rink-pickup" when the gift thief goes down in the snow. While the crew is out, the
// rink hears "winter-rink-rescue" so the other skaters can make room and watch. Everyone knocked
// down while the crew is busy waits on the ice, in order, until the crew comes for them.

export const rinkKnockdownEvent = "winter-rink-knockdown";
export const rinkRescueEvent = "winter-rink-rescue";

/** Stacking order on the rink: nearer the front (a lower floor) paints on top. */
export const rinkDepthZ = (floor: number) => Math.round(10 + (.5 - floor) * 160);

export type RinkKnockdown = {
  person: string;
  /** Spoken in status messages, e.g. "the speed skater". */
  name: string;
  /** Centre of the patient lying on the ice, as a fraction of the rink's width. */
  x: number;
  /** The patient's resting line on the ice, as a fraction of the rink's height from the bottom. */
  floor: number;
  /** Perspective scale for the crew; 1 is the painted crew's own size. */
  scale: number;
  /** The lying patient's width on the ice, in percent of the rink's height. */
  width: number;
  /** -1 when the patient lies mirrored (head to the right). */
  flip: 1 | -1;
  /** Hockey: the crew arrives in an ambulance, lights going, and takes the player back to it. */
  ambulance?: boolean;
  /** Lying-down art (a posed fall). `rest` is where the patient's back meets the ice, as a fraction of its height. */
  patient: { src: string; width: number; height: number; rest: number };
  onStart?: () => void;
  onComplete?: () => void;
};
export type RinkRescueState = { active: boolean; person: string; x: number };

type Request = {
  subject: string; label: string; x: number; floor: number; scale: number; width: number; flip: 1 | -1;
  src: string; ratio: number; rest: number; lift: number; skater: boolean; ambulance: boolean;
  onStart?: () => void; onComplete?: () => void;
};
type Guest = { person: "guest"; x?: number; onComplete: () => void };
type Scene = { request: Request; playing: boolean; duration: number };

const rigDirectory = "/images/winter/hockey/rig/";
// The painted medics and stretcher are cut into puppet layers (one shared 768x384 canvas) so the
// crew can stop, lower the stretcher, bend to lift the patient on, raise it and wheel out. Back to front:
const rig = ["base", "scissor", "bed", "woman-legs", "woman-body", "man-legs", "man-body"] as const;
const rigClass = {
  base: "rigBase", scissor: "rigScissor", bed: "rigBed", "woman-legs": "rigWomanLegs",
  "woman-body": "rigWomanBody", "man-legs": "rigManLegs", "man-body": "rigManBody",
} as const;
// The gift thief keeps his painted fall: 95cqh wide on the snow, shrunk to the bed's length on the lift.
const thief = { src: "/images/winter/hockey/thief-down.webp", width: 600, height: 264 };
const bounded = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

function Sprite({ src, className, width, height }: { src: string; className: string; width: number; height: number }) {
  return <Image src={src} alt="" width={width} height={height} loading="eager" unoptimized draggable={false} className={className} />;
}

export default function WinterRinkRescue() {
  const stage = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState<Scene | null>(null);
  const [paused, setPaused] = useState(true);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const rink = stage.current?.parentElement;
    if (!rink) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let current: Request | null = null, queuedGuest: Request | null = null;
    const waiting: Request[] = [];
    let ready = false, playing = false, visible = false, disposed = false;
    let remaining = 0, duration = 0, startedAt: number | null = null;
    let timer: number | undefined;

    const tell = (active: boolean, request: Request) => window.dispatchEvent(new CustomEvent<RinkRescueState>(rinkRescueEvent, {
      detail: { active, person: request.subject, x: request.x },
    }));

    // One clock counts only visible, foreground time for the rescue that is playing.
    function pauseClock() {
      window.clearTimeout(timer);
      if (startedAt !== null) remaining = Math.max(0, remaining - (performance.now() - startedAt));
      startedAt = null;
    }

    function schedule() {
      pauseClock();
      const canRun = visible && !document.hidden;
      setPaused(!canRun);
      if (disposed || !canRun || !current || !ready) return;
      if (!playing) {
        playing = true;
        setScene({ request: current, playing: true, duration });
        setStatus(`Two Millstadt medics are bringing the stretcher onto the ice for ${current.label}.`);
        current.onStart?.();
      }
      startedAt = performance.now();
      timer = window.setTimeout(() => {
        startedAt = null;
        finish();
      }, remaining);
    }

    function finish() {
      pauseClock();
      const completed = current;
      current = null; ready = false; playing = false;
      setScene(null);
      if (completed) {
        setStatus("The medics have left the rink with their passenger.");
        tell(false, completed);
      }
      const next = queuedGuest ?? waiting.shift() ?? null;
      if (next === queuedGuest) queuedGuest = null;
      if (next) void begin(next);
      else schedule();
      completed?.onComplete?.();
    }

    async function begin(request: Request) {
      pauseClock();
      current = request; ready = playing = false;
      duration = motion.matches ? 3000 : request.ambulance ? 13_000 : 10_500;
      setScene({ request, playing: false, duration });
      tell(true, request);
      try {
        await Promise.all([...rig.map(part => rigDirectory + part + ".webp"), request.src].map(async src => {
          const image = new window.Image();
          image.src = src;
          await image.decode();
        }));
      } catch {
        if (!disposed && current === request) finish();
        return;
      }
      if (disposed || current !== request) return;
      ready = true; remaining = duration;
      schedule();
    }

    function onKnockdown(event: Event) {
      if (!(event instanceof CustomEvent) || !event.cancelable || document.hidden) return;
      const fall = event.detail as RinkKnockdown;
      if (!fall || typeof fall.person !== "string" || !fall.patient?.src ||
        ![fall.x, fall.floor, fall.scale, fall.width, fall.patient.width, fall.patient.height, fall.patient.rest].every(Number.isFinite)) return;
      event.preventDefault();
      const request: Request = {
        subject: fall.person, label: fall.name || "a skater", x: bounded(fall.x, .03, .97), floor: bounded(fall.floor, 0, .6),
        scale: bounded(fall.scale, .4, 1.4), width: bounded(fall.width, 10, 160), flip: fall.flip === -1 ? -1 : 1,
        src: fall.patient.src, ratio: fall.patient.height / fall.patient.width, rest: bounded(fall.patient.rest, 0, 1),
        lift: 1, skater: true, ambulance: fall.ambulance === true, onStart: fall.onStart, onComplete: fall.onComplete,
      };
      // The crew is busy: this skater stays down on the ice until they come back for them.
      if (current || queuedGuest) { waiting.push(request); return; }
      if (!visible) rink!.scrollIntoView({ block: "nearest", behavior: motion.matches ? "instant" : "smooth" });
      void begin(request);
    }

    function onGuest(event: Event) {
      if (!(event instanceof CustomEvent) || !event.cancelable || queuedGuest || current?.subject === "guest") return;
      const guest = event.detail as Guest;
      if (guest?.person !== "guest" || typeof guest.onComplete !== "function") return;
      event.preventDefault();
      const request: Request = {
        subject: "guest", label: "the gift thief", x: bounded(Number.isFinite(guest.x) ? guest.x! : .5, .19, .81), floor: .12,
        scale: 1, width: 95, flip: 1, src: thief.src, ratio: thief.height / thief.width, rest: 1, lift: .78, skater: false, ambulance: false,
        onComplete: guest.onComplete,
      };
      if (!visible) rink!.scrollIntoView({ block: "center", behavior: motion.matches ? "instant" : "smooth" });
      if (current) queuedGuest = request;
      else void begin(request);
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= .42;
      schedule();
    }, { threshold: [0, .42], rootMargin: "-50px 0px -35px" });
    observer.observe(rink);
    document.addEventListener("visibilitychange", schedule);
    motion.addEventListener("change", schedule);
    window.addEventListener(rinkKnockdownEvent, onKnockdown);
    window.addEventListener("winter-rink-pickup", onGuest);
    return () => {
      disposed = true; pauseClock(); observer.disconnect();
      document.removeEventListener("visibilitychange", schedule);
      motion.removeEventListener("change", schedule);
      window.removeEventListener(rinkKnockdownEvent, onKnockdown);
      window.removeEventListener("winter-rink-pickup", onGuest);
      current?.onComplete?.();
      queuedGuest?.onComplete?.();
      waiting.splice(0).forEach(request => request.onComplete?.());
    };
  }, []);

  const request = scene?.request;
  const drop = request ? (1 - request.rest) * request.width * request.ratio : 0;
  return <>
    <div className={styles.stage} ref={stage} aria-hidden="true" data-paused={paused}
      data-kind={request ? request.skater ? "skater" : "guest" : undefined} data-ambulance={request?.ambulance || undefined}
      data-rink-rescue={scene ? scene.playing ? "playing" : "loading" : "idle"} style={request ? {
        "--run": (scene?.duration ?? 10_500) + "ms", "--pickup-x": request.x * 100 + "%", "--ground": request.floor * 100 + "%",
        "--crew": request.scale, "--down-w": request.width, "--down-drop": drop, "--flip": request.flip, "--lift": request.lift,
        // On the bed the patient keeps the same size (skaters) or shrinks to the bed's length (the thief).
        "--bed-w": request.width * request.lift / (148 * request.scale) * 100 + "%",
        "--bed-drop": drop * request.lift / (74 * request.scale) * 100 + "%",
        // Limbs below the patient's back tuck out of sight behind the mattress once they're on the bed.
        "--clip": request.skater ? Math.max(0, (1 - request.rest) * 100 - 3) + "%" : "0%",
        "--z": rinkDepthZ(request.floor),
      } as CSSProperties : undefined}>
      {scene?.playing && request && <>
        {/* Hockey: Millstadt EMS unit 3925 pulls up at the edge of the rink, lights going; the crew
            comes out of it with the cot and takes the player back to it, then it drives off. */}
        {request.ambulance && (
          <div className={styles.amboLane}>
            <div className={styles.ambo}>
              <Sprite src="/images/winter/fleet/3925.webp" width={760} height={444} className={styles.amboArt} />
              <EmergencyLights unit="3925" on />
            </div>
          </div>
        )}
        <div className={styles.cotLane}>
          <div className={styles.crew}>
            {rig.map(part => part === "bed"
              ? <div key={part} className={styles.rigBed}>
                  <Sprite src={rigDirectory + "bed.webp"} width={768} height={384} className={styles.rigPart} />
                  {/* Everyone rides out in their own posed fall, lying on their side like the gift thief. */}
                  <Sprite src={request.src} width={400} height={Math.round(400 * request.ratio)} className={styles.onBed} />
                </div>
              : <Sprite key={part} src={rigDirectory + part + ".webp"} width={768} height={384} className={`${styles.rigPart} ${styles[rigClass[part]]}`} />)}
          </div>
        </div>
        <div className={styles.downLane}>
          <Sprite src={request.src} width={400} height={Math.round(400 * request.ratio)} className={styles.down} />
        </div>
      </>}
    </div>
    <span role="status" className={styles.announcement}>{status}</span>
  </>;
}
