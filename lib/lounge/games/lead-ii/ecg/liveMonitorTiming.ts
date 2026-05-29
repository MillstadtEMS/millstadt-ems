import type { ECGEvent } from './types';

/**
 * Live monitor timing helpers.
 *
 * The simulator uses the same pixel/mm convention as the mini ECG paper:
 * 1 mm = 4 px. At clinical paper speed, 25 mm/sec therefore becomes
 * 100 px/sec. Narrow phone portrait layouts should show fewer seconds, not
 * squeeze the same five seconds into a smaller width.
 */
export const ECG_PAPER_PX_PER_MM = 4;
export const LIVE_MONITOR_PX_PER_SECOND = 25 * ECG_PAPER_PX_PER_MM;

export function visibleSecondsForCanvasWidth(widthPx: number): number {
  if (!Number.isFinite(widthPx) || widthPx <= 0) return 1;
  return Math.max(1, widthPx / LIVE_MONITOR_PX_PER_SECOND);
}

export function isBeepableQrsEvent(event: ECGEvent): boolean {
  return event.kind === 'qrs-narrow' || event.kind === 'qrs-wide' || event.kind === 'pvc';
}

/**
 * QRS events that crossed the live sweep since the last audio cursor.
 * Dedupe by event time so a PVC that emits both `qrs-wide` and `pvc` only
 * produces one monitor beep.
 */
export function qrsEventsDueForBeep(
  events: readonly ECGEvent[],
  lastBeepedSec: number,
  nowSec: number,
): readonly ECGEvent[] {
  const due = events
    .filter((event) => isBeepableQrsEvent(event))
    .filter((event) => event.tSec > lastBeepedSec && event.tSec <= nowSec)
    .sort((a, b) => a.tSec - b.tSec);

  const deduped: ECGEvent[] = [];
  for (const event of due) {
    const previous = deduped[deduped.length - 1];
    if (previous && Math.abs(previous.tSec - event.tSec) < 0.030) continue;
    deduped.push(event);
  }
  return deduped;
}
