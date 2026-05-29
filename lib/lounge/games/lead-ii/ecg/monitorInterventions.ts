/**
 * Real-world monitor intervention artifacts.
 *
 * This layer sits AFTER the rhythm generators and BEFORE Skia rendering. It
 * lets the app teach what the monitor looks like while an intervention is
 * happening:
 *
 * - adenosine: transient AV block/pause, sometimes revealing flutter/AF
 * - defib/cardiovert: high-amplitude shock spike, brief blanking, then result
 * - CPR: large rhythmic compression artifact contaminating the tracing
 * - movement/lead artifact: chaotic VF/VT-looking noise over a perfusing rhythm
 * - transcutaneous pacing: spikes, blanking/artifact, capture threshold, and
 *   failure-to-capture when current is too low or the patient is hyperkalemic
 * - sync mode: visible markers on R waves, with a hyperkalemia T-wave risk mode
 *
 * Pure TypeScript. No React, RN, or Skia imports.
 */

import type {
  ECGEvent,
  ECGSettings,
  ECGPoint,
  GeneratedECGSignal,
  RhythmId,
} from './types';
import { DEFAULT_ARTIFACT } from './artifacts';
import { DEFAULT_SAMPLE_RATE_HZ } from './constants';
import { simulateWindow, type SimulationResult } from './simulator';
import {
  evaluateAbsBeat,
  gaussian,
  sampleTimes,
  wideBeatComponents,
} from './generators/gaussianBeat';

export type MonitorInterventionKind =
  | 'adenosine-svt-conversion'
  | 'adenosine-av-block-reveal-flutter'
  | 'adenosine-af-no-conversion'
  | 'adenosine-generic-pause'
  | 'adenosine-hyperk-asystole'
  | 'defib-conversion'
  | 'defib-no-conversion'
  | 'sync-cardioversion-conversion'
  | 'sync-cardioversion-no-conversion'
  | 'cpr-artifact'
  | 'movement-artifact'
  | 'tcp';

export type SyncMarkerMode = 'off' | 'r-wave' | 't-wave-risk';

export interface MonitorInterventionScript {
  kind: MonitorInterventionKind;
  /** Seconds since this canvas/script started. */
  startSec: number;
  /** Rhythm shown before the effect takes hold. Defaults to current settings. */
  preRhythmId?: RhythmId;
  preHeartRate?: number;
  /** Rhythm shown after the artifact/pause. Defaults to current settings. */
  postRhythmId?: RhythmId;
  postHeartRate?: number;
  /** TCP controls. */
  pacingRateBpm?: number;
  pacingMilliamp?: number;
  captureThresholdMa?: number;
  mechanicalCaptureThresholdMa?: number;
  /** Optional teaching text the UI can display. */
  label?: string;
}

export interface MonitorSimulationResult extends SimulationResult {
  syncMarkers: readonly ECGEvent[];
  scriptEvents: readonly ECGEvent[];
}

const DEFAULT_RESULT: MonitorSimulationResult = {
  samples: [],
  signal: null,
  generated: false,
  syncMarkers: [],
  scriptEvents: [],
};

const PAUSE_START_SEC = 0.75;
const PAUSE_END_SEC = 3.1;
const SHOCK_AT_SEC = 0.95;
const SHOCK_BLANK_END_SEC = 1.55;
const MAX_TCP_MA = 200;

function withSettings(
  base: ECGSettings,
  rhythmId?: RhythmId,
  heartRate?: number,
): ECGSettings {
  return {
    rhythmId: rhythmId ?? base.rhythmId,
    heartRate: heartRate ?? base.heartRate,
    sampleRateHz: base.sampleRateHz || DEFAULT_SAMPLE_RATE_HZ,
    artifact: base.artifact ?? DEFAULT_ARTIFACT,
    variantSeed: base.variantSeed,
  };
}

function atIndex(points: readonly ECGPoint[], i: number): number {
  return points[i]?.mv ?? 0;
}

function sawtooth(phase: number): number {
  const p = phase - Math.floor(phase);
  return 2 * p - 1;
}

function flutterOnlyMv(t: number): number {
  const flutterRrSec = 60 / 300;
  return 0.22 * sawtooth(t / flutterRrSec);
}

function fibOnlyMv(t: number): number {
  // Fine fibrillatory baseline, deterministic and visibly irregular.
  return (
    0.07 * Math.sin(2 * Math.PI * 7.4 * t) +
    0.04 * Math.sin(2 * Math.PI * 11.2 * t + 0.8) +
    0.025 * Math.sin(2 * Math.PI * 17.8 * t + 1.9)
  );
}

