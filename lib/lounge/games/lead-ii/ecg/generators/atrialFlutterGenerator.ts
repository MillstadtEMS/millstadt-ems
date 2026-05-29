/**
 * Atrial Flutter generator (typical, 3:1 conduction).
 *
 *  - Sawtooth atrial activity at ~300/min (flutter rate; classic +/- inferior).
 *  - Regular ventricular response at ~100 bpm via 3:1 AV conduction.
 *  - 3:1 conduction is chosen over 2:1 here so TWO clearly-visible flutter
 *    waves sit between each QRS — at 2:1 every other flutter wave is buried
 *    inside QRS and the strip can read as a plain narrow-complex tachycardia.
 *  - Sawtooth is asymmetric (slow rise / sharp drop) and ~2× the prior
 *    amplitude so it reads unambiguously against the QRS baseline.
 */

import type {
  ECGEvent,
  ECGSettings,
  GeneratedECGSignal,
} from '../types';
import { requireMorphologyProfile } from '../litflMorphologyProfiles';
import { evaluateAbsBeat, narrowBeatComponents, sampleTimes } from './gaussianBeat';

const FLUTTER_PROFILE = requireMorphologyProfile('atrial.flutter');
const FLUTTER_RATE_BPM = FLUTTER_PROFILE.generator?.flutterAtrialRateBpm ?? 300;
const FLUTTER_AMPLITUDE_MV = FLUTTER_PROFILE.generator?.flutterWaveAmplitudeMv ?? 0.18;
const CONDUCTION_RATIO = FLUTTER_PROFILE.generator?.flutterConductionRatio ?? 2; // 2:1 — every 2nd flutter wave conducts

/**
 * Asymmetric flutter wave (-1..1) parameterized by a phase argument.
 *
 * Real inferior-lead flutter waves rise slowly then drop sharply — a
 * symmetric triangle wave reads as a series of cones, not a sawtooth.
 * 85% rise / 15% fall produces the classic "F-wave" shape.
 */
function sawtooth(phase: number): number {
  const p = phase - Math.floor(phase);
  const RISE_FRAC = 0.85;
  if (p < RISE_FRAC) return -1 + (p / RISE_FRAC) * 2;
  return 1 - ((p - RISE_FRAC) / (1 - RISE_FRAC)) * 2;
}

/** No-P beat — flutter waves themselves stand in for atrial activity. */
function buildFlutterBeat() {
  const c = narrowBeatComponents(0.10);
  c.p = { ...c.p, amplitudeMv: 0 };
  return c;
}

const FLUTTER_BEAT = buildFlutterBeat();

export function atrialFlutterGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  void settings.heartRate;
  const flutterRrSec = 60 / FLUTTER_RATE_BPM; // 0.20 s

  // Flutter waves at integer multiples of flutterRrSec from t=0.
  const firstFlutter = Math.max(
    0,
    Math.floor((tStart - 0.10) / flutterRrSec),
  );
  const lastFlutter = Math.ceil((tEnd + 0.10) / flutterRrSec);

  // QRS beats at every CONDUCTION_RATIO flutter wave (so even indices are conducted).
  const beatStartsForQrs: number[] = [];
  for (let i = firstFlutter; i <= lastFlutter; i++) {
    if (i % CONDUCTION_RATIO === 0) {
      beatStartsForQrs.push(i * flutterRrSec);
    }
  }

  const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
  const points = new Array<{ t: number; mv: number }>(times.length);
  for (let k = 0; k < times.length; k++) {
    const t = times[k] as number;
    // Sawtooth flutter waves run continuously.
    const flutter = FLUTTER_AMPLITUDE_MV * sawtooth(t / flutterRrSec);
    let mv = flutter;
    // QRS+T overlay at every 2nd flutter wave.
    for (const beatStart of beatStartsForQrs) {
      if (Math.abs(t - beatStart) > 0.6) continue;
      mv += evaluateAbsBeat(t, beatStart, FLUTTER_BEAT);
    }
    points[k] = { t, mv };
  }

  // Events.
  const events: ECGEvent[] = [];
  for (let i = firstFlutter; i <= lastFlutter; i++) {
    const ft = i * flutterRrSec;
    if (ft >= tStart && ft < tEnd) events.push({ kind: 'flutter-wave', tSec: ft });
  }
  for (const beatStart of beatStartsForQrs) {
    const rT = beatStart + FLUTTER_BEAT.r.centerFraction;
    if (rT >= tStart && rT < tEnd) {
      events.push({
        kind: 'qrs-narrow',
        tSec: rT,
        meta: { conductedFromFlutter: true, ratio: CONDUCTION_RATIO },
      });
    }
  }

  return {
    rhythmId: settings.rhythmId,
    windowStartSec: tStart,
    windowEndSec: tEnd,
    sampleRateHz: settings.sampleRateHz,
    points,
    events,
  };
}

