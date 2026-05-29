/**
 * Per-rhythm rate-control policy.
 *
 * Drives BOTH generator behavior AND UI lock state so the displayed HR, the
 * vitals HR, and the QRS event rate cannot contradict each other:
 *
 *   - `adjustable`     : the generator honors `settings.heartRate` clamped
 *                        to `[minBpm, maxBpm]`. UI exposes the HR ± stepper.
 *   - `locked-fixed`   : the generator runs at `fixedBpm` regardless of
 *                        settings.heartRate. UI disables the HR stepper and
 *                        renders the rate as fixed.
 *   - `locked-zero`    : no electrical rate (vfib chaos / asystole flatline).
 *                        UI disables the HR stepper; vitals show 0.
 *
 * Adding a new rhythm without registering it here is intentional: the UI
 * defaults to `adjustable` semantics with the existing HR_MIN/HR_MAX clamps.
 * For Phase 3 every implemented rhythm has an explicit entry, asserted by
 * tests.
 */

import type { RhythmId } from './canonicalRhythmIds';

export type RhythmRateControl =
  | {
      kind: 'adjustable';
      /** Lower clamp for the user-controlled rate. */
      minBpm: number;
      /** Upper clamp for the user-controlled rate. */
      maxBpm: number;
      /** Rate to seed when the rhythm is freshly selected. */
      defaultBpm: number;
    }
  | {
      kind: 'locked-fixed';
      /** What the generator actually produces, regardless of settings.heartRate. */
      fixedBpm: number;
      /** One short tag the UI can display next to the rate (e.g. 'FIXED 2:1'). */
      lockLabel?: string;
    }
  | {
      kind: 'locked-zero';
      /** Why HR is shown as 0 (e.g. 'PULSELESS' or 'NO ELECTRICAL ACTIVITY'). */
      lockLabel: string;
    };

