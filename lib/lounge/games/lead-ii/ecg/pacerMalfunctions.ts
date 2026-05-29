/**
 * Pacemaker malfunction reference — data + helpers.
 *
 * The simulator already has rhythm ids for the major pacemaker
 * malfunctions (`pacer.failure-to-capture`, `pacer.failure-to-pace`,
 * `pacer.failure-to-sense`, `pacer.oversensing`, `pacer.undersensing`,
 * `pacer.pmt`, `pacer.runaway`). This module is the *clinical truth*
 * those generators should match:
 *
 *   - what each malfunction looks like on the strip
 *   - what causes it
 *   - how it is diagnosed and treated
 *   - what danger it poses
 *
 * Pure TypeScript. No React / RN / Skia imports.
 */

import type { RhythmId } from './types';

export type PacerMode = 'VVI' | 'AAI' | 'DDD' | 'BiV-CRT';

export type PacerMalfunctionKind =
  | 'failure-to-capture'
  | 'failure-to-pace'
  | 'failure-to-sense'
  | 'oversensing'
  | 'undersensing'
  | 'pacemaker-mediated-tachycardia'
  | 'runaway-pacemaker';

export interface PacerMalfunctionSpec {
  kind: PacerMalfunctionKind;
  rhythmId: RhythmId;
  displayName: string;
  /** One-sentence description suitable for a soft-key label or chart note. */
  description: string;
  /** What the ECG strip looks like. */
  strip: {
    spikeVisible: boolean;
    qrsFollowsSpike: boolean;
    rateBpm?: number;
    /** Free-form description of the salient pattern. */
    pattern: string;
  };
  causes: readonly string[];
  diagnosis: readonly string[];
  /** Bedside / clinical treatment moves. */
  treatment: readonly string[];
  /** Why it matters — risk if missed. */
  danger: string;
  /** Pacing modes that are most prone to this malfunction. */
  vulnerableModes: readonly PacerMode[];
}

