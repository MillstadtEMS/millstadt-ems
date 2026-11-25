"use client";

import { useEffect } from "react";
import { centralParts } from "./stationTime";

// Keeps a station TV running all season without anyone touching it:
//  - the screen stays awake (Screen Wake Lock, where the TV browser has it);
//  - the sign-in renews once a day (the cookie lasts months; renewing keeps it that way);
//  - the page reloads itself quietly once a night around 04:00 Central (fresh code after an update,
//    a clean slate after a day of animation), and after a long disconnection;
//  - it never reloads into an error page: it first checks the site answers, and waits if not.

const PING = "/api/station/ping";
const RENEW = "/api/station/session";
const CHECK_EVERY = 2 * 60_000;
const LONG_OUTAGE = 10 * 60_000;
const DAY = 24 * 60 * 60_000;

type WakeLockSentinelLike = { released: boolean; release: () => Promise<void>; addEventListener: (type: "release", listener: () => void) => void };
type WakeLockNavigator = Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> } };

async function siteAnswers(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 12_000);
    const response = await fetch(PING, { cache: "no-store", signal: controller.signal });
    window.clearTimeout(timer);
    return response.ok;
  } catch {
    return false;
  }
}

/** Milliseconds until the next 04:00-04:15 Central (a little random, so a room of TVs don't all reload at once). */
function untilNightlyReload(now = Date.now()): number {
  const t = centralParts(new Date(now));
  const minutesNow = t.hour * 60 + t.minute + t.second / 60;
  const target = 4 * 60 + Math.random() * 15;
  let minutes = target - minutesNow;
  if (minutes <= 1) minutes += 24 * 60;
  return Math.round(minutes * 60_000);
}

export default function StationKeeper({ review = false }: { review?: boolean }) {
  // The screen stays awake.
  useEffect(() => {
    const nav = navigator as WakeLockNavigator;
    if (!nav.wakeLock) return;
    let lock: WakeLockSentinelLike | null = null;
    let alive = true;
    const hold = async () => {
      if (!alive || document.hidden || (lock && !lock.released)) return;
      try {
        lock = await nav.wakeLock!.request("screen");
        lock.addEventListener("release", () => { if (alive && !document.hidden) window.setTimeout(hold, 1000); });
      } catch { /* not allowed right now (no user activation on some TVs): try again when the page is shown */ }
    };
    void hold();
    const onVisible = () => { if (!document.hidden) void hold(); };
    document.addEventListener("visibilitychange", onVisible);
    // Some TV browsers only grant it after an interaction: try again on the first remote press.
    window.addEventListener("keydown", onVisible);
    window.addEventListener("pointerdown", onVisible);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("keydown", onVisible);
      window.removeEventListener("pointerdown", onVisible);
      void lock?.release().catch(() => {});
    };
  }, []);

  // The sign-in renews once a day (and now, if the TV was off for a while).
  useEffect(() => {
    if (review) return;
    const key = "mems:station-renewed";
    let timer = 0;
    const renew = async () => {
      try {
        const response = await fetch(RENEW, { method: "POST", cache: "no-store", credentials: "same-origin" });
        if (response.ok) { try { localStorage.setItem(key, String(Date.now())); } catch { /* fine */ } }
      } catch { /* offline: the next try is in an hour */ }
      timer = window.setTimeout(renew, DAY);
    };
    let last = 0;
    try { last = Number(localStorage.getItem(key)) || 0; } catch { /* storage blocked */ }
    timer = window.setTimeout(renew, Math.max(5_000, Math.min(DAY, last + DAY - Date.now())));
    return () => window.clearTimeout(timer);
  }, [review]);

  // The nightly reload, and a reload after a long outage, but only once the site answers again.
  useEffect(() => {
    let alive = true;
    let downSince: number | null = null;
    let reloading = false;
    const reloadWhenReachable = async (why: string) => {
      if (reloading) return;
      reloading = true;
      while (alive) {
        if (await siteAnswers()) {
          console.info(`[station] reloading (${why})`);
          window.location.reload();
          return;
        }
        await new Promise(done => window.setTimeout(done, 60_000));
      }
    };
    const reloadAt = Date.now() + untilNightlyReload();
    const nightly = window.setTimeout(() => void reloadWhenReachable("nightly refresh"), reloadAt - Date.now());
    const check = window.setInterval(async () => {
      if (reloading) return;
      // A TV that slept through the timer still gets its nightly refresh.
      if (Date.now() >= reloadAt) { void reloadWhenReachable("nightly refresh"); return; }
      const ok = navigator.onLine !== false && await siteAnswers();
      if (!ok) { downSince ??= Date.now(); return; }
      if (downSince !== null && Date.now() - downSince >= LONG_OUTAGE) void reloadWhenReachable("back after a long disconnection");
      downSince = null;
    }, CHECK_EVERY);
    const offline = () => { downSince ??= Date.now(); };
    const online = () => {
      if (downSince !== null && Date.now() - downSince >= LONG_OUTAGE) void reloadWhenReachable("back online after a long disconnection");
      else downSince = null;
    };
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    return () => {
      alive = false;
      window.clearTimeout(nightly);
      window.clearInterval(check);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
    };
  }, []);

  return null;
}
