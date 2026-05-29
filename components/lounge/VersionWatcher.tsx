"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Polls /api/lounge/version every 60s. The first response gets saved as
 * the "current" version; if a later poll returns a different SHA we
 * surface a small banner that hard-reloads when tapped. Prevents installed
 * PWAs (iOS especially) from sitting on a stale cached build forever.
 */
export default function VersionWatcher() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const seen = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/lounge/version", { cache: "no-store" });
        if (!res.ok) return;
        const d = await res.json();
        const sha: string | undefined = d?.sha;
        if (!sha) return;
        if (!seen.current) {
          seen.current = sha;
          return;
        }
        if (!cancelled && sha !== seen.current) setUpdateAvailable(true);
      } catch { /* offline is fine */ }
    }

    check();
    const interval = setInterval(check, 60_000);
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!updateAvailable) return null;
  return (
    <div
      role="status"
      style={{
        position: "fixed",
        left: "50%",
        bottom: "calc(env(safe-area-inset-bottom) + 76px)",
        transform: "translateX(-50%)",
        background: "#f0b429",
        color: "#040d1a",
        padding: "10px 18px",
        borderRadius: 999,
        fontWeight: 900,
        fontSize: 13,
        letterSpacing: "0.06em",
        boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
        cursor: "pointer",
        zIndex: 1000,
        fontFamily: "inherit",
      }}
      onClick={() => window.location.reload()}
    >
      Update available · tap to refresh
    </div>
  );
}
