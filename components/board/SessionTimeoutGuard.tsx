"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const IDLE_LIMIT_MS = 30 * 60 * 1000;
const WARNING_MS = 2 * 60 * 1000;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export default function SessionTimeoutGuard() {
  const router = useRouter();
  const lastActivityRef = useRef(0);
  const lastRefreshRef = useRef(0);
  const [warning, setWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(Math.floor(WARNING_MS / 1000));

  const refreshSession = useCallback(async () => {
    const res = await fetch("/api/board/session/refresh", { method: "POST" });
    if (!res.ok) throw new Error("Session refresh failed");
    lastRefreshRef.current = Date.now();
  }, []);

  const signOut = useCallback(async () => {
    await fetch("/api/board/logout", { method: "POST" }).catch(() => null);
    router.replace("/board/login");
    router.refresh();
  }, [router]);

  useEffect(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    lastRefreshRef.current = now;

    const noteActivity = () => {
      lastActivityRef.current = Date.now();
      if (!warning && Date.now() - lastRefreshRef.current > REFRESH_INTERVAL_MS) {
        void refreshSession().catch(() => null);
      }
    };

    const events = ["click", "keydown", "pointerdown", "scroll", "touchstart"] as const;
    events.forEach((eventName) => window.addEventListener(eventName, noteActivity, { passive: true }));

    const interval = window.setInterval(() => {
      const idleFor = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, IDLE_LIMIT_MS - idleFor);
      setWarning(remaining <= WARNING_MS);
      setSecondsLeft(Math.ceil(remaining / 1000));
      if (remaining <= 0) void signOut();
    }, 1000);

    return () => {
      window.clearInterval(interval);
      events.forEach((eventName) => window.removeEventListener(eventName, noteActivity));
    };
  }, [refreshSession, signOut, warning]);

  if (!warning) return null;

  return (
    <div className="board-session-warning" role="dialog" aria-live="assertive" aria-label="Session timeout warning">
      <strong>Still there?</strong>
      <span>Your board session will sign out in {Math.max(0, secondsLeft)} seconds.</span>
      <button
        type="button"
        onClick={() => {
          lastActivityRef.current = Date.now();
          void refreshSession().then(() => setWarning(false)).catch(() => signOut());
        }}
      >
        Stay signed in
      </button>
    </div>
  );
}
