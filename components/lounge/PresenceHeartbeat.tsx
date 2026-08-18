"use client";

import { useEffect, useRef } from "react";

const ACTIVITY_WINDOW_MS = 5 * 60 * 1000;
const PULSE_INTERVAL_MS = 30 * 1000;

/**
 * Lightweight heartbeat. Tracks the last cursor/keyboard/touch event on
 * the page; every 30 seconds, if we've moved within the last 5 minutes,
 * post to /api/lounge/presence so the server marks us "online now".
 * Pulses immediately on mount so freshly-loaded sessions register fast.
 */
export default function PresenceHeartbeat() {
  const lastActivity = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    lastActivity.current = Date.now();
    const markActive = () => { lastActivity.current = Date.now(); };
    window.addEventListener("mousemove", markActive, { passive: true });
    window.addEventListener("keydown", markActive, { passive: true });
    window.addEventListener("touchstart", markActive, { passive: true });
    window.addEventListener("focus", markActive);

    let cancelled = false;
    async function pulse() {
      if (cancelled) return;
      if (Date.now() - lastActivity.current > ACTIVITY_WINDOW_MS) return;
      try { await fetch("/api/lounge/presence", { method: "POST" }); } catch { /* offline ok */ }
    }
    pulse();
    const id = setInterval(pulse, PULSE_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener("mousemove", markActive);
      window.removeEventListener("keydown", markActive);
      window.removeEventListener("touchstart", markActive);
      window.removeEventListener("focus", markActive);
    };
  }, []);

  return null;
}
