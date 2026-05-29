/**
 * QRS-tick classifier.
 *
 * Real cardiac monitors draw a small colored mark above each QRS the
 * device detects, color-coded so the learner can see what the device
 * "thinks" about each beat:
 *   - normal narrow QRS  → green
 *   - PVC / ectopic      → yellow
 *   - very wide (VT/IDR) → red
 *
 * This module is pure — it turns a list of `ECGEvent`s into a list of
 * tick descriptors the renderer can draw without knowing anything about
 * the underlying rhythm.
 */

import type { ECGEvent } from './types';

export type QrsTickColor = 'normal' | 'ectopic' | 'wide';

export interface QrsTick {
  /** Time of the tick in seconds (same axis as ECGEvent.tSec). */
  tSec: number;
  color: QrsTickColor;
}

/** Color → hex string the Skia canvas can paint with. */
export const TICK_COLORS: Record<QrsTickColor, string> = {
  normal: '#34f59f',
  ectopic: '#ffd6a8',
  wide: '#ff5e4f',
};

/**
 * Map a single ECG event to a tick color, or null if the event isn't a
 * QRS we should mark (e.g., a P wave or a flutter wave).
 */
export function classifyEvent(event: ECGEvent): QrsTickColor | null {
  switch (event.kind) {
    case 'qrs-narrow':
      return 'normal';
    case 'pvc':
      return 'ectopic';
    case 'qrs-wide':
      return 'wide';
    default:
      return null;
  }
}

/**
 * Pick tickable events, classify them, and dedupe near-simultaneous
 * events (a PVC that emits both `qrs-wide` and `pvc` should produce one
 * tick, not two — keep the more-specific PVC label).
 *
 * Caller controls the time window — pass only events visible on screen.
 */
export function classifyQrsEvents(events: readonly ECGEvent[]): readonly QrsTick[] {
  const candidates: QrsTick[] = [];
  for (const event of events) {
    const color = classifyEvent(event);
    if (color) candidates.push({ tSec: event.tSec, color });
  }
  candidates.sort((a, b) => a.tSec - b.tSec);

  // De-dupe events within 30 ms; prefer ectopic > wide > normal so a
  // PVC labeled both 'wide' and 'pvc' surfaces as the ectopic tick.
  const out: QrsTick[] = [];
  for (const tick of candidates) {
    const prev = out[out.length - 1];
    if (prev && Math.abs(prev.tSec - tick.tSec) < 0.030) {
      out[out.length - 1] = { tSec: prev.tSec, color: preferredColor(prev.color, tick.color) };
      continue;
    }
    out.push(tick);
  }
  return out;
}

function preferredColor(a: QrsTickColor, b: QrsTickColor): QrsTickColor {
  const rank: Record<QrsTickColor, number> = { normal: 0, wide: 1, ectopic: 2 };
  return rank[a] >= rank[b] ? a : b;
}
