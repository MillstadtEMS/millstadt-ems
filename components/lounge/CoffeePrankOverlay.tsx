"use client";

import { useEffect, useState } from "react";

/**
 * Temporary joke welcome animation for Kallista Wetzel and Jennifer Goetz.
 * Plays a 6-frame flipbook (clean → coffee dump → splash + money → burning
 * money → flames → burnt-out wreckage) over ~3 seconds, then fades out.
 *
 * Reuses the same sessionStorage activation trigger as WelcomeOverlay.
 * Remove this overlay (and the kwetzel/jgoetz branch in lounge/page.tsx)
 * when the joke runs its course.
 */

const FRAMES = [
  "/lounge/coffee-prank/frame-1.png",
  "/lounge/coffee-prank/frame-2.png",
  "/lounge/coffee-prank/frame-3.png",
  "/lounge/coffee-prank/frame-4.png",
  "/lounge/coffee-prank/frame-5.png",
  "/lounge/coffee-prank/frame-6.png",
];

const FRAME_MS = 110;      // ~9 fps — chunky cartoon-style
const LOOPS = 3;           // 3 full passes through the 6 frames
const HOLD_MS = 900;       // hold on the burnt-out final frame
const FADE_MS = 600;

const TOTAL_MS = FRAMES.length * FRAME_MS * LOOPS + HOLD_MS + FADE_MS;

function welcomeSeenKey(username: string | undefined, name: string) {
  return `lounge:welcome-seen:${(username || name).trim().toLowerCase()}`;
}

export default function CoffeePrankOverlay({ name, username }: { name: string; username?: string }) {
  const [phase, setPhase] = useState<"idle" | "playing" | "fading" | "done">("idle");
  const [frameIdx, setFrameIdx] = useState(0);

  // Pre-load every frame to avoid the first-cycle pop.
  useEffect(() => {
    FRAMES.forEach((src) => {
      const img = new window.Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    let active = false;
    try {
      if (sessionStorage.getItem("lounge:welcome") === "1") {
        sessionStorage.removeItem("lounge:welcome");
        const key = welcomeSeenKey(username, name);
        if (localStorage.getItem(key) !== "1") {
          localStorage.setItem(key, "1");
          active = true;
        }
      }
    } catch {
      // sessionStorage unavailable — never animate
    }
    if (!active) {
      setPhase("done");
      return;
    }
    setPhase("playing");

    // Walk frames at FRAME_MS for LOOPS cycles.
    const totalFrames = FRAMES.length * LOOPS;
    let f = 0;
    const interval = setInterval(() => {
      f++;
      if (f >= totalFrames) {
        clearInterval(interval);
        setFrameIdx(FRAMES.length - 1); // settle on burnt-out frame
        return;
      }
      setFrameIdx(f % FRAMES.length);
    }, FRAME_MS);

    const fadeAt = FRAMES.length * FRAME_MS * LOOPS + HOLD_MS;
    const tFade = setTimeout(() => setPhase("fading"), fadeAt);
    const tDone = setTimeout(() => setPhase("done"), TOTAL_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(tFade);
      clearTimeout(tDone);
    };
  }, [name, username]);

  if (phase === "idle" || phase === "done") return null;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: "none",
        background: "#040d1a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 24px",
        opacity: phase === "fading" ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-out`,
      }}
    >
      {/* Flipbook frame */}
      <div
        style={{
          width: "min(560px, 88vw)",
          aspectRatio: "4 / 3",
          backgroundImage: `url("${FRAMES[frameIdx]}")`,
          backgroundSize: "contain",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          imageRendering: "auto",
          filter: "drop-shadow(0 18px 40px rgba(0,0,0,0.55))",
        }}
      />

      {/* "Hi, {name}." */}
      <h1
        style={{
          color: "white",
          margin: "28px 0 0",
          fontWeight: 900,
          fontSize: "clamp(1.6rem, 5vw, 2.8rem)",
          letterSpacing: "-0.01em",
          textAlign: "center",
          textShadow: "0 4px 22px rgba(240,180,41,0.35)",
        }}
      >
        Hi, {name}.
      </h1>

      <p
        style={{
          color: "#f0b429",
          margin: "10px 0 0",
          fontWeight: 800,
          fontSize: "clamp(0.78rem, 1.5vw, 1rem)",
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        Welcome to the Employee Lounge
      </p>

      <p
        style={{
          color: "#e2e8f0",
          margin: "8px 0 0",
          fontWeight: 900,
          fontSize: "clamp(0.92rem, 1.8vw, 1.2rem)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        Virtual Breakroom
      </p>

      <p
        style={{
          color: "#94a3b8",
          margin: "14px 0 0",
          fontWeight: 700,
          fontSize: "clamp(0.7rem, 1.2vw, 0.85rem)",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        Please keep beverages away from the CenCom.
      </p>
    </div>
  );
}