/**
 * Atrial Flutter with variable conduction (2:1 / 3:1 / 4:1 rotating).
 *
 * Same atrial sawtooth at ~ 300 bpm, but the conduction ratio shifts
 * between beats so the ventricular response is irregular. This is the
 * "irregularly irregular flutter" presentation that fools learners into
 * calling AFib until they see the organized atrial waves.
 */
function hashUnit(i: number): number {
  let x = (i | 0) ^ 0xc6a4a793;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return ((x ^ (x >>> 16)) >>> 0) / 0xffffffff;
}

export function atrialFlutterAtypicalGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  void settings.heartRate;
  const flutterRrSec = 60 / FLUTTER_RATE_BPM;
  const firstFlutter = Math.max(0, Math.floor((tStart - 0.10) / flutterRrSec));
  const lastFlutter = Math.ceil((tEnd + 0.10) / flutterRrSec);

  // Walk flutter waves; pick a conduction ratio (2 / 3 / 4) for the NEXT
  // QRS using the hash. After conducting, skip that many flutter waves
  // before allowing another QRS.
  const beatStartsForQrs: { tSec: number; ratio: number }[] = [];
  let nextConductibleIndex = firstFlutter;
  let pickIdx = 0;
  while (nextConductibleIndex <= lastFlutter) {
    const u = hashUnit(pickIdx++);
    // Bias slightly toward 2:1 conduction (most common in real flutter).
    const ratio = u < 0.5 ? 2 : u < 0.8 ? 3 : 4;
    if (nextConductibleIndex >= firstFlutter) {
      beatStartsForQrs.push({
        tSec: nextConductibleIndex * flutterRrSec,
        ratio,
      });
    }
    nextConductibleIndex += ratio;
  }

  const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
  const points = new Array<{ t: number; mv: number }>(times.length);
  for (let k = 0; k < times.length; k++) {
    const t = times[k] as number;
    const flutter = FLUTTER_AMPLITUDE_MV * sawtooth(t / flutterRrSec);
    let mv = flutter;
    for (const beat of beatStartsForQrs) {
      if (Math.abs(t - beat.tSec) > 0.6) continue;
      mv += evaluateAbsBeat(t, beat.tSec, FLUTTER_BEAT);
    }
    points[k] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (let i = firstFlutter; i <= lastFlutter; i++) {
    const ft = i * flutterRrSec;
    if (ft >= tStart && ft < tEnd) events.push({ kind: 'flutter-wave', tSec: ft });
  }
  for (const beat of beatStartsForQrs) {
    const rT = beat.tSec + FLUTTER_BEAT.r.centerFraction;
    if (rT >= tStart && rT < tEnd) {
      events.push({
        kind: 'qrs-narrow',
        tSec: rT,
        meta: { conductedFromFlutter: true, ratio: beat.ratio, variableConduction: true },
      });
    }
  }

  return {
    rhythmId: settings.rhythmId,
    windowStartSec: tStart,
    windowEndSec: tEnd,
    sampleRateHz: settings.sampleRateHz,
    points,
    events,
  };
}