function pauseMv(t: number, rel: number, kind: MonitorInterventionKind): number {
  if (kind === 'adenosine-av-block-reveal-flutter') return flutterOnlyMv(t);
  if (kind === 'adenosine-af-no-conversion') return fibOnlyMv(t);
  // A short adenosine pause is not always perfectly flat: occasional escape
  // beats/ectopy are a real-world thing learners should not overcall.
  const escape1 = gaussian(rel, 1.42, 0.018, 0.45) - gaussian(rel, 1.47, 0.030, 0.25);
  const escape2 = gaussian(rel, 2.38, 0.022, -0.40) + gaussian(rel, 2.44, 0.045, 0.28);
  return 0.018 * Math.sin(2 * Math.PI * 0.7 * t) + escape1 + escape2;
}

function shockArtifactMv(rel: number): number {
  const d = rel - SHOCK_AT_SEC;
  return (
    gaussian(d, 0, 0.004, 8.5) -
    gaussian(d, 0.010, 0.006, 7.0) +
    gaussian(d, 0.020, 0.010, 2.0)
  );
}

function cprArtifactMv(t: number): number {
  // 110/min compression fundamental with a broad, ugly monitor baseline swing.
  const hz = 110 / 60;
  const phase = (t * hz) % 1;
  const broad = 1 - 2 * Math.abs(phase - 0.5);
  return (
    1.15 * (broad - 0.5) +
    0.28 * Math.sin(2 * Math.PI * hz * t + 0.3) +
    0.12 * Math.sin(2 * Math.PI * hz * 3 * t)
  );
}

function movementArtifactMv(t: number): number {
  // Low-frequency motion/lead artifact: huge baseline swings with bursts of
  // faster noise. It is intentionally "VF alarm plausible" while preserving
  // the underlying rhythm/events so the teaching point is to check the patient.
  const low = 1.45 * Math.sin(2 * Math.PI * 1.6 * t + 0.4);
  const mid = 0.70 * Math.sin(2 * Math.PI * 3.2 * t + 1.7);
  const burstGate = Math.max(0, Math.sin(2 * Math.PI * 0.42 * t));
  const rough = burstGate * (
    0.55 * Math.sin(2 * Math.PI * 8.5 * t) +
    0.25 * Math.sin(2 * Math.PI * 14.0 * t + 0.6)
  );
  return low + mid + rough;
}

function pacedSpikeMv(t: number, spikeT: number, ma: number): number {
  const scale = Math.min(1.8, Math.max(0.35, ma / 100));
  return (
    gaussian(t, spikeT, 0.0025, 3.0 * scale) -
    gaussian(t, spikeT + 0.006, 0.004, 1.8 * scale)
  );
}

const PACED_CAPTURE_BEAT = wideBeatComponents({ centerSec: 0.055, polarity: 1 });

function tcpCaptureThresholdFor(script: MonitorInterventionScript): number {
  if (typeof script.captureThresholdMa === 'number') return script.captureThresholdMa;
  return 150;
}

function tcpMechanicalThresholdFor(script: MonitorInterventionScript): number {
  if (typeof script.mechanicalCaptureThresholdMa === 'number') {
    return script.mechanicalCaptureThresholdMa;
  }
  return tcpCaptureThresholdFor(script) + 20;
}

export function tcpHasElectricalCapture(script: MonitorInterventionScript): boolean {
  const ma = script.pacingMilliamp ?? 0;
  return ma >= tcpCaptureThresholdFor(script) && ma <= MAX_TCP_MA;
}

export function tcpHasMechanicalCapture(script: MonitorInterventionScript): boolean {
  const ma = script.pacingMilliamp ?? 0;
  return tcpHasElectricalCapture(script) && ma >= tcpMechanicalThresholdFor(script) && ma <= MAX_TCP_MA;
}

export function tcpInstructionFor(script: MonitorInterventionScript): string {
  const threshold = tcpCaptureThresholdFor(script);
  const mechanicalThreshold = tcpMechanicalThresholdFor(script);
  const ma = script.pacingMilliamp ?? 0;
  if (threshold > MAX_TCP_MA) {
    return 'No capture at max output: suspect hyperkalemia/acidosis/pad-vector problem and treat causes.';
  }
  if (ma < threshold) {
    if (ma >= 80) return 'No capture yet: myocardial blips without capture. Keep increasing current.';
    if (ma >= 70) return 'No capture yet: pacer spikes only, no electrical capture.';
    return `No capture yet. Increase current toward threshold (${threshold} mA), then add 5-10 mA.`;
  }
  if (ma < mechanicalThreshold) {
    return 'Electrical capture. Confirm a pulse before calling mechanical capture.';
  }
  return 'Electrical and mechanical capture: radial pulse present.';
}

