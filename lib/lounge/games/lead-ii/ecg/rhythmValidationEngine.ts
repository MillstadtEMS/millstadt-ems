/**
 * Master validation engine.
 *
 * Runs an actual generator window for every implemented rhythm and checks
 * that the produced signal matches its `RhythmMeasurementSpec`. The point
 * is to catch generator drift automatically — if someone tweaks the sinus
 * generator and the rate accidentally lands outside the spec band, this
 * engine fails and the test suite fires.
 *
 * Pure TypeScript; no React / RN / Skia. The expensive part is the
 * generator call. It runs in seconds across the whole catalog.
 *
 * What we actually check:
 *   1. Rate — derived from QRS event spacing, must sit within the
 *      measurement spec band (with a small tolerance because of windowing).
 *   2. P-wave presence — must agree with the spec (`present` / `absent` /
 *      `variable` / `chaotic` / `paced`).
 *   3. QRS-event count — sanity check that the window actually emitted
 *      QRS events at the expected cadence.
 */

import { DEFAULT_ARTIFACT } from './artifacts';
import { DEFAULT_SAMPLE_RATE_HZ } from './constants';
import { rhythmMeasurementSpec, type MeasurementBand } from './ecgMeasurementStandards';
import { resolveHrFor } from './rhythmRateControl';
import { simulateWindow } from './simulator';
import type { ECGEvent, ECGSettings, RhythmId } from './types';
import { hasGenerator } from './waveform';

/** Allowable rate deviation when interpolating from a 6-second window. */
export const RATE_TOLERANCE_BPM = 12;

/** Allowable bandwidth padding when comparing measured rate to spec. */
export const RATE_BAND_PADDING_BPM = 5;

export interface ValidationFinding {
  kind: 'info' | 'warning' | 'error';
  rhythmId: RhythmId;
  field: 'rate' | 'pWave' | 'qrs-count' | 'generator-missing';
  message: string;
}

export interface ValidationReport {
  rhythmId: RhythmId;
  /** True when no errors were raised. Warnings still count as "passed." */
  passed: boolean;
  /** All findings (info + warning + error). */
  findings: readonly ValidationFinding[];
}

export interface ValidationSummary {
  total: number;
  passed: number;
  failed: number;
  reports: readonly ValidationReport[];
}

// ── Helpers ───────────────────────────────────────────────────────────

const QRS_EVENT_KINDS = new Set(['qrs-narrow', 'qrs-wide', 'pvc']);
const P_EVENT_KINDS = new Set(['p-wave']);
const PACED_EVENT_KINDS = new Set(['paced-spike']);

function countQrsEvents(events: readonly ECGEvent[]): number {
  let n = 0;
  for (const e of events) if (QRS_EVENT_KINDS.has(e.kind)) n++;
  return n;
}

function hasAnyEvent(events: readonly ECGEvent[], set: Set<string>): boolean {
  for (const e of events) if (set.has(e.kind)) return true;
  return false;
}

/** Estimate beats-per-minute from QRS event spacing across a window. */
function estimateRateBpm(events: readonly ECGEvent[]): number | null {
  const qrsTimes: number[] = [];
  for (const e of events) if (QRS_EVENT_KINDS.has(e.kind)) qrsTimes.push(e.tSec);
  if (qrsTimes.length < 2) return null;
  qrsTimes.sort((a, b) => a - b);
  let sumRr = 0;
  for (let i = 1; i < qrsTimes.length; i++) sumRr += qrsTimes[i]! - qrsTimes[i - 1]!;
  const meanRr = sumRr / (qrsTimes.length - 1);
  if (meanRr <= 0) return null;
  return 60 / meanRr;
}

/** Estimate the actual VT run rate for NSVT instead of the surrounding sinus rate. */
function estimateNsvtRunRateBpm(events: readonly ECGEvent[]): number | null {
  const byRun = new Map<number, number[]>();
  for (const e of events) {
    if (e.kind !== 'qrs-wide') continue;
    const runId = e.meta?.runId;
    if (typeof runId !== 'number') continue;
    const run = byRun.get(runId) ?? [];
    run.push(e.tSec);
    byRun.set(runId, run);
  }

  let bestRate: number | null = null;
  for (const run of byRun.values()) {
    if (run.length < 3) continue;
    run.sort((a, b) => a - b);
    let sumRr = 0;
    for (let i = 1; i < run.length; i++) sumRr += run[i]! - run[i - 1]!;
    const meanRr = sumRr / (run.length - 1);
    if (meanRr <= 0) continue;
    const rate = 60 / meanRr;
    if (bestRate === null || rate > bestRate) bestRate = rate;
  }
  return bestRate;
}

function shouldSkipAggregateRateValidation(rhythmId: RhythmId): boolean {
  return rhythmId === 'pacer.failure-to-sense' || rhythmId === 'pacer.undersensing';
}

/** Convert a rate `MeasurementBand` into [min, max] with padding. */
function rateBandWithPadding(band: MeasurementBand): { min: number; max: number } {
  return {
    min: Math.max(0, band.min - RATE_BAND_PADDING_BPM),
    max: band.max + RATE_BAND_PADDING_BPM,
  };
}

// ── Single-rhythm validation ──────────────────────────────────────────

export interface ValidateOptions {
  /** Window duration in seconds. Default 6 sec — enough for 6+ beats at normal rates. */
  windowSec?: number;
  /** Sample rate. Default 500 Hz. */
  sampleRateHz?: number;
  /** Override heart rate. If omitted, uses the spec's `typical` or the policy default. */
  heartRate?: number;
}

