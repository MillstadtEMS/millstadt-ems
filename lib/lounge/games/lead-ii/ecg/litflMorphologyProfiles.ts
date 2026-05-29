/**
 * LITFL-backed morphology profiles.
 *
 * These are NOT copied source text and they do NOT embed LITFL ECG images.
 * The profiles turn source-backed ECG teaching points into local, original,
 * structured model data: rate bands, intervals, morphology cues, and generator
 * knobs. Waveform generators can import the numeric knobs instead of carrying
 * unexplained magic constants.
 */

import type { RhythmId } from './types';

export interface Range {
  min: number;
  max: number;
}

export interface RhythmGeneratorKnobs {
  sinusRateBpm?: Range;
  afBaseRateBpm?: number;
  afRrFraction?: Range;
  afBaselineFrequenciesHz?: readonly number[];
  afBaselineAmplitudesMv?: readonly number[];
  flutterAtrialRateBpm?: number;
  flutterConductionRatio?: number;
  flutterWaveAmplitudeMv?: number;
  vtRateBpm?: Range;
  vfFrequenciesHz?: readonly number[];
  vfAmplitudesMv?: readonly number[];
}

export interface LitflMorphologyProfile {
  id: RhythmId;
  /** Original URLs used as clinical references. No prose/images are copied. */
  sourceUrls: readonly string[];
  rhythmClass: 'single-lead' | 'twelve-lead-pattern' | 'clinical-state';
  rateBpm?: Range;
  atrialRateBpm?: Range;
  ventricularRateBpm?: Range;
  prMs?: Range;
  qrsMs?: Range;
  qtMs?: Range;
  regularity: 'regular' | 'regularly-irregular' | 'irregularly-irregular' | 'chaotic' | 'none';
  pWave: string;
  qrs: string;
  stT: string;
  modelNotes: readonly string[];
  generator?: RhythmGeneratorKnobs;
}

const LITFL = {
  nsr: 'https://litfl.com/normal-sinus-rhythm-ecg-library/',
  sinusBrady: 'https://litfl.com/sinus-bradycardia-ecg-library/',
  sinusTachy: 'https://litfl.com/sinus-tachycardia-ecg-library/',
  sinusArrhythmia: 'https://litfl.com/sinus-arrhythmia-ecg-library/',
  af: 'https://litfl.com/atrial-fibrillation-ecg-library/',
  flutter: 'https://litfl.com/atrial-flutter-ecg-library/',
  svt: 'https://litfl.com/supraventricular-tachycardia-svt-ecg-library/',
  avnrt: 'https://litfl.com/avnrt-ecg-library/',
  avrt: 'https://litfl.com/avrt-ecg-library/',
  pac: 'https://litfl.com/premature-atrial-complex-pac-ecg-library/',
  pjc: 'https://litfl.com/premature-junctional-complex-pjc-ecg-library/',
  mat: 'https://litfl.com/multifocal-atrial-tachycardia-mat/',
  junctionalTach: 'https://litfl.com/junctional-tachycardia-ecg-library/',
  junctional: 'https://litfl.com/junctional-rhythm-ecg-library/',
  pvc: 'https://litfl.com/premature-ventricular-complex-pvc-ecg-library/',
  idioventricular: 'https://litfl.com/idioventricular-rhythm-ecg-library/',
  vt: 'https://litfl.com/ventricular-tachycardia-monomorphic-ecg-library/',
  polymorphicVt: 'https://litfl.com/ventricular-tachycardia-polymorphic-ecg-library/',
  torsades: 'https://litfl.com/torsades-de-pointes-ecg-library/',
  vf: 'https://litfl.com/ventricular-fibrillation-ecg-library/',
  asystole: 'https://litfl.com/asystole-ecg-library/',
  pea: 'https://litfl.com/pulseless-electrical-activity-pea-ecg-library/',
  firstDegree: 'https://litfl.com/first-degree-heart-block-ecg-library/',
  mobitzI: 'https://litfl.com/av-block-2nd-degree-mobitz-i-wenckebach-phenomenon/',
  mobitzII: 'https://litfl.com/av-block-2nd-degree-mobitz-ii-hay-block/',
  highGrade: 'https://litfl.com/high-grade-av-block-ecg-library/',
  completeBlock: 'https://litfl.com/av-block-3rd-degree-complete-heart-block/',
  pacemaker: 'https://litfl.com/pacemaker-rhythms-normal-patterns/',
  pacemakerMalfunction: 'https://litfl.com/pacemaker-malfunction-ecg-library/',
  rbbb: 'https://litfl.com/right-bundle-branch-block-rbbb-ecg-library/',
  lbbb: 'https://litfl.com/left-bundle-branch-block-lbbb-ecg-library/',
  wpw: 'https://litfl.com/pre-excitation-syndromes-ecg-library/',
  brugada: 'https://litfl.com/brugada-syndrome-ecg-library/',
  hypothermia: 'https://litfl.com/hypothermia-ecg-library/',
  stemi: 'https://litfl.com/st-elevation-myocardial-infarction-stemi-ecg-library/',
  inferior: 'https://litfl.com/inferior-stemi-ecg-library/',
  anterior: 'https://litfl.com/anterior-stemi-ecg-library/',
  lateral: 'https://litfl.com/lateral-stemi-ecg-library/',
  posterior: 'https://litfl.com/posterior-myocardial-infarction-ecg-library/',
  sgarbossa: 'https://litfl.com/sgarbossa-criteria-ecg-library/',
  hyperk: 'https://litfl.com/hyperkalaemia-ecg-library/',
} as const;

const narrowQrs: Range = { min: 70, max: 110 };
const wideQrs: Range = { min: 120, max: 220 };
const normalPr: Range = { min: 120, max: 200 };

