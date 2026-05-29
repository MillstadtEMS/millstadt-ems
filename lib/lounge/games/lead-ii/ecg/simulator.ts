/**
 * Top-level signal simulator. Composes a base rhythm with optional
 * conduction / ischemia / electrolyte / artifact layers.
 *
 * Phase 0 ships only the type contract and a stubbed `simulateWindow`.
 * Phase 1 plugs in real generators via `WAVEFORM_GENERATORS` from `waveform.ts`.
 */

import type { ECGPoint, ECGSettings, GeneratedECGSignal } from './types';
import { hasGenerator, WAVEFORM_GENERATORS } from './waveform';

export interface SimulationResult {
  /** Sample points within the requested window. */
  samples: ECGPoint[];
  /** Full signal incl. event metadata. `null` when no generator exists. */
  signal: GeneratedECGSignal | null;
  /** True iff at least one matching generator existed. */
  generated: boolean;
}

/**
 * Produce a window of ECG samples for the given settings.
 *
 * Returns `generated: false` and an empty `samples` array when no generator
 * exists for `rhythmId`. The full `GeneratedECGSignal` is returned via
 * `signal` when a generator is present — useful for tests and for any
 * consumer that needs event metadata in addition to samples.
 */
export function simulateWindow(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): SimulationResult {
  if (!hasGenerator(settings.rhythmId)) {
    return { samples: [], signal: null, generated: false };
  }
  const gen = WAVEFORM_GENERATORS[settings.rhythmId]!;
  const signal = gen(settings, tStart, tEnd);
  return { samples: signal.points, signal, generated: true };
}
