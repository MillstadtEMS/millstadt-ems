/**
 * Artifact pattern catalog + signal mixers.
 *
 * Teaches and renders the artifacts that contaminate a real cardiac
 * monitor strip:
 *
 *   - Muscle tremor / EMG: broadband HF noise, 25–100 Hz, from skeletal
 *     muscle contraction.
 *   - Parkinsonian tremor: narrow-band 4–6 Hz quasi-sinusoid that mimics
 *     atrial flutter on the strip.
 *   - Shivering: 8–12 Hz higher-amplitude rhythmic noise that can hide
 *     QRS complexes entirely.
 *   - Mains-line interference: pure 50 Hz (EU) or 60 Hz (US) sinusoid.
 *   - Wandering baseline: slow respiratory-frequency drift (~0.15–0.4 Hz).
 *   - Motion artifact / lead pull: large irregular swings from movement.
 *   - Poor electrode contact: high-frequency spikes + amplitude collapse.
 *   - CPR artifact: rhythmic ~2 Hz wide compression artifact.
 *
 * Each pattern has a clinical recognition rule (what gives it away) +
 * a pure-TS sample mixer that can be added to a clean ECG sample array.
 *
 * Pure TypeScript. No React / RN / Skia imports.
 */

import type { ECGPoint } from './types';

export type ArtifactPatternKind =
  | 'muscle-tremor-emg'
  | 'parkinsonian-tremor'
  | 'shivering'
  | 'mains-hum-60'
  | 'mains-hum-50'
  | 'wandering-baseline'
  | 'motion-artifact'
  | 'poor-electrode-contact'
  | 'cpr-artifact';

export interface ArtifactPatternSpec {
  kind: ArtifactPatternKind;
  displayName: string;
  /** Where the artifact comes from physically. */
  source: string;
  /** Dominant frequency band, Hz, [low, high]. */
  frequencyBandHz: readonly [number, number];
  /** Typical amplitude relative to a normal R-wave (1.0 = full R amplitude). */
  typicalAmplitudeRelR: number;
  /** Recognition clues a clinician sees. */
  clues: readonly string[];
  /** Real rhythms the artifact can be mistaken for. */
  mimics: readonly string[];
  /** How to clean it up. */
  fix: string;
  /** Pearls / context. */
  pearls: readonly string[];
}

// ── Pattern specs ─────────────────────────────────────────────────────

const muscleTremorSpec: ArtifactPatternSpec = {
  kind: 'muscle-tremor-emg',
  displayName: 'Muscle tremor / EMG',
  source: 'Skeletal-muscle contraction near electrode (e.g., tensed pectoral, shivering arms).',
  frequencyBandHz: [25, 100],
  typicalAmplitudeRelR: 0.15,
  clues: [
    'Fuzzy, fine baseline — looks like grass between QRS complexes',
    'Highest in the limb leads when the patient is tense',
    'No discrete waveforms inside the noise',
    'Disappears when the patient relaxes',
  ],
  mimics: [
    'Atrial fibrillation (the fine fibrillatory waves of AFib can be hard to distinguish from EMG)',
    'Polymorphic VT in extreme cases',
  ],
  fix: 'Have the patient relax, reposition electrodes off muscle bellies, warm the patient.',
  pearls: [
    'A 0.5–40 Hz "muscle" filter mode on the monitor reduces EMG but slightly distorts the QRS — only use temporarily.',
    'If the noise is rhythmic at 4–6 Hz, think parkinsonian tremor instead of generic EMG.',
  ],
};