function p(def: LitflMorphologyProfile): LitflMorphologyProfile {
  return def;
}

function sinusProfile(
  id: RhythmId,
  sourceUrl: string,
  rateBpm: Range,
  notes: readonly string[],
  regularity: LitflMorphologyProfile['regularity'] = 'regular',
): LitflMorphologyProfile {
  return p({
    id,
    sourceUrls: [sourceUrl],
    rhythmClass: 'single-lead',
    rateBpm,
    prMs: normalPr,
    qrsMs: narrowQrs,
    regularity,
    pWave: 'Upright sinus P before every conducted QRS.',
    qrs: 'Narrow QRS with one QRS for each sinus P wave.',
    stT: 'No primary ST/T abnormality modeled.',
    modelNotes: notes,
    generator: { sinusRateBpm: rateBpm },
  });
}

function pvcPatternProfile(id: RhythmId, pattern: string): LitflMorphologyProfile {
  return p({
    id,
    sourceUrls: [LITFL.pvc],
    rhythmClass: 'single-lead',
    qrsMs: wideQrs,
    regularity: 'regularly-irregular',
    pWave: 'Premature ventricular beats are not preceded by sinus P waves.',
    qrs: 'Premature broad bizarre ventricular complex with dominant wide deflection.',
    stT: 'Secondary ST/T direction is discordant to the dominant QRS.',
    modelNotes: [pattern, 'Use compensatory pause and wide-QRS event markers to make the pattern testable.'],
  });
}

function vtFamilyProfile(id: RhythmId, urls: readonly string[], notes: readonly string[]): LitflMorphologyProfile {
  return p({
    id,
    sourceUrls: urls,
    rhythmClass: 'single-lead',
    rateBpm: { min: 150, max: 250 },
    qrsMs: wideQrs,
    regularity: id === 'vent.polymorphic-vt' || id === 'vent.torsades' ? 'regularly-irregular' : 'regular',
    pWave: 'No consistent sinus P wave relationship is modeled.',
    qrs: 'Wide ventricular complexes; morphology depends on the VT subtype.',
    stT: 'Repolarization is secondary/discordant to wide ventricular depolarization.',
    modelNotes: notes,
    generator: { vtRateBpm: { min: 150, max: 220 } },
  });
}

function pacerProfile(id: RhythmId, notes: readonly string[]): LitflMorphologyProfile {
  return p({
    id,
    sourceUrls: [LITFL.pacemaker, LITFL.pacemakerMalfunction],
    rhythmClass: 'single-lead',
    rateBpm: { min: 50, max: 110 },
    qrsMs: wideQrs,
    regularity: 'regular',
    pWave: 'Depends on pacing mode; atrial capture may precede a conducted QRS.',
    qrs: 'Pacer spike timing and capture/failure state define the teaching pattern.',
    stT: 'Ventricular paced beats use secondary ST/T discordance.',
    modelNotes: notes,
  });
}

function stemiProfile(id: RhythmId, urls: readonly string[], leads: string, reciprocal: string): LitflMorphologyProfile {
  return p({
    id,
    sourceUrls: urls,
    rhythmClass: 'twelve-lead-pattern',
    regularity: 'regular',
    pWave: 'Pattern is layered onto the selected base rhythm.',
    qrs: 'Base rhythm QRS is preserved unless paired with a conduction modifier.',
    stT: `ST-elevation territory modeled in ${leads}.`,
    modelNotes: [
      reciprocal ? `Reciprocal depression modeled in ${reciprocal}.` : 'No mandatory reciprocal territory in this simplified pattern.',
      'Applied as a 12-lead modifier, never as a separate rhythm strip generator.',
    ],
  });
}

