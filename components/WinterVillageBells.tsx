"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import styles from "./WinterVillageBells.module.css";

const pealLength = 2950;
type Bells = {
  tower: RefObject<HTMLButtonElement | null>;
  ringing: boolean;
  sound: boolean;
  setSound: (enabled: boolean) => void;
  ring: (showTower?: boolean) => void;
};
const BellContext = createContext<Bells | null>(null);

function useBells() {
  const bells = useContext(BellContext);
  if (!bells) throw new Error("The church bells need their village provider.");
  return bells;
}

function playPeal(audio: AudioContext) {
  // A low hum, prime, minor third and nominal give each short toll its bronze timbre.
  const partials = [[.5, .026, 1.45], [1, .078, 1.5], [1.19, .016, .68], [2.01, .022, .8], [2.74, .008, .42]];
  const now = audio.currentTime + .015;
  for (const [offset, note] of [[0, 523.25], [.43, 392], [.95, 523.25]]) {
    for (const [ratio, level, decay] of partials) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      const at = now + offset;
      osc.frequency.value = note * ratio;
      osc.type = "sine";
      gain.gain.setValueAtTime(.0001, at);
      gain.gain.exponentialRampToValueAtTime(level, at + .015);
      gain.gain.exponentialRampToValueAtTime(.0001, at + decay);
      osc.connect(gain).connect(audio.destination);
      osc.start(at);
      osc.stop(at + decay + .025);
    }
  }
}

export function WinterVillageBellsProvider({ children }: { children: ReactNode }) {
  const tower = useRef<HTMLButtonElement>(null);
  const audio = useRef<AudioContext | null>(null);
  const end = useRef<number | undefined>(undefined);
  const [ringing, setRinging] = useState(false);
  const [sound, setSoundState] = useState(false);

  const stopAudio = useCallback(() => {
    const active = audio.current;
    audio.current = null;
    if (active && active.state !== "closed") void active.close().catch(() => {});
  }, []);

  function setSound(enabled: boolean) {
    setSoundState(enabled);
    if (!enabled) stopAudio();
  }

  const stop = useCallback(() => {
    window.clearTimeout(end.current);
    end.current = undefined;
    stopAudio();
    setRinging(false);
  }, [stopAudio]);

  useEffect(() => {
    const onVisibility = () => { if (document.hidden) stop(); };
    const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting && end.current !== undefined) stop(); });
    const postcard = tower.current?.closest("section");
    if (postcard) observer.observe(postcard);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearTimeout(end.current);
      stopAudio();
    };
  }, [stop, stopAudio]);

  function ring(showTower = false) {
    if (document.hidden || end.current !== undefined) return;
    if (showTower) {
      tower.current?.scrollIntoView({
        block: "nearest", inline: "nearest",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      });
    }
    setRinging(true);
    end.current = window.setTimeout(stop, pealLength);
    if (sound && typeof window.AudioContext === "function") {
      try {
        const context = new window.AudioContext();
        audio.current = context;
        void context.resume().then(() => {
          if (audio.current === context && !document.hidden) playPeal(context);
        }).catch(() => { if (audio.current === context) stopAudio(); });
      } catch { stopAudio(); }
    }
  }

  return <BellContext.Provider value={{ tower, ringing, sound, setSound, ring }}>{children}</BellContext.Provider>;
}

export function WinterVillageBellTower() {
  const { tower, ringing, ring } = useBells();
  return (
    <button ref={tower} className={styles.tower} type="button" onClick={() => ring()}
      tabIndex={-1} aria-label="Ring the bells at St. James" title="Ring the bells at St. James">
      {ringing && <span className={styles.glow} aria-hidden="true"><i /><i /></span>}
    </button>
  );
}

export function WinterVillageBellControl() {
  const { ringing, sound, setSound, ring } = useBells();
  return (
    <div className={styles.control} role="group" aria-label="St. James church bells">
      <button type="button" onClick={() => ring(true)} className={styles.button}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3a5.2 5.2 0 0 0-5.2 5.2c0 4.3-1.5 6.1-3 7.7-.45.5-.12 1.25.55 1.25h15.3c.67 0 1-.75.55-1.25-1.5-1.6-3-3.4-3-7.7A5.2 5.2 0 0 0 12 3Z M9.8 20a2.8 2.8 0 0 0 4.4 0" />
        </svg>
        Ring the church bells
      </button>
      <label className={styles.sound}>
        <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} aria-label="Enable bell sound" />
        Sound
      </label>
      <span role="status" className={styles.sr}>{ringing ? "The bells at St. James are ringing." : ""}</span>
    </div>
  );
}
