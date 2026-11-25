"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { askForShake, shakeAccess, shakeCount, subscribeShakeAccess, type ShakeAccess } from "@/lib/seasonal/crewShake";
import { useSnowballTimeout } from "@/lib/seasonal/snowballTimeout";
import styles from "./WinterShakeChip.module.css";

// The invitation to shake the phone at the crew on the lights. iPhones and iPads only deliver
// motion after a tap, and a system prompt out of nowhere on the visitor's first tap would be
// jarring, so a small neon chip asks instead: "Shake the lights". Tap it, allow motion, and it
// answers "Now shake your phone!" (or tablet) until the first shake. Android needs no tap, so it just shows a
// passing hint once a visit. Touch devices during the snowball fight only (never in Time Out, with
// reduced motion, on the staff pages, with the menu open, or once everyone has fallen). It sits
// in a corner of the living-room banner, clear of the page's buttons and links, and never blocks
// anything but itself.

type Stage = "ask" | "go" | "hint";
const dismissKey = "millstadt:shake-chip:v1";
const hintKey = "millstadt:shake-hint:v1";
const remembered = (key: string) => { try { return sessionStorage.getItem(key) === "1"; } catch { return false; } };
const remember = (key: string) => { try { sessionStorage.setItem(key, "1"); } catch { /* Storage blocked: just this page. */ } };
const noBody = () => null;
const bodyOnClient = () => document.body;
const noSubscription = () => () => {};

export default function WinterShakeChip({ hidden }: { hidden: boolean }) {
  const body = useSyncExternalStore<HTMLElement | null>(noSubscription, bodyOnClient, noBody);
  const access = useSyncExternalStore<ShakeAccess>(subscribeShakeAccess, shakeAccess, () => "idle");
  const shakes = useSyncExternalStore(subscribeShakeAccess, shakeCount, () => 0);
  const timeout = useSnowballTimeout();
  const [stage, setStage] = useState<Stage | null>(null);
  const [leaving, setLeaving] = useState(false);
  const shown = useRef(false);
  const shakesAtShow = useRef(0);

  // When to offer it: a beat after the page settles.
  useEffect(() => {
    if (shown.current) return;
    let next: Stage | null = null;
    if (access === "ask" && !remembered(dismissKey)) next = "ask";
    else if (access === "on" && !remembered(hintKey)) next = "hint";
    if (!next) return;
    const timer = window.setTimeout(() => {
      shown.current = true;
      shakesAtShow.current = shakeCount();
      if (next === "hint") remember(hintKey);
      setStage(next);
    }, next === "ask" ? 2200 : 3200);
    return () => window.clearTimeout(timer);
  }, [access]);

  // Allowed: say so. Refused: go away.
  useEffect(() => {
    if (stage !== "ask") return;
    if (access === "on" || access === "listening") { shakesAtShow.current = shakeCount(); setStage("go"); }
    else if (access === "denied") setLeaving(true);
  }, [access, stage]);

  // The first real shake answers it. Otherwise it bows out on its own.
  useEffect(() => {
    if ((stage === "go" || stage === "hint") && shakes > shakesAtShow.current) setLeaving(true);
  }, [shakes, stage]);
  useEffect(() => {
    if (!stage) return;
    const timer = window.setTimeout(() => setLeaving(true), stage === "ask" ? 16000 : stage === "go" ? 6000 : 5200);
    return () => window.clearTimeout(timer);
  }, [stage]);
  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => { setStage(null); setLeaving(false); }, 320);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  if (!body || !stage || hidden || timeout) return null;
  // Tablets are shaken too: name the device in hand.
  const device = Math.min(screen.width, screen.height) >= 600 ? "tablet" : "phone";
  const icon = (
    <svg className={styles.phone} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path className={styles.motion} d="M3.6 8.2c-1 1.1-1 2.5 0 3.6m-1.7-5.3c-2 2.1-2 5 0 7m18.5-5.3c1 1.1 1 2.5 0 3.6m1.7-5.3c2 2.1 2 5 0 7" />
      <rect className={styles.body} x="7.1" y="2.6" width="9.8" height="18.8" rx="2.2" />
      <path className={styles.screen} d="M9.1 5.4h5.8v12.2H9.1z" />
      <circle className={styles.button} cx="12" cy="19.4" r=".75" />
    </svg>
  );
  // It docks in a corner of the living-room banner when there is one (every public page), so it
  // scrolls away with the room and never covers the page's own buttons and links (the hero's Pay
  // Your Bill and Donate, the Financial Transparency links). data-snow-own-click keeps the site-wide
  // fight from treating a tap on it as a throw.
  const banner = body.querySelector<HTMLElement>("[data-living-room]")?.closest("aside")?.parentElement ?? null;
  return createPortal(
    <div className={styles.dock} data-leaving={leaving || undefined} data-stage={stage}
      data-in-banner={banner ? "" : undefined} data-snow-own-click="">
      {stage === "ask" ? (
        <span className={styles.chip}>
          <button type="button" className={styles.ask} onClick={() => askForShake()}
            aria-label={`Shake the lights: allow motion, then shake your ${device} to rattle the crew hanging from the Christmas lights`}>
            {icon}<span className={styles.label}>Shake the lights</span>
          </button>
          <button type="button" className={styles.close} aria-label="No thanks"
            onClick={() => { remember(dismissKey); setLeaving(true); }}>
            <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="m3 3 6 6m0-6-6 6" /></svg>
          </button>
        </span>
      ) : (
        <span className={`${styles.chip} ${styles.hint}`} role="status">
          {icon}<span className={styles.label}>{stage === "go" ? `Now shake your ${device}!` : `Shake your ${device}!`}</span>
        </span>
      )}
    </div>,
    banner ?? body,
  );
}