export function validateRhythm(rhythmId: RhythmId, options: ValidateOptions = {}): ValidationReport {
  const findings: ValidationFinding[] = [];
  const spec = rhythmMeasurementSpec(rhythmId);

  if (!hasGenerator(rhythmId)) {
    findings.push({
      kind: 'warning',
      rhythmId,
      field: 'generator-missing',
      message: 'No single-lead generator registered; cannot validate signal output.',
    });
    return { rhythmId, passed: false, findings };
  }

  if (!spec) {
    findings.push({
      kind: 'warning',
      rhythmId,
      field: 'rate',
      message: 'No measurement spec — skipping rate / morphology checks.',
    });
    return { rhythmId, passed: true, findings };
  }

  const hr = options.heartRate ?? spec.rateBpm?.typical ?? spec.rateBpm?.min ?? 70;
  const resolvedHr = resolveHrFor(rhythmId, hr);

  const settings: ECGSettings = {
    rhythmId,
    heartRate: resolvedHr,
    sampleRateHz: options.sampleRateHz ?? DEFAULT_SAMPLE_RATE_HZ,
    artifact: DEFAULT_ARTIFACT,
  };
  const windowSec = options.windowSec ?? (rhythmId === 'vent.nsvt' ? 40 : 6);
  const result = simulateWindow(settings, 0, windowSec);

  if (!result.generated || result.samples.length === 0) {
    findings.push({
      kind: 'error',
      rhythmId,
      field: 'qrs-count',
      message: 'Generator returned no samples.',
    });
    return { rhythmId, passed: false, findings };
  }

  const events = result.signal?.events ?? [];
  const qrsCount = countQrsEvents(events);

  // ── Rate validation ────────────────────────────────────────────────
  if (spec.rateBpm) {
    const measured = rhythmId === 'vent.nsvt'
      ? estimateNsvtRunRateBpm(events)
      : shouldSkipAggregateRateValidation(rhythmId)
        ? null
        : estimateRateBpm(events);
    const band = rateBandWithPadding(spec.rateBpm);
    if (spec.regularity === 'chaotic') {
      // VFib / asystole — rate isn't measurable. Skip the rate check entirely.
    } else if (shouldSkipAggregateRateValidation(rhythmId)) {
      findings.push({
        kind: 'info',
        rhythmId,
        field: 'rate',
        message:
          'Aggregate QRS rate skipped because intrinsic and paced complexes compete independently.',
      });
    } else if (measured === null) {
      // Allow rhythm specs that intentionally produce few or zero QRS events
      // in a 6-second window (e.g., locked-zero asystole, third-degree block
      // with very slow ventricular escape).
      const allowsFew = spec.rateBpm.min < 30 || spec.rateBpm.max < 30;
      if (!allowsFew) {
        findings.push({
          kind: 'error',
          rhythmId,
          field: 'rate',
          message: `Fewer than 2 QRS events in ${windowSec}-second window — cannot estimate rate.`,
        });
      }
    } else if (measured < band.min - RATE_TOLERANCE_BPM || measured > band.max + RATE_TOLERANCE_BPM) {
      findings.push({
        kind: 'error',
        rhythmId,
        field: 'rate',
        message: `Measured rate ${measured.toFixed(1)} bpm is outside the spec band ${spec.rateBpm.min}–${spec.rateBpm.max} bpm (with tolerance ±${RATE_TOLERANCE_BPM}).`,
      });
    }
  }

  // ── P-wave presence validation ─────────────────────────────────────
  const hasP = hasAnyEvent(events, P_EVENT_KINDS);
  const hasPace = hasAnyEvent(events, PACED_EVENT_KINDS);
  switch (spec.pWave.status) {
    case 'present':
      if (!hasP && !hasPace) {
        findings.push({
          kind: 'warning',
          rhythmId,
          field: 'pWave',
          message: 'Spec expects P waves present, but the generator emitted none.',
        });
      }
      break;
    case 'absent':
      if (hasP) {
        findings.push({
          kind: 'warning',
          rhythmId,
          field: 'pWave',
          message: 'Spec expects no P waves, but the generator emitted P-wave events.',
        });
      }
      break;
    case 'paced':
      if (!hasPace) {
        findings.push({
          kind: 'warning',
          rhythmId,
          field: 'pWave',
          message: 'Spec expects paced spikes but the generator did not emit any.',
        });
      }
      break;
    case 'variable':
    case 'chaotic':
      // No strict requirement — these are valid for AFib / VFib / WAP, etc.
      break;
  }

  // ── QRS-count sanity ────────────────────────────────────────────────
  if (spec.regularity !== 'chaotic' && qrsCount === 0 && (spec.rateBpm?.min ?? 0) > 20) {
    findings.push({
      kind: 'error',
      rhythmId,
      field: 'qrs-count',
      message: `Generator emitted zero QRS events in ${windowSec} s window for a rhythm with rate ≥ 20 bpm.`,
    });
  }

  const passed = findings.every((f) => f.kind !== 'error');
  return { rhythmId, passed, findings };
}

// ── Bulk validation ───────────────────────────────────────────────────

export function validateAllRhythms(
  rhythmIds: readonly RhythmId[],
  options: ValidateOptions = {},
): ValidationSummary {
  const reports: ValidationReport[] = [];
  for (const id of rhythmIds) {
    reports.push(validateRhythm(id, options));
  }
  const passed = reports.filter((r) => r.passed).length;
  return {
    total: reports.length,
    passed,
    failed: reports.length - passed,
    reports,
  };
}