export const RHYTHM_RATE_CONTROL: Record<string, RhythmRateControl> = {
  // ── Adjustable ────────────────────────────────────────────────────
  // Note: these rates are intentionally MID-RANGE for their textbook
  // teaching bands. Earlier they were nudged down chasing a grid-render
  // bug (every drawn small box was 2 mm instead of 1 mm, so big-box
  // rate math came out 2× too fast). Grid is now correctly calibrated;
  // rates restored to clean textbook teaching values.
  'sinus.normal':            { kind: 'adjustable', minBpm: 60,  maxBpm: 100, defaultBpm: 80  },
  'sinus.bradycardia':       { kind: 'adjustable', minBpm: 30,  maxBpm: 59,  defaultBpm: 45  },
  'sinus.tachycardia':       { kind: 'adjustable', minBpm: 101, maxBpm: 180, defaultBpm: 120 },
  'sinus.arrhythmia':        { kind: 'adjustable', minBpm: 50,  maxBpm: 100, defaultBpm: 75  },
  // Teaching defaults sit at recognizable points in each rhythm's textbook
  // range so students can count big boxes on the grid. SVT 150 → R-R 2 big
  // boxes; VT 220 → R-R ~1.4 big boxes (classic fast monomorphic VT).
  'atrial.svt':              { kind: 'adjustable', minBpm: 150, maxBpm: 250, defaultBpm: 150 },
  'vent.pvc':                { kind: 'adjustable', minBpm: 60,  maxBpm: 110, defaultBpm: 80  },
  'vent.vtach-stable':       { kind: 'adjustable', minBpm: 120, maxBpm: 250, defaultBpm: 150 },
  'av-block.first-degree':   { kind: 'adjustable', minBpm: 50,  maxBpm: 100, defaultBpm: 70  },

  // ── Locked-fixed (generator runs at a fixed rate) ─────────────────
  // AFib at ~100 — irregularly irregular, classic teaching presentation.
  // Slower than RVR; faster than a rate-controlled AFib (which would blur
  // visually into NSR).
  'atrial.fib':              { kind: 'locked-fixed', fixedBpm: 100, lockLabel: 'IRREG' },
  'atrial.flutter':          { kind: 'locked-fixed', fixedBpm: 150, lockLabel: '2:1'   },
  'vent.pea':                { kind: 'locked-fixed', fixedBpm: 30,  lockLabel: 'PULSELESS' },
  'av-block.second-mobitz-i':  { kind: 'locked-fixed', fixedBpm: 60, lockLabel: 'CYCLE' },
  'av-block.second-mobitz-ii': { kind: 'locked-fixed', fixedBpm: 50, lockLabel: 'CYCLE' },
  'av-block.third-degree':   { kind: 'locked-fixed', fixedBpm: 35,  lockLabel: 'AV-DISSOC' },

  // ── Locked-zero (no electrical activity) ──────────────────────────
  'vent.vfib':               { kind: 'locked-zero', lockLabel: 'VF' },
  'vent.asystole':           { kind: 'locked-zero', lockLabel: 'NO ACTIVITY' },

  // ── Phase 4: intermediate pack ────────────────────────────────────
  'atrial.pac':              { kind: 'adjustable', minBpm: 60,  maxBpm: 100, defaultBpm: 80  },
  'atrial.avnrt':            { kind: 'adjustable', minBpm: 150, maxBpm: 250, defaultBpm: 150 },
  'atrial.avrt':             { kind: 'adjustable', minBpm: 150, maxBpm: 250, defaultBpm: 160 },
  'junctional.rhythm':       { kind: 'adjustable', minBpm: 40,  maxBpm: 60,  defaultBpm: 42  },
  'junctional.accelerated':  { kind: 'adjustable', minBpm: 60,  maxBpm: 100, defaultBpm: 65  },
  'vent.pvc-couplet':        { kind: 'adjustable', minBpm: 60,  maxBpm: 110, defaultBpm: 80  },
  'vent.pvc-triplet':        { kind: 'adjustable', minBpm: 60,  maxBpm: 110, defaultBpm: 80  },
  'vent.bigeminy':           { kind: 'adjustable', minBpm: 60,  maxBpm: 100, defaultBpm: 80  },
  'vent.trigeminy':          { kind: 'adjustable', minBpm: 60,  maxBpm: 100, defaultBpm: 80  },
  'vent.idioventricular':    { kind: 'adjustable', minBpm: 20,  maxBpm: 40,  defaultBpm: 30  },
  'vent.aivr':               { kind: 'adjustable', minBpm: 40,  maxBpm: 120, defaultBpm: 55  },
  'vent.nsvt':               { kind: 'adjustable', minBpm: 60,  maxBpm: 100, defaultBpm: 75  },
  'vent.vfib-fine':          { kind: 'locked-zero', lockLabel: 'FINE VF' },
  'av-block.2-1':            { kind: 'locked-fixed', fixedBpm: 40, lockLabel: '2:1' },

  // ── Phase 5: expert pack ──────────────────────────────────────────
  // Polymorphic / unusual VTs
  'vent.torsades':           { kind: 'adjustable', minBpm: 150, maxBpm: 250, defaultBpm: 200 },
  'vent.polymorphic-vt':     { kind: 'adjustable', minBpm: 150, maxBpm: 250, defaultBpm: 200 },
  'vent.bidirectional-vt':   { kind: 'adjustable', minBpm: 120, maxBpm: 250, defaultBpm: 140 },
  'vent.fascicular-vt':      { kind: 'adjustable', minBpm: 120, maxBpm: 250, defaultBpm: 140 },
  'vent.rvot-vt':            { kind: 'adjustable', minBpm: 120, maxBpm: 250, defaultBpm: 140 },

  // AV blocks
  'av-block.high-grade':     { kind: 'locked-fixed', fixedBpm: 20,  lockLabel: 'HIGH-GRADE' },
  'av-block.dissociation':   { kind: 'locked-fixed', fixedBpm: 75,  lockLabel: 'AV-DISSOC' },

  // Paced rhythms
  'pacer.atrial':            { kind: 'adjustable', minBpm: 50, maxBpm: 100, defaultBpm: 70 },
  'pacer.ventricular':       { kind: 'adjustable', minBpm: 50, maxBpm: 100, defaultBpm: 70 },
  'pacer.av':                { kind: 'adjustable', minBpm: 50, maxBpm: 100, defaultBpm: 70 },

  // Pacemaker malfunctions — locked-fixed cycle patterns
  'pacer.failure-to-pace':   { kind: 'locked-fixed', fixedBpm: 56,  lockLabel: 'MALFUNCTION' },
  'pacer.failure-to-capture':{ kind: 'locked-fixed', fixedBpm: 53,  lockLabel: 'MALFUNCTION' },
  'pacer.failure-to-sense':  { kind: 'locked-fixed', fixedBpm: 70,  lockLabel: 'MALFUNCTION' },
  'pacer.oversensing':       { kind: 'locked-fixed', fixedBpm: 53,  lockLabel: 'MALFUNCTION' },
  'pacer.undersensing':      { kind: 'locked-fixed', fixedBpm: 70,  lockLabel: 'MALFUNCTION' },
  'pacer.pmt':               { kind: 'locked-fixed', fixedBpm: 130, lockLabel: 'PMT' },
  'pacer.runaway':           { kind: 'locked-fixed', fixedBpm: 200, lockLabel: 'RUNAWAY' },

  // Hyperkalemia
  'electrolyte.hyperk-peaked-t':    { kind: 'adjustable', minBpm: 60, maxBpm: 100, defaultBpm: 70 },
  'electrolyte.hyperk-progression': { kind: 'locked-fixed', fixedBpm: 60, lockLabel: 'HYPERK' },
  'electrolyte.hyperk-sine-wave':   { kind: 'locked-fixed', fixedBpm: 48, lockLabel: 'SINE' },

  // ── Phase 8: paramedic-curriculum rhythms ─────────────────────────
  // AFib with RVR: locked at 130 bpm average ventricular response (irregularly irregular).
  'atrial.fib-rvr':                 { kind: 'locked-fixed', fixedBpm: 130, lockLabel: 'RVR' },
  // AFlutter with variable conduction (2:1/3:1/4:1 rotating).
  'atrial.flutter-atypical':        { kind: 'locked-fixed', fixedBpm: 110, lockLabel: 'VARIABLE' },
  // MAT: adjustable, defaults > 100 since "tachycardia" is part of the name.
  'atrial.mat':                     { kind: 'adjustable', minBpm: 100, maxBpm: 180, defaultBpm: 110 },
  'junctional.tachycardia':         { kind: 'adjustable', minBpm: 100, maxBpm: 180, defaultBpm: 110 },
  // PJC: ectopics on a sinus background — adjustable underlying sinus rate.
  'junctional.pjc':                 { kind: 'adjustable', minBpm: 60,  maxBpm: 100, defaultBpm: 75 },

  // ── Curriculum Basic/Core additions ────────────────────────────────
  'sinus.arrest':                   { kind: 'adjustable', minBpm: 50,  maxBpm: 90,  defaultBpm: 70 },
  'atrial.wandering-pacemaker':     { kind: 'adjustable', minBpm: 50,  maxBpm: 99,  defaultBpm: 75 },
  'atrial.focal-atrial-tach':       { kind: 'adjustable', minBpm: 100, maxBpm: 250, defaultBpm: 150 },
  'vent.pvc-multifocal':            { kind: 'adjustable', minBpm: 60,  maxBpm: 110, defaultBpm: 80 },
  'vent.r-on-t':                    { kind: 'adjustable', minBpm: 60,  maxBpm: 100, defaultBpm: 80 },
  'vent.quadrigeminy':              { kind: 'adjustable', minBpm: 60,  maxBpm: 100, defaultBpm: 80 },
  'vent.ventricular-escape':        { kind: 'adjustable', minBpm: 20,  maxBpm: 40,  defaultBpm: 30 },
  // Nerd/Expert
  'vent.flutter':                   { kind: 'locked-fixed', fixedBpm: 280, lockLabel: 'V-FLUTTER' },

  // 12-lead morphology patterns exposed on the live monitor through a sinus
  // base plus the diagnostic pattern layer.
  'conduction.rbbb':                 { kind: 'adjustable', minBpm: 40, maxBpm: 160, defaultBpm: 80 },
  'conduction.lbbb':                 { kind: 'adjustable', minBpm: 40, maxBpm: 160, defaultBpm: 80 },
  'conduction.wpw':                  { kind: 'adjustable', minBpm: 50, maxBpm: 180, defaultBpm: 90 },
  'conduction.wpw-type-a':           { kind: 'adjustable', minBpm: 50, maxBpm: 180, defaultBpm: 90 },
  'conduction.wpw-type-b':           { kind: 'adjustable', minBpm: 50, maxBpm: 180, defaultBpm: 90 },
  'conduction.brugada-pattern':      { kind: 'adjustable', minBpm: 50, maxBpm: 120, defaultBpm: 75 },
  'ischemia.st-depression':          { kind: 'adjustable', minBpm: 50, maxBpm: 160, defaultBpm: 90 },
  'ischemia.inferior-stemi':         { kind: 'adjustable', minBpm: 50, maxBpm: 160, defaultBpm: 90 },
  'ischemia.anterior-stemi':         { kind: 'adjustable', minBpm: 50, maxBpm: 160, defaultBpm: 90 },
  'ischemia.lateral-stemi':          { kind: 'adjustable', minBpm: 50, maxBpm: 160, defaultBpm: 90 },
  'ischemia.anterolateral-stemi':    { kind: 'adjustable', minBpm: 50, maxBpm: 160, defaultBpm: 90 },
  'ischemia.septal-stemi':           { kind: 'adjustable', minBpm: 50, maxBpm: 160, defaultBpm: 90 },
  'ischemia.posterior-stemi':        { kind: 'adjustable', minBpm: 50, maxBpm: 160, defaultBpm: 90 },
  'ischemia.sgarbossa':              { kind: 'adjustable', minBpm: 40, maxBpm: 150, defaultBpm: 80 },
  'ischemia.modified-sgarbossa':     { kind: 'adjustable', minBpm: 40, maxBpm: 150, defaultBpm: 80 },
  'special.brugada-type-1':          { kind: 'adjustable', minBpm: 50, maxBpm: 120, defaultBpm: 75 },
  'special.brugada-type-2':          { kind: 'adjustable', minBpm: 50, maxBpm: 120, defaultBpm: 75 },
  'special.hypothermia':             { kind: 'adjustable', minBpm: 30, maxBpm: 80, defaultBpm: 45 },
};