export const PACER_MALFUNCTION_SPECS: readonly PacerMalfunctionSpec[] = [
  {
    kind: 'failure-to-capture',
    rhythmId: 'pacer.failure-to-capture',
    displayName: 'Failure to capture',
    description: 'Pacing spike is delivered but the myocardium does not depolarize.',
    strip: {
      spikeVisible: true,
      qrsFollowsSpike: false,
      pattern: 'Sharp pacing spike with NO ensuing QRS — flat line or underlying rhythm continues.',
    },
    causes: [
      'Lead displacement or dislodgement',
      'Elevated pacing threshold (fibrosis, infarction at lead tip, severe acidosis, hyperkalemia)',
      'Lead fracture or insulation break',
      'Battery depletion (output below threshold)',
      'Exit block at the electrode-tissue interface',
    ],
    diagnosis: [
      'Pacing spike followed by no QRS on the same lead',
      'Chest X-ray to verify lead position',
      'Pacemaker interrogation: capture threshold trending up',
      'Check serum K, pH, and any anti-arrhythmic dosage changes',
    ],
    treatment: [
      'Increase pacing output (mA) at the device',
      'Correct hyperkalemia / acidosis if present',
      'Reposition or replace the lead if mechanical cause confirmed',
      'Transcutaneous backup pacing if symptomatic',
    ],
    danger:
      'Symptomatic bradycardia, syncope, or asystole if the patient is pacer-dependent and no escape rhythm takes over.',
    vulnerableModes: ['VVI', 'AAI', 'DDD', 'BiV-CRT'],
  },
  {
    kind: 'failure-to-pace',
    rhythmId: 'pacer.failure-to-pace',
    displayName: 'Failure to pace (output failure)',
    description: 'No pacing spike when one was expected.',
    strip: {
      spikeVisible: false,
      qrsFollowsSpike: false,
      pattern: 'Expected spike absent at the programmed interval — long pause without pacing output.',
    },
    causes: [
      'Lead fracture or disconnection',
      'Battery depletion (end-of-life)',
      'Generator component failure',
      'Oversensing inhibiting output (see oversensing spec)',
      'Loose set screw at the connector',
    ],
    diagnosis: [
      'Programmed pacing interval elapses with no spike on any lead',
      'Pacemaker interrogation shows lead impedance abnormal',
      'Battery voltage near elective replacement indicator',
    ],
    treatment: [
      'Transcutaneous backup pacing if hemodynamically unstable',
      'Magnet placement converts to asynchronous mode at magnet rate — diagnostic and bridging',
      'Surgical lead revision or generator replacement',
    ],
    danger:
      'Pacer-dependent patients can deteriorate to asystole. Magnet application is the bedside bridge.',
    vulnerableModes: ['VVI', 'AAI', 'DDD', 'BiV-CRT'],
  },
  {
    kind: 'failure-to-sense',
    rhythmId: 'pacer.failure-to-sense',
    displayName: 'Failure to sense (under-sensing)',
    description: 'The pacemaker does not detect native cardiac activity and fires inappropriately.',
    strip: {
      spikeVisible: true,
      qrsFollowsSpike: false,
      pattern:
        'Pacing spikes fall at fixed intervals regardless of underlying native beats. Spikes may land on QRS, on T waves (R-on-T risk), or in diastole.',
    },
    causes: [
      'Sensing threshold programmed too low (high mV cutoff)',
      'Lead displacement or insulation break',
      'Magnet application (intentional asynchronous mode)',
      'Battery depletion altering sensing',
    ],
    diagnosis: [
      'Native QRS visible with spikes inappropriately placed nearby',
      'Look for spikes on the T wave — R-on-T is dangerous',
    ],
    treatment: [
      'Reprogram sensing threshold lower (more sensitive)',
      'Reposition lead if mechanical',
      'If R-on-T provokes VT/VF: defibrillate and reprogram immediately',
    ],
    danger:
      'R-on-T phenomenon can trigger polymorphic VT or VF — this is the most dangerous malfunction of the bunch.',
    vulnerableModes: ['VVI', 'DDD'],
  },
  {
    kind: 'oversensing',
    rhythmId: 'pacer.oversensing',
    displayName: 'Oversensing',
    description: 'The pacemaker treats non-cardiac signal as cardiac activity and inappropriately INHIBITS output.',
    strip: {
      spikeVisible: false,
      qrsFollowsSpike: false,
      pattern:
        'Long pauses where pacing should have fired. Sometimes inappropriate spikes if oversensing triggers (vs. inhibits) in a tracking mode.',
    },
    causes: [
      'Electromagnetic interference (EMI) — MRI, cautery, TENS units',
      'T-wave oversensing (counted as a second R wave)',
      'Myopotential oversensing (pectoral muscle activity)',
      'Lead insulation break exposing the conductor',
      'Cross-talk in DDD between atrial and ventricular leads',
    ],
    diagnosis: [
      'Pauses on telemetry that resolve when the EMI source is removed',
      'Pacemaker interrogation reveals sensed events that should not have been seen',
    ],
    treatment: [
      'Remove the EMI source',
      'Reprogram sensitivity (less sensitive setting)',
      'Magnet placement converts to asynchronous mode — bridge if life-threatening',
    ],
    danger: 'Long pauses in a pacer-dependent patient can be syncopal or fatal.',
    vulnerableModes: ['VVI', 'DDD', 'BiV-CRT'],
  },
  {
    kind: 'undersensing',
    rhythmId: 'pacer.undersensing',
    displayName: 'Undersensing',
    description:
      'Same mechanism as failure-to-sense — pacemaker misses real beats and fires anyway. Some clinicians use the terms interchangeably; we treat them as one phenomenon with two textbook names.',
    strip: {
      spikeVisible: true,
      qrsFollowsSpike: false,
      pattern: 'Spikes fall on native beats, T waves, or in diastole. Indistinguishable from failure-to-sense.',
    },
    causes: [
      'Sensing threshold set too high',
      'Lead displacement reducing the sensed signal',
      'Low-amplitude underlying rhythm (fine VFib, junctional escape)',
    ],
    diagnosis: ['As for failure-to-sense.'],
    treatment: ['As for failure-to-sense — reprogram sensitivity.'],
    danger: 'R-on-T → polymorphic VT / VF.',
    vulnerableModes: ['VVI', 'DDD'],
  },
  {
    kind: 'pacemaker-mediated-tachycardia',
    rhythmId: 'pacer.pmt',
    displayName: 'Pacemaker-mediated tachycardia',
    description:
      'Endless-loop tachycardia in dual-chamber pacemakers: each ventricular pace conducts retrograde through the AV node, the atrial lead senses the retrograde P, triggers another ventricular pace, and the loop repeats.',
    strip: {
      spikeVisible: true,
      qrsFollowsSpike: true,
      rateBpm: 130,
      pattern:
        'Regular wide-complex tachycardia at the programmed upper rate limit. Retrograde P wave hidden in the ST segment or just before the next ventricular spike.',
    },
    causes: [
      'Retrograde VA conduction',
      'PVC initiating a retrograde P that the atrial channel senses',
      'PVARP (post-ventricular atrial refractory period) too short',
    ],
    diagnosis: [
      'Regular paced wide-complex tachycardia at the upper rate limit',
      'Magnet application converts pacing to asynchronous mode and breaks the loop — DIAGNOSTIC and therapeutic',
    ],
    treatment: [
      'Magnet placement to terminate the loop',
      'Reprogram PVARP longer to prevent recurrence',
      'Re-evaluate the underlying PVC trigger',
    ],
    danger:
      'Hemodynamic compromise if sustained or if the upper rate is high in a structurally-diseased heart.',
    vulnerableModes: ['DDD'],
  },
  {
    kind: 'runaway-pacemaker',
    rhythmId: 'pacer.runaway',
    displayName: 'Runaway pacemaker',
    description:
      'Generator component failure causes pacing far above the programmed upper rate (often 180–400 bpm). Cannot be treated as an arrhythmia — the device itself is the problem.',
    strip: {
      spikeVisible: true,
      qrsFollowsSpike: true,
      rateBpm: 220,
      pattern: 'Pacing spike before every QRS at a rate dramatically above the programmed maximum.',
    },
    causes: [
      'Battery depletion in older generators (modern devices have firmware that prevents this)',
      'Internal component failure',
      'External EMI in rare circumstances',
    ],
    diagnosis: [
      'Pacing spikes at > 180 bpm with corresponding wide paced QRS complexes',
      'Hemodynamic decline confirms clinical significance',
    ],
    treatment: [
      'Magnet placement may slow paced rate to magnet rate (programmed asynchronous)',
      'If magnet fails: emergent generator deactivation or surgical disconnection of the lead',
      'Standard antiarrhythmics will NOT help — the pacer is the source',
    ],
    danger:
      'Hemodynamically intolerable ventricular rate driven by the device. Untreated, leads to cardiovascular collapse.',
    vulnerableModes: ['VVI', 'AAI', 'DDD'],
  },
];

/** Map by rhythm id. */
export const PACER_MALFUNCTION_BY_RHYTHM_ID: ReadonlyMap<RhythmId, PacerMalfunctionSpec> = new Map(
  PACER_MALFUNCTION_SPECS.map((s) => [s.rhythmId, s]),
);

/** Map by malfunction kind. */
export const PACER_MALFUNCTION_BY_KIND: ReadonlyMap<PacerMalfunctionKind, PacerMalfunctionSpec> = new Map(
  PACER_MALFUNCTION_SPECS.map((s) => [s.kind, s]),
);

/**
 * Quick label used in the soft-key panel for a given malfunction.
 * Short enough to fit on a button.
 */
export function shortLabel(kind: PacerMalfunctionKind): string {
  switch (kind) {
    case 'failure-to-capture':
      return 'FTC';
    case 'failure-to-pace':
      return 'FTP';
    case 'failure-to-sense':
      return 'FTS';
    case 'oversensing':
      return 'OVER';
    case 'undersensing':
      return 'UNDER';
    case 'pacemaker-mediated-tachycardia':
      return 'PMT';
    case 'runaway-pacemaker':
      return 'RUNAWAY';
  }
}
