"use client";

import { useSyncExternalStore } from "react";

// "Call time out" stops every automatic snowball antic (ambushes, characters throwing at each
// other, pop-ups, staged incidents) and stops page-wide clicks from knocking characters over.
// Opt-in games such as the village hunt stay playable. The choice lasts across pages and visits
// until the visitor resumes, and every open tab follows along.
const storageKey = "millstadt:snowball-timeout:v1";
export const snowballTimeoutEvent = "mems:snowball-timeout";
const listeners = new Set<() => void>();
let cached: boolean | null = null;

function read() {
  try { return localStorage.getItem(storageKey) === "1"; } catch { return false; }
}

function mark(on: boolean) {
  document.documentElement.toggleAttribute("data-snowball-timeout", on);
}

export function isSnowballTimeout() {
  if (typeof window === "undefined") return false;
  if (cached === null) {
    cached = read();
    mark(cached);
  }
  return cached;
}

function announce(on: boolean) {
  mark(on);
  listeners.forEach((listener) => listener());
  window.dispatchEvent(new CustomEvent(snowballTimeoutEvent, { detail: { timeout: on } }));
}

export function setSnowballTimeout(on: boolean) {
  cached = on;
  try {
    if (on) localStorage.setItem(storageKey, "1");
    else localStorage.removeItem(storageKey);
  } catch { /* Storage blocked: the choice still holds for this page. */ }
  announce(on);
}

// One shared handler keeps every tab in step with the latest choice.
function onStorage(event: StorageEvent) {
  if (event.key !== storageKey && event.key !== null) return;
  const next = read();
  if (next === cached) return;
  cached = next;
  announce(next);
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function useSnowballTimeout() {
  return useSyncExternalStore(subscribe, isSnowballTimeout, () => false);
}