export function getRateControl(id: RhythmId): RhythmRateControl | undefined {
  return RHYTHM_RATE_CONTROL[id];
}

/** True iff the user can change the heart rate via the UI for this rhythm. */
export function isHrAdjustable(id: RhythmId): boolean {
  const c = RHYTHM_RATE_CONTROL[id];
  return c?.kind === 'adjustable';
}

/**
 * Resolve `settings.heartRate` against the rhythm's rate-control policy.
 * Generators call this so the same clamp/lock logic lives in one place.
 *
 *   - adjustable  → clamp to [minBpm, maxBpm], default if not finite
 *   - locked-fixed → always returns `fixedBpm`
 *   - locked-zero  → always returns 0
 *   - unregistered → returns the requested HR (no clamp); generators handle
 */
export function resolveHrFor(id: RhythmId, requestedBpm: number): number {
  const c = RHYTHM_RATE_CONTROL[id];
  if (!c) return requestedBpm;
  if (c.kind === 'locked-fixed') return c.fixedBpm;
  if (c.kind === 'locked-zero') return 0;
  // adjustable
  const hr = Number.isFinite(requestedBpm) ? requestedBpm : c.defaultBpm;
  if (hr < c.minBpm) return c.minBpm;
  if (hr > c.maxBpm) return c.maxBpm;
  return hr;
}

/** What the vitals panel should display for this rhythm + requested HR. */
export function vitalsHrFor(id: RhythmId, requestedBpm: number): number {
  return resolveHrFor(id, requestedBpm);
}
