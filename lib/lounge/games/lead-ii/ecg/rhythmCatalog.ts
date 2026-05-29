/**
 * Single source of truth for every rhythm and pattern the app knows about.
 *
 * Coverage target: the full taxonomy of the LITFL ECG Library
 * (basic rhythms, atrial, junctional, ventricular, AV blocks, bundle/fascicular
 * blocks, pre-excitation, ischemia/STEMI, electrolyte/tox, channelopathies,
 * pacemaker, and miscellaneous patterns).
 *
 * Hard contracts:
 *  - `id` is immutable. Never rename a shipped ID.
 *  - `implemented: false` is the default. Flip to `true` only when a real
 *    waveform generator AND a passing test exist. The catalog test enforces
 *    that every implemented rhythm is registered in `WAVEFORM_GENERATORS`.
 *  - All `confusableWith` entries must resolve to other IDs in this file. The
 *    catalog test enforces this.
 *  - Descriptions and learning notes are original / paraphrased. No source
 *    text is copied from any external library.
 *  - `sourceReferenceLabel` is a category pointer ONLY — it does not imply we
 *    have permission to reproduce that source's content.
 */

import type { RhythmDefinition, RhythmId } from './types';

const r = (def: RhythmDefinition): RhythmDefinition => def;

export const RHYTHM_CATALOG: readonly RhythmDefinition[] = [
  // ═══════════════════════════════════════════════════════════════════
  //  SINUS RHYTHMS
  // ═══════════════════════════════════════════════════════════════════
  r({
    id: 'sinus.normal',
    displayName: 'Normal Sinus Rhythm',
    family: 'sinus',
    difficulty: 'beginner',
    aliases: ['NSR', 'Sinus rhythm'],
    implemented: true,
    confusableWith: ['sinus.bradycardia', 'sinus.tachycardia', 'sinus.arrhythmia'],
    tags: ['baseline', 'regular'],
    description:
      'Regular rhythm originating from the SA node with an upright P wave preceding every QRS at a rate of 60–100 bpm.',
    learningNotes:
      'Anchor rhythm. Confirm upright P in lead II preceding each narrow QRS at a regular rate. Everything else is measured against this.',
    sourceReferenceLabel: 'ACLS rhythm recognition standards',
  }),
  r({
    id: 'sinus.bradycardia',
    displayName: 'Sinus Bradycardia',
    family: 'sinus',
    difficulty: 'beginner',
    aliases: ['Brady', 'Sinus brady'],
    implemented: true,
    confusableWith: ['sinus.normal', 'junctional.rhythm', 'av-block.first-degree', 'sinus.sa-exit-block'],
    tags: ['slow', 'regular'],
    description: 'Sinus rhythm at a rate below 60 bpm with otherwise normal morphology.',
    learningNotes:
      'Same morphology as NSR, just slower. Treat the patient, not the number — only intervene for symptomatic bradycardia.',
    sourceReferenceLabel: 'ACLS rhythm recognition standards',
  }),
  r({
    id: 'sinus.tachycardia',
    displayName: 'Sinus Tachycardia',
    family: 'sinus',
    difficulty: 'beginner',
    aliases: ['Sinus tach', 'STach'],
    implemented: true,
    confusableWith: ['atrial.svt', 'atrial.avnrt', 'atrial.flutter', 'atrial.fib-rvr', 'atrial.focal-atrial-tach'],
    tags: ['fast', 'regular'],
    description: 'Sinus rhythm at a rate above 100 bpm.',
    learningNotes:
      'Treat the underlying cause (pain, fever, hypovolemia, hypoxia, anxiety). Gradual onset and visible upright P waves separate it from SVT.',
    sourceReferenceLabel: 'ACLS rhythm recognition standards',
  }),
  r({
    id: 'sinus.arrhythmia',
    displayName: 'Sinus Arrhythmia',
    family: 'sinus',
    difficulty: 'intermediate',
    aliases: ['Respiratory sinus arrhythmia'],
    implemented: true,
    confusableWith: ['sinus.normal', 'atrial.wandering-pacemaker', 'sinus.arrest'],
    tags: ['irregular', 'pediatric-common', 'benign'],
    description:
      'Sinus rhythm with cyclic R–R variation, classically tied to respiration. Common and benign in young patients.',
    learningNotes:
      'P morphology stays consistent (separates from WAP). Rate quickens on inspiration, slows on expiration.',
    sourceReferenceLabel: 'EMS/nursing rhythm interpretation education',
  }),
  r({
    id: 'sinus.arrest',
    displayName: 'Sinus Arrest / Pause',
    family: 'sinus',
    difficulty: 'beginner',
    aliases: ['Sinus pause'],
    implemented: true,
    confusableWith: ['sinus.arrhythmia', 'sinus.sa-exit-block', 'av-block.second-mobitz-ii', 'av-block.high-grade'],
    tags: ['pause', 'irregular'],
    description: 'Failure of SA node to fire, producing a dropped P-QRS-T cycle.',
    learningNotes:
      'Pause length is NOT an integer multiple of the underlying P–P (separates from SA exit block). Watch for symptomatic syncope.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'sinus.sa-exit-block',
    displayName: 'Sinoatrial Exit Block',
    family: 'sinus',
    difficulty: 'expert',
    aliases: ['SA block', 'SA exit block'],
    implemented: false,
    confusableWith: ['sinus.arrest', 'sinus.arrhythmia', 'av-block.second-mobitz-i'],
    tags: ['pause', 'block'],
    description:
      'SA impulse fires but fails to depolarize the atrium. The pause is a multiple of the underlying P–P interval.',
    learningNotes:
      'Pause = integer multiple of P–P (this is the discriminator from sinus arrest). Often nodal-blocker or vagal-tone related.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'sinus.sick-sinus-syndrome',
    displayName: 'Sick Sinus Syndrome',
    family: 'sinus',
    difficulty: 'expert',
    aliases: ['SSS', 'Tachy-brady syndrome'],
    implemented: false,
    confusableWith: ['sinus.bradycardia', 'sinus.arrest', 'atrial.fib'],
    tags: ['intermittent', 'pacing-likely'],
    description:
      'Spectrum of SA node dysfunction: alternating bradyarrhythmias and tachyarrhythmias, often AFib alternating with sinus pauses.',
    learningNotes:
      'Tachy-brady alternation is the classic clue. Pacing usually indicated; rate-control of the tachy component without worsening the brady requires care.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),

  // ═══════════════════════════════════════════════════════════════════
  //  ATRIAL RHYTHMS
  // ═══════════════════════════════════════════════════════════════════
  r({
    id: 'atrial.fib',
    displayName: 'Atrial Fibrillation',
    family: 'atrial',
    difficulty: 'beginner',
    aliases: ['AFib', 'A-fib', 'AF'],
    implemented: true,
    confusableWith: ['atrial.flutter', 'atrial.mat', 'atrial.fib-rvr', 'atrial.wandering-pacemaker'],
    tags: ['irregular', 'no-p-waves'],
    description:
      'Irregularly irregular rhythm with no discrete P waves and a chaotic, fibrillatory atrial baseline.',
    learningNotes:
      '"Irregularly irregular" with no organized P waves. Stratify stroke risk (CHA2DS2-VASc) and decide between rate vs rhythm control.',
    sourceReferenceLabel: 'ACLS rhythm recognition standards',
  }),
  r({
    id: 'atrial.fib-rvr',
    displayName: 'Atrial Fibrillation with RVR',
    family: 'atrial',
    difficulty: 'intermediate',
    aliases: ['AFib RVR', 'Rapid AFib'],
    implemented: true,
    confusableWith: ['atrial.fib', 'atrial.svt', 'atrial.avnrt', 'sinus.tachycardia', 'conduction.irregular-wct'],
    tags: ['fast', 'irregular'],
    description: 'Atrial fibrillation with ventricular response above ~110 bpm.',
    learningNotes:
      'Still irregularly irregular — most fast SVTs are regular. Cardiovert if hemodynamically unstable.',
    sourceReferenceLabel: 'ACLS rhythm recognition standards',
  }),
  r({
    id: 'atrial.flutter',
    displayName: 'Atrial Flutter (Typical)',
    family: 'atrial',
    difficulty: 'intermediate',
    aliases: ['AFlutter', 'A-flutter', 'Type I flutter'],
    implemented: true,
    confusableWith: ['atrial.fib', 'atrial.svt', 'sinus.tachycardia', 'atrial.flutter-atypical'],
    tags: ['sawtooth', 'macroreentrant'],
    description:
      'Macro-reentrant atrial circuit producing sawtooth flutter waves at ~300 bpm with fixed or variable AV conduction.',
    learningNotes:
      'Sawtooth pattern best seen in II/III/aVF. 2:1 conduction → 150 bpm is the classic mimic of sinus tach.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'atrial.flutter-atypical',
    displayName: 'Atrial Flutter (Variable Conduction)',
    family: 'atrial',
    difficulty: 'intermediate',
    aliases: ['Variable flutter', 'Flutter with variable conduction', 'Type II flutter'],
    implemented: true,
    confusableWith: ['atrial.flutter', 'atrial.focal-atrial-tach'],
    tags: ['macroreentrant'],
    description:
      'Atrial flutter with a non-cavotricuspid-isthmus circuit; flutter waves do not match the classic inferior sawtooth.',
    learningNotes:
      'Often post-ablation or post-cardiac surgery. Less responsive to typical flutter ablation; mapping required.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'atrial.svt',
    // Display name is AVNRT — what bedside teaching calls "SVT" is, in
    // the vast majority of cases, AV-nodal reentrant tachycardia. Per
    // user directive (2026-05-11): a regular narrow-complex tachycardia
    // that breaks with adenosine is AVNRT. The legacy id is kept for
    // backward-compat and is aliased to atrial.avnrt in rhythmAliases.
    displayName: 'AVNRT',
    family: 'atrial',
    difficulty: 'beginner',
    aliases: ['AVNRT', 'SVT', 'PSVT'],
    implemented: true,
    confusableWith: ['sinus.tachycardia', 'atrial.flutter', 'atrial.avrt', 'atrial.focal-atrial-tach', 'vent.vtach-stable'],
    tags: ['fast', 'narrow-complex', 'regular', 'reentrant'],
    description:
      'AV-nodal reentrant tachycardia (AVNRT) — the most common form of supraventricular tachycardia. Regular narrow QRS at 150–220 bpm with P waves often buried in the QRS or appearing as a pseudo-R\' in V1.',
    learningNotes:
      'Sudden onset and offset. Vagal maneuvers first, then adenosine — both diagnostic and therapeutic. Synchronized cardioversion if unstable.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'atrial.avnrt',
    displayName: 'AV Nodal Reentrant Tachycardia',
    family: 'atrial',
    difficulty: 'expert',
    aliases: ['AVNRT'],
    implemented: true,
    confusableWith: ['atrial.svt', 'atrial.avrt', 'atrial.focal-atrial-tach', 'sinus.tachycardia'],
    tags: ['fast', 'narrow-complex', 'reentrant'],
    description:
      'Most common SVT mechanism — re-entry within the AV node using slow and fast pathways. P waves often buried in the QRS or appear as a pseudo-R\' in V1.',
    learningNotes:
      'Adenosine is both diagnostic and therapeutic. Look for the pseudo-R\' in V1 disappearing with conversion.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'atrial.avrt',
    displayName: 'AV Reentrant Tachycardia',
    family: 'atrial',
    difficulty: 'expert',
    aliases: ['AVRT', 'Orthodromic AVRT'],
    implemented: true,
    confusableWith: ['atrial.avnrt', 'atrial.svt', 'conduction.wpw', 'conduction.irregular-wct'],
    tags: ['fast', 'narrow-complex', 'pre-excitation'],
    description:
      'Re-entry circuit using both the AV node and an accessory pathway. Orthodromic = narrow QRS; antidromic = wide QRS.',
    learningNotes:
      'Antidromic AVRT is a wide-complex SVT mimicking VT. Suspect in WPW patients with tachycardia.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'atrial.focal-atrial-tach',
    displayName: 'Atrial Tachycardia',
    family: 'atrial',
    difficulty: 'beginner',
    aliases: ['Focal AT', 'Ectopic atrial tachycardia', 'AT'],
    implemented: true,
    confusableWith: ['atrial.svt', 'atrial.avnrt', 'sinus.tachycardia', 'atrial.flutter'],
    tags: ['fast', 'narrow-complex', 'automatic'],
    description:
      'Tachycardia from a single ectopic atrial focus. P waves are abnormal in morphology but consistent beat-to-beat.',
    learningNotes:
      'Warm-up / cool-down rate (vs sudden SVT). Adenosine may transiently slow but typically does not terminate.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'atrial.ectopic-atrial-rhythm',
    displayName: 'Ectopic Atrial Rhythm',
    family: 'atrial',
    difficulty: 'intermediate',
    aliases: ['EAR'],
    implemented: false,
    confusableWith: ['sinus.normal', 'atrial.focal-atrial-tach', 'junctional.rhythm'],
    tags: ['ectopic', 'narrow-complex'],
    description:
      'Sustained rhythm from a single non-sinus atrial focus at a rate < 100 bpm. P waves are abnormal but uniform.',
    learningNotes:
      'Differentiated from sinus by P-wave morphology (e.g., inverted in II if low atrial focus). Rate distinguishes from focal AT.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'atrial.pac',
    displayName: 'Premature Atrial Contractions',
    family: 'atrial',
    difficulty: 'beginner',
    aliases: ['PACs', 'APBs', 'APCs'],
    implemented: true,
    confusableWith: ['vent.pvc', 'junctional.pjc', 'atrial.blocked-pac'],
    tags: ['ectopy', 'narrow-complex'],
    description:
      'Early ectopic atrial beat with abnormal P-wave morphology and a narrow QRS.',
    learningNotes:
      'Differs from a PVC: narrow QRS preceded by an early (often abnormal) P. Usually benign.',
    sourceReferenceLabel: 'EMS/nursing rhythm interpretation education',
  }),
  r({
    id: 'atrial.blocked-pac',
    displayName: 'Blocked (Non-Conducted) PAC',
    family: 'atrial',
    difficulty: 'expert',
    aliases: ['Non-conducted PAC', 'Blocked APB'],
    implemented: false,
    confusableWith: ['atrial.pac', 'av-block.second-mobitz-ii', 'sinus.arrest'],
    tags: ['ectopy', 'pause'],
    description:
      'Premature atrial contraction that arrives during AV-node refractoriness and is not conducted, producing an apparent pause.',
    learningNotes:
      'Most common cause of an "unexplained" pause. Hunt for a hidden P wave in the preceding T wave.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'atrial.wandering-pacemaker',
    displayName: 'Wandering Atrial Pacemaker',
    family: 'atrial',
    difficulty: 'beginner',
    aliases: ['WAP'],
    implemented: true,
    confusableWith: ['atrial.mat', 'sinus.arrhythmia', 'atrial.fib'],
    tags: ['multifocal', 'irregular'],
    description:
      'At least three different P-wave morphologies at a rate < 100 bpm as the pacemaker shifts among atrial foci.',
    learningNotes:
      'WAP < 100 bpm. Same picture at > 100 bpm is MAT. Often benign in elderly or COPD patients.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'atrial.mat',
    displayName: 'Multifocal Atrial Tachycardia',
    family: 'atrial',
    difficulty: 'intermediate',
    aliases: ['MAT'],
    implemented: true,
    confusableWith: ['atrial.fib', 'atrial.wandering-pacemaker', 'atrial.flutter'],
    tags: ['multifocal', 'fast', 'irregular'],
    description:
      'Three or more distinct P-wave morphologies at a rate > 100 bpm. Strongly associated with COPD/hypoxia.',
    learningNotes:
      'Treat the underlying lung disease/hypoxia. Cardioversion does not work — multiple foci.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),

  // ═══════════════════════════════════════════════════════════════════
  //  JUNCTIONAL RHYTHMS
  // ═══════════════════════════════════════════════════════════════════
  r({
    id: 'junctional.rhythm',
    displayName: 'Junctional Rhythm',
    family: 'junctional',
    difficulty: 'intermediate',
    aliases: ['Junctional escape', 'Junctional escape rhythm'],
    implemented: true,
    confusableWith: ['sinus.bradycardia', 'junctional.accelerated', 'vent.idioventricular'],
    tags: ['narrow-complex', 'escape'],
    description:
      'Escape rhythm from the AV junction at 40–60 bpm with absent, inverted, or retrograde P waves.',
    learningNotes:
      'Look for absent P, inverted P in II/III/aVF, or retrograde P after QRS. Narrow QRS distinguishes from idioventricular.',
    sourceReferenceLabel: 'EMS/nursing rhythm interpretation education',
  }),
  r({
    id: 'junctional.accelerated',
    displayName: 'Accelerated Junctional Rhythm',
    family: 'junctional',
    difficulty: 'intermediate',
    aliases: ['AJR'],
    implemented: true,
    confusableWith: ['junctional.rhythm', 'junctional.tachycardia', 'sinus.normal'],
    tags: ['narrow-complex'],
    description: 'Junctional rhythm at 60–100 bpm.',
    learningNotes:
      'Same P-wave clues as junctional escape, just faster. Common in dig toxicity and post-MI.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'junctional.tachycardia',
    displayName: 'Junctional Tachycardia',
    family: 'junctional',
    difficulty: 'intermediate',
    aliases: ['JT'],
    implemented: true,
    confusableWith: ['atrial.svt', 'atrial.avnrt', 'junctional.accelerated', 'sinus.tachycardia'],
    tags: ['fast', 'narrow-complex'],
    description: 'Junctional rhythm at > 100 bpm.',
    learningNotes:
      'Mimics SVT. Suspect with dig toxicity, post–cardiac surgery, or myocarditis.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'junctional.pjc',
    displayName: 'Premature Junctional Contractions',
    family: 'junctional',
    difficulty: 'intermediate',
    aliases: ['PJCs', 'PJC'],
    implemented: true,
    confusableWith: ['atrial.pac', 'vent.pvc'],
    tags: ['ectopy', 'narrow-complex'],
    description:
      'Early narrow-complex beats originating in the AV junction with absent or inverted P waves.',
    learningNotes:
      'Distinguish from PACs by P-wave morphology (inverted/absent) and from PVCs by narrow QRS.',
    sourceReferenceLabel: 'EMS/nursing rhythm interpretation education',
  }),

  // ═══════════════════════════════════════════════════════════════════
  //  VENTRICULAR RHYTHMS
  // ═══════════════════════════════════════════════════════════════════
  r({
    id: 'vent.pvc',
    displayName: 'Premature Ventricular Contractions',
    family: 'ventricular',
    difficulty: 'beginner',
    aliases: ['PVCs', 'VPBs', 'VPCs'],
    implemented: true,
    confusableWith: ['atrial.pac', 'junctional.pjc', 'vent.bigeminy', 'vent.pvc-multifocal'],
    tags: ['ectopy', 'wide-complex'],
    description:
      'Early, wide (≥ 0.12 s) QRS complex of ventricular origin with no preceding P wave and an opposite-direction T wave.',
    learningNotes:
      'Wide and bizarre, T wave opposite to QRS, full compensatory pause. Significance depends on context.',
    sourceReferenceLabel: 'ACLS rhythm recognition standards',
  }),
  r({
    id: 'vent.pvc-multifocal',
    displayName: 'Multifocal PVCs',
    family: 'ventricular',
    difficulty: 'beginner',
    aliases: ['Multiform PVCs', 'Polymorphic PVCs'],
    implemented: true,
    confusableWith: ['vent.pvc', 'vent.pvc-couplet', 'vent.bigeminy'],
    tags: ['ectopy', 'wide-complex'],
    description:
      'PVCs with two or more distinct morphologies, suggesting multiple ventricular foci or a single focus with variable conduction.',
    learningNotes:
      'More concerning than uniform PVCs. Look for ischemia, electrolyte derangement, or QT prolongation.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'vent.pvc-couplet',
    displayName: 'PVC Couplets',
    family: 'ventricular',
    difficulty: 'intermediate',
    aliases: ['Couplets', 'Paired PVCs'],
    implemented: true,
    confusableWith: ['vent.pvc', 'vent.pvc-triplet', 'vent.vtach-stable'],
    tags: ['ectopy', 'wide-complex'],
    description: 'Two consecutive PVCs.',
    learningNotes:
      'Bridge between isolated PVCs and runs of VT. Frequent couplets warrant attention.',
    sourceReferenceLabel: 'EMS/nursing rhythm interpretation education',
  }),
  r({
    id: 'vent.pvc-triplet',
    displayName: 'PVC Triplets',
    family: 'ventricular',
    difficulty: 'intermediate',
    aliases: ['Triplets', 'Salvo'],
    implemented: true,
    confusableWith: ['vent.pvc-couplet', 'vent.vtach-stable', 'vent.nsvt'],
    tags: ['ectopy', 'wide-complex'],
    description:
      'Three consecutive PVCs. By definition, ≥ 3 in a row at > 100 bpm meets criteria for non-sustained VT.',
    learningNotes:
      'Triplet = the threshold where ectopy crosses into non-sustained VT.',
    sourceReferenceLabel: 'EMS/nursing rhythm interpretation education',
  }),
  r({
    id: 'vent.bigeminy',
    displayName: 'Ventricular Bigeminy',
    family: 'ventricular',
    difficulty: 'beginner',
    aliases: ['Bigeminy'],
    implemented: true,
    confusableWith: ['vent.trigeminy', 'vent.quadrigeminy', 'vent.pvc', 'atrial.fib'],
    tags: ['ectopy', 'pattern'],
    description: 'Every other beat is a PVC.',
    learningNotes: 'Sinus → PVC → sinus → PVC pattern. Often regularly irregular.',
    sourceReferenceLabel: 'EMS/nursing rhythm interpretation education',
  }),
  r({
    id: 'vent.trigeminy',
    displayName: 'Ventricular Trigeminy',
    family: 'ventricular',
    difficulty: 'beginner',
    aliases: ['Trigeminy'],
    implemented: true,
    confusableWith: ['vent.bigeminy', 'vent.quadrigeminy', 'vent.pvc'],
    tags: ['ectopy', 'pattern'],
    description: 'Every third beat is a PVC.',
    learningNotes: 'Two normal beats then a PVC, repeating.',
    sourceReferenceLabel: 'EMS/nursing rhythm interpretation education',
  }),
  r({
    id: 'vent.quadrigeminy',
    displayName: 'Ventricular Quadrigeminy',
    family: 'ventricular',
    difficulty: 'beginner',
    aliases: ['Quadrigeminy'],
    implemented: true,
    confusableWith: ['vent.trigeminy', 'vent.bigeminy', 'vent.pvc'],
    tags: ['ectopy', 'pattern'],
    description: 'Every fourth beat is a PVC.',
    learningNotes: 'Three normal beats then a PVC, repeating.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'vent.r-on-t',
    displayName: 'R-on-T PVC',
    family: 'ventricular',
    difficulty: 'beginner',
    aliases: ['R on T phenomenon'],
    implemented: true,
    confusableWith: ['vent.pvc', 'vent.torsades', 'vent.vtach-unstable'],
    tags: ['lethal-precursor', 'wide-complex'],
    description: 'PVC falling on the T wave of the preceding beat — vulnerable repolarization period.',
    learningNotes:
      'High risk of triggering polymorphic VT/VF. Especially dangerous in long QT.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'vent.idioventricular',
    displayName: 'Idioventricular Rhythm',
    family: 'ventricular',
    difficulty: 'intermediate',
    aliases: ['IVR', 'Ventricular escape rhythm'],
    implemented: true,
    confusableWith: ['junctional.rhythm', 'vent.aivr', 'vent.vtach-stable', 'vent.ventricular-escape'],
    tags: ['wide-complex', 'slow', 'escape'],
    description: 'Ventricular escape at 20–40 bpm with wide QRS and no P waves.',
    learningNotes:
      'Last-resort pacemaker. Often agonal. Atropine ineffective; consider pacing.',
    sourceReferenceLabel: 'ACLS rhythm recognition standards',
  }),
  r({
    id: 'vent.aivr',
    displayName: 'Accelerated Idioventricular Rhythm',
    family: 'ventricular',
    difficulty: 'expert',
    aliases: ['AIVR'],
    implemented: true,
    confusableWith: ['vent.idioventricular', 'vent.vtach-stable'],
    tags: ['wide-complex', 'reperfusion'],
    description:
      'Ventricular rhythm at 40–100 bpm — classically a reperfusion sign post-thrombolysis or post-PCI.',
    learningNotes:
      'Usually self-limited. Do NOT suppress with antiarrhythmics — it is the perfusing rhythm.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'vent.ventricular-escape',
    displayName: 'Ventricular Escape Rhythm',
    family: 'ventricular',
    difficulty: 'beginner',
    aliases: ['Ventricular escape', 'Idioventricular Rhythm (slow)', 'AKA IVR'],
    implemented: true,
    confusableWith: ['vent.pvc', 'vent.idioventricular'],
    tags: ['escape', 'wide-complex'],
    description:
      'A single late wide-complex beat that emerges when a higher pacemaker fails to fire on time.',
    learningNotes:
      'LATE (vs PVC = early). Same morphology as a PVC but timing is escape, not premature.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'vent.nsvt',
    displayName: 'Non-Sustained Ventricular Tachycardia',
    family: 'ventricular',
    difficulty: 'intermediate',
    aliases: ['NSVT'],
    implemented: true,
    confusableWith: ['vent.pvc-triplet', 'vent.vtach-stable', 'vent.aivr'],
    tags: ['wide-complex', 'fast'],
    description:
      'Three or more consecutive ventricular beats at > 100 bpm lasting < 30 seconds and self-terminating.',
    learningNotes:
      'Risk-stratify based on structural heart disease and symptoms. Often benign in structurally normal hearts.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'vent.vtach-stable',
    displayName: 'Stable Monomorphic VT',
    family: 'ventricular',
    difficulty: 'intermediate',
    aliases: ['Monomorphic VT (stable)', 'VT with a pulse'],
    implemented: true,
    confusableWith: ['vent.vtach-unstable', 'atrial.svt', 'conduction.wide-complex-tach', 'vent.aivr', 'atrial.avrt'],
    tags: ['wide-complex', 'fast'],
    description:
      'Monomorphic wide-complex tachycardia > 100 bpm in a hemodynamically stable patient with a pulse.',
    learningNotes:
      'Treat any wide-complex tachycardia as VT until proven otherwise. Antiarrhythmics first if stable.',
    sourceReferenceLabel: 'ACLS rhythm recognition standards',
  }),
  r({
    id: 'vent.vtach-unstable',
    displayName: 'Unstable / Pulseless VT',
    family: 'ventricular',
    difficulty: 'intermediate',
    aliases: ['Unstable VT', 'Pulseless VT'],
    implemented: false,
    confusableWith: ['vent.vtach-stable', 'vent.vfib', 'vent.torsades', 'vent.polymorphic-vt'],
    tags: ['wide-complex', 'fast', 'lethal'],
    description:
      'VT with hemodynamic instability — hypotension, AMS, chest pain, or no pulse.',
    learningNotes:
      'Synchronized cardioversion if pulse present; defibrillate if pulseless. ACLS VT/VF algorithm.',
    sourceReferenceLabel: 'ACLS rhythm recognition standards',
  }),
  r({
    id: 'vent.polymorphic-vt',
    displayName: 'Polymorphic VT',
    family: 'ventricular',
    difficulty: 'expert',
    aliases: ['Polymorphic Ventricular Tachycardia'],
    implemented: true,
    confusableWith: ['vent.torsades', 'vent.vfib', 'vent.vtach-unstable', 'vent.bidirectional-vt'],
    tags: ['polymorphic', 'wide-complex', 'lethal'],
    description:
      'VT with continuously changing QRS morphology, generally NOT associated with QT prolongation.',
    learningNotes:
      'Often ischemic in origin (vs torsades = QT-related). Treat ischemia + defibrillate if pulseless.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'vent.torsades',
    displayName: 'Torsades de Pointes',
    family: 'ventricular',
    difficulty: 'expert',
    aliases: ['Torsades', 'TdP'],
    implemented: true,
    confusableWith: ['vent.polymorphic-vt', 'vent.vfib', 'conduction.long-qt'],
    tags: ['polymorphic', 'shockable', 'lethal'],
    description:
      'Polymorphic VT with QRS complexes that twist around the isoelectric baseline. Associated with prolonged QT.',
    learningNotes:
      'Magnesium sulfate, correct underlying QT prolongation, defibrillate if pulseless. Stop QT-prolonging drugs.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'vent.bidirectional-vt',
    displayName: 'Bidirectional VT',
    family: 'ventricular',
    difficulty: 'expert',
    aliases: ['Bidirectional ventricular tachycardia'],
    implemented: true,
    confusableWith: ['vent.polymorphic-vt', 'vent.torsades', 'vent.vtach-stable'],
    tags: ['wide-complex', 'fast', 'rare'],
    description:
      'VT with beat-to-beat alternation of QRS axis (typically 180° flip).',
    learningNotes:
      'Classic for digoxin toxicity and CPVT. Treat the underlying cause (Digibind, beta-blockers).',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'vent.fascicular-vt',
    displayName: 'Fascicular VT',
    family: 'ventricular',
    difficulty: 'expert',
    aliases: ['Idiopathic LV VT', 'Belhassen VT'],
    implemented: true,
    confusableWith: ['vent.vtach-stable', 'atrial.svt', 'conduction.wide-complex-tach'],
    tags: ['wide-complex', 'idiopathic'],
    description:
      'Idiopathic VT originating from the left posterior fascicle. RBBB morphology with left axis deviation.',
    learningNotes:
      'Verapamil-sensitive. Occurs in structurally normal hearts. Often confused with SVT-with-aberrancy.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'vent.rvot-vt',
    displayName: 'RVOT VT',
    family: 'ventricular',
    difficulty: 'expert',
    aliases: ['RV outflow tract VT', 'Idiopathic RVOT VT'],
    implemented: true,
    confusableWith: ['vent.vtach-stable', 'vent.fascicular-vt'],
    tags: ['wide-complex', 'idiopathic'],
    description:
      'Idiopathic VT from the RV outflow tract. LBBB morphology with inferior axis (tall R in II/III/aVF).',
    learningNotes:
      'Adenosine-sensitive in some cases. Generally benign in structurally normal hearts.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'vent.flutter',
    displayName: 'Ventricular Flutter',
    family: 'ventricular',
    difficulty: 'expert',
    aliases: ['V-Flutter'],
    implemented: true,
    confusableWith: ['vent.vtach-stable', 'vent.polymorphic-vt', 'vent.vfib'],
    tags: ['wide-complex', 'peri-arrest', 'lethal'],
    description:
      'Extremely rapid (~ 250–300 bpm) monomorphic wide-complex tachycardia with a sinusoidal appearance and no discernible discrete QRS/ST/T.',
    learningNotes:
      'Transitional rhythm between VT and VF. Pulseless — treat as shockable. Usually degenerates to VFib within seconds.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'vent.vfib',
    displayName: 'Ventricular Fibrillation (Coarse)',
    family: 'ventricular',
    difficulty: 'beginner',
    aliases: ['VFib', 'V-Fib', 'VF', 'Coarse VF'],
    implemented: true,
    confusableWith: ['vent.vfib-fine', 'vent.torsades', 'vent.polymorphic-vt', 'vent.vtach-unstable'],
    tags: ['lethal', 'shockable', 'chaotic'],
    description:
      'Chaotic, irregular ventricular activity with high amplitude (> 3 mm) and no identifiable QRS — pulseless.',
    learningNotes:
      'Immediate defibrillation + high-quality CPR. Coarse responds better than fine.',
    sourceReferenceLabel: 'ACLS rhythm recognition standards',
  }),
  r({
    id: 'vent.vfib-fine',
    displayName: 'Fine Ventricular Fibrillation',
    family: 'ventricular',
    difficulty: 'intermediate',
    aliases: ['Fine VF', 'Low-amplitude VF'],
    implemented: true,
    confusableWith: ['vent.vfib', 'vent.asystole'],
    tags: ['lethal', 'shockable', 'low-amplitude'],
    description:
      'Low-amplitude (< 3 mm) chaotic ventricular activity. Easily mistaken for asystole.',
    learningNotes:
      'Confirm in two leads, increase gain. Still defibrillate — but outcomes worse than coarse VF. CPR + epi to coarsen if possible.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'vent.asystole',
    displayName: 'Asystole',
    family: 'ventricular',
    difficulty: 'beginner',
    aliases: ['Flatline'],
    implemented: true,
    confusableWith: ['vent.pea', 'vent.vfib-fine'],
    tags: ['lethal', 'non-shockable', 'flatline'],
    description: 'Absence of all electrical activity.',
    learningNotes:
      'Confirm in two leads; rule out lead-off / disconnect / fine VF. CPR + epi; not shockable.',
    sourceReferenceLabel: 'ACLS rhythm recognition standards',
  }),
  r({
    id: 'vent.pea',
    displayName: 'Pulseless Electrical Activity',
    family: 'ventricular',
    difficulty: 'intermediate',
    aliases: ['PEA', 'EMD'],
    implemented: true,
    confusableWith: ['vent.asystole', 'vent.idioventricular'],
    tags: ['lethal', 'non-shockable'],
    description:
      'Organized electrical activity on the monitor with no palpable pulse.',
    learningNotes:
      "Treat reversible causes — H's and T's. Diagnosis is clinical, not on the monitor.",
    sourceReferenceLabel: 'ACLS rhythm recognition standards',
  }),

  // ═══════════════════════════════════════════════════════════════════
  //  AV BLOCKS
  // ═══════════════════════════════════════════════════════════════════
  r({
    id: 'av-block.first-degree',
    displayName: 'First-Degree AV Block',
    family: 'av-block',
    difficulty: 'beginner',
    aliases: ['1° AVB', 'Long PR'],
    implemented: true,
    confusableWith: ['sinus.normal', 'sinus.bradycardia', 'av-block.second-mobitz-i'],
    tags: ['conduction-delay'],
    description: 'PR interval > 0.20 s with every P followed by a QRS.',
    learningNotes:
      'Just slow conduction — no dropped beats. Usually benign in isolation.',
    sourceReferenceLabel: 'ACLS rhythm recognition standards',
  }),
  r({
    id: 'av-block.second-mobitz-i',
    displayName: 'Second-Degree AV Block Type I (Wenckebach)',
    family: 'av-block',
    difficulty: 'intermediate',
    aliases: ['Wenckebach', 'Mobitz I', '2° AVB type I'],
    implemented: true,
    confusableWith: ['av-block.first-degree', 'av-block.second-mobitz-ii', 'sinus.arrhythmia', 'av-block.2-1'],
    tags: ['progressive-pr', 'dropped-beat'],
    description:
      'Progressive PR prolongation until a P wave fails to conduct, then the cycle resets.',
    learningNotes:
      '"Longer, longer, longer, drop." Usually nodal; often does not require pacing.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'av-block.second-mobitz-ii',
    displayName: 'Second-Degree AV Block Type II (Mobitz II)',
    family: 'av-block',
    difficulty: 'intermediate',
    aliases: ['Mobitz II', '2° AVB type II'],
    implemented: true,
    confusableWith: ['av-block.second-mobitz-i', 'av-block.third-degree', 'av-block.high-grade', 'av-block.2-1'],
    tags: ['dropped-beat', 'pacing-likely'],
    description:
      'Constant PR interval with intermittent non-conducted P waves. QRS often wide (infranodal block).',
    learningNotes:
      'Higher risk of progression to complete block. Pacing usually indicated.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'av-block.2-1',
    displayName: '2:1 AV Block',
    family: 'av-block',
    difficulty: 'expert',
    aliases: ['2 to 1 block'],
    implemented: true,
    confusableWith: ['av-block.second-mobitz-i', 'av-block.second-mobitz-ii', 'av-block.high-grade'],
    tags: ['dropped-beat'],
    description:
      'Every other P wave is conducted. Cannot tell Mobitz I vs II from a 2:1 strip alone — look at adjacent intervals or QRS width.',
    learningNotes:
      'Narrow QRS suggests nodal (often Mobitz I-equivalent); wide QRS suggests infranodal (Mobitz II–like). Pacing if symptomatic.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'av-block.high-grade',
    displayName: 'High-Grade AV Block',
    family: 'av-block',
    difficulty: 'expert',
    aliases: ['Advanced AV block'],
    implemented: true,
    confusableWith: ['av-block.second-mobitz-ii', 'av-block.third-degree', 'av-block.2-1'],
    tags: ['dropped-beat'],
    description:
      'Two or more consecutive non-conducted P waves with some still conducting — between Mobitz II and complete block.',
    learningNotes:
      'Treat aggressively; high risk of complete block.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'av-block.third-degree',
    displayName: 'Third-Degree AV Block (Complete Heart Block)',
    family: 'av-block',
    difficulty: 'intermediate',
    aliases: ['CHB', 'Complete heart block', '3° AVB'],
    implemented: true,
    confusableWith: ['av-block.second-mobitz-ii', 'av-block.high-grade', 'vent.idioventricular', 'av-block.dissociation'],
    tags: ['av-dissociation', 'pacing-required'],
    description:
      'No conducted impulses cross the AV node. P waves and QRS complexes march independently.',
    learningNotes:
      'P–P regular, R–R regular, no relationship between them. Escape rhythm sets the rate.',
    sourceReferenceLabel: 'ACLS rhythm recognition standards',
  }),
  r({
    id: 'av-block.dissociation',
    displayName: 'AV Dissociation',
    family: 'av-block',
    difficulty: 'expert',
    aliases: ['Isorhythmic AV dissociation'],
    implemented: true,
    confusableWith: ['av-block.third-degree', 'junctional.accelerated'],
    tags: ['av-dissociation'],
    description:
      'P waves and QRS complexes dissociated, but not necessarily due to complete block — can be from a faster junctional/ventricular focus outpacing the sinus node.',
    learningNotes:
      'Not synonymous with complete heart block. Distinguish by checking whether AV conduction is intact when timing allows.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),

  // ═══════════════════════════════════════════════════════════════════
  //  PACEMAKER RHYTHMS
  // ═══════════════════════════════════════════════════════════════════
  r({
    id: 'pacer.atrial',
    displayName: 'Atrial Paced Rhythm',
    family: 'pacemaker',
    difficulty: 'intermediate',
    aliases: ['AAI paced'],
    implemented: true,
    confusableWith: ['pacer.av', 'sinus.normal'],
    tags: ['pacing', 'spike'],
    description:
      'Pacing spike before each P wave; intrinsic AV conduction produces the QRS.',
    learningNotes:
      'Spike → P → narrow QRS. Used when SA node fails but AV node is intact.',
    sourceReferenceLabel: 'EMS/nursing rhythm interpretation education',
  }),
  r({
    id: 'pacer.ventricular',
    displayName: 'Ventricular Paced Rhythm',
    family: 'pacemaker',
    difficulty: 'intermediate',
    aliases: ['VVI paced', 'V-paced'],
    implemented: true,
    confusableWith: ['pacer.av', 'conduction.lbbb', 'vent.idioventricular'],
    tags: ['pacing', 'spike', 'wide-complex'],
    description:
      'Pacing spike before each wide QRS (LBBB-like morphology). No relationship to intrinsic P waves.',
    learningNotes:
      'Spike → wide QRS. Use modified Sgarbossa to evaluate ischemia in V-paced patients.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'pacer.av',
    displayName: 'AV Paced (Dual Chamber) Rhythm',
    family: 'pacemaker',
    difficulty: 'intermediate',
    aliases: ['DDD paced', 'Dual-chamber paced'],
    implemented: true,
    confusableWith: ['pacer.atrial', 'pacer.ventricular'],
    tags: ['pacing', 'spike'],
    description:
      'Pacing spike before P, another before QRS. Both chambers paced.',
    learningNotes: 'Two spikes per cycle. Confirms dual-chamber device.',
    sourceReferenceLabel: 'EMS/nursing rhythm interpretation education',
  }),
  r({
    id: 'pacer.failure-to-pace',
    displayName: 'Failure to Pace',
    family: 'pacemaker',
    difficulty: 'expert',
    aliases: ['FTP'],
    implemented: true,
    confusableWith: ['pacer.failure-to-capture', 'pacer.oversensing', 'sinus.arrest'],
    tags: ['pacing-malfunction'],
    description: 'Pacemaker fails to deliver an impulse when expected — no spike where one should be.',
    learningNotes:
      'Absent expected spikes. Causes: battery, lead fracture, oversensing.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'pacer.failure-to-capture',
    displayName: 'Failure to Capture',
    family: 'pacemaker',
    difficulty: 'expert',
    aliases: ['FTC', 'Loss of capture'],
    implemented: true,
    confusableWith: ['pacer.failure-to-pace', 'pacer.failure-to-sense'],
    tags: ['pacing-malfunction', 'spike'],
    description: 'Spike present but no resulting depolarization.',
    learningNotes:
      'Spike with no P/QRS following. Causes: lead displacement, threshold rise, MI, electrolytes.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'pacer.failure-to-sense',
    displayName: 'Failure to Sense',
    family: 'pacemaker',
    difficulty: 'expert',
    aliases: ['Sensing malfunction', 'Failure to inhibit'],
    implemented: true,
    confusableWith: ['pacer.oversensing', 'pacer.failure-to-capture', 'pacer.undersensing'],
    tags: ['pacing-malfunction', 'spike'],
    description:
      'Pacemaker does not detect intrinsic cardiac activity and fires inappropriately during the cardiac cycle.',
    learningNotes:
      'Spikes appear in the middle of intrinsic complexes. Risk of R-on-T phenomenon. See also "Undersensing" — many curricula treat the terms as synonyms, others use undersensing for the specific sensing-threshold problem.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'pacer.oversensing',
    displayName: 'Oversensing',
    family: 'pacemaker',
    difficulty: 'expert',
    aliases: [],
    implemented: true,
    confusableWith: ['pacer.failure-to-pace', 'pacer.failure-to-sense', 'pacer.undersensing'],
    tags: ['pacing-malfunction'],
    description:
      'Pacemaker incorrectly senses non-cardiac signal as cardiac activity and inhibits pacing when it should be firing.',
    learningNotes:
      'Looks clinically like failure to pace. Common causes: EMI, T-wave oversensing, myopotentials. Contrast with undersensing (the opposite — failing to detect real intrinsic beats).',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'pacer.undersensing',
    displayName: 'Undersensing',
    family: 'pacemaker',
    difficulty: 'expert',
    aliases: ['Sensing failure', 'Failure to recognize intrinsic activity'],
    implemented: true,
    confusableWith: ['pacer.failure-to-sense', 'pacer.failure-to-capture', 'pacer.oversensing'],
    tags: ['pacing-malfunction', 'spike'],
    description:
      'Pacemaker fails to recognize intrinsic cardiac activity and delivers a stimulus when it should have been inhibited. Spikes appear inappropriately during or after intrinsic complexes.',
    learningNotes:
      'Closely related to "Failure to Sense" — many texts use the terms interchangeably; some draw a distinction (undersensing = sensing-threshold problem, failure to sense = broader category). Both are quizzed and both are listed for clarity. Risk: spike landing on a T wave (R-on-T → polymorphic VT).',
    sourceReferenceLabel: 'EMS/nursing rhythm interpretation education',
  }),
  r({
    id: 'pacer.pmt',
    displayName: 'Pacemaker-Mediated Tachycardia',
    family: 'pacemaker',
    difficulty: 'expert',
    aliases: ['PMT', 'Endless-loop tachycardia'],
    implemented: true,
    confusableWith: ['atrial.svt', 'pacer.ventricular', 'pacer.runaway'],
    tags: ['pacing-malfunction', 'fast'],
    description:
      'Re-entrant tachycardia using a dual-chamber pacemaker as part of the circuit. Retrograde P sensed by atrial channel triggers a paced ventricular beat, repeating.',
    learningNotes:
      'Magnet application terminates by reverting to asynchronous mode. Reprogram PVARP afterward.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'pacer.runaway',
    displayName: 'Runaway Pacemaker',
    family: 'pacemaker',
    difficulty: 'expert',
    aliases: ['Runaway'],
    implemented: true,
    confusableWith: ['pacer.pmt', 'pacer.ventricular'],
    tags: ['pacing-malfunction', 'fast', 'historical'],
    description:
      'Pacemaker fires at extreme rates due to circuit malfunction — historically more common with older devices.',
    learningNotes:
      'Rare with modern devices but classic teaching point. Disable device with magnet, prepare for cardioversion if hemodynamically unstable.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),

  // ═══════════════════════════════════════════════════════════════════
  //  CONDUCTION ABNORMALITIES (bundle, fascicular, pre-excitation, channelopathies, wide-complex)
  // ═══════════════════════════════════════════════════════════════════
  r({
    id: 'conduction.rbbb',
    displayName: 'Right Bundle Branch Block',
    family: 'conduction',
    difficulty: 'intermediate',
    aliases: ['RBBB', 'Complete RBBB'],
    implemented: true,
    confusableWith: ['conduction.lbbb', 'conduction.incomplete-rbbb', 'vent.pvc', 'pacer.ventricular', 'special.brugada-type-1'],
    tags: ['wide-complex', 'bundle-branch'],
    description:
      'QRS ≥ 0.12 s with rSR\' (rabbit-ear) in V1 and a wide slurred S in I and V6.',
    learningNotes:
      '"Right rabbit ears" in V1. Does not obscure ischemia interpretation as much as LBBB.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'conduction.incomplete-rbbb',
    displayName: 'Incomplete Right Bundle Branch Block',
    family: 'conduction',
    difficulty: 'expert',
    aliases: ['iRBBB'],
    implemented: false,
    confusableWith: ['conduction.rbbb', 'special.brugada-type-2'],
    tags: ['bundle-branch'],
    description:
      'rSR\' pattern in V1 with QRS duration 0.10–0.12 s.',
    learningNotes:
      'Common normal variant in young patients. Differentiate from Brugada Type 2 saddleback.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'conduction.lbbb',
    displayName: 'Left Bundle Branch Block',
    family: 'conduction',
    difficulty: 'intermediate',
    aliases: ['LBBB', 'Complete LBBB'],
    implemented: true,
    confusableWith: ['conduction.rbbb', 'conduction.incomplete-lbbb', 'pacer.ventricular', 'vent.vtach-stable'],
    tags: ['wide-complex', 'bundle-branch'],
    description:
      'QRS ≥ 0.12 s with broad monomorphic R in I/V6 and deep S or QS in V1.',
    learningNotes:
      'Obscures standard STEMI criteria. Use Sgarbossa / Modified Sgarbossa for ischemia evaluation.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'conduction.incomplete-lbbb',
    displayName: 'Incomplete Left Bundle Branch Block',
    family: 'conduction',
    difficulty: 'expert',
    aliases: ['iLBBB'],
    implemented: false,
    confusableWith: ['conduction.lbbb', 'conduction.lafb'],
    tags: ['bundle-branch'],
    description:
      'LBBB-like morphology with QRS 0.10–0.12 s.',
    learningNotes:
      'Often progresses to complete LBBB. Same ischemia-detection challenges in the appropriate clinical context.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'conduction.lafb',
    displayName: 'Left Anterior Fascicular Block',
    family: 'conduction',
    difficulty: 'expert',
    aliases: ['LAFB', 'Left anterior hemiblock'],
    implemented: false,
    confusableWith: ['conduction.lpfb', 'conduction.lbbb', 'conduction.incomplete-lbbb'],
    tags: ['fascicular', 'axis'],
    description:
      'Marked left axis deviation (−45° to −90°) with qR in I/aVL, rS in II/III/aVF, and normal QRS duration.',
    learningNotes:
      'Common in conduction-system disease. Normal QRS width unless combined with other blocks.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'conduction.lpfb',
    displayName: 'Left Posterior Fascicular Block',
    family: 'conduction',
    difficulty: 'expert',
    aliases: ['LPFB', 'Left posterior hemiblock'],
    implemented: false,
    confusableWith: ['conduction.lafb', 'conduction.bifascicular'],
    tags: ['fascicular', 'axis'],
    description:
      'Right axis deviation with rS in I/aVL and qR in II/III/aVF; normal QRS duration. Diagnosis of exclusion.',
    learningNotes:
      'Rare alone. Must exclude RVH, lateral MI, and other causes of right-axis deviation first.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'conduction.bifascicular',
    displayName: 'Bifascicular Block',
    family: 'conduction',
    difficulty: 'expert',
    aliases: ['Bifascicular block (RBBB + LAFB or LPFB)'],
    implemented: false,
    confusableWith: ['conduction.rbbb', 'conduction.trifascicular', 'conduction.lafb'],
    tags: ['fascicular', 'wide-complex'],
    description:
      'RBBB combined with either LAFB or LPFB — two of the three infranodal fascicles blocked.',
    learningNotes:
      'Risk of progression to complete block, especially with new symptoms.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'conduction.trifascicular',
    displayName: 'Trifascicular Block',
    family: 'conduction',
    difficulty: 'expert',
    aliases: ['Trifascicular block'],
    implemented: false,
    confusableWith: ['conduction.bifascicular', 'av-block.first-degree', 'av-block.third-degree'],
    tags: ['fascicular', 'wide-complex', 'pacing-likely'],
    description:
      'Bifascicular block plus first-degree AV block (or alternating bundle branch block). Implies disease in all three fascicles.',
    learningNotes:
      'High risk of complete heart block. Often warrants pacing.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'conduction.nicd',
    displayName: 'Non-Specific Intraventricular Conduction Delay',
    family: 'conduction',
    difficulty: 'expert',
    aliases: ['NICD', 'IVCD'],
    implemented: false,
    confusableWith: ['conduction.lbbb', 'conduction.rbbb', 'electrolyte.hyperk-progression'],
    tags: ['wide-complex'],
    description:
      'QRS ≥ 0.11 s that does not meet morphologic criteria for RBBB or LBBB.',
    learningNotes:
      'Common in cardiomyopathy, hyperkalemia, sodium-channel-blocker toxicity. Look for electrolyte/drug causes.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'conduction.wide-complex-tach',
    displayName: 'Wide-Complex Tachycardia',
    family: 'conduction',
    difficulty: 'intermediate',
    aliases: ['WCT'],
    implemented: false,
    confusableWith: ['vent.vtach-stable', 'atrial.svt', 'atrial.avrt', 'conduction.irregular-wct'],
    tags: ['wide-complex', 'fast'],
    description:
      'Tachycardia with QRS ≥ 0.12 s. Differential: VT, SVT with aberrancy, pre-excited tachycardia.',
    learningNotes: 'Treat as VT until proven otherwise.',
    sourceReferenceLabel: 'ACLS rhythm recognition standards',
  }),
  r({
    id: 'conduction.irregular-wct',
    displayName: 'Irregular Wide-Complex Tachycardia',
    family: 'conduction',
    difficulty: 'expert',
    aliases: ['Irregular WCT', 'AFib with WPW'],
    implemented: false,
    confusableWith: ['conduction.wide-complex-tach', 'atrial.fib-rvr', 'vent.polymorphic-vt', 'conduction.wpw'],
    tags: ['wide-complex', 'fast', 'irregular'],
    description:
      'Irregularly irregular wide-complex tachycardia — classically AFib conducting down a WPW accessory pathway.',
    learningNotes:
      'AVOID AV-nodal blockers (adenosine, BB, CCB, dig) — they can accelerate accessory-pathway conduction.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'conduction.wpw',
    displayName: 'WPW / Pre-excitation',
    family: 'conduction',
    difficulty: 'expert',
    aliases: ['Wolff-Parkinson-White', 'Pre-excitation'],
    implemented: true,
    confusableWith: ['conduction.wpw-type-a', 'conduction.wpw-type-b', 'conduction.lgl', 'atrial.avrt', 'conduction.irregular-wct'],
    tags: ['delta-wave', 'short-pr'],
    description:
      'Short PR (< 0.12 s) and a delta wave (slurred QRS upstroke) due to an accessory pathway.',
    learningNotes:
      'Classic triad: short PR, delta wave, wide QRS. Risk of dangerous tachycardias.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'conduction.wpw-type-a',
    displayName: 'WPW Type A (Left-Sided Pathway)',
    family: 'conduction',
    difficulty: 'expert',
    aliases: ['WPW-A'],
    implemented: true,
    confusableWith: ['conduction.wpw', 'conduction.wpw-type-b', 'conduction.rbbb'],
    tags: ['delta-wave', 'pre-excitation'],
    description:
      'Pre-excitation via a left-sided accessory pathway. Positive delta and dominant R in V1 (mimics RBBB or posterior MI).',
    learningNotes:
      'Positive QRS in V1 distinguishes from Type B.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'conduction.wpw-type-b',
    displayName: 'WPW Type B (Right-Sided Pathway)',
    family: 'conduction',
    difficulty: 'expert',
    aliases: ['WPW-B'],
    implemented: true,
    confusableWith: ['conduction.wpw', 'conduction.wpw-type-a', 'conduction.lbbb'],
    tags: ['delta-wave', 'pre-excitation'],
    description:
      'Pre-excitation via a right-sided accessory pathway. Negative delta and dominant S in V1 (mimics LBBB).',
    learningNotes:
      'Negative QRS in V1 distinguishes from Type A.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'conduction.lgl',
    displayName: 'Lown-Ganong-Levine Pattern',
    family: 'conduction',
    difficulty: 'expert',
    aliases: ['LGL'],
    implemented: false,
    confusableWith: ['conduction.wpw'],
    tags: ['short-pr', 'pre-excitation'],
    description:
      'Short PR (< 0.12 s) with normal QRS and no delta wave. Historically attributed to bypass of AV node.',
    learningNotes:
      'Modern teaching considers this an inconsistent entity, but the term still appears on exams.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'conduction.long-qt',
    displayName: 'Long QT',
    family: 'conduction',
    difficulty: 'expert',
    aliases: ['LQTS', 'Prolonged QT'],
    implemented: false,
    confusableWith: ['conduction.short-qt', 'vent.torsades', 'electrolyte.hypoca'],
    tags: ['repolarization'],
    description:
      'QTc > 460 ms (men) / 470 ms (women). Predisposes to torsades.',
    learningNotes:
      'Drug-induced (many antibiotics, antiemetics, psychiatric meds), congenital, hypokalemia, hypomagnesemia, hypocalcemia.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'conduction.short-qt',
    displayName: 'Short QT',
    family: 'conduction',
    difficulty: 'expert',
    aliases: ['SQTS'],
    implemented: false,
    confusableWith: ['conduction.long-qt', 'electrolyte.hyperca', 'electrolyte.hyperk-peaked-t'],
    tags: ['repolarization', 'rare'],
    description:
      'QTc < 330–360 ms. Rare; associated with sudden cardiac death.',
    learningNotes:
      'Hypercalcemia, digoxin, hyperkalemia, congenital channelopathy.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'conduction.brugada-pattern',
    displayName: 'Brugada Pattern',
    family: 'conduction',
    difficulty: 'expert',
    aliases: ['Brugada', 'Brugada syndrome ECG pattern'],
    implemented: true,
    confusableWith: [
      'special.brugada-type-1',
      'special.brugada-type-2',
      'conduction.rbbb',
      'conduction.incomplete-rbbb',
      'ischemia.septal-stemi',
    ],
    tags: ['channelopathy', 'sudden-cardiac-death', 'umbrella'],
    description:
      'Umbrella term for the Brugada ECG morphologies (coved Type 1 and saddleback Type 2) seen in V1–V2 due to inherited dysfunction of cardiac sodium channels.',
    learningNotes:
      'The general teaching topic. Type 1 (coved) is the only diagnostic morphology; Type 2 (saddleback) is suggestive and may convert to Type 1 under sodium-channel-blocker challenge. See `special.brugada-type-1` and `special.brugada-type-2` for specific morphologies.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),

  // ═══════════════════════════════════════════════════════════════════
  //  ISCHEMIA / STEMI / 12-LEAD PATTERNS
  // ═══════════════════════════════════════════════════════════════════
  r({
    id: 'ischemia.st-depression',
    displayName: 'ST Depression / Subendocardial Ischemia',
    family: 'ischemia-stemi',
    difficulty: 'intermediate',
    aliases: ['NSTEMI pattern', 'Subendocardial ischemia'],
    implemented: true,
    confusableWith: ['ischemia.posterior-stemi', 'ischemia.wellens', 'ischemia.lvh-strain'],
    tags: ['12-lead', 'ischemia'],
    description: 'Horizontal or downsloping ST depression ≥ 0.5 mm.',
    learningNotes:
      'Reciprocal change vs primary ischemia — always check the opposite wall.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'ischemia.t-wave-inversion',
    displayName: 'T-Wave Inversion',
    family: 'ischemia-stemi',
    difficulty: 'intermediate',
    aliases: ['TWI', 'Inverted T waves'],
    implemented: false,
    confusableWith: ['ischemia.wellens', 'ischemia.lvh-strain', 'special.cerebral-t-waves'],
    tags: ['12-lead', 'ischemia'],
    description:
      'Symmetric T-wave inversion in contiguous leads, suggesting ischemia or post-ischemic memory.',
    learningNotes:
      'Distribution matters. Watch for Wellens (V2–V3), cerebral T waves (deep, diffuse), and benign juvenile pattern.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'ischemia.hyperacute-t',
    displayName: 'Hyperacute T Waves',
    family: 'ischemia-stemi',
    difficulty: 'intermediate',
    aliases: ['Hyperacute Ts'],
    implemented: false,
    confusableWith: ['electrolyte.hyperk-peaked-t', 'ischemia.de-winter', 'ischemia.anterior-stemi', 'ischemia.early-repolarization'],
    tags: ['12-lead', 'pre-stemi'],
    description:
      'Tall, broad, asymmetric T waves that precede ST elevation in early STEMI.',
    learningNotes:
      'Broader and more asymmetric than hyperK peaked Ts. Often the only finding minutes into an MI.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'ischemia.pathologic-q',
    displayName: 'Pathological Q Waves',
    family: 'ischemia-stemi',
    difficulty: 'intermediate',
    aliases: ['Pathologic Q', 'Q waves of infarction'],
    implemented: false,
    confusableWith: ['ischemia.lv-aneurysm', 'special.lvh', 'ischemia.inferior-stemi'],
    tags: ['12-lead', 'old-mi'],
    description:
      'Q waves > 0.04 s wide or > 25% of the R-wave amplitude in two contiguous leads — evidence of prior transmural infarction.',
    learningNotes:
      'Septal Qs in I/aVL/V5/V6 are normal. Pathologic Qs should match an anatomical territory.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'ischemia.inferior-stemi',
    displayName: 'Inferior STEMI',
    family: 'ischemia-stemi',
    difficulty: 'intermediate',
    aliases: ['Inferior MI'],
    implemented: true,
    confusableWith: ['ischemia.rv-stemi', 'ischemia.posterior-stemi', 'ischemia.inferolateral-stemi'],
    tags: ['12-lead', 'stemi'],
    description: 'STE in II, III, aVF with reciprocal depression in I/aVL.',
    learningNotes:
      'Always get a right-sided ECG to evaluate RV involvement. Avoid nitrates if RV-MI.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'ischemia.anterior-stemi',
    displayName: 'Anterior STEMI',
    family: 'ischemia-stemi',
    difficulty: 'intermediate',
    aliases: ['Anterior MI', 'LAD occlusion'],
    implemented: true,
    confusableWith: ['ischemia.anterolateral-stemi', 'ischemia.septal-stemi', 'ischemia.de-winter', 'ischemia.hyperacute-t'],
    tags: ['12-lead', 'stemi'],
    description: 'STE in V3–V4 ± neighboring precordials.',
    learningNotes:
      'Large LAD territory; high mortality. Watch for cardiogenic shock.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'ischemia.lateral-stemi',
    displayName: 'Lateral STEMI',
    family: 'ischemia-stemi',
    difficulty: 'intermediate',
    aliases: ['Lateral MI'],
    implemented: true,
    confusableWith: ['ischemia.anterolateral-stemi', 'ischemia.high-lateral-stemi', 'ischemia.inferolateral-stemi'],
    tags: ['12-lead', 'stemi'],
    description: 'STE in I, aVL, V5–V6.',
    learningNotes: 'Often circumflex. Reciprocal depression inferiorly.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'ischemia.high-lateral-stemi',
    displayName: 'High Lateral STEMI',
    family: 'ischemia-stemi',
    difficulty: 'expert',
    aliases: ['High lateral MI'],
    implemented: false,
    confusableWith: ['ischemia.lateral-stemi', 'ischemia.anterolateral-stemi'],
    tags: ['12-lead', 'stemi'],
    description: 'Isolated STE in I and aVL with reciprocal depression in II/III/aVF.',
    learningNotes:
      'Often subtle; can be the only territory affected by a first diagonal occlusion.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'ischemia.anterolateral-stemi',
    displayName: 'Anterolateral STEMI',
    family: 'ischemia-stemi',
    difficulty: 'intermediate',
    aliases: ['Anterolateral MI'],
    implemented: true,
    confusableWith: ['ischemia.anterior-stemi', 'ischemia.lateral-stemi', 'ischemia.high-lateral-stemi'],
    tags: ['12-lead', 'stemi'],
    description: 'STE across V3–V6, I, aVL.',
    learningNotes: 'Large LAD territory + lateral wall.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'ischemia.inferolateral-stemi',
    displayName: 'Inferolateral STEMI',
    family: 'ischemia-stemi',
    difficulty: 'expert',
    aliases: ['Inferolateral MI'],
    implemented: false,
    confusableWith: ['ischemia.inferior-stemi', 'ischemia.lateral-stemi', 'ischemia.posterior-stemi'],
    tags: ['12-lead', 'stemi'],
    description:
      'STE in inferior leads (II/III/aVF) plus lateral leads (V5/V6 ± I/aVL).',
    learningNotes:
      'Typical of dominant circumflex or distal RCA occlusion.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'ischemia.septal-stemi',
    displayName: 'Septal STEMI',
    family: 'ischemia-stemi',
    difficulty: 'expert',
    aliases: ['Septal MI'],
    implemented: true,
    confusableWith: ['ischemia.anterior-stemi'],
    tags: ['12-lead', 'stemi'],
    description:
      'STE in V1–V2 reflecting septal-wall infarction, often from proximal LAD or septal perforator occlusion.',
    learningNotes:
      'Proximal LAD or septal perforator. Frequently combined with anterior STEMI (anteroseptal pattern).',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'ischemia.posterior-stemi',
    displayName: 'Posterior STEMI',
    family: 'ischemia-stemi',
    difficulty: 'expert',
    aliases: ['Posterior MI'],
    implemented: true,
    confusableWith: ['ischemia.st-depression', 'ischemia.inferior-stemi', 'ischemia.inferolateral-stemi'],
    tags: ['12-lead', 'stemi', 'mirror'],
    description:
      'ST depression in V1–V3 with tall R waves — mirror image of posterior STEMI. Confirm with V7–V9.',
    learningNotes:
      '"STEMI equivalent." Get posterior leads; treat as STEMI.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'ischemia.rv-stemi',
    displayName: 'Right Ventricular STEMI',
    family: 'ischemia-stemi',
    difficulty: 'expert',
    aliases: ['RV-MI', 'Right ventricular infarct'],
    implemented: false,
    confusableWith: ['ischemia.inferior-stemi'],
    tags: ['12-lead', 'stemi', 'preload-dependent'],
    description:
      'STE in V4R (right-sided lead), often with inferior STEMI.',
    learningNotes:
      'Preload-dependent — avoid nitrates, give fluids cautiously.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'ischemia.left-main-occlusion',
    displayName: 'Left Main Coronary Occlusion Pattern',
    family: 'ischemia-stemi',
    difficulty: 'expert',
    aliases: ['LMCA pattern', 'aVR STE pattern'],
    implemented: false,
    confusableWith: ['ischemia.st-depression', 'ischemia.de-winter'],
    tags: ['12-lead', 'stemi-equivalent', 'aVR'],
    description:
      'Diffuse ST depression (often ≥ 6 leads) with ST elevation in aVR (and often V1) — suggests proximal LAD or LMCA occlusion or severe triple-vessel disease.',
    learningNotes:
      'aVR is the "forgotten lead." STE in aVR > V1 strongly suggests LMCA. Activate cath lab.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'ischemia.sgarbossa',
    displayName: 'Sgarbossa Criteria',
    family: 'ischemia-stemi',
    difficulty: 'expert',
    aliases: ['Sgarbossa'],
    implemented: true,
    confusableWith: ['ischemia.modified-sgarbossa', 'conduction.lbbb', 'pacer.ventricular'],
    tags: ['12-lead', 'lbbb-mi'],
    description:
      'Original criteria for diagnosing MI in the presence of LBBB or paced rhythm.',
    learningNotes:
      'Concordant STE ≥ 1 mm, concordant ST depression in V1–V3, or discordant STE ≥ 5 mm.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'ischemia.modified-sgarbossa',
    displayName: 'Modified Sgarbossa Criteria',
    family: 'ischemia-stemi',
    difficulty: 'expert',
    aliases: ['Smith-modified Sgarbossa'],
    implemented: true,
    confusableWith: ['ischemia.sgarbossa', 'conduction.lbbb'],
    tags: ['12-lead', 'lbbb-mi'],
    description:
      'Replaces the third Sgarbossa criterion with the ST/S ratio (≤ −0.25).',
    learningNotes:
      'More sensitive than original Sgarbossa for occlusion MI in LBBB or V-paced rhythms.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'ischemia.wellens',
    displayName: 'Wellens Pattern',
    family: 'ischemia-stemi',
    difficulty: 'expert',
    aliases: ['Wellens syndrome', 'LAD-T'],
    implemented: false,
    confusableWith: ['ischemia.wellens-type-a', 'ischemia.wellens-type-b', 'ischemia.de-winter', 'ischemia.t-wave-inversion'],
    tags: ['12-lead', 'pre-infarction'],
    description:
      'Biphasic or deeply inverted T waves in V2–V3 in a pain-free patient with critical proximal LAD stenosis.',
    learningNotes:
      'Critical pre-infarction pattern. Do NOT stress-test.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'ischemia.wellens-type-a',
    displayName: 'Wellens Type A (Biphasic)',
    family: 'ischemia-stemi',
    difficulty: 'expert',
    aliases: ['Wellens Type 1', 'Biphasic Wellens'],
    implemented: false,
    confusableWith: ['ischemia.wellens', 'ischemia.wellens-type-b'],
    tags: ['12-lead', 'pre-infarction'],
    description:
      'Biphasic T waves in V2–V3 (positive deflection followed by deep negative).',
    learningNotes:
      'Less common than Type B. Same critical proximal LAD lesion.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'ischemia.wellens-type-b',
    displayName: 'Wellens Type B (Deep Inverted)',
    family: 'ischemia-stemi',
    difficulty: 'expert',
    aliases: ['Wellens Type 2', 'Deep T-inversion Wellens'],
    implemented: false,
    confusableWith: ['ischemia.wellens', 'ischemia.wellens-type-a', 'ischemia.t-wave-inversion'],
    tags: ['12-lead', 'pre-infarction'],
    description:
      'Symmetric, deeply inverted T waves in V2–V3.',
    learningNotes:
      'More common Wellens variant. Pain-free at the time of the ECG.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'ischemia.de-winter',
    displayName: 'De Winter Pattern',
    family: 'ischemia-stemi',
    difficulty: 'expert',
    aliases: ['De Winter T waves'],
    implemented: false,
    confusableWith: ['ischemia.anterior-stemi', 'ischemia.wellens', 'electrolyte.hyperk-peaked-t', 'ischemia.hyperacute-t'],
    tags: ['12-lead', 'stemi-equivalent'],
    description:
      'Upsloping ST depression at the J point in V1–V6 with tall, symmetric T waves — STEMI equivalent for proximal LAD occlusion.',
    learningNotes:
      'Treat as STEMI — activate cath lab.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'ischemia.lv-aneurysm',
    displayName: 'LV Aneurysm Pattern',
    family: 'ischemia-stemi',
    difficulty: 'expert',
    aliases: ['LV aneurysm', 'Old anterior MI with persistent STE'],
    implemented: false,
    confusableWith: ['ischemia.anterior-stemi', 'ischemia.pathologic-q'],
    tags: ['12-lead', 'old-mi'],
    description:
      'Persistent ST elevation in precordial leads with deep Q waves — sequela of an old anterior MI with bulging scar.',
    learningNotes:
      'Looks like STEMI but is chronic. Old ECG comparison is critical to avoid unnecessary cath activation.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'ischemia.early-repolarization',
    displayName: 'Early Repolarization (Benign)',
    family: 'ischemia-stemi',
    difficulty: 'intermediate',
    aliases: ['BER', 'J-point elevation'],
    implemented: false,
    confusableWith: ['ischemia.pericarditis-mimic', 'ischemia.anterior-stemi', 'ischemia.hyperacute-t'],
    tags: ['12-lead', 'normal-variant'],
    description:
      'Concave-up STE with notching/slurring at the J point (J wave), most pronounced in mid-precordial leads. Common in young, healthy patients.',
    learningNotes:
      'Concordant T-wave concavity, fish-hook J point, no reciprocal change. Not all BER is benign — newer evidence links some patterns to SCD.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'ischemia.pericarditis-mimic',
    displayName: 'Acute Pericarditis',
    family: 'ischemia-stemi',
    difficulty: 'intermediate',
    aliases: ['Pericarditis'],
    implemented: false,
    confusableWith: ['ischemia.anterior-stemi', 'ischemia.lateral-stemi', 'ischemia.inferior-stemi', 'ischemia.early-repolarization'],
    tags: ['12-lead', 'stemi-mimic'],
    description:
      'Diffuse concave-up STE with PR depression — classic mimic of STEMI.',
    learningNotes:
      'Diffuse (not territorial), PR depression, no reciprocal changes (except aVR/V1).',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'ischemia.lvh-strain',
    displayName: 'LVH with Strain Pattern',
    family: 'ischemia-stemi',
    difficulty: 'intermediate',
    aliases: ['LVH strain'],
    implemented: false,
    confusableWith: ['ischemia.st-depression', 'special.lvh', 'ischemia.t-wave-inversion'],
    tags: ['12-lead', 'lvh', 'mimic'],
    description:
      'High voltage QRS with downsloping ST depression and asymmetric T-wave inversion in lateral leads.',
    learningNotes:
      'Common ischemia mimic in long-standing hypertension or aortic stenosis. Compare with old ECG.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'ischemia.aslanger',
    displayName: 'Aslanger Pattern (Check Mark Sign)',
    family: 'ischemia-stemi',
    difficulty: 'expert',
    aliases: ['Check Mark sign'],
    implemented: false,
    confusableWith: ['ischemia.inferior-stemi', 'ischemia.st-depression'],
    tags: ['12-lead', 'subtle-omi', 'inferior'],
    description:
      'Subtle inferior STEMI: ST elevation in lead III only (not II or aVF), reciprocal depression in I and V4–V6, isoelectric or upsloping ST in II. Suggests a single-vessel inferior occlusion plus subendocardial ischemia elsewhere.',
    learningNotes:
      'Often missed because III alone does not meet two-lead STEMI criteria. High suspicion in ischemic chest pain — treat as STEMI equivalent in the right clinical context.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'ischemia.south-african-flag',
    displayName: 'South African Flag Sign',
    family: 'ischemia-stemi',
    difficulty: 'expert',
    aliases: ['First diagonal occlusion pattern'],
    implemented: false,
    confusableWith: ['ischemia.anterolateral-stemi', 'ischemia.high-lateral-stemi'],
    tags: ['12-lead', 'subtle-omi', 'high-lateral'],
    description:
      'STE in I, aVL, V2 with reciprocal depression in III — a four-lead pattern that resembles the South African flag. Suggests first-diagonal branch occlusion of the LAD.',
    learningNotes:
      'Recognition matters because the high-lateral territory is otherwise easy to miss.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),

  // ═══════════════════════════════════════════════════════════════════
  //  ELECTROLYTE / TOXICOLOGIC PATTERNS
  // ═══════════════════════════════════════════════════════════════════
  r({
    id: 'electrolyte.hyperk-peaked-t',
    displayName: 'Hyperkalemia — Peaked T Waves',
    family: 'electrolyte-tox',
    difficulty: 'intermediate',
    aliases: ['Peaked T waves', 'Early hyperK'],
    implemented: true,
    confusableWith: ['electrolyte.hyperk-progression', 'ischemia.de-winter', 'ischemia.hyperacute-t'],
    tags: ['electrolyte', 'tall-t'],
    description: 'Tall, narrow, symmetric peaked T waves — earliest hyperkalemia change.',
    learningNotes:
      'K ~5.5–6.5. Tented T waves, especially precordial. Narrow base (vs hyperacute T = broad base).',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'electrolyte.hyperk-progression',
    displayName: 'Hyperkalemia — Advanced Progression',
    family: 'electrolyte-tox',
    difficulty: 'expert',
    aliases: ['Advanced hyperK'],
    implemented: true,
    confusableWith: ['electrolyte.hyperk-peaked-t', 'electrolyte.hyperk-sine-wave', 'av-block.first-degree', 'conduction.nicd'],
    tags: ['electrolyte', 'wide-complex'],
    description:
      'Progression: peaked T → PR prolongation → P-wave flattening/loss → wide QRS → sine wave.',
    learningNotes:
      'Wide QRS in a dialysis patient is hyperK until proven otherwise. Calcium first.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'electrolyte.hyperk-sine-wave',
    displayName: 'Hyperkalemia — Sine-Wave Pattern',
    family: 'electrolyte-tox',
    difficulty: 'expert',
    aliases: ['Sine wave', 'Pre-arrest hyperK'],
    implemented: true,
    confusableWith: ['electrolyte.hyperk-progression', 'vent.vtach-stable', 'vent.idioventricular'],
    tags: ['electrolyte', 'lethal'],
    description:
      'Continuous sinusoidal pattern — terminal hyperkalemia, imminent VF/asystole.',
    learningNotes:
      'Calcium NOW. This patient is about to arrest.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'electrolyte.hypok',
    displayName: 'Hypokalemia (U Waves)',
    family: 'electrolyte-tox',
    difficulty: 'intermediate',
    aliases: ['Hypokalaemia', 'Low K'],
    implemented: false,
    confusableWith: ['conduction.long-qt', 'electrolyte.hypomg', 'electrolyte.digoxin-effect'],
    tags: ['electrolyte', 'u-wave'],
    description:
      'Flat or inverted T waves, prominent U waves, ST depression. Severe → QT prolongation and torsades.',
    learningNotes:
      'U wave > T wave amplitude, especially in V2–V3. Often coexists with hypomagnesemia — replete both.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'electrolyte.hyperca',
    displayName: 'Hypercalcemia',
    family: 'electrolyte-tox',
    difficulty: 'expert',
    aliases: ['High Ca'],
    implemented: false,
    confusableWith: ['conduction.short-qt', 'electrolyte.digoxin-effect'],
    tags: ['electrolyte', 'short-qt'],
    description: 'Shortened QT interval (mainly via short ST segment).',
    learningNotes:
      'Severe hypercalcemia (> 14): Osborn-like waves, AV blocks, arrest possible.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'electrolyte.hypoca',
    displayName: 'Hypocalcemia',
    family: 'electrolyte-tox',
    difficulty: 'expert',
    aliases: ['Low Ca'],
    implemented: false,
    confusableWith: ['conduction.long-qt', 'electrolyte.hypok'],
    tags: ['electrolyte', 'long-qt'],
    description: 'Prolonged QT due to a long flat ST segment, with normal T-wave width.',
    learningNotes:
      'Long QT here is from a long ST, not a wide T (helps differentiate from hypoK/drug long-QT).',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'electrolyte.hypermg',
    displayName: 'Hypermagnesemia',
    family: 'electrolyte-tox',
    difficulty: 'expert',
    aliases: ['High Mg'],
    implemented: false,
    confusableWith: ['av-block.first-degree', 'electrolyte.hyperk-progression'],
    tags: ['electrolyte'],
    description:
      'PR prolongation, wide QRS, AV blocks at very high levels.',
    learningNotes:
      'Most often iatrogenic — eclampsia or laxative abuse. Calcium gluconate as antidote.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'electrolyte.hypomg',
    displayName: 'Hypomagnesemia',
    family: 'electrolyte-tox',
    difficulty: 'expert',
    aliases: ['Low Mg'],
    implemented: false,
    confusableWith: ['conduction.long-qt', 'electrolyte.hypok', 'vent.torsades'],
    tags: ['electrolyte', 'long-qt'],
    description:
      'Prolonged QT and predisposition to torsades; often coexists with hypokalemia.',
    learningNotes:
      'Replete Mg before correcting K — refractory hypoK is usually undertreated hypoMg.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'electrolyte.digoxin-effect',
    displayName: 'Digoxin Effect',
    family: 'electrolyte-tox',
    difficulty: 'intermediate',
    aliases: ['Dig effect', 'Salvador Dali ST'],
    implemented: false,
    confusableWith: ['ischemia.st-depression', 'electrolyte.digoxin-toxicity', 'electrolyte.hypok'],
    tags: ['drug', 'st-depression'],
    description:
      'Downsloping ST depression with a "scooped" appearance (Salvador Dali sagging) and a shortened QT — therapeutic dig finding, not toxicity.',
    learningNotes:
      'Effect ≠ toxicity. Therapeutic ECG changes do not require treatment.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'electrolyte.digoxin-toxicity',
    displayName: 'Digoxin Toxicity',
    family: 'electrolyte-tox',
    difficulty: 'expert',
    aliases: ['Dig toxicity'],
    implemented: false,
    confusableWith: ['vent.bidirectional-vt', 'junctional.tachycardia', 'av-block.third-degree', 'electrolyte.digoxin-effect'],
    tags: ['drug', 'toxicity'],
    description:
      'Almost any arrhythmia possible. Classic: atrial tach with block, accelerated junctional, bidirectional VT.',
    learningNotes:
      'Suspect with hyperK + bradyarrhythmia + GI symptoms in a patient on dig. Treat with Digibind.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'electrolyte.tca-toxicity',
    displayName: 'TCA Toxicity',
    family: 'electrolyte-tox',
    difficulty: 'expert',
    aliases: ['Tricyclic overdose', 'Sodium-channel blocker (TCA)'],
    implemented: false,
    confusableWith: ['electrolyte.na-channel-blocker', 'conduction.rbbb', 'special.brugada-type-1'],
    tags: ['drug', 'wide-complex', 'na-channel-blocker'],
    description:
      'Sinus tachycardia, wide QRS (> 100 ms), terminal R wave in aVR (> 3 mm), prolonged QT.',
    learningNotes:
      'Sodium bicarbonate is the antidote. Wide QRS predicts seizures and arrhythmia.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'electrolyte.na-channel-blocker',
    displayName: 'Sodium-Channel Blocker Toxicity',
    family: 'electrolyte-tox',
    difficulty: 'expert',
    aliases: ['Na channel blocker', 'Class I antiarrhythmic toxicity'],
    implemented: false,
    confusableWith: ['electrolyte.tca-toxicity', 'electrolyte.hyperk-progression', 'conduction.nicd'],
    tags: ['drug', 'wide-complex'],
    description:
      'Wide QRS, right axis deviation in terminal QRS (terminal R in aVR), QT prolongation. Includes TCAs, cocaine, flecainide, propafenone, hydroxychloroquine.',
    learningNotes:
      'Sodium bicarbonate. Avoid Class IA/IC antiarrhythmics.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'electrolyte.cocaine-toxicity',
    displayName: 'Cocaine Toxicity',
    family: 'electrolyte-tox',
    difficulty: 'expert',
    aliases: ['Cocaine cardiotoxicity'],
    implemented: false,
    confusableWith: ['ischemia.anterior-stemi', 'electrolyte.na-channel-blocker', 'sinus.tachycardia'],
    tags: ['drug', 'ischemia'],
    description:
      'Sinus tachycardia, hypertension, ischemia/STEMI from coronary vasospasm, sodium-channel blockade with wide QRS at high doses.',
    learningNotes:
      'AVOID beta-blockers — unopposed alpha. Benzodiazepines and bicarb if wide QRS.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'electrolyte.lithium-toxicity',
    displayName: 'Lithium Toxicity',
    family: 'electrolyte-tox',
    difficulty: 'expert',
    aliases: ['Li toxicity'],
    implemented: false,
    confusableWith: ['electrolyte.digoxin-toxicity', 'sinus.bradycardia'],
    tags: ['drug', 'bradycardia'],
    description:
      'T-wave flattening/inversion, QT prolongation, sinus node dysfunction, AV blocks.',
    learningNotes:
      'Hemodialysis is the definitive treatment for severe toxicity.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'electrolyte.bb-ccb-toxicity',
    displayName: 'Beta-Blocker / CCB Toxicity',
    family: 'electrolyte-tox',
    difficulty: 'expert',
    aliases: ['BB toxicity', 'Calcium channel blocker overdose'],
    implemented: false,
    confusableWith: ['sinus.bradycardia', 'av-block.first-degree', 'av-block.third-degree'],
    tags: ['drug', 'bradycardia'],
    description:
      'Bradycardia, AV blocks, hypotension. Wide QRS possible at high doses.',
    learningNotes:
      'High-dose insulin / glucagon / calcium / lipid emulsion as adjuncts. Pacing for refractory bradycardia.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'electrolyte.bb-toxicity',
    displayName: 'Beta-blocker Toxicity',
    family: 'electrolyte-tox',
    difficulty: 'expert',
    aliases: ['BB toxicity'],
    implemented: false,
    confusableWith: ['electrolyte.bb-ccb-toxicity', 'electrolyte.ccb-toxicity', 'sinus.bradycardia'],
    tags: ['drug', 'bradycardia'],
    description: 'Sinus bradycardia, AV blocks, hypotension. QRS widening at very high doses.',
    learningNotes: 'Glucagon is the specific antidote. Pacing for refractory bradycardia.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'electrolyte.ccb-toxicity',
    displayName: 'Calcium Channel Blocker Toxicity',
    family: 'electrolyte-tox',
    difficulty: 'expert',
    aliases: ['CCB toxicity'],
    implemented: false,
    confusableWith: ['electrolyte.bb-ccb-toxicity', 'electrolyte.bb-toxicity', 'sinus.bradycardia'],
    tags: ['drug', 'bradycardia'],
    description: 'Bradycardia, AV blocks, hypotension. Often preserved mental status (vs BB) until late.',
    learningNotes: 'Calcium gluconate / chloride; high-dose insulin therapy; vasopressors. Pacing for refractory brady.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'electrolyte.carbamazepine-toxicity',
    displayName: 'Carbamazepine Toxicity',
    family: 'electrolyte-tox',
    difficulty: 'expert',
    aliases: ['Tegretol toxicity'],
    implemented: false,
    confusableWith: ['electrolyte.tca-toxicity', 'electrolyte.na-channel-blocker'],
    tags: ['drug', 'sodium-channel'],
    description: 'Wide QRS, prolonged QT, R wave in aVR, AV blocks — shares the Na-channel-blockade pattern with TCAs.',
    learningNotes: 'Sodium bicarbonate for QRS widening. Activated charcoal in early ingestion.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'electrolyte.quetiapine-toxicity',
    displayName: 'Quetiapine Toxicity',
    family: 'electrolyte-tox',
    difficulty: 'expert',
    aliases: ['Seroquel toxicity'],
    implemented: false,
    confusableWith: ['electrolyte.tca-toxicity', 'electrolyte.bb-toxicity'],
    tags: ['drug', 'sedation'],
    description: 'Tachycardia, mild QT prolongation, hypotension, profound sedation. Less Na-channel blockade than TCAs.',
    learningNotes: 'Mostly supportive care. Watch QT and avoid additional QT-prolonging drugs.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),

  // ═══════════════════════════════════════════════════════════════════
  //  SPECIAL / ADVANCED PATTERNS
  // ═══════════════════════════════════════════════════════════════════
  r({
    id: 'special.brugada-type-1',
    displayName: 'Brugada Type 1 (Coved)',
    family: 'special',
    difficulty: 'expert',
    aliases: ['Brugada coved', 'Diagnostic Brugada'],
    implemented: true,
    confusableWith: ['special.brugada-type-2', 'conduction.brugada-pattern', 'conduction.rbbb', 'ischemia.septal-stemi'],
    tags: ['channelopathy', 'sudden-cardiac-death'],
    description:
      'Coved-type ST elevation ≥ 2 mm in V1–V2 followed by an inverted T wave. The diagnostic Brugada pattern.',
    learningNotes:
      'Type 1 is the only diagnostic morphology. Risk of polymorphic VT/SCD; consider ICD if symptomatic. See `conduction.brugada-pattern` for the umbrella teaching topic.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'special.brugada-type-2',
    displayName: 'Brugada Type 2 (Saddleback)',
    family: 'special',
    difficulty: 'expert',
    aliases: ['Brugada saddleback'],
    implemented: true,
    confusableWith: ['special.brugada-type-1', 'conduction.brugada-pattern', 'conduction.incomplete-rbbb'],
    tags: ['channelopathy'],
    description:
      'Saddleback ST elevation in V1–V2 with positive or biphasic T wave. Suggestive but not diagnostic.',
    learningNotes:
      'Provocation testing (sodium-channel blocker challenge) may convert to Type 1 if Brugada is real. See `conduction.brugada-pattern` for the umbrella teaching topic.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'special.arvc',
    displayName: 'Arrhythmogenic RV Cardiomyopathy',
    family: 'special',
    difficulty: 'expert',
    aliases: ['ARVC', 'ARVD', 'Epsilon waves'],
    implemented: false,
    confusableWith: ['vent.rvot-vt', 'special.brugada-type-1'],
    tags: ['channelopathy', 'sudden-cardiac-death'],
    description:
      'Epsilon waves (small terminal notch after QRS) in V1–V3, T-wave inversion in V1–V3, and a propensity for VT of LBBB morphology.',
    learningNotes:
      'Athletes presenting with syncope or polymorphic VT — consider ARVC. Cardiac MRI is the imaging gold standard.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'special.cpvt',
    displayName: 'Catecholaminergic Polymorphic VT',
    family: 'special',
    difficulty: 'expert',
    aliases: ['CPVT'],
    implemented: false,
    confusableWith: ['vent.bidirectional-vt', 'vent.polymorphic-vt'],
    tags: ['channelopathy', 'pediatric'],
    description:
      'Bidirectional or polymorphic VT triggered by exertion or emotion in a structurally normal heart with a normal resting ECG.',
    learningNotes:
      'Genetic. Beta-blockers are first-line; ICD for refractory cases.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'special.hcm',
    displayName: 'Hypertrophic Cardiomyopathy',
    family: 'special',
    difficulty: 'expert',
    aliases: ['HCM', 'HOCM'],
    implemented: false,
    confusableWith: ['special.lvh', 'ischemia.lvh-strain', 'special.cerebral-t-waves'],
    tags: ['cardiomyopathy', 'sudden-cardiac-death'],
    description:
      'High voltage with deep narrow Q waves (lateral and inferior pseudo-infarct pattern), giant T-wave inversions (apical HCM).',
    learningNotes:
      'Athlete with syncope + abnormal ECG — think HCM. Echo is diagnostic.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'special.hypothermia',
    displayName: 'Hypothermia (Osborn / J Waves)',
    family: 'special',
    difficulty: 'intermediate',
    aliases: ['J waves', 'Osborn waves'],
    implemented: true,
    confusableWith: ['ischemia.early-repolarization', 'special.brugada-type-1'],
    tags: ['environmental', 'osborn'],
    description:
      'Osborn (J) waves — positive deflection at the J point, especially in lateral leads. Bradycardia, prolonged intervals, baseline tremor from shivering.',
    learningNotes:
      'Size of J wave correlates with degree of hypothermia. Rewarm before aggressive treatment.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'special.pe-pattern',
    displayName: 'Pulmonary Embolism Pattern',
    family: 'special',
    difficulty: 'intermediate',
    aliases: ['PE pattern', 'S1Q3T3', 'RV strain pattern'],
    implemented: false,
    confusableWith: ['sinus.tachycardia', 'conduction.rbbb', 'ischemia.inferior-stemi'],
    tags: ['rv-strain', 'tachycardia'],
    description:
      'Sinus tachycardia (most common), S1Q3T3, T-wave inversion in V1–V4 + III, new RBBB, right axis deviation.',
    learningNotes:
      'Sinus tach is the single most common ECG finding in PE. S1Q3T3 is taught but only present in ~20%.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'special.lvh',
    displayName: 'Left Ventricular Hypertrophy',
    family: 'special',
    difficulty: 'intermediate',
    aliases: ['LVH', 'Sokolow-Lyon'],
    implemented: false,
    confusableWith: ['ischemia.lvh-strain', 'special.hcm', 'ischemia.pathologic-q'],
    tags: ['voltage', 'hypertrophy'],
    description:
      'High voltage by Sokolow-Lyon (S in V1 + R in V5/V6 ≥ 35 mm) or Cornell criteria.',
    learningNotes:
      'Voltage criteria are imperfect; combine with strain pattern, axis, P-mitrale for confidence.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'special.rvh',
    displayName: 'Right Ventricular Hypertrophy',
    family: 'special',
    difficulty: 'expert',
    aliases: ['RVH'],
    implemented: false,
    confusableWith: ['conduction.rbbb', 'ischemia.posterior-stemi', 'special.pe-pattern'],
    tags: ['voltage', 'hypertrophy'],
    description:
      'Right axis deviation, dominant R in V1, deep S in V5/V6, RV strain (T-wave inversion V1–V3).',
    learningNotes:
      'Common in cor pulmonale, congenital heart disease, severe COPD.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'special.left-atrial-enlargement',
    displayName: 'Left Atrial Enlargement (P Mitrale)',
    family: 'special',
    difficulty: 'expert',
    aliases: ['LAE', 'P mitrale'],
    implemented: false,
    confusableWith: ['special.right-atrial-enlargement', 'special.lvh'],
    tags: ['atrial-enlargement', 'p-wave'],
    description:
      'Broad (> 0.12 s), notched ("M-shaped") P wave in lead II, with a deep negative terminal portion in V1.',
    learningNotes:
      'Common in mitral stenosis or chronic LV failure.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'special.right-atrial-enlargement',
    displayName: 'Right Atrial Enlargement (P Pulmonale)',
    family: 'special',
    difficulty: 'expert',
    aliases: ['RAE', 'P pulmonale'],
    implemented: false,
    confusableWith: ['special.left-atrial-enlargement', 'special.rvh'],
    tags: ['atrial-enlargement', 'p-wave'],
    description:
      'Tall (> 2.5 mm), peaked P wave in lead II.',
    learningNotes:
      'Common in COPD, pulmonary hypertension, tricuspid stenosis.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'special.electrical-alternans',
    displayName: 'Electrical Alternans',
    family: 'special',
    difficulty: 'expert',
    aliases: ['QRS alternans'],
    implemented: false,
    confusableWith: ['atrial.fib', 'vent.bigeminy'],
    tags: ['tamponade', 'effusion'],
    description:
      'Beat-to-beat alternation in QRS amplitude due to a swinging heart in a large pericardial effusion.',
    learningNotes:
      'Suspect tamponade with sinus tach + electrical alternans + low voltage. Get an echo immediately.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'special.dextrocardia',
    displayName: 'Dextrocardia',
    family: 'special',
    difficulty: 'expert',
    aliases: ['Mirror-image dextrocardia'],
    implemented: false,
    confusableWith: ['special.lead-reversal'],
    tags: ['anomaly'],
    description:
      'Negative P, QRS, and T in lead I; reversed precordial R-wave progression. Suggests dextrocardia (or arm-lead reversal).',
    learningNotes:
      'Confirm with reversed precordial leads. Distinguish from limb-lead reversal by checking precordial progression.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'special.lead-reversal',
    displayName: 'Limb Lead Reversal',
    family: 'special',
    difficulty: 'intermediate',
    aliases: ['LA-RA reversal'],
    implemented: false,
    confusableWith: ['special.dextrocardia'],
    tags: ['artifact', 'pitfall'],
    description:
      'Negative P/QRS/T in lead I from swapped LA-RA limb electrodes. Precordial leads are normal.',
    learningNotes:
      'Always rule out lead reversal before diagnosing dextrocardia or unusual axis. Recheck cable placement.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'special.takotsubo',
    displayName: 'Takotsubo Cardiomyopathy',
    family: 'special',
    difficulty: 'expert',
    aliases: ['Stress cardiomyopathy', 'Apical ballooning'],
    implemented: false,
    confusableWith: ['ischemia.anterior-stemi', 'ischemia.t-wave-inversion'],
    tags: ['stemi-mimic'],
    description:
      'Diffuse anterolateral STE or deep symmetric T-wave inversions with markedly prolonged QT, often after emotional/physical stress.',
    learningNotes:
      'Cath shows clean coronaries with apical ballooning. Supportive care; usually recovers.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'special.cerebral-t-waves',
    displayName: 'Cerebral T Waves',
    family: 'special',
    difficulty: 'expert',
    aliases: ['SAH T waves', 'Neurogenic T waves'],
    implemented: false,
    confusableWith: ['ischemia.t-wave-inversion', 'ischemia.wellens-type-b', 'special.hcm'],
    tags: ['neurologic'],
    description:
      'Deep, widespread, symmetric T-wave inversions, often with prolonged QT, after subarachnoid hemorrhage or other intracranial catastrophe.',
    learningNotes:
      'Sudden severe headache + bizarre deep TWI = CT head before cath lab.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
  r({
    id: 'special.athlete-heart',
    displayName: "Athlete's Heart Pattern",
    family: 'special',
    difficulty: 'expert',
    aliases: ['Athletic ECG'],
    implemented: false,
    confusableWith: ['sinus.bradycardia', 'av-block.first-degree', 'special.lvh', 'ischemia.early-repolarization'],
    tags: ['benign', 'high-vagal'],
    description:
      'Sinus bradycardia, sinus arrhythmia, first-degree AV block, voltage criteria for LVH, early repolarization — all common in trained athletes.',
    learningNotes:
      'Differentiate physiologic remodeling from HCM/ARVC. Symptoms or family history of SCD warrant imaging.',
    sourceReferenceLabel: 'LITFL ECG Library',
  }),
] as const;

/** Map of id → definition. Built once at module load. */
export const RHYTHM_BY_ID: ReadonlyMap<RhythmId, RhythmDefinition> = new Map(
  RHYTHM_CATALOG.map((row) => [row.id, row]),
);

export function getRhythm(id: RhythmId): RhythmDefinition | undefined {
  return RHYTHM_BY_ID.get(id);
}

/** Alias for `getRhythm` — provided so callers can use the more explicit name. */
export const getRhythmById = getRhythm;

export function listImplementedRhythms(): RhythmDefinition[] {
  return RHYTHM_CATALOG.filter((row) => row.implemented);
}

/**
 * Single-lead implemented rhythms for live quiz rendering and 12-lead base
 * rhythm selection. 12-lead pattern rows are intentionally excluded here even
 * though the live monitor can display diagnostic single-lead adapters for
 * them.
 *
 * NOTE: imports lazily via dynamic require to avoid the circular import that
 * comes from waveform.ts -> generators/* -> types/* -> rhythmCatalog.ts.
 */
export function listSingleLeadRhythms(): RhythmDefinition[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { hasGenerator } = require('./waveform') as typeof import('./waveform');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { hasTwelveLeadPattern } = require('./twelveLeadRegistry') as typeof import('./twelveLeadRegistry');
  return RHYTHM_CATALOG.filter(
    (row) => row.implemented && hasGenerator(row.id) && !hasTwelveLeadPattern(row.id),
  );
}

/**
 * Rhythms eligible for the live ECG monitor selector. Includes the 12-lead
 * pattern adapters so implemented patterns such as RBBB, STEMI territories,
 * Brugada, and hypothermia are reachable in the simulator.
 */
export function listLiveMonitorRhythms(): RhythmDefinition[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { hasGenerator } = require('./waveform') as typeof import('./waveform');
  return RHYTHM_CATALOG.filter(
    (row) => row.implemented && hasGenerator(row.id),
  );
}

/**
 * 12-lead implemented patterns — those registered in `TWELVE_LEAD_REGISTRY`.
 * Used by the `TwelveLeadScreen` pattern selector.
 */
export function list12LeadRhythms(): RhythmDefinition[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { hasTwelveLeadPattern } = require('./twelveLeadRegistry') as typeof import('./twelveLeadRegistry');
  return RHYTHM_CATALOG.filter(
    (row) => row.implemented && hasTwelveLeadPattern(row.id),
  );
}
