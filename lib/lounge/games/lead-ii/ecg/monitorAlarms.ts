/**
 * Monitor alarm severity + throttle logic.
 *
 * Maps current vitals + rhythm state to an alarm severity, with a
 * minimum-quiet-time so the same alarm isn't audibly fired every frame.
 *
 *   - critical : VF / pulseless VT / asystole / extreme HR (< 30 or > 180)
 *   - warning  : HR > preset high or < preset low; sustained ectopy
 *   - advisory : leads off / artifact / low signal quality
 *
 * Pure TypeScript — no React, RN, or audio imports here. The audio
 * playback layer subscribes to these decisions.
 */

import type { RhythmId } from './types';

export type AlarmSeverity = 'critical' | 'warning' | 'advisory';

export interface AlarmDecisionInput {
  rhythmId: RhythmId;
  heartRate: number;
  /** Configured high HR alarm threshold; default 140. */
  hrHigh?: number;
  /** Configured low HR alarm threshold; default 40. */
  hrLow?: number;
  /** Whether artifact or shake is currently active (advisory tier). */
  artifactActive?: boolean;
  /** ms-since-epoch of the most recent same-severity alarm sound. */
  lastFiredMs: Partial<Record<AlarmSeverity, number>>;
  /** Wall clock at decision time, ms. */
  nowMs: number;
}

export interface AlarmDecision {
  /** Severity of the active alarm, or null when none. */
  severity: AlarmSeverity | null;
  /** Short label, e.g. "HEART RATE LOW". */
  message: string | null;
  /** Should an audible tone fire on this tick? */
  shouldFireTone: boolean;
}

/** Minimum gap between repeated tones of the same severity, in ms. */
export const ALARM_THROTTLE_MS: Record<AlarmSeverity, number> = {
  critical: 2_000,
  warning: 4_000,
  advisory: 8_000,
};

/** Rhythms that ARE the alarm (lethal until proven otherwise). */
const LETHAL_RHYTHM_IDS: ReadonlySet<RhythmId> = new Set<RhythmId>([
  'vent.vfib',
  'vent.vfib-fine',
  'vent.flutter',
  'vent.asystole',
  'vent.pea',
  'vent.torsades',
  'vent.polymorphic-vt',
]);

const VT_RHYTHM_IDS: ReadonlySet<RhythmId> = new Set<RhythmId>([
  'vent.vtach-stable',
  'vent.vtach-unstable',
  'vent.bidirectional-vt',
  'vent.fascicular-vt',
  'vent.rvot-vt',
  'vent.nsvt',
]);

function lethalLabelFor(id: RhythmId): string {
  if (id === 'vent.vfib' || id === 'vent.vfib-fine') return 'VENTRICULAR FIBRILLATION';
  if (id === 'vent.flutter') return 'VENTRICULAR FLUTTER';
  if (id === 'vent.asystole') return 'ASYSTOLE';
  if (id === 'vent.pea') return 'PULSELESS ELECTRICAL ACTIVITY';
  if (id === 'vent.torsades') return 'TORSADES DE POINTES';
  if (id === 'vent.polymorphic-vt') return 'POLYMORPHIC VT';
  return 'LETHAL RHYTHM';
}

/**
 * Decide whether the monitor should be alarming right now, and whether
 * a tone should fire this tick (subject to throttle).
 *
 * Pure — caller persists `lastFiredMs` between calls.
 */
export function decideAlarm(input: AlarmDecisionInput): AlarmDecision {
  const hrHigh = input.hrHigh ?? 140;
  const hrLow = input.hrLow ?? 40;
  let severity: AlarmSeverity | null = null;
  let message: string | null = null;

  // Critical: lethal rhythms or extreme HR.
  if (LETHAL_RHYTHM_IDS.has(input.rhythmId)) {
    severity = 'critical';
    message = lethalLabelFor(input.rhythmId);
  } else if (VT_RHYTHM_IDS.has(input.rhythmId)) {
    severity = 'critical';
    message = 'VENTRICULAR TACHYCARDIA';
  } else if (input.heartRate >= 30 && input.heartRate <= 240) {
    if (input.heartRate < 30) {
      severity = 'critical';
      message = 'SEVERE BRADYCARDIA';
    } else if (input.heartRate > 180) {
      severity = 'critical';
      message = 'SEVERE TACHYCARDIA';
    } else if (input.heartRate > hrHigh) {
      severity = 'warning';
      message = 'HEART RATE HIGH';
    } else if (input.heartRate < hrLow) {
      severity = 'warning';
      message = 'HEART RATE LOW';
    }
  }

  if (severity === null && input.artifactActive) {
    severity = 'advisory';
    message = 'ARTIFACT — CHECK LEADS';
  }

  if (severity === null) {
    return { severity: null, message: null, shouldFireTone: false };
  }

  const lastFired = input.lastFiredMs[severity] ?? 0;
  const throttle = ALARM_THROTTLE_MS[severity];
  const shouldFireTone = input.nowMs - lastFired >= throttle;

  return { severity, message, shouldFireTone };
}
