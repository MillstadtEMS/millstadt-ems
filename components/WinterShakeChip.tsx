"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { askForShake, shakeAccess, shakeCount, subscribeShakeAccess, type ShakeAccess } from "@/lib/seasonal/crewShake";
import { useSnowballTimeout } from "@/lib/seasonal/snowballTimeout";
import styles from "./WinterShakeChip.module.css";

// The invitation to shake the phone at the crew on the lights: a little vertical neon sign,
// "SHAKE", hanging from the light string itself (in the gap between two of the crew on a phone,
// beside the TV on a tablet), so it's part of the decorations and never sits over the page.
// iPhones and iPads only deliver motion after a tap, and a system prompt out of nowhere on the
// visitor's first tap would be jarring, so the sign asks instead: tap it, allow motion, and it
// flashes until the first shake knocks it off the wire. Android needs no tap, so the sign just
// hangs there a moment once a visit. Touch devices during the snowball fight only: never in Time
// Out, with reduced motion, on the staff pages, with the menu open, once everyone has fallen, or
// once the visitor has scrolled into the page (it bows out rather than hang over anything they
// can tap). A Don't Allow is remembered for the visit.

type Stage = "ask" | "go" | "hint";
type Leaving = "fade" | "drop";
const deniedKey = "millstadt:shake-denied:v1";
const hintKey = "millstadt:shake-hint:v1";
const remembered = (key: string) => { try { return sessionStorage.getItem(key) === "1"; } catch { return false; } };
const remember = (key: string) => { try { sessionStorage.setItem(key, "1"); } catch { /* Storage blocked: just this page. */ } };
const controls = "a,button,input,select,textarea,summary,label,iframe,video,[role='button'],[role='link'],[role='menuitem'],[tabindex]:not([tabindex='-1']),[data-snow-target]";
// Past this far down the page the sign has done its job.
const SCROLL_AWAY = 140;

// Something the visitor could tap sits right under the sign (the page scrolled under the header).
function overControls(sign: HTMLElement) {
  const box = sign.getBoundingClientRect();
  const roof = sign.closest("[data-winter-roof]");
  for (const fy of [.3, .55, .8, .98]) {
    for (const hit of document.elementsFromPoint(box.left + box.width / 2, box.top + box.height * fy)) {
      if (sign.contains(hit) || roof?.contains(hit)) continue;
      if (hit.closest(controls)) return true;
      break;
    }
  }
  return false;
}

export default function WinterShakeChip({ hidden }: { hidden: boolean }) {
  const access = useSyncExternalStore<ShakeAccess>(subscribeShakeAccess, shakeAccess, () => "idle");
  const shakes = useSyncExternalStore(subscribeShakeAccess, shakeCount, () => 0);
  const timeout = useSnowballTimeout();
  const [stage, setStage] = useState<Stage | null>(null);
  const [leaving, setLeaving] = useState<Leaving | null>(null);
  const sign = useRef<HTMLSpanElement>(null);
  const shown = useRef(false);
  const shakesAtShow = useRef(0);

  // When to offer it: a beat after the page settles, while the visitor is still at the top.
  useEffect(() => {
    if (shown.current) return;
    let next: Stage | null = null;
    if (access === "ask" && !remembered(deniedKey)) next = "ask";
    else if (access === "on" && !remembered(hintKey)) next = "hint";
    if (!next) return;
    const timer = window.setTimeout(() => {
      if (window.scrollY > SCROLL_AWAY) return;
      shown.current = true;
      shakesAtShow.current = shakeCount();
      if (next === "hint") remember(hintKey);
      setStage(next);
    }, next === "ask" ? 2200 : 3200);
    return () => window.clearTimeout(timer);
  }, [access]);

  // Allowed: it flashes for the shake. Refused: it goes, and stays gone for the visit.
  useEffect(() => {
    if (stage !== "ask") return;
    if (access === "on" || access === "listening") { shakesAtShow.current = shakeCount(); setStage("go"); }
    else if (access === "denied") { remember(deniedKey); setLeaving("fade"); }
  }, [access, stage]);

  // The first real shake knocks it off the wire. Otherwise it bows out on its own.
  useEffect(() => {
    if ((stage === "go" || stage === "hint") && shakes > shakesAtShow.current) setLeaving(current => current ?? "drop");
  }, [shakes, stage]);
  useEffect(() => {
    if (!stage) return;
    const timer = window.setTimeout(() => setLeaving(current => current ?? "fade"), stage === "ask" ? 16000 : stage === "go" ? 7000 : 5200);
    return () => window.clearTimeout(timer);
  }, [stage]);
  useEffect(() => {
    if (stage && (hidden || timeout)) setLeaving(current => current ?? "fade");
  }, [hidden, stage, timeout]);
  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => { setStage(null); setLeaving(null); }, leaving === "drop" ? 760 : 340);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  // It hangs from the header, so the page scrolls beneath it: once the visitor heads into the page,
  // or anything they could tap comes under it, it bows out.
  useEffect(() => {
    if (!stage || leaving) return;
    let frame = 0;
    const check = () => {
      frame = 0;
      if (sign.current && (window.scrollY > SCROLL_AWAY || overControls(sign.current))) setLeaving(current => current ?? "fade");
    };
    const soon = () => { if (!frame) frame = requestAnimationFrame(check); };
    soon();
    window.addEventListener("scroll", soon, { passive: true });
    window.addEventListener("resize", soon, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", soon);
      window.removeEventListener("resize", soon);
    };
  }, [leaving, stage]);

  if (!stage) return null;
  // Tablets are shaken too: name the device in hand.
  const device = Math.min(screen.width, screen.height) >= 600 ? "tablet" : "phone";
  const face = (
    <>
      <svg className={styles.phone} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path className={styles.motion} d="M3.6 8.2c-1 1.1-1 2.5 0 3.6m-1.7-5.3c-2 2.1-2 5 0 7m18.5-5.3c1 1.1 1 2.5 0 3.6m1.7-5.3c2 2.1 2 5 0 7" />
        <rect className={styles.body} x="7.1" y="2.6" width="9.8" height="18.8" rx="2.2" />
        <path className={styles.screen} d="M9.1 5.4h5.8v12.2H9.1z" />
        <circle className={styles.button} cx="12" cy="19.4" r=".75" />
      </svg>
      <span className={styles.letters} aria-hidden="true">
        {["S", "H", "A", "K", "E"].map((letter, i) => <span key={i} style={{ "--i": i } as CSSProperties}>{letter}</span>)}
      </span>
    </>
  );
  return (
    <span ref={sign} className={styles.sign} data-stage={stage} data-leaving={leaving ?? undefined}>
      <span className={styles.swing}>
        {/* Two little chains from a hook on the light string to the sign's top corners. */}
        <svg className={styles.chains} viewBox="0 0 30 14" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path d="M15 1.6 3.2 13.4M15 1.6l11.8 11.8" className={styles.chain} />
          <path d="M15 1.6 3.2 13.4M15 1.6l11.8 11.8" className={styles.chainShine} />
          <circle cx="15" cy="1.9" r="1.7" className={styles.hook} />
        </svg>
        {stage === "ask" ? (
          <button type="button" className={styles.board} onClick={() => askForShake()}
            aria-label={`Shake the lights: allow motion, then shake your ${device} to rattle the crew hanging from the Christmas lights`}>
            {face}
          </button>
        ) : (
          <span className={styles.board} role="status" aria-label={stage === "go" ? `Now shake your ${device}!` : `Shake your ${device} to rattle the crew on the lights!`}>
            {face}
          </span>
        )}
      </span>
    </span>
  );
}