export const LITFL_MORPHOLOGY_PROFILES = {
  'sinus.normal': sinusProfile('sinus.normal', LITFL.nsr, { min: 60, max: 100 }, [
    'Anchor waveform: regular rhythm, sinus P, normal PR, narrow QRS.',
  ]),
  'sinus.bradycardia': sinusProfile('sinus.bradycardia', LITFL.sinusBrady, { min: 30, max: 59 }, [
    'Same morphology as sinus rhythm with the rate band shifted below 60 bpm.',
  ]),
  'sinus.tachycardia': sinusProfile('sinus.tachycardia', LITFL.sinusTachy, { min: 101, max: 180 }, [
    'Same morphology as sinus rhythm with the rate band shifted above 100 bpm.',
  ]),
  'sinus.arrhythmia': sinusProfile('sinus.arrhythmia', LITFL.sinusArrhythmia, { min: 55, max: 105 }, [
    'R-R variability should be smooth/cyclic, not chaotic like AF.',
  ], 'regularly-irregular'),

  'atrial.fib': p({
    id: 'atrial.fib',
    sourceUrls: [LITFL.af],
    rhythmClass: 'single-lead',
    ventricularRateBpm: { min: 60, max: 120 },
    qrsMs: narrowQrs,
    regularity: 'irregularly-irregular',
    pWave: 'No discrete P waves; atrial baseline is fibrillatory.',
    qrs: 'Usually narrow unless a separate conduction problem is present.',
    stT: 'No primary ST/T abnormality modeled.',
    modelNotes: ['Use deterministic irregular R-R intervals and low-amplitude fibrillatory baseline.'],
    generator: {
      afBaseRateBpm: 90,
      afRrFraction: { min: 0.6, max: 1.3 },
      afBaselineFrequenciesHz: [5.4, 6.9, 8.6, 10.4],
      afBaselineAmplitudesMv: [0.085, 0.065, 0.05, 0.035],
    },
  }),
  'atrial.flutter': p({
    id: 'atrial.flutter',
    sourceUrls: [LITFL.flutter],
    rhythmClass: 'single-lead',
    atrialRateBpm: { min: 250, max: 350 },
    ventricularRateBpm: { min: 120, max: 170 },
    qrsMs: narrowQrs,
    regularity: 'regular',
    pWave: 'Sawtooth flutter waves replace discrete sinus P waves.',
    qrs: 'Narrow QRS with modeled 3:1 conduction — leaves two clearly visible flutter waves between each QRS.',
    stT: 'Flutter waves may distort the apparent ST/T baseline.',
    modelNotes: ['Typical teaching view uses an atrial rate near 300/min. 3:1 conduction → ventricular response near 100/min; two pronounced flutter waves visible between QRSes for unambiguous sawtooth recognition.'],
    generator: { flutterAtrialRateBpm: 300, flutterConductionRatio: 3, flutterWaveAmplitudeMv: 0.35 },
  }),
  'atrial.fib-rvr': p({
    id: 'atrial.fib-rvr',
    sourceUrls: [LITFL.af],
    rhythmClass: 'single-lead',
    ventricularRateBpm: { min: 100, max: 180 },
    qrsMs: narrowQrs,
    regularity: 'irregularly-irregular',
    pWave: 'No discrete P waves; fibrillatory baseline only.',
    qrs: 'Narrow QRS at a rapid, irregularly irregular ventricular rate (RVR).',
    stT: 'No primary ST/T abnormality modeled.',
    modelNotes: ['Same morphology as controlled AFib; locked at ~ 130 bpm average ventricular response.'],
    generator: {
      afBaseRateBpm: 130,
      afRrFraction: { min: 0.6, max: 1.3 },
      afBaselineFrequenciesHz: [5.8, 7.5, 9.3, 11.1],
      afBaselineAmplitudesMv: [0.085, 0.06, 0.045, 0.032],
    },
  }),
  'atrial.flutter-atypical': p({
    id: 'atrial.flutter-atypical',
    sourceUrls: [LITFL.flutter],
    rhythmClass: 'single-lead',
    atrialRateBpm: { min: 250, max: 350 },
    ventricularRateBpm: { min: 60, max: 150 },
    qrsMs: narrowQrs,
    regularity: 'irregularly-irregular',
    pWave: 'Sawtooth flutter waves at ~ 300/min; conduction ratio shifts 2:1 / 3:1 / 4:1 between beats.',
    qrs: 'Narrow QRS at irregular intervals because the conduction ratio changes.',
    stT: 'Flutter waves may distort the apparent ST/T baseline.',
    modelNotes: ['Same atrial sawtooth as typical flutter; ventricular response varies as conduction ratio rotates.'],
    generator: { flutterAtrialRateBpm: 300, flutterWaveAmplitudeMv: 0.18 },
  }),
  'atrial.mat': p({
    id: 'atrial.mat',
    sourceUrls: [LITFL.mat],
    rhythmClass: 'single-lead',
    rateBpm: { min: 100, max: 180 },
    qrsMs: narrowQrs,
    regularity: 'irregularly-irregular',
    pWave: 'Three or more different P-wave morphologies, by definition.',
    qrs: 'Narrow QRS at a tachycardic rate.',
    stT: 'No primary ST/T abnormality modeled.',
    modelNotes: ['Distinct from AFib by discrete identifiable P waves of varying shape preceding each QRS.'],
  }),
  'atrial.svt': p({
    id: 'atrial.svt',
    sourceUrls: [LITFL.svt],
    rhythmClass: 'single-lead',
    rateBpm: { min: 150, max: 220 },
    qrsMs: narrowQrs,
    regularity: 'regular',
    pWave: 'P waves are absent, retrograde, or buried in the QRS/T complex.',
    qrs: 'Narrow regular tachycardia.',
    stT: 'Rate-related ST/T changes may be subtle; not primary to the model.',
    modelNotes: ['Abrupt regular narrow-complex tachycardia differentiates from sinus tachycardia.'],
  }),
  'atrial.avnrt': p({
    id: 'atrial.avnrt',
    sourceUrls: [LITFL.avnrt, LITFL.svt],
    rhythmClass: 'single-lead',
    rateBpm: { min: 140, max: 250 },
    qrsMs: narrowQrs,
    regularity: 'regular',
    pWave: 'Retrograde P activity is hidden or appears immediately after QRS.',
    qrs: 'Narrow regular tachycardia.',
    stT: 'No primary ST/T abnormality modeled.',
    modelNotes: ['Short-RP SVT phenotype; generated as a tight regular narrow tachycardia.'],
  }),
  'atrial.avrt': p({
    id: 'atrial.avrt',
    sourceUrls: [LITFL.avrt, LITFL.svt],
    rhythmClass: 'single-lead',
    rateBpm: { min: 150, max: 250 },
    qrsMs: narrowQrs,
    regularity: 'regular',
    pWave: 'Retrograde P wave follows QRS when visible.',
    qrs: 'Orthodromic AVRT is usually narrow; antidromic/wide variants are not modeled here.',
    stT: 'No primary ST/T abnormality modeled.',
    modelNotes: ['Keep distinct from generic SVT by later adding visible post-QRS retrograde P timing.'],
  }),
  'atrial.pac': p({
    id: 'atrial.pac',
    sourceUrls: [LITFL.pac],
    rhythmClass: 'single-lead',
    qrsMs: narrowQrs,
    regularity: 'regularly-irregular',
    pWave: 'Premature abnormal P wave, often deforming the previous T wave.',
    qrs: 'Usually narrow because ventricular conduction is normal.',
    stT: 'T wave may be notched by the premature atrial depolarization.',
    modelNotes: ['Premature atrial event should reset the sinus timing rather than create a compensatory pause like PVC.'],
  }),
  'junctional.rhythm': p({
    id: 'junctional.rhythm',
    sourceUrls: [LITFL.junctional],
    rhythmClass: 'single-lead',
    rateBpm: { min: 40, max: 60 },
    qrsMs: narrowQrs,
    regularity: 'regular',
    pWave: 'P waves absent, inverted, or retrograde with short PR when visible.',
    qrs: 'Narrow escape rhythm.',
    stT: 'No primary ST/T abnormality modeled.',
    modelNotes: ['Escape range 40-60/min; generated with absent/retrograde atrial activity.'],
  }),
  'junctional.accelerated': p({
    id: 'junctional.accelerated',
    sourceUrls: [LITFL.junctional],
    rhythmClass: 'single-lead',
    rateBpm: { min: 60, max: 100 },
    qrsMs: narrowQrs,
    regularity: 'regular',
    pWave: 'P waves absent, inverted, or retrograde with short PR when visible.',
    qrs: 'Narrow junctional rhythm at accelerated rate.',
    stT: 'No primary ST/T abnormality modeled.',
    modelNotes: ['Same junctional morphology, faster than escape but below classic tachycardia.'],
  }),
  'junctional.tachycardia': p({
    id: 'junctional.tachycardia',
    sourceUrls: [LITFL.junctionalTach, LITFL.junctional],
    rhythmClass: 'single-lead',
    rateBpm: { min: 100, max: 180 },
    qrsMs: narrowQrs,
    regularity: 'regular',
    pWave: 'P waves absent, inverted, or retrograde with short PR when visible.',
    qrs: 'Narrow junctional rhythm at a tachycardic rate.',
    stT: 'No primary ST/T abnormality modeled.',
    modelNotes: ['Same junctional morphology as escape, but firing > 100/min.'],
  }),
  'junctional.pjc': p({
    id: 'junctional.pjc',
    sourceUrls: [LITFL.pjc, LITFL.junctional],
    rhythmClass: 'single-lead',
    qrsMs: narrowQrs,
    regularity: 'regularly-irregular',
    pWave: 'Premature beat has an inverted P just before QRS, a P falling within the QRS, or no visible P at all.',
    qrs: 'Narrow QRS — ectopic origin is junctional, so ventricular conduction is normal.',
    stT: 'No primary ST/T abnormality modeled.',
    modelNotes: ['Non-compensatory pause after the PJC because the SA node is reset, same as a PAC.'],
  }),

  // ── Curriculum Basic/Core additions ──────────────────────────────────
  'sinus.arrest': p({
    id: 'sinus.arrest',
    sourceUrls: [LITFL.nsr, LITFL.sinusBrady],
    rhythmClass: 'single-lead',
    rateBpm: { min: 50, max: 90 },
    qrsMs: narrowQrs,
    regularity: 'regularly-irregular',
    pWave: 'Sinus P waves normally, with intermittent absent P-QRS-T (the pause).',
    qrs: 'Narrow QRS when present; absent during the pause.',
    stT: 'No primary ST/T abnormality modeled.',
    modelNotes: ['Pause length is NOT an integer multiple of the underlying P-P (separates from SA exit block).'],
  }),
  'atrial.wandering-pacemaker': p({
    id: 'atrial.wandering-pacemaker',
    sourceUrls: [LITFL.pac],
    rhythmClass: 'single-lead',
    rateBpm: { min: 60, max: 100 },
    qrsMs: narrowQrs,
    regularity: 'regularly-irregular',
    pWave: 'P-wave morphology changes from beat to beat as the pacemaker site drifts among atrial foci.',
    qrs: 'Narrow QRS — ventricular conduction is normal.',
    stT: 'No primary ST/T abnormality modeled.',
    modelNotes: ['Distinguishes from MAT by rate — WAP is < 100 bpm, MAT is > 100 bpm.'],
  }),
  'atrial.focal-atrial-tach': p({
    id: 'atrial.focal-atrial-tach',
    sourceUrls: [LITFL.svt, LITFL.pac],
    rhythmClass: 'single-lead',
    rateBpm: { min: 150, max: 250 },
    qrsMs: narrowQrs,
    regularity: 'regular',
    pWave: 'Uniform but abnormal P waves (different from sinus); often buried in the preceding T at fast rates.',
    qrs: 'Narrow QRS at a tachycardic rate.',
    stT: 'No primary ST/T abnormality modeled.',
    modelNotes: ['Single ectopic atrial focus; differs from MAT by uniform P morphology.'],
  }),
  'vent.pvc-multifocal': pvcPatternProfile('vent.pvc-multifocal', 'PVCs from multiple foci — different QRS morphologies on the same strip.'),
  'vent.r-on-t': pvcPatternProfile('vent.r-on-t', 'PVC fires during the preceding T wave — short coupling interval, risk of degeneration to VT/VF.'),
  'vent.quadrigeminy': pvcPatternProfile('vent.quadrigeminy', 'Every fourth beat is a PVC.'),
  'vent.ventricular-escape': p({
    id: 'vent.ventricular-escape',
    sourceUrls: [LITFL.idioventricular],
    rhythmClass: 'single-lead',
    rateBpm: { min: 20, max: 40 },
    qrsMs: { min: 120, max: 180 },
    regularity: 'regular',
    pWave: 'Absent — origin is ventricular.',
    qrs: 'Wide and bizarre, same morphology as idioventricular rhythm.',
    stT: 'Discordant T-wave to the QRS.',
    modelNotes: ['AKA Idioventricular Rhythm — same morphology family. Used when emphasizing the escape mechanism.'],
  }),
  'vent.flutter': p({
    id: 'vent.flutter',
    sourceUrls: [LITFL.vt, LITFL.vf],
    rhythmClass: 'single-lead',
    rateBpm: { min: 250, max: 300 },
    qrsMs: { min: 120, max: 200 },
    regularity: 'regular',
    pWave: 'None.',
    qrs: 'Sinusoidal — no discernible discrete QRS/ST/T; just a regular, very fast, large-amplitude wave.',
    stT: 'No discernible.',
    modelNotes: ['Transitional rhythm between VT and VF. Usually degenerates to VFib within seconds.'],
  }),

  'vent.pvc': pvcPatternProfile('vent.pvc', 'Single premature broad complex with compensatory pause.'),
  'vent.pvc-couplet': pvcPatternProfile('vent.pvc-couplet', 'Two consecutive PVCs.'),
  'vent.pvc-triplet': pvcPatternProfile('vent.pvc-triplet', 'Three consecutive PVCs, bridging toward NSVT teaching.'),
  'vent.bigeminy': pvcPatternProfile('vent.bigeminy', 'Every other beat is a PVC.'),
  'vent.trigeminy': pvcPatternProfile('vent.trigeminy', 'Every third beat is a PVC.'),

  'vent.idioventricular': p({
    id: 'vent.idioventricular',
    sourceUrls: [LITFL.idioventricular],
    rhythmClass: 'single-lead',
    rateBpm: { min: 20, max: 40 },
    qrsMs: wideQrs,
    regularity: 'regular',
    pWave: 'No consistent atrial relationship.',
    qrs: 'Regular wide ventricular escape complexes.',
    stT: 'Secondary ST/T discordance.',
    modelNotes: ['Escape rhythm: slower than AIVR and VT.'],
  }),
  'vent.aivr': p({
    id: 'vent.aivr',
    sourceUrls: [LITFL.idioventricular],
    rhythmClass: 'single-lead',
    rateBpm: { min: 50, max: 120 },
    qrsMs: wideQrs,
    regularity: 'regular',
    pWave: 'May show AV dissociation, capture, or fusion beats in advanced examples.',
    qrs: 'Wide ventricular rhythm faster than escape but slower than VT.',
    stT: 'Secondary ST/T discordance.',
    modelNotes: ['Often a reperfusion rhythm; model should not exceed VT rates.'],
  }),
  'vent.nsvt': vtFamilyProfile('vent.nsvt', [LITFL.vt], [
    'At least three consecutive ventricular beats terminating before 30 seconds.',
  ]),
  'vent.vtach-stable': vtFamilyProfile('vent.vtach-stable', [LITFL.vt], [
    'Regular monomorphic wide-complex tachycardia; hemodynamic stability is a vitals-layer concept.',
  ]),
  'vent.polymorphic-vt': vtFamilyProfile('vent.polymorphic-vt', [LITFL.polymorphicVt], [
    'Wide-complex tachycardia with changing QRS shape/axis rather than a single template.',
  ]),
  'vent.torsades': vtFamilyProfile('vent.torsades', [LITFL.torsades, LITFL.polymorphicVt], [
    'Polymorphic VT whose amplitude appears to rotate around the baseline; long-QT context is central.',
  ]),
  'vent.bidirectional-vt': vtFamilyProfile('vent.bidirectional-vt', [LITFL.vt], [
    'Beat-to-beat alternation of QRS axis/polarity; classically linked with digoxin toxicity or CPVT.',
  ]),
  'vent.fascicular-vt': vtFamilyProfile('vent.fascicular-vt', [LITFL.vt], [
    'Relatively narrower VT phenotype; teaching emphasis is wide-complex tachycardia with fascicular axis pattern.',
  ]),
  'vent.rvot-vt': vtFamilyProfile('vent.rvot-vt', [LITFL.vt], [
    'Idiopathic VT phenotype with outflow-tract morphology; modeled as organized monomorphic VT.',
  ]),
  'vent.vfib': p({
    id: 'vent.vfib',
    sourceUrls: [LITFL.vf],
    rhythmClass: 'single-lead',
    regularity: 'chaotic',
    pWave: 'No organized P waves.',
    qrs: 'No identifiable QRS complexes.',
    stT: 'No interpretable ST/T segment.',
    modelNotes: ['Chaotic waveform with no organized ventricular depolarization events.'],
    generator: {
      vfFrequenciesHz: [4.5, 5.7, 6.3, 7.1, 8.4],
      vfAmplitudesMv: [0.18, 0.165, 0.15, 0.135, 0.12],
    },
  }),
  'vent.vfib-fine': p({
    id: 'vent.vfib-fine',
    sourceUrls: [LITFL.vf],
    rhythmClass: 'single-lead',
    regularity: 'chaotic',
    pWave: 'No organized P waves.',
    qrs: 'No identifiable QRS complexes; amplitude is low.',
    stT: 'No interpretable ST/T segment.',
    modelNotes: ['Fine VF should be lower amplitude than coarse VF and remain distinct from asystole.'],
  }),
  'vent.asystole': p({
    id: 'vent.asystole',
    sourceUrls: [LITFL.asystole],
    rhythmClass: 'single-lead',
    regularity: 'none',
    pWave: 'No atrial electrical activity modeled.',
    qrs: 'No ventricular electrical activity modeled.',
    stT: 'Flat baseline aside from minor artifact.',
    modelNotes: ['Do not emit QRS events; future audio should stay silent.'],
  }),
  'vent.pea': p({
    id: 'vent.pea',
    sourceUrls: [LITFL.pea],
    rhythmClass: 'clinical-state',
    qrsMs: narrowQrs,
    regularity: 'regular',
    pWave: 'Can appear organized; the key fact is absence of a pulse.',
    qrs: 'PEA is not a unique waveform; app uses an organized rhythm plus pulseless vitals/context.',
    stT: 'Depends on the organized electrical rhythm displayed.',
    modelNotes: ['Never present PEA as a single morphology. It is organized electrical activity without palpable pulse.'],
  }),

  'av-block.first-degree': p({
    id: 'av-block.first-degree',
    sourceUrls: [LITFL.firstDegree],
    rhythmClass: 'single-lead',
    rateBpm: { min: 45, max: 100 },
    prMs: { min: 210, max: 320 },
    qrsMs: narrowQrs,
    regularity: 'regular',
    pWave: 'One sinus P wave before every QRS.',
    qrs: 'Every atrial impulse conducts; no dropped QRS.',
    stT: 'No primary ST/T abnormality modeled.',
    modelNotes: ['Prolong PR interval is the entire teaching point.'],
  }),
  'av-block.second-mobitz-i': p({
    id: 'av-block.second-mobitz-i',
    sourceUrls: [LITFL.mobitzI],
    rhythmClass: 'single-lead',
    prMs: { min: 160, max: 360 },
    qrsMs: narrowQrs,
    regularity: 'regularly-irregular',
    pWave: 'Sinus P waves march through; PR progressively lengthens before a non-conducted P.',
    qrs: 'Grouped beating with a dropped QRS after PR prolongation.',
    stT: 'No primary ST/T abnormality modeled.',
    modelNotes: ['Crescendo PR lengthening then dropped beat.'],
  }),
  'av-block.second-mobitz-ii': p({
    id: 'av-block.second-mobitz-ii',
    sourceUrls: [LITFL.mobitzII],
    rhythmClass: 'single-lead',
    prMs: normalPr,
    qrsMs: { min: 90, max: 160 },
    regularity: 'regularly-irregular',
    pWave: 'Sinus P waves continue; some fail to conduct without prior PR lengthening.',
    qrs: 'Intermittently dropped QRS with fixed PR on conducted beats.',
    stT: 'No primary ST/T abnormality modeled.',
    modelNotes: ['Fixed PR plus sudden dropped complexes; higher risk than Mobitz I.'],
  }),
  'av-block.2-1': p({
    id: 'av-block.2-1',
    sourceUrls: [LITFL.mobitzI, LITFL.mobitzII],
    rhythmClass: 'single-lead',
    qrsMs: { min: 80, max: 160 },
    regularity: 'regular',
    pWave: 'Every other P wave conducts.',
    qrs: '2:1 conduction makes Mobitz I vs II uncertain without more context.',
    stT: 'No primary ST/T abnormality modeled.',
    modelNotes: ['Teaching point: classify as 2:1 AV block rather than pretending type is certain.'],
  }),
  'av-block.high-grade': p({
    id: 'av-block.high-grade',
    sourceUrls: [LITFL.highGrade],
    rhythmClass: 'single-lead',
    qrsMs: { min: 90, max: 180 },
    regularity: 'regularly-irregular',
    pWave: 'Multiple P waves may fail to conduct in a row.',
    qrs: 'Intermittent ventricular response with more non-conducted than conducted atrial beats.',
    stT: 'No primary ST/T abnormality modeled.',
    modelNotes: ['High-grade block should visibly drop consecutive QRS complexes.'],
  }),
  'av-block.third-degree': p({
    id: 'av-block.third-degree',
    sourceUrls: [LITFL.completeBlock],
    rhythmClass: 'single-lead',
    ventricularRateBpm: { min: 20, max: 50 },
    qrsMs: { min: 90, max: 180 },
    regularity: 'regular',
    pWave: 'P waves and QRS complexes march independently.',
    qrs: 'Escape rhythm may be narrow or wide depending on block level.',
    stT: 'No primary ST/T abnormality modeled.',
    modelNotes: ['AV dissociation is the defining feature; P and QRS clocks must be independent.'],
  }),
  'av-block.dissociation': p({
    id: 'av-block.dissociation',
    sourceUrls: [LITFL.completeBlock],
    rhythmClass: 'single-lead',
    qrsMs: { min: 90, max: 180 },
    regularity: 'regular',
    pWave: 'Atrial and ventricular activity are independent.',
    qrs: 'Ventricular escape or competing pacemaker rhythm is independent of P waves.',
    stT: 'No primary ST/T abnormality modeled.',
    modelNotes: ['Model as two clocks, not a fixed PR conduction rhythm.'],
  }),

  'pacer.atrial': pacerProfile('pacer.atrial', ['Atrial spike precedes atrial capture followed by native narrow QRS conduction.']),
  'pacer.ventricular': pacerProfile('pacer.ventricular', ['Ventricular spike immediately precedes wide paced QRS.']),
  'pacer.av': pacerProfile('pacer.av', ['Dual-chamber pacing shows atrial spike, AV delay, then ventricular spike/QRS.']),
  'pacer.failure-to-pace': pacerProfile('pacer.failure-to-pace', ['Expected pacing spikes are absent when the pacer should fire.']),
  'pacer.failure-to-capture': pacerProfile('pacer.failure-to-capture', ['Pacing spike appears but is not followed by expected depolarization.']),
  'pacer.failure-to-sense': pacerProfile('pacer.failure-to-sense', ['Pacemaker fires inappropriately despite intrinsic activity.']),
  'pacer.oversensing': pacerProfile('pacer.oversensing', ['Pacemaker is inhibited by signals it incorrectly interprets as cardiac activity.']),
  'pacer.undersensing': pacerProfile('pacer.undersensing', ['Pacemaker fails to recognize intrinsic complexes and fires inappropriately.']),
  'pacer.pmt': pacerProfile('pacer.pmt', ['Pacemaker-mediated tachycardia: device-tracked loop produces regular paced tachycardia.']),
  'pacer.runaway': pacerProfile('pacer.runaway', ['Very rapid pacer output; intentionally rare but visually distinct and dangerous.']),

  'conduction.rbbb': p({
    id: 'conduction.rbbb',
    sourceUrls: [LITFL.rbbb],
    rhythmClass: 'twelve-lead-pattern',
    qrsMs: { min: 120, max: 180 },
    regularity: 'regular',
    pWave: 'Base rhythm P waves are preserved.',
    qrs: 'Right-precordial terminal R prime with broad/slurred lateral S wave.',
    stT: 'Expected secondary repolarization discordance in right precordial leads.',
    modelNotes: ['12-lead modifier widens QRS and changes V1/V6 morphology.'],
  }),
  'conduction.lbbb': p({
    id: 'conduction.lbbb',
    sourceUrls: [LITFL.lbbb],
    rhythmClass: 'twelve-lead-pattern',
    qrsMs: { min: 120, max: 200 },
    regularity: 'regular',
    pWave: 'Base rhythm P waves are preserved.',
    qrs: 'Broad/notched lateral R waves with deep dominant S in V1.',
    stT: 'Appropriate discordant ST/T shifts expected; Sgarbossa overlays inspect concordance/proportion.',
    modelNotes: ['12-lead modifier provides the substrate for Sgarbossa patterns.'],
  }),
  'conduction.wpw': p({
    id: 'conduction.wpw',
    sourceUrls: [LITFL.wpw],
    rhythmClass: 'twelve-lead-pattern',
    prMs: { min: 80, max: 110 },
    qrsMs: { min: 100, max: 140 },
    regularity: 'regular',
    pWave: 'Sinus P waves are preserved; ventricular activation starts early through the accessory pathway.',
    qrs: 'Delta wave creates a slurred early QRS upstroke and widens the total QRS.',
    stT: 'Secondary ST/T changes may be discordant to the pre-excited QRS.',
    modelNotes: ['12-lead modifier adds a pre-QRS delta slur and tags QRS events as pre-excited.'],
  }),
  'conduction.wpw-type-a': p({
    id: 'conduction.wpw-type-a',
    sourceUrls: [LITFL.wpw],
    rhythmClass: 'twelve-lead-pattern',
    prMs: { min: 80, max: 110 },
    qrsMs: { min: 100, max: 140 },
    regularity: 'regular',
    pWave: 'Sinus P waves are preserved with short PR.',
    qrs: 'Positive/dominant V1 delta pattern, classically associated with a left-sided accessory pathway.',
    stT: 'Secondary discordance follows the pre-excited QRS direction.',
    modelNotes: ['V1 delta polarity is positive so Type A separates visually from Type B.'],
  }),
  'conduction.wpw-type-b': p({
    id: 'conduction.wpw-type-b',
    sourceUrls: [LITFL.wpw],
    rhythmClass: 'twelve-lead-pattern',
    prMs: { min: 80, max: 110 },
    qrsMs: { min: 100, max: 140 },
    regularity: 'regular',
    pWave: 'Sinus P waves are preserved with short PR.',
    qrs: 'Negative/dominant S in V1 delta pattern, classically associated with a right-sided accessory pathway.',
    stT: 'Secondary discordance follows the pre-excited QRS direction.',
    modelNotes: ['V1 delta polarity is negative so Type B separates visually from Type A.'],
  }),
  'conduction.brugada-pattern': p({
    id: 'conduction.brugada-pattern',
    sourceUrls: [LITFL.brugada],
    rhythmClass: 'twelve-lead-pattern',
    qrsMs: { min: 80, max: 120 },
    regularity: 'regular',
    pWave: 'Base rhythm P waves are preserved.',
    qrs: 'May resemble incomplete RBBB in right precordial leads.',
    stT: 'Coved right-precordial ST elevation with T inversion is modeled as the umbrella teaching default.',
    modelNotes: ['12-lead modifier changes V1-V3; specific Type 1 and Type 2 profiles are separate renderable patterns.'],
  }),
  'special.brugada-type-1': p({
    id: 'special.brugada-type-1',
    sourceUrls: [LITFL.brugada],
    rhythmClass: 'twelve-lead-pattern',
    qrsMs: { min: 80, max: 120 },
    regularity: 'regular',
    pWave: 'Base rhythm P waves are preserved.',
    qrs: 'Right-precordial QRS may have incomplete RBBB-like terminal forces.',
    stT: 'Coved ST elevation in V1-V2 followed by inverted T wave.',
    modelNotes: ['Diagnostic Brugada morphology; generated with coved ST descent and negative T in V1-V3.'],
  }),
  'special.brugada-type-2': p({
    id: 'special.brugada-type-2',
    sourceUrls: [LITFL.brugada],
    rhythmClass: 'twelve-lead-pattern',
    qrsMs: { min: 80, max: 120 },
    regularity: 'regular',
    pWave: 'Base rhythm P waves are preserved.',
    qrs: 'Right-precordial QRS may have incomplete RBBB-like terminal forces.',
    stT: 'Saddleback ST elevation in V1-V2 with positive or biphasic T wave.',
    modelNotes: ['Suggestive Brugada morphology; generated with high takeoff, saddle dip, and upright terminal repolarization.'],
  }),
  'special.hypothermia': p({
    id: 'special.hypothermia',
    sourceUrls: [LITFL.hypothermia],
    rhythmClass: 'twelve-lead-pattern',
    rateBpm: { min: 20, max: 70 },
    prMs: { min: 160, max: 300 },
    qrsMs: { min: 80, max: 140 },
    regularity: 'regularly-irregular',
    pWave: 'Sinus P waves may persist in mild cases; atrial fibrillation can occur with deeper hypothermia.',
    qrs: 'QRS may widen with temperature drop; Osborn wave appears at the J point.',
    stT: 'J-point Osborn wave, QT prolongation, and tremor artifact are the modeled teaching features.',
    modelNotes: ['12-lead modifier adds lateral/inferior J waves plus deterministic tremor artifact.'],
  }),
  'ischemia.st-depression': p({
    id: 'ischemia.st-depression',
    sourceUrls: [LITFL.stemi],
    rhythmClass: 'twelve-lead-pattern',
    regularity: 'regular',
    pWave: 'Base rhythm P waves are preserved.',
    qrs: 'Base rhythm QRS is preserved.',
    stT: 'Horizontal or downsloping ST depression in affected territories.',
    modelNotes: ['Used for ischemia/subendocardial strain teaching without territory-specific STE.'],
  }),
  'ischemia.inferior-stemi': stemiProfile('ischemia.inferior-stemi', [LITFL.inferior, LITFL.stemi], 'II, III, aVF', 'I, aVL'),
  'ischemia.anterior-stemi': stemiProfile('ischemia.anterior-stemi', [LITFL.anterior, LITFL.stemi], 'V1-V4', 'inferior leads when present'),
  'ischemia.lateral-stemi': stemiProfile('ischemia.lateral-stemi', [LITFL.lateral, LITFL.stemi], 'I, aVL, V5, V6', 'III, aVF when present'),
  'ischemia.anterolateral-stemi': stemiProfile('ischemia.anterolateral-stemi', [LITFL.anterior, LITFL.lateral, LITFL.stemi], 'V2-V6 plus I/aVL', 'inferior leads when present'),
  'ischemia.septal-stemi': stemiProfile('ischemia.septal-stemi', [LITFL.anterior, LITFL.stemi], 'V1, V2', ''),
  'ischemia.posterior-stemi': p({
    id: 'ischemia.posterior-stemi',
    sourceUrls: [LITFL.posterior, LITFL.stemi],
    rhythmClass: 'twelve-lead-pattern',
    regularity: 'regular',
    pWave: 'Base rhythm P waves are preserved.',
    qrs: 'Tall R waves may appear in V1-V3 as reciprocal posterior Q waves.',
    stT: 'Horizontal ST depression and upright T waves in V1-V3; posterior leads would show STE.',
    modelNotes: ['Use reciprocal anterior depression rather than fake visible posterior leads.'],
  }),
  'ischemia.sgarbossa': p({
    id: 'ischemia.sgarbossa',
    sourceUrls: [LITFL.sgarbossa, LITFL.lbbb],
    rhythmClass: 'twelve-lead-pattern',
    qrsMs: { min: 120, max: 200 },
    regularity: 'regular',
    pWave: 'Base rhythm P waves are preserved.',
    qrs: 'Requires LBBB substrate.',
    stT: 'Concordant STE/STD or excessive discordance overlays ischemia onto LBBB.',
    modelNotes: ['Must be chained after LBBB; registry enforces requires: conduction.lbbb.'],
  }),
  'ischemia.modified-sgarbossa': p({
    id: 'ischemia.modified-sgarbossa',
    sourceUrls: [LITFL.sgarbossa, LITFL.lbbb],
    rhythmClass: 'twelve-lead-pattern',
    qrsMs: { min: 120, max: 200 },
    regularity: 'regular',
    pWave: 'Base rhythm P waves are preserved.',
    qrs: 'Requires LBBB substrate.',
    stT: 'Uses proportional discordance concept in addition to concordant changes.',
    modelNotes: ['Must be chained after LBBB; pattern should visibly use ST/S-wave proportionality.'],
  }),

  'electrolyte.hyperk-peaked-t': p({
    id: 'electrolyte.hyperk-peaked-t',
    sourceUrls: [LITFL.hyperk],
    rhythmClass: 'single-lead',
    qrsMs: narrowQrs,
    regularity: 'regular',
    pWave: 'P waves still visible early.',
    qrs: 'QRS remains narrow early.',
    stT: 'Tall narrow tented T waves dominate.',
    modelNotes: ['Earliest classic model: exaggerated narrow T amplitude with preserved QRS.'],
  }),
  'electrolyte.hyperk-progression': p({
    id: 'electrolyte.hyperk-progression',
    sourceUrls: [LITFL.hyperk],
    rhythmClass: 'single-lead',
    prMs: { min: 200, max: 320 },
    qrsMs: { min: 110, max: 180 },
    regularity: 'regular',
    pWave: 'P waves flatten or disappear as potassium rises.',
    qrs: 'QRS widens progressively.',
    stT: 'Peaked T persists while QRS begins to merge toward it.',
    modelNotes: ['Middle-stage hyperkalemia should show PR prolongation/P loss plus QRS widening.'],
  }),
  'electrolyte.hyperk-sine-wave': p({
    id: 'electrolyte.hyperk-sine-wave',
    sourceUrls: [LITFL.hyperk],
    rhythmClass: 'single-lead',
    qrsMs: { min: 180, max: 320 },
    regularity: 'regular',
    pWave: 'P waves absent.',
    qrs: 'Very wide QRS merges with T wave into sine-wave morphology.',
    stT: 'QRS and T are no longer separable.',
    modelNotes: ['Peri-arrest pattern; model as broad undulating sine morphology rather than discrete PQRST.'],
  }),
} satisfies Partial<Record<RhythmId, LitflMorphologyProfile>>;

export function getMorphologyProfile(id: RhythmId): LitflMorphologyProfile | undefined {
  return (LITFL_MORPHOLOGY_PROFILES as Partial<Record<RhythmId, LitflMorphologyProfile>>)[id];
}

export function requireMorphologyProfile(id: RhythmId): LitflMorphologyProfile {
  const profile = getMorphologyProfile(id);
  if (!profile) throw new Error(`No LITFL morphology profile registered for ${id}`);
  return profile;
}