function simulateTcpWindow(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
  script: MonitorInterventionScript,
): MonitorSimulationResult {
  const underlying = simulateWindow(settings, tStart, tEnd);
  const times = sampleTimes(tStart, tEnd, settings.sampleRateHz || DEFAULT_SAMPLE_RATE_HZ);
  const points = new Array<ECGPoint>(times.length);
  const pacingRateBpm = script.pacingRateBpm ?? 70;
  const ma = Math.max(0, Math.min(MAX_TCP_MA, script.pacingMilliamp ?? 0));
  const rr = 60 / pacingRateBpm;
  const threshold = tcpCaptureThresholdFor(script);
  const captured = ma >= threshold && threshold <= MAX_TCP_MA;
  const firstSlot = Math.floor((tStart - script.startSec - 0.1) / rr);
  const lastSlot = Math.ceil((tEnd - script.startSec + 0.8) / rr);
  const spikeTimes: number[] = [];
  for (let s = firstSlot; s <= lastSlot; s++) {
    const spikeT = script.startSec + s * rr;
    if (spikeT >= tStart - 0.8 && spikeT < tEnd + 0.8) spikeTimes.push(spikeT);
  }

  for (let i = 0; i < times.length; i++) {
    const t = times[i]!;
    let mv = atIndex(underlying.samples, i);
    for (const spikeT of spikeTimes) {
      mv += pacedSpikeMv(t, spikeT, ma);
      const afterSpike = t - spikeT;
      if (afterSpike >= 0 && afterSpike <= 0.080) {
        // Defibrillator monitors blank a short period around TCP output; a
        // little artifact remains so students learn it can mimic capture.
        mv *= 0.18;
        mv += 0.06 * Math.sin(2 * Math.PI * 55 * afterSpike);
      }
      if (captured && Math.abs(t - spikeT) < 0.8) {
        mv += evaluateAbsBeat(t, spikeT, PACED_CAPTURE_BEAT);
      } else if (!captured) {
        mv += 0.10 * Math.sin(2 * Math.PI * 18 * afterSpike) * Math.exp(-Math.abs(afterSpike) * 8);
      }
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [...(underlying.signal?.events ?? [])];
  for (const spikeT of spikeTimes) {
    if (spikeT >= tStart && spikeT < tEnd) {
      events.push({
        kind: 'paced-spike',
        tSec: spikeT,
        meta: { chamber: 'ventricular', external: true, ma, thresholdMa: threshold, captured },
      });
    }
    const rT = spikeT + PACED_CAPTURE_BEAT.r.centerFraction;
    if (captured && rT >= tStart && rT < tEnd) {
      events.push({
        kind: 'qrs-wide',
        tSec: rT,
        meta: { paced: 'transcutaneous', captured: true, hrBpm: pacingRateBpm },
      });
    }
  }

  const signal: GeneratedECGSignal = {
    rhythmId: settings.rhythmId,
    windowStartSec: tStart,
    windowEndSec: tEnd,
    sampleRateHz: settings.sampleRateHz,
    points,
    events,
  };
  return {
    samples: points,
    signal,
    generated: true,
    syncMarkers: [],
    scriptEvents: events.filter((e) => e.kind === 'paced-spike'),
  };
}

export function simulateMonitorWindow(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
  script?: MonitorInterventionScript | null,
): MonitorSimulationResult {
  if (!script) {
    const base = simulateWindow(settings, tStart, tEnd);
    return { ...base, syncMarkers: [], scriptEvents: [] };
  }
  if (script.kind === 'tcp') return simulateTcpWindow(settings, tStart, tEnd, script);

  const preSettings = withSettings(settings, script.preRhythmId, script.preHeartRate);
  const postSettings = withSettings(settings, script.postRhythmId, script.postHeartRate);
  const pre = simulateWindow(preSettings, tStart, tEnd);
  const post = simulateWindow(postSettings, tStart, tEnd);
  if (!pre.generated && !post.generated) return DEFAULT_RESULT;

  const basePoints = post.samples.length > 0 ? post.samples : pre.samples;
  const points = new Array<ECGPoint>(basePoints.length);
  const blockStart = script.startSec + PAUSE_START_SEC;
  const blockEnd = script.startSec + PAUSE_END_SEC;
  const shockT = script.startSec + SHOCK_AT_SEC;
  const shockBlankEnd = script.startSec + SHOCK_BLANK_END_SEC;

  for (let i = 0; i < basePoints.length; i++) {
    const t = basePoints[i]!.t;
    const rel = t - script.startSec;
    let mv = atIndex(post.samples, i);

    if (script.kind.startsWith('adenosine')) {
      if (t < blockStart) mv = atIndex(pre.samples, i);
      else if (t < blockEnd) mv = pauseMv(t, rel, script.kind);
      else mv = atIndex(post.samples, i);
    } else if (script.kind === 'cpr-artifact') {
      mv = atIndex(post.samples, i) + cprArtifactMv(t);
    } else if (script.kind === 'movement-artifact') {
      mv = atIndex(post.samples, i) + movementArtifactMv(t);
    } else {
      if (t < shockT) mv = atIndex(pre.samples, i);
      else if (t < shockBlankEnd) mv = shockArtifactMv(rel);
      else mv = atIndex(post.samples, i);
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  events.push(...(pre.signal?.events ?? []).filter((e) => e.tSec < script.startSec + PAUSE_START_SEC));
  events.push(...(post.signal?.events ?? []).filter((e) => {
    if (script.kind.startsWith('adenosine')) return e.tSec >= blockEnd;
    if (script.kind === 'cpr-artifact' || script.kind === 'movement-artifact') return true;
    return e.tSec >= shockBlankEnd;
  }));

  const scriptEvents: ECGEvent[] = [];
  if (script.kind.startsWith('adenosine')) {
    scriptEvents.push({
      kind: 'adenosine-block',
      tSec: blockStart,
      meta: { startSec: blockStart, endSec: blockEnd, revealsFlutter: script.kind.includes('flutter') },
    });
    // If adenosine reveals flutter, preserve flutter-wave events through the
    // block even while QRS complexes disappear.
    if (script.kind === 'adenosine-av-block-reveal-flutter') {
      for (let ft = Math.ceil(blockStart / 0.2) * 0.2; ft < blockEnd; ft += 0.2) {
        scriptEvents.push({ kind: 'flutter-wave', tSec: ft, meta: { revealedByAdenosine: true } });
      }
    }
  } else if (script.kind === 'cpr-artifact') {
    for (let t = Math.ceil(tStart * 2) / 2; t < tEnd; t += 0.5) {
      scriptEvents.push({ kind: 'cpr-artifact', tSec: t, meta: { compressionArtifact: true } });
    }
  } else if (script.kind === 'movement-artifact') {
    for (let t = Math.ceil(tStart * 2) / 2; t < tEnd; t += 0.5) {
      scriptEvents.push({ kind: 'motion-artifact', tSec: t, meta: { patientMovement: true, canMimicVfib: true } });
    }
  } else {
    scriptEvents.push({
      kind: 'shock-artifact',
      tSec: shockT,
      meta: {
        synchronized: script.kind.startsWith('sync'),
        converted: script.kind.endsWith('conversion'),
      },
    });
  }

  events.push(...scriptEvents);
  events.sort((a, b) => a.tSec - b.tSec);

  const signal: GeneratedECGSignal = {
    rhythmId: postSettings.rhythmId,
    windowStartSec: tStart,
    windowEndSec: tEnd,
    sampleRateHz: settings.sampleRateHz,
    points,
    events,
  };
  return {
    samples: points,
    signal,
    generated: true,
    syncMarkers: [],
    scriptEvents,
  };
}

export function syncMarkerEvents(
  events: readonly ECGEvent[],
  mode: SyncMarkerMode,
): readonly ECGEvent[] {
  if (mode === 'off') return [];
  if (mode === 't-wave-risk') return events.filter((e) => e.kind === 't-wave');
  return events.filter(
    (e) => e.kind === 'qrs-narrow' || e.kind === 'qrs-wide' || e.kind === 'pvc',
  );
}

export function syncRiskModeForRhythm(rhythmId: RhythmId): SyncMarkerMode {
  if (
    rhythmId === 'electrolyte.hyperk-peaked-t' ||
    rhythmId === 'electrolyte.hyperk-progression' ||
    rhythmId === 'electrolyte.hyperk-sine-wave'
  ) {
    return 't-wave-risk';
  }
  return 'r-wave';
}