const parkinsonianTremorSpec: ArtifactPatternSpec = {
  kind: 'parkinsonian-tremor',
  displayName: 'Parkinsonian tremor',
  source: 'Resting tremor (typically 4–6 Hz) in a patient with Parkinson disease.',
  frequencyBandHz: [4, 6],
  typicalAmplitudeRelR: 0.3,
  clues: [
    'Regular sawtooth pattern in the BASELINE — not in the QRS itself',
    'Frequency around 4–6 Hz, so roughly 240–360 cycles per minute',
    'Worse at rest, improves with voluntary movement',
    'Disappears when the patient holds their arms in active position',
  ],
  mimics: [
    'Atrial flutter (the regular ~300 bpm sawtooth is the dangerous look-alike)',
    'Atrial tachycardia at fast atrial rates',
  ],
  fix: 'Have the patient sit up, hold the affected limb against gravity, or rest the limb on a pillow.',
  pearls: [
    'A classic Internet ECG mistake — submitted as "atrial flutter" but is parkinsonian tremor. The cardiac rate is normal underneath.',
    'Cardinal feature: QRS rate is independent of the "flutter waves" — they march independently.',
  ],
};

const shiveringSpec: ArtifactPatternSpec = {
  kind: 'shivering',
  displayName: 'Shivering',
  source: 'Generalized rhythmic skeletal-muscle contraction from cold, fever, or post-anesthesia.',
  frequencyBandHz: [8, 12],
  typicalAmplitudeRelR: 0.6,
  clues: [
    'Coarse, high-amplitude rhythmic noise that can completely obscure QRS',
    'Synchronous across all leads',
    'Often follows hypothermia or anesthetic emergence',
    'Resolves when the patient is warmed or sedated',
  ],
  mimics: [
    'Ventricular fibrillation (large irregular oscillation)',
    'Polymorphic VT',
  ],
  fix: 'Warm the patient (Bair Hugger, warm blankets), treat fever, address anesthetic emergence.',
  pearls: [
    'In a "VF" alarm on a cold trauma patient — check a pulse FIRST. Shivering artifact is a classic cause of false VF alarms.',
    'Shivering is metabolically expensive — increases oxygen demand by 200–500 %.',
  ],
};

const mainsHum60Spec: ArtifactPatternSpec = {
  kind: 'mains-hum-60',
  displayName: 'Mains-line interference (60 Hz)',
  source: 'Capacitive coupling from US mains electricity (60 Hz).',
  frequencyBandHz: [60, 60],
  typicalAmplitudeRelR: 0.1,
  clues: [
    'Perfectly regular sinusoidal noise riding on the baseline',
    'Frequency exactly 60 Hz (US) — count 6 oscillations in 100 ms',
    'Worst in damp environments, near unshielded power lines, or with poor electrode adherence',
    'Disappears when the offending appliance is unplugged',
  ],
  mimics: ['Fine ventricular fibrillation', 'Artifact mistaken for a "noisy lead"'],
  fix: 'Use the monitor 60 Hz notch filter; re-apply electrodes; unplug nearby AC-powered equipment.',
  pearls: [
    'A 60 Hz notch filter cleans this up cleanly without distorting the QRS.',
    'In Europe the same artifact appears at 50 Hz — different notch frequency.',
  ],
};

const mainsHum50Spec: ArtifactPatternSpec = {
  kind: 'mains-hum-50',
  displayName: 'Mains-line interference (50 Hz)',
  source: 'Capacitive coupling from EU / UK / Australia mains electricity (50 Hz).',
  frequencyBandHz: [50, 50],
  typicalAmplitudeRelR: 0.1,
  clues: [
    'Perfectly regular sinusoidal noise on the baseline',
    'Frequency exactly 50 Hz — count 5 oscillations in 100 ms',
    'Same etiology and remedy as 60 Hz hum but at a different frequency',
  ],
  mimics: ['Fine ventricular fibrillation'],
  fix: 'Use the monitor 50 Hz notch filter (region-specific setting).',
  pearls: [
    'Make sure the monitor\'s mains filter is set to the local grid frequency. A 60 Hz filter in a 50 Hz country does nothing.',
  ],
};

