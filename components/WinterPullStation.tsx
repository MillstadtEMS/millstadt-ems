"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useSnowballTimeout } from "@/lib/seasonal/snowballTimeout";
import { allCrewHanging, subscribeCrewDown } from "./WinterRoofline";
import styles from "./WinterPullStation.module.css";

// The living room's easter egg: a red fire-alarm pull station on the wall between the little TV and
// the fireplace, under a horn/strobe and a sign. The sign lights up PULL FOR EMERGENCY only while the
// whole crew is still hanging from the Christmas lights; otherwise it's a dim, ordinary pull station
// (and it stays out of the way during a Time Out). Pull it and the handle snaps down, the strobe
// flashes and Ladder 3919 comes: Santa rescues everyone from the lights, one by one
// (WinterLadderRescue, loaded only when it's needed).
// Preview: ?preview=ve&pull-preview=now pulls it as soon as everyone is up (pull-preview=still plays
// the reduced-motion version).

const WinterLadderRescue = dynamic(() => import("./WinterLadderRescue"), { ssr: false });
const loadRescue = () => import("./WinterLadderRescue");

type Stage = "idle" | "armed" | "alarm" | "rescue";
const noBody = () => null;
const bodyOnClient = () => document.body;
const noSubscription = () => () => {};

function previewMode(): "now" | "still" | null {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("preview") !== "ve") return null;
    const mode = params.get("pull-preview");
    return mode === "now" || mode === "still" ? mode : null;
  } catch { return null; }
}

