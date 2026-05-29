"use client";

/**
 * Audio cues for Lead II web — mirrors the native AudioContext.
 *
 *   beep    — QRS tick on each visible R wave
 *   ding    — correct answer (synthesized, no asset needed)
 *   buzzer  — wrong answer
 *   chime   — intro
 *
 * Beep is the asset file from the native app; ding/buzzer are tiny
 * synthesizer pings via WebAudio so they survive the port without
 * extra files.
 */

let beepAudio: HTMLAudioElement | null = null;
let chimeAudio: HTMLAudioElement | null = null;
let webAudioCtx: AudioContext | null = null;
let muted = false;

function ensureBeep() {
  if (typeof window === "undefined") return null;
  if (!beepAudio) {
    beepAudio = new Audio("/lounge/games/qrs-beep.wav");
    beepAudio.preload = "auto";
    beepAudio.volume = 0.5;
  }
  return beepAudio;
}
function ensureChime() {
  if (typeof window === "undefined") return null;
  if (!chimeAudio) {
    chimeAudio = new Audio("/lounge/games/intro-chime.wav");
    chimeAudio.preload = "auto";
    chimeAudio.volume = 0.6;
  }
  return chimeAudio;
}
function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!webAudioCtx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    webAudioCtx = new Ctor();
  }
  if (webAudioCtx.state === "suspended") webAudioCtx.resume().catch(() => {});
  return webAudioCtx;
}

export function setMuted(next: boolean) { muted = next; }
export function isMuted(): boolean { return muted; }

export function beep() {
  if (muted) return;
  const el = ensureBeep();
  if (!el) return;
  try {
    el.currentTime = 0;
    void el.play();
  } catch { /* ignore */ }
}

export function chime() {
  if (muted) return;
  const el = ensureChime();
  if (!el) return;
  try {
    el.currentTime = 0;
    void el.play();
  } catch { /* ignore */ }
}

function tone(freq: number, durMs: number, type: OscillatorType = "sine", gain = 0.18) {
  if (muted) return;
  const ctx = ensureCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + durMs / 1000);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + durMs / 1000 + 0.02);
}

export function ding() {
  // Bright two-step "✓".
  tone(880, 140, "triangle", 0.22);
  setTimeout(() => tone(1320, 180, "triangle", 0.2), 90);
}

export function buzzer() {
  // Low buzzy descend.
  tone(180, 220, "square", 0.22);
  setTimeout(() => tone(120, 220, "square", 0.18), 130);
}