const wanderingBaselineSpec: ArtifactPatternSpec = {
  kind: 'wandering-baseline',
  displayName: 'Wandering baseline',
  source: 'Respiratory motion, sweat, or loose electrode causing slow baseline drift.',
  frequencyBandHz: [0.15, 0.4],
  typicalAmplitudeRelR: 0.5,
  clues: [
    'Slow, smooth up-and-down drift of the entire trace',
    'Frequency matches the respiratory rate (10–25 / min)',
    'ST segments appear elevated then depressed as the baseline moves',
    'QRS morphology is intact — only the baseline shifts',
  ],
  mimics: [
    'Dynamic ST changes / ischemia (the baseline drift can look like ST elevation appearing and disappearing)',
  ],
  fix: 'Dry the skin, re-prep with alcohol pad, replace electrodes; use a 0.5 Hz high-pass filter sparingly.',
  pearls: [
    'Suspect baseline wander when "ST elevation" comes and goes at respiratory frequency — it is not ischemia.',
    'Diagnostic-mode filters (0.05 Hz cutoff) preserve ST fidelity but amplify baseline drift; monitor mode (0.5 Hz) hides drift but distorts ST.',
  ],
};

const motionArtifactSpec: ArtifactPatternSpec = {
  kind: 'motion-artifact',
  displayName: 'Motion / lead-pull artifact',
  source: 'Patient movement, transport bumps, or electrode wires being tugged.',
  frequencyBandHz: [1, 10],
  typicalAmplitudeRelR: 1.5,
  clues: [
    'Large, irregular, non-repeating swings that dwarf the underlying QRS',
    'Appears in bursts that correlate with movement',
    'No consistent morphology — each "complex" looks different',
    'Disappears the moment movement stops',
  ],
  mimics: [
    'Ventricular tachycardia (large wide complexes)',
    'Ventricular fibrillation (chaotic large swings)',
    'Polymorphic VT',
  ],
  fix: 'Stop transport / movement, check electrode adherence, untangle lead wires.',
  pearls: [
    'A "VT" alarm during patient transport is motion artifact until proven otherwise — feel a pulse, look at the patient.',
    'False VT/VF alarms from motion are the #1 cause of alarm fatigue in ED/ICU.',
  ],
};

const poorElectrodeContactSpec: ArtifactPatternSpec = {
  kind: 'poor-electrode-contact',
  displayName: 'Poor electrode contact',
  source: 'Dried gel, oily skin, body hair, or a lifting electrode edge.',
  frequencyBandHz: [0.5, 60],
  typicalAmplitudeRelR: 1.0,
  clues: [
    'Squared-off "telegraph-line" pattern or sudden amplitude collapse',
    'Sometimes "leads off" alarm despite the cable being connected',
    'High-frequency spikes intermixed with flat segments',
    'Affects ONE lead while others look fine — distinguishes from systemic artifact',
  ],
  mimics: ['Asystole (if amplitude collapses in the displayed lead — always check a second lead)'],
  fix: 'Replace the electrode; clean and dry the skin; shave hair under the pad.',
  pearls: [
    '"Asystole" in one lead but not in another is a lead problem, not an arrest.',
    'Always check a second lead before calling asystole.',
  ],
};

const cprArtifactSpec: ArtifactPatternSpec = {
  kind: 'cpr-artifact',
  displayName: 'CPR compression artifact',
  source: 'Chest compressions during CPR — typically 100–120 / min.',
  frequencyBandHz: [1.7, 2],
  typicalAmplitudeRelR: 1.2,
  clues: [
    'Regular, wide, repeating waveform at compression frequency (~2 Hz)',
    'Disappears the moment compressions are paused',
    'Can mimic almost any organized wide-complex rhythm',
    'Rate exactly matches the rescuer compression rate',
  ],
  mimics: [
    'Ventricular tachycardia (regular wide complex at 100–120 / min)',
    'Idioventricular rhythm',
    'Wide-complex tachycardia',
  ],
  fix: 'Pause compressions for rhythm check — the artifact resolves instantly when compressions stop.',
  pearls: [
    'Newer monitors apply CPR-artifact filtering algorithms to estimate the underlying rhythm during compressions, but pulse-check pauses remain the gold standard.',
    'Never make a rhythm-classification decision (shockable vs not) without pausing compressions.',
  ],
};

