"use client";

import { useSyncExternalStore } from "react";

export const themeChangeEvent = "mems:season-change";

function subscribe(onChange: () => void) {
  window.addEventListener(themeChangeEvent, onChange);
  return () => window.removeEventListener(themeChangeEvent, onChange);
}

const isWinter = () => document.documentElement.dataset.memsSeason === "winter";

export function useWinterTheme(initialWinter = false) {
  return useSyncExternalStore(subscribe, isWinter, () => initialWinter);
}
