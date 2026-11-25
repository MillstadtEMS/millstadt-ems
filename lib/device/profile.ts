"use client";

import { useEffect, useSyncExternalStore } from "react";

// The holiday snowball games tune themselves to the device. Tesla's in-car browser
// (Chromium with a "Tesla/<version>" tag; QtCarBrowser on older cars) gets larger tap zones and
// lighter effects for the car's touchscreen and processor. ?preview=ve&device-preview=tesla shows
// the Tesla tuning in any browser.
export type DeviceProfile = "tesla" | "standard";

let cached: DeviceProfile | null = null;

export function deviceProfile(): DeviceProfile {
  if (typeof navigator === "undefined") return "standard";
  if (cached) return cached;
  let preview: string | null = null;
  try {
    const params = new URLSearchParams(window.location.search);
    preview = params.get("preview") === "ve" ? params.get("device-preview") : null;
  } catch { /* No preview override. */ }
  cached = preview === "tesla" || /\bTesla\/|QtCarBrowser/i.test(navigator.userAgent) ? "tesla" : "standard";
  return cached;
}

export const isTesla = () => deviceProfile() === "tesla";

const noSubscription = () => () => {};
const serverProfile = (): DeviceProfile => "standard";

export function useDeviceProfile() {
  return useSyncExternalStore(noSubscription, deviceProfile, serverProfile);
}

/** Marks <html data-device="tesla"> so CSS can enlarge and lighten the holiday effects. */
export function useDeviceMarker() {
  const profile = useDeviceProfile();
  useEffect(() => {
    if (profile === "tesla") document.documentElement.dataset.device = "tesla";
    else delete document.documentElement.dataset.device;
  }, [profile]);
}

/** How far a tap may drift and still count as a tap: fingers drift more than a mouse, car screens most. */
export function tapSlop(pointerType?: string | null) {
  if (isTesla()) return 24;
  return pointerType && pointerType !== "mouse" ? 14 : 9;
}

/** Extra reach around a character for a finger tap to still count as a hit (CSS px). */
export function touchReach(pointerType?: string | null) {
  if (!pointerType || pointerType === "mouse") return 0;
  return isTesla() ? 22 : 12;
}

// Offsets sampled around a tap: the tap itself, then a ring at the given reach.
export function reachSamples(reach: number): ReadonlyArray<readonly [number, number]> {
  if (!reach) return [[0, 0]];
  const d = reach * Math.SQRT1_2;
  return [[0, 0], [reach, 0], [-reach, 0], [0, reach], [0, -reach], [d, d], [-d, d], [d, -d], [-d, -d]];
}
