"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./WinterVillageBells.module.css";

// The opening two phrases of the traditional carol “Joy to the World”, in D.
// Each entry is the pitch in Hz and the time to the next strike in beats.
const carol = [
  [587.33, 2], [554.37, 1.5], [493.88, .5], [440, 3],
  [392, 1], [369.99, 2], [329.63, 2], [293.66, 3],
  [440, 1], [493.88, 3], [493.88, 1], [554.37, 3], [554.37, 1], [587.33, 3],
];
const beatSeconds = .28;
const decaySeconds = 1.72;

function playCarol(audio: AudioContext) {
  // Hum, prime, tierce and upper partials have different decay rates in a bronze bell.
  const partials = [[.5, .026, 1.5], [1, .105, decaySeconds], [1.20, .014, .78], [2.02, .036, .91], [2.74, .014, .47], [4.12, .008, .32]];
  const start = audio.currentTime + .025;
  let strike = start;
  let tail = start;
  for (const [pitch, beats] of carol) {
    for (const [ratio, level, decay] of partials) {
      const tone = audio.createOscillator();
      const gain = audio.createGain();
      tone.frequency.value = pitch * ratio;
      gain.gain.setValueAtTime(.0001, strike);
      gain.gain.exponentialRampToValueAtTime(level, strike + .012);
      gain.gain.exponentialRampToValueAtTime(.0001, strike + decay);
      tone.connect(gain).connect(audio.destination);
      tone.start(strike);
      tone.stop(strike + decay + .02);
    }
    tail = strike + decaySeconds + .04;
    strike += beats * beatSeconds;
  }
  return (tail - audio.currentTime) * 1000;
}

export function WinterVillageBellTower() {
  const audio = useRef<AudioContext | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const [ringing, setRinging] = useState(false);

  function closeBells() {
    window.clearTimeout(timer.current);
    const context = audio.current;
    audio.current = null;
    if (context && context.state !== "closed") void context.close().catch(() => {});
  }

  useEffect(() => {
    function onVisibility() {
      if (document.hidden) {
        closeBells();
        setRinging(false);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      closeBells();
    };
  }, []);

  async function ring() {
    if (document.hidden || audio.current) return;
    const engine = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!engine) return;
    let context: AudioContext | undefined;
    try {
      // Unlock this independent instrument in the actual click, tap or keyboard gesture.
      context = new engine();
      audio.current = context;
      await context.resume();
      if (audio.current !== context) return;
      const duration = playCarol(context);
      setRinging(true);
      timer.current = window.setTimeout(() => {
        closeBells();
        setRinging(false);
      }, duration);
    } catch {
      if (context && audio.current !== context) return;
      closeBells();
      setRinging(false);
    }
  }

  return (
    <>
      <button type="button" className={styles.tower} onClick={ring} data-village-bells="" data-ringing={ringing}
        aria-label="Ring the bells at St. James" title="Play Joy to the World on the St. James bells">
        <span className={styles.windows} aria-hidden="true"><i /><i /></span>
      </button>
      <span className={styles.sr} role="status">{ringing ? "The St. James bells are playing Joy to the World." : ""}</span>
    </>
  );
}
