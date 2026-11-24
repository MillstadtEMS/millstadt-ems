"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./WinterRinkRescue.module.css";

type Subject = "hockey" | "solo" | "family" | "guest";
type Request = { subject: Subject; x: number; floor: number; onComplete?: () => void };
type Shot = { person: "solo" | "family"; x: number; floor: number };
type Guest = { person: "guest"; x?: number; onComplete: () => void };
type Scene = { request: Request; playing: boolean; duration: number };

const directory = "/images/winter/hockey/";
const nextHockey = () => 150_000 + Math.random() * 90_000;
const patient = (subject: Subject) => subject === "guest" ? "thief" : subject;
const loaded = (subject: Subject) => subject === "hockey" ? "medics-cot-loaded" : patient(subject) + "-loaded";
const down = (subject: Subject) => subject === "hockey" ? "blues-down" : patient(subject) + "-down";
const bounded = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

function Sprite({ file, className, width, height }: { file: string; className: string; width: number; height: number }) {
  return <Image src={directory + file + ".webp"} alt="" width={width} height={height}
    loading="eager" unoptimized draggable={false} className={className} />;
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
    const hits: Record<Shot["person"], number[]> = { solo: [], family: [] };
    let current: Request | null = null, queuedGuest: Request | null = null;
    let ready = false, playing = false, visible = false, disposed = false;
    let remaining = nextHockey(), duration = 0, startedAt: number | null = null;
    let timer: number | undefined;
    let focusedSkater: HTMLButtonElement | null = null;
    const targets = rink.querySelectorAll<HTMLButtonElement>("[data-skater] button");

    // A single clock counts only visible, foreground time for either the
    // next hockey game or the currently playing rescue. The two cannot overlap.
    function pauseClock() {
      window.clearTimeout(timer);
      if (startedAt !== null) remaining = Math.max(0, remaining - (performance.now() - startedAt));
      startedAt = null;
    }

    function schedule() {
      pauseClock();
      const canRun = visible && !document.hidden;
      setPaused(!canRun);
      if (disposed || !canRun || (current ? !ready : motion.matches)) return;
      if (current && !playing) {
        playing = true;
        setScene({ request: current, playing: true, duration });
        if (current.subject !== "hockey") setStatus("Two Millstadt medics are bringing the stretcher onto the ice.");
      }
      startedAt = performance.now();
      timer = window.setTimeout(() => {
        startedAt = null;
        if (current) finish();
        else begin({ subject: "hockey", x: .48, floor: .1 });
      }, remaining);
    }

    function finish() {
      pauseClock();
      const completed = current;
      current = null; ready = false; playing = false;
      setScene(null);
      setStatus(completed?.subject !== "hockey" ? "The medics have left the rink with their passenger." : "");
      remaining = nextHockey();
      const next = queuedGuest;
      queuedGuest = null;
      if (next) begin(next);
      else {
        targets.forEach(button => { button.disabled = false; });
        schedule();
        const restoreFocus = focusedSkater;
        focusedSkater = null;
        if (restoreFocus) requestAnimationFrame(() => {
          if (!disposed && !current && document.activeElement === document.body) restoreFocus.focus({ preventScroll: true });
        });
      }
      completed?.onComplete?.();
    }

    async function begin(request: Request) {
      pauseClock();
      current = request; ready = playing = false;
      targets.forEach(button => {
        if (document.activeElement === button) focusedSkater = button;
        button.disabled = true;
      });
      hits.solo = []; hits.family = [];
      duration = request.subject === "hockey" ? 11_800 : motion.matches ? 3000 : 7400;
      setScene({ request, playing: false, duration });
      const files = ["medics-cot-empty", loaded(request.subject), down(request.subject)];
      if (request.subject === "family") files.push("family-companion");
      if (request.subject === "hockey") files.push("blues-skater", "red-skater");
      try {
        await Promise.all(files.map(async file => {
          const image = new window.Image();
          image.src = directory + file + ".webp";
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

    function onShot(event: Event) {
      if (!(event instanceof CustomEvent) || !event.cancelable || current || queuedGuest || document.hidden) return;
      const hit = event.detail as Shot;
      if (!hit || (hit.person !== "family" && hit.person !== "solo") || !Number.isFinite(hit.x) || !Number.isFinite(hit.floor)) return;
      event.preventDefault();
      const now = performance.now();
      hits[hit.person] = hits[hit.person].filter(timestamp => now - timestamp <= 2000);
      hits[hit.person].push(now);
      setStatus(`Snowball hit ${hits[hit.person].length} on the ${hit.person === "solo" ? "skater in the golden scarf" : "skating father"}.`);
      if (hits[hit.person].length === 3) {
        if (!visible) rink!.scrollIntoView({ block: "nearest", behavior: motion.matches ? "instant" : "smooth" });
        void begin({ subject: hit.person, x: bounded(hit.x, .16, .84), floor: bounded(hit.floor, .04, .27) });
      }
    }

    function onGuest(event: Event) {
      if (!(event instanceof CustomEvent) || !event.cancelable || queuedGuest || current?.subject === "guest") return;
      const guest = event.detail as Guest;
      if (guest?.person !== "guest" || typeof guest.onComplete !== "function") return;
      event.preventDefault();
      const request: Request = { subject: "guest", x: bounded(Number.isFinite(guest.x) ? guest.x! : .5, .19, .81), floor: .12, onComplete: guest.onComplete };
      if (!visible) rink!.scrollIntoView({ block: "center", behavior: motion.matches ? "instant" : "smooth" });
      if (current) queuedGuest = request;
      else void begin(request);
    }

    function onMotion() {
      if (motion.matches && current?.subject === "hockey") finish();
      else schedule();
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= .42;
      schedule();
    }, { threshold: [0, .42], rootMargin: "-50px 0px -35px" });
    observer.observe(rink);
    document.addEventListener("visibilitychange", schedule);
    motion.addEventListener("change", onMotion);
    window.addEventListener("winter-rink-shot", onShot);
    window.addEventListener("winter-rink-pickup", onGuest);
    return () => {
      disposed = true; pauseClock(); observer.disconnect();
      document.removeEventListener("visibilitychange", schedule);
      motion.removeEventListener("change", onMotion);
      window.removeEventListener("winter-rink-shot", onShot);
      window.removeEventListener("winter-rink-pickup", onGuest);
      current?.onComplete?.();
      queuedGuest?.onComplete?.();
    };
  }, []);

  const subject = scene?.request.subject;
  return <>
    <div className={styles.stage} ref={stage} aria-hidden="true" data-subject={subject} data-paused={paused}
      data-rink-rescue={scene ? scene.playing ? "playing" : "loading" : "idle"} style={scene ? {
        "--run": scene.duration + "ms", "--pickup-x": scene.request.x * 100 + "%", "--ground": scene.request.floor * 100 + "%",
      } as CSSProperties : undefined}>
      {scene?.playing && subject && <>
        {subject === "hockey" && <>
          <div className={styles.redLane}><Sprite file="red-skater" width={400} height={391} className={styles.red} /></div>
          <div className={styles.blueLane}><Sprite file="blues-skater" width={400} height={384} className={styles.blue} /></div>
        </>}
        <div className={styles.cotLane}>
          <div className={styles.crew}>
            <Sprite file="medics-cot-empty" width={768} height={384} className={styles.empty} />
            <Sprite file={loaded(subject)} width={768} height={384} className={styles.loaded} />
          </div>
        </div>
        {subject === "family" && <div className={styles.companionLane}>
          <Sprite file="family-companion" width={114} height={256} className={styles.companion} />
        </div>}
        <div className={styles.downLane}><Sprite file={down(subject)} width={400} height={{ hockey: 129, guest: 163, family: 142, solo: 149 }[subject]} className={styles.down} /></div>
        {subject === "hockey" && <i className={styles.spray} />}
      </>}
    </div>
    <span role="status" className={styles.announcement}>{status}</span>
  </>;
}