export const ARTIFACT_PATTERN_SPECS: readonly ArtifactPatternSpec[] = [
  muscleTremorSpec,
  parkinsonianTremorSpec,
  shiveringSpec,
  mainsHum60Spec,
  mainsHum50Spec,
  wanderingBaselineSpec,
  motionArtifactSpec,
  poorElectrodeContactSpec,
  cprArtifactSpec,
];

export const ARTIFACT_PATTERN_BY_KIND: ReadonlyMap<ArtifactPatternKind, ArtifactPatternSpec> =
  new Map(ARTIFACT_PATTERN_SPECS.map((s) => [s.kind, s]));

// ── Signal mixers ─────────────────────────────────────────────────────

/**
 * Deterministic seeded RNG so artifact injection is reproducible in tests.
 * Mulberry32 — fast, decent statistical quality for noise mixing.
 */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ArtifactMixOptions {
  /** Multiplier on the amplitude defined in the pattern spec (0..2 typical). */
  intensity?: number;
  /** RNG seed for reproducibility. */
  seed?: number;
  /** Reference R-wave amplitude in mV. Defaults to 1.0 mV. */
  rAmplitudeMv?: number;
}

/**
 * Inject an artifact pattern into a clean sample array.
 *
 * Returns a NEW array; the input is not mutated. The artifact is added
 * to the `mv` field of each sample. Time stamps are preserved.
 */
export function injectArtifact(
  samples: readonly ECGPoint[],
  kind: ArtifactPatternKind,
  opts: ArtifactMixOptions = {},
): ECGPoint[] {
  const spec = ARTIFACT_PATTERN_BY_KIND.get(kind);
  if (!spec || samples.length === 0) return samples.map((s) => ({ ...s }));

  const intensity = opts.intensity ?? 1;
  const rAmp = opts.rAmplitudeMv ?? 1.0;
  const amp = spec.typicalAmplitudeRelR * intensity * rAmp;
  const [fLow, fHigh] = spec.frequencyBandHz;
  const rng = mulberry32(opts.seed ?? 1);

  return samples.map((sample, i) => {
    const t = sample.t;
    let noise = 0;

    switch (kind) {
      case 'mains-hum-60':
      case 'mains-hum-50': {
        noise = amp * Math.sin(2 * Math.PI * fLow * t);
        break;
      }
      case 'wandering-baseline': {
        // Slow respiratory-frequency drift
        const f = (fLow + fHigh) / 2;
        noise = amp * Math.sin(2 * Math.PI * f * t);
        break;
      }
      case 'parkinsonian-tremor': {
        const f = 5; // canonical 5 Hz
        noise = amp * Math.sin(2 * Math.PI * f * t);
        break;
      }
      case 'shivering': {
        const f = 10;
        noise = amp * Math.sin(2 * Math.PI * f * t) + 0.3 * amp * (rng() - 0.5) * 2;
        break;
      }
      case 'muscle-tremor-emg': {
        // Broadband HF noise approximated by uniform random per sample
        noise = amp * (rng() - 0.5) * 2;
        break;
      }
      case 'motion-artifact': {
        // Bursts: occasional large irregular swings
        if (rng() < 0.05) {
          noise = amp * (rng() * 2 - 1);
        }
        break;
      }
      case 'poor-electrode-contact': {
        // Squared-off / collapsed amplitude
        if (rng() < 0.3) {
          // intermittent dropout that pulls signal toward zero
          noise = -sample.mv * 0.9;
        } else if (rng() < 0.05) {
          noise = amp * (rng() * 2 - 1);
        }
        break;
      }
      case 'cpr-artifact': {
        // ~120 compressions/min = 2 Hz, broad triangular
        const f = 2;
        const phase = (t * f) % 1;
        const triangle = 1 - 2 * Math.abs(phase - 0.5);
        noise = amp * triangle;
        break;
      }
    }
    // suppress unused-index warning in some configs
    void i;
    return { t, mv: sample.mv + noise };
  });
}

/**
 * Compute a signal's RMS — useful to test that artifact injection
 * actually changed the signal energy.
 */
export function rms(samples: readonly ECGPoint[]): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (const s of samples) sum += s.mv * s.mv;
  return Math.sqrt(sum / samples.length);
}