export default function WinterPullStation() {
  const marker = useRef<HTMLSpanElement>(null);
  const [room, setRoom] = useState<HTMLElement | null>(null);
  const body = useSyncExternalStore<HTMLElement | null>(noSubscription, bodyOnClient, noBody);
  const hanging = useSyncExternalStore(subscribeCrewDown, allCrewHanging, () => false);
  const timeout = useSnowballTimeout();
  const [run, setRun] = useState<"alarm" | "rescue" | null>(null);
  const [reduced, setReduced] = useState(false);
  const [strobe, setStrobe] = useState(false);
  const [status, setStatus] = useState("");
  const [forceStill, setForceStill] = useState(false);

  // The room picture lives in the music player beside this marker; follow it as it comes and goes.
  useEffect(() => {
    const stage = marker.current?.parentElement;
    if (!stage) return;
    const find = () => setRoom(stage.querySelector<HTMLElement>("[data-living-room]"));
    find();
    const watch = new MutationObserver(find);
    watch.observe(stage, { childList: true, subtree: true });
    return () => watch.disconnect();
  }, []);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(motion.matches);
    sync();
    motion.addEventListener("change", sync);
    return () => motion.removeEventListener("change", sync);
  }, []);

  // Lit only while everyone is up (and the fight is on); a rescue in progress keeps its own state.
  const stage: Stage = run ?? (hanging && !timeout ? "armed" : "idle");

  const pull = useCallback(() => {
    if (stage !== "armed") return;
    void loadRescue();
    setRun("alarm");
    setStrobe(true);
    setStatus("Fire alarm pulled. Ladder 3919 is on the way to rescue the crew from the Christmas lights.");
  }, [stage]);

  // The preview pulls it once everyone has climbed up.
  useEffect(() => {
    const mode = previewMode();
    if (!mode || stage !== "armed") return;
    setForceStill(mode === "still");
    const timer = window.setTimeout(pull, 900);
    return () => window.clearTimeout(timer);
  }, [stage, pull]);

  const phase = useCallback((next: "start" | "parked" | "done") => {
    if (next === "start") setRun("rescue");
    else if (next === "parked") setStrobe(false);
    else {
      setStrobe(false);
      setRun(null);
      setStatus("Santa rescued everyone from the Christmas lights.");
    }
  }, []);

  const lit = stage === "armed";
  const pulled = stage === "alarm" || stage === "rescue";
  const station = (
    <span className={styles.station} data-state={stage} data-strobe={strobe || undefined} data-still={reduced || undefined}>
      {/* The strobe's flash on the wallpaper. */}
      <i className={styles.flash} aria-hidden="true" />
      <i className={styles.halo} aria-hidden="true" />
      <svg className={styles.art} viewBox="0 0 56 78" aria-hidden="true">
        <defs>
          <linearGradient id="mems-ps-red" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f2523f" />
            <stop offset=".38" stopColor="#d01d17" />
            <stop offset="1" stopColor="#780a08" />
          </linearGradient>
          <linearGradient id="mems-ps-frame" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e9e2d2" />
            <stop offset=".5" stopColor="#a49a88" />
            <stop offset="1" stopColor="#d8cfbd" />
          </linearGradient>
          <linearGradient id="mems-ps-glass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1d1416" />
            <stop offset=".45" stopColor="#070506" />
            <stop offset="1" stopColor="#140d0f" />
          </linearGradient>
          <linearGradient id="mems-ps-lens" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f6f3ea" />
            <stop offset="1" stopColor="#c9cfd2" />
          </linearGradient>
          <filter id="mems-ps-glow" x="-40%" y="-80%" width="180%" height="260%">
            <feGaussianBlur stdDeviation="1.1" result="soft" />
            <feMerge><feMergeNode in="soft" /><feMergeNode in="soft" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="mems-ps-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.3" />
          </filter>
        </defs>
        {/* Contact shadows on the wall. */}
        <g fill="#1a0504" opacity=".55" filter="url(#mems-ps-shadow)">
          <rect x="17.4" y="2" width="24" height="14" rx="2.4" />
          <rect x="2.6" y="18" width="54" height="21" rx="2" />
          <rect x="16.6" y="43" width="26.4" height="36" rx="3" />
        </g>
        {/* Horn/strobe: red housing, FIRE, and the clear strobe lens. */}
        <g>
          <rect x="16" y=".5" width="24" height="13" rx="2.1" fill="url(#mems-ps-red)" stroke="#2b0605" strokeWidth=".9" />
          <path d="M18.3 2.8h19.4" stroke="#ffb2a2" strokeWidth=".5" strokeLinecap="round" opacity=".6" />
          <text x="28" y="6.9" textAnchor="middle" className={styles.hornWord}>FIRE</text>
          <rect x="18.8" y="8.1" width="18.4" height="3.9" rx=".9" fill="url(#mems-ps-lens)" stroke="#5b5452" strokeWidth=".45" />
          <rect className={styles.lens} x="18.8" y="8.1" width="18.4" height="3.9" rx=".9" />
          <path d="M19.9 9h7" stroke="#fff" strokeWidth=".55" strokeLinecap="round" opacity=".8" />
        </g>
        {/* The sign: a black glass panel in a brushed frame. */}
        <rect x="1" y="16" width="54" height="21" rx="1.6" fill="url(#mems-ps-frame)" stroke="#3a2f27" strokeWidth=".8" />
        <rect x="2.9" y="17.9" width="50.2" height="17.2" rx=".8" fill="url(#mems-ps-glass)" />
        <g className={styles.words} filter={lit || pulled ? "url(#mems-ps-glow)" : undefined}>
          {pulled ? <>
            <text x="28" y="25.5" textAnchor="middle" className={styles.word}>HELP IS</text>
            <text x="28" y="33.4" textAnchor="middle" className={styles.word}>ON THE WAY</text>
          </> : <>
            <text x="28" y="25.5" textAnchor="middle" className={styles.word}>PULL FOR</text>
            <text x="28" y="33.4" textAnchor="middle" className={styles.word}>EMERGENCY</text>
          </>}
        </g>
        <path d="M4 19.2c15-.9 32-.9 48 0" stroke="#fff" strokeWidth=".5" opacity=".18" fill="none" />
        {/* The pull station: die-cast red body, FIRE / ALARM, and the white pull-down handle. */}
        <rect x="15" y="41" width="26" height="36.4" rx="2.6" fill="url(#mems-ps-red)" stroke="#2b0605" strokeWidth="1" />
        <rect x="16.6" y="42.6" width="22.8" height="33.2" rx="1.8" fill="none" stroke="#ff8f7d" strokeWidth=".55" opacity=".55" />
        <circle cx="28" cy="43.6" r=".85" fill="#d9d2c6" stroke="#4a3b35" strokeWidth=".35" />
        <circle cx="28" cy="75" r=".85" fill="#d9d2c6" stroke="#4a3b35" strokeWidth=".35" />
        <text x="28" y="50.2" textAnchor="middle" className={styles.stationWord}>FIRE</text>
        <rect x="18.2" y="52.3" width="19.6" height="11.8" rx="1.6" fill="#3e0605" stroke="#1e0302" strokeWidth=".6" />
        <g className={styles.handle}>
          <rect x="19.4" y="53.3" width="17.2" height="5.4" rx="1.3" fill="#fbf6ec" stroke="#3a1a14" strokeWidth=".55" />
          <text x="28" y="57.35" textAnchor="middle" className={styles.handleWord}>PULL</text>
        </g>
        <text x="28" y="72.3" textAnchor="middle" className={styles.stationWordSmall}>ALARM</text>
        <path d="M16.2 44.5c.2-1.6 1-2.4 2.6-2.6" stroke="#fff" strokeWidth=".7" opacity=".55" fill="none" strokeLinecap="round" />
      </svg>
      {lit && <button type="button" className={styles.pull} onClick={pull}
        onPointerEnter={() => void loadRescue()} onFocus={() => void loadRescue()}
        aria-label="Pull for emergency: the fire alarm calls Ladder 3919, and Santa rescues the crew from the Christmas lights" />}
    </span>
  );

  return (<>
    <span ref={marker} hidden />
    {room && createPortal(station, room)}
    {body && createPortal(<span role="status" className={styles.announcement}>{status}</span>, body)}
    {pulled && <WinterLadderRescue still={reduced || forceStill} onPhase={phase} />}
  </>);
}
