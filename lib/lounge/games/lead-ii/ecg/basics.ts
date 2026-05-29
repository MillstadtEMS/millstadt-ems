/**
 * ECG Basics — beginner-friendly concepts and question bank.
 *
 * Targets: complete beginners (EMT students, first-week nursing students).
 * All explanations are original / paraphrased — no source text is copied.
 */

import type { BasicsConcept, BasicsConceptId, BasicsQuestion } from './basicsTypes';

export const BASICS_CONCEPTS: readonly BasicsConcept[] = [
  // ── Paper, time, amplitude ────────────────────────────────────────
  {
    id: 'basics.paper.small-box',
    topic: 'paper',
    title: 'Small box on ECG paper',
    summary:
      'At standard 25 mm/s paper speed, one small box (1 mm) represents 0.04 seconds (40 ms) horizontally and 0.1 mV vertically.',
    keyPoints: [
      '1 small box wide = 0.04 s.',
      '1 small box tall = 0.1 mV.',
      'Standard paper speed is 25 mm/s; double-speed (50 mm/s) is sometimes used.',
    ],
  },
  {
    id: 'basics.paper.large-box',
    topic: 'paper',
    title: 'Large box on ECG paper',
    summary:
      'A large box is 5 small boxes by 5 small boxes, representing 0.20 seconds horizontally and 0.5 mV vertically.',
    keyPoints: [
      '1 large box wide = 0.20 s.',
      '1 large box tall = 0.5 mV.',
      'Five large boxes = 1 second.',
    ],
  },
  // ── Leads ─────────────────────────────────────────────────────────
  {
    id: 'basics.leads.standard-12',
    topic: 'leads',
    title: 'The 12 leads',
    summary:
      'A standard 12-lead ECG has 6 limb leads (I, II, III, aVR, aVL, aVF) and 6 precordial / chest leads (V1–V6). Together they look at the heart from 12 angles.',
    keyPoints: [
      'Limb leads: I, II, III, aVR, aVL, aVF.',
      'Precordial leads: V1, V2, V3, V4, V5, V6.',
      'Lead II is the workhorse rhythm strip — usually upright P, QRS, T.',
    ],
  },
  {
    id: 'basics.leads.placement',
    topic: 'leads',
    title: 'Precordial electrode placement',
    summary:
      'V1: 4th ICS right of sternum. V2: 4th ICS left of sternum. V4: 5th ICS midclavicular. V3: between V2 and V4. V5: anterior axillary at V4 level. V6: midaxillary at V4 level.',
    keyPoints: [
      'V1 sits to the right of the sternum at the 4th intercostal space.',
      'V4 is at the 5th ICS, midclavicular.',
      'V3 is placed between V2 and V4 (not between V4 and V5).',
    ],
  },
  // ── Waves ─────────────────────────────────────────────────────────
  {
    id: 'basics.waves.p-wave',
    topic: 'waves',
    title: 'P wave',
    summary:
      'The P wave is atrial depolarization. Normal P waves are upright in lead II and inverted in aVR, with a duration < 0.12 s (3 small boxes) and amplitude < 2.5 mm (2.5 small boxes).',
    keyPoints: [
      'P wave = atrial depolarization (right atrium first, then left).',
      'Normal duration < 0.12 s; amplitude < 2.5 mm.',
      'Should be upright in II, inverted in aVR.',
      'Tall peaked P (P pulmonale) suggests right atrial enlargement.',
      'Wide notched P (P mitrale) suggests left atrial enlargement.',
    ],
  },
  {
    id: 'basics.waves.q-wave',
    topic: 'waves',
    title: 'Q wave',
    summary:
      'The Q wave is the FIRST negative (downward) deflection of the QRS complex, before any R wave. Small "septal" Q waves in lateral leads (I, aVL, V5, V6) are normal — they represent left-to-right septal depolarization.',
    keyPoints: [
      'Q = first negative deflection of the QRS, before the R wave.',
      'Small septal Qs in I, aVL, V5, V6 are physiologic.',
      'Pathologic Q wave: > 0.04 s (1 small box) wide, OR > 25% of the R-wave height, in 2 contiguous leads.',
      'Pathologic Qs usually mean prior MI (electrical "scar").',
    ],
  },
  {
    id: 'basics.waves.r-wave',
    topic: 'waves',
    title: 'R wave',
    summary:
      'The R wave is the FIRST positive (upward) deflection of the QRS complex. A second positive deflection after an S is called R-prime (R\'). In the precordial leads, R amplitude normally grows from V1 to V5 — this is called R-wave progression.',
    keyPoints: [
      'R = first positive deflection of the QRS.',
      'R\' (R-prime) = a second positive deflection after an S wave (e.g., RSR\' in RBBB).',
      'Normal R-wave progression: R grows V1 → V5, then shrinks slightly in V6.',
      'Poor R-wave progression (R stays small through V3/V4) can mean anterior MI, LVH, or lead misplacement.',
    ],
  },
  {
    id: 'basics.waves.s-wave',
    topic: 'waves',
    title: 'S wave',
    summary:
      'The S wave is the negative deflection that follows the R wave. In the precordial leads, S waves are deep in V1–V2 and shrink toward V5–V6 — mirroring R-wave progression.',
    keyPoints: [
      'S = negative deflection after the R.',
      'Deep S in V1–V2 is normal; shrinks across the precordium.',
      'A second S after an R\' is "S-prime" (S\').',
      'Persistent deep S in V5/V6 can suggest LVH or right-axis pathology.',
    ],
  },
  {
    id: 'basics.waves.qrs',
    topic: 'waves',
    title: 'QRS complex',
    summary:
      'The QRS complex is ventricular depolarization — the combined Q, R, and S deflections. Normal duration is < 0.12 s. A wide QRS suggests bundle-branch block, ventricular ectopy/rhythm, hyperkalemia, or sodium-channel-blocker toxicity.',
    keyPoints: [
      'QRS = ventricular depolarization.',
      'Not every complex has all three waves; naming follows what is present (QS, RS, qRs, etc.).',
      'Normal QRS duration < 0.12 s (3 small boxes); narrow = supraventricular origin.',
      'Wide and bizarre = think ventricular until proven otherwise.',
    ],
  },
  {
    id: 'basics.waves.t-wave',
    topic: 'waves',
    title: 'T wave',
    summary:
      'The T wave is ventricular repolarization. Normally upright in most leads except aVR (and sometimes V1). Tall peaked Ts can mean hyperkalemia or hyperacute MI; deep inverted Ts can mean ischemia.',
    keyPoints: [
      'T wave = ventricular repolarization.',
      'Normally asymmetric, broad, in the same direction as the QRS.',
      'Symmetric, peaked, narrow → hyperkalemia.',
      'Symmetric, deeply inverted → ischemia.',
      'Always inverted in aVR; may be inverted in V1 and III as a normal variant.',
    ],
  },
  {
    id: 'basics.waves.u-wave',
    topic: 'waves',
    title: 'U wave',
    summary:
      'The U wave is a small, rounded deflection that sometimes follows the T wave. Its origin is debated (late repolarization of the Purkinje fibers or papillary muscles). When present, it is normally < 25% of the T-wave height and in the same direction.',
    keyPoints: [
      'Comes AFTER the T wave; usually best seen in V2–V3.',
      'Often absent on a normal ECG — that\'s fine.',
      'Prominent U waves: hypokalemia, hypomagnesemia, bradycardia, drugs (digoxin, amiodarone).',
      'Inverted U waves can suggest LV strain or ischemia.',
    ],
  },
  {
    id: 'basics.waves.delta-wave',
    topic: 'waves',
    title: 'Delta wave',
    summary:
      'A delta wave is a slurred upstroke at the START of the QRS, caused by ventricular pre-excitation through an accessory pathway (Wolff-Parkinson-White). The R wave loses its sharp onset because some ventricular tissue is depolarized early.',
    keyPoints: [
      'Found at the very beginning of the QRS — a slow, slurred upstroke.',
      'Goes with a SHORT PR interval (< 0.12 s).',
      'Together: short PR + delta + wide QRS = WPW pattern.',
      'Direction of the delta varies by accessory pathway location.',
    ],
  },
  // ── Segments and fiducial points ─────────────────────────────────
  {
    id: 'basics.segments.pr-segment',
    topic: 'segments',
    title: 'PR segment',
    summary:
      'The PR segment is the flat (isoelectric) line from the END of the P wave to the START of the QRS. It represents conduction delay through the AV node — electricity is flowing, but no muscle is depolarizing fast enough to make a visible deflection.',
    keyPoints: [
      'From end of P to start of QRS — should sit on the baseline.',
      'Represents AV-node delay (no visible deflection because mass is small).',
      'PR depression: pericarditis (typical), atrial infarction.',
      'Don\'t confuse the PR SEGMENT (flat) with the PR INTERVAL (P start → QRS start).',
    ],
  },
  {
    id: 'basics.segments.st-segment',
    topic: 'segments',
    title: 'ST segment',
    summary:
      'The ST segment is the flat (isoelectric) line from the END of the QRS (the J point) to the START of the T wave. It represents the plateau phase of ventricular action potentials — all ventricular cells are depolarized at the same time, so the net voltage is near zero.',
    keyPoints: [
      'From the J point to the start of the T wave.',
      'Normally isoelectric — sits on the baseline (compared against the TP segment).',
      'ST elevation = injury/STEMI (in the right pattern), early repolarization, pericarditis, LV aneurysm.',
      'ST depression = ischemia, reciprocal change, digoxin effect, LVH strain.',
      'Measured 0.04–0.08 s after the J point (the "J+80 ms" point).',
    ],
  },
  {
    id: 'basics.segments.tp-segment',
    topic: 'segments',
    title: 'TP segment',
    summary:
      'The TP segment is the flat line from the END of the T wave to the START of the next P wave. The heart is electrically silent here — this is the resting baseline and the reference for "isoelectric" when measuring ST elevation or depression.',
    keyPoints: [
      'From end of T to start of next P.',
      'This IS the baseline / isoelectric line.',
      'Use the TP segment, not the PR segment, when judging ST elevation/depression.',
      'Disappears at fast heart rates as the T crowds into the next P.',
    ],
  },
  {
    id: 'basics.segments.j-point',
    topic: 'segments',
    title: 'J point',
    summary:
      'The J point is the JUNCTION between the end of the QRS and the start of the ST segment. It is the anatomic landmark used to decide whether the ST segment is elevated, depressed, or normal.',
    keyPoints: [
      'The exact "corner" where the QRS ends and the ST segment begins.',
      'STEMI criteria are defined as J-point elevation relative to the TP baseline.',
      'A notched / elevated J point with concave-up ST = "J-point notching" of benign early repolarization.',
      'A prominent dome-shaped J wave (Osborn wave) is classic for hypothermia.',
    ],
  },
  {
    id: 'basics.segments.baseline',
    topic: 'segments',
    title: 'Isoelectric baseline',
    summary:
      'The baseline (isoelectric line) is the flat reference line at zero voltage. The TP segment is the cleanest place to identify it. Every measurement of elevation or depression is made relative to this line.',
    keyPoints: [
      'Zero-voltage reference — the level of the TP segment.',
      'A "wandering baseline" (slow drift) is usually patient movement or breathing artifact.',
      'Don\'t confuse fine baseline tremor (Parkinson, shivering) with atrial flutter / fibrillation.',
      'All ST measurements use this line, not the PR segment.',
    ],
  },
  {
    id: 'basics.segments.calibration',
    topic: 'segments',
    title: 'Calibration pulse',
    summary:
      'Every ECG begins with a square calibration mark: a 1 mV step lasting 0.2 s, drawn as a box 10 mm tall and 5 mm wide (10 small boxes by 5 small boxes). It confirms the gain and paper speed before you measure anything.',
    keyPoints: [
      'Standard calibration pulse = 10 mm tall × 5 mm wide = 1 mV × 0.20 s.',
      'Standard gain = 10 mm/mV. Standard paper speed = 25 mm/s.',
      'Half-standard (5 mm/mV) is used when the QRS is too tall to fit (e.g., big LVH).',
      'Double-standard (20 mm/mV) is used when complexes are very small.',
      'Always check the calibration BEFORE measuring intervals or amplitudes.',
    ],
  },
  // ── Intervals ────────────────────────────────────────────────────
  {
    id: 'basics.intervals.pr',
    topic: 'intervals',
    title: 'PR interval',
    summary:
      'Measured from the START of the P wave to the START of the QRS. Normal PR is 0.12–0.20 s (3–5 small boxes). Long PR = first-degree AV block. Short PR + delta wave = pre-excitation (WPW).',
    keyPoints: [
      'P start → QRS start. Includes the P wave AND the PR segment.',
      'Normal PR: 0.12–0.20 s (3–5 small boxes).',
      '> 0.20 s = first-degree AV block.',
      '< 0.12 s with a delta wave = WPW.',
    ],
  },
  {
    id: 'basics.intervals.qrs-duration',
    topic: 'intervals',
    title: 'QRS duration',
    summary:
      'The QRS duration is the WIDTH of the QRS complex, measured from the start of the first deflection (Q or R) to the end of the last (S, J point). Normal is < 0.12 s (3 small boxes). Wide QRS suggests a problem with ventricular conduction.',
    keyPoints: [
      'Normal QRS < 0.12 s (< 3 small boxes).',
      '0.10–0.12 s = "incomplete" bundle-branch block / IVCD.',
      '> 0.12 s = "wide complex": BBB, ventricular rhythm, hyperK, Na-channel blocker.',
      'Measure in the lead where the QRS is widest.',
    ],
  },
  {
    id: 'basics.intervals.qt',
    topic: 'intervals',
    title: 'QT interval',
    summary:
      'Measured from the START of the QRS to the END of the T wave. Rate-corrected QTc > 460 ms (men) or > 470 ms (women) is prolonged. Long QT predisposes to torsades.',
    keyPoints: [
      'QRS start → end of T wave (where T returns to baseline).',
      'QT shortens with faster heart rates — use QTc (Bazett: QT / √RR in seconds).',
      'Bedside rule: QT < half the R–R interval is usually reassuring.',
      'Drugs, hypoK, hypoMg, hypoCa, and congenital LQTS all prolong QT.',
    ],
  },
  {
    id: 'basics.intervals.rr',
    topic: 'intervals',
    title: 'R–R interval',
    summary:
      'The R–R interval is the distance between two consecutive R waves. It is the timing reference for ventricular rate. Regular R–R = regular rhythm. Varying R–R = irregular rhythm.',
    keyPoints: [
      'R-peak to next R-peak.',
      'Constant R–R = regular rhythm; varying R–R = irregular.',
      'Rate (regular) = 1500 ÷ R–R in small boxes, OR 300 ÷ R–R in large boxes.',
      'Use the R-R for the ventricular rate; use the P-P for the atrial rate.',
    ],
  },
  {
    id: 'basics.intervals.pp',
    topic: 'intervals',
    title: 'P–P interval',
    summary:
      'The P–P interval is the distance between two consecutive P waves. It measures the ATRIAL rate. In normal sinus rhythm the P–P and R–R are equal. They diverge in AV block, where atria and ventricles fire independently.',
    keyPoints: [
      'P-peak to next P-peak.',
      'P–P = R–R in normal sinus.',
      'In 3rd-degree AV block, regular P–P and regular R–R but at DIFFERENT rates.',
      'Compare P–P and R–R to spot AV dissociation.',
    ],
  },
  // ── Rate ──────────────────────────────────────────────────────────
  {
    id: 'basics.rate.300-method',
    topic: 'rate',
    title: 'Rate calculation — 300 method',
    summary:
      'For a regular rhythm: count the number of large boxes between two consecutive R waves and divide 300 by that number. Memorize 300, 150, 100, 75, 60, 50.',
    keyPoints: [
      '1 large box between Rs ≈ 300 bpm.',
      '2 large boxes ≈ 150. 3 ≈ 100. 4 ≈ 75. 5 ≈ 60. 6 ≈ 50.',
      'Only valid for regular rhythms.',
    ],
  },
  {
    id: 'basics.rate.6-second',
    topic: 'rate',
    title: 'Rate calculation — 6-second method',
    summary:
      'For irregular rhythms: count QRS complexes in a 6-second strip and multiply by 10. ECG paper usually marks every 3 seconds.',
    keyPoints: [
      'Best method for irregular rhythms (e.g., AFib).',
      '6-second strip × 10 = bpm.',
      'Most rhythm strips have 3-second tick marks at the top.',
    ],
  },
  // ── Axis ──────────────────────────────────────────────────────────
  {
    id: 'basics.axis.quadrant',
    topic: 'axis',
    title: 'Cardiac axis quadrant method',
    summary:
      'Look at the QRS direction in leads I and aVF. Both up = normal. I up + aVF down = left axis. I down + aVF up = right axis. Both down = extreme axis (rare and concerning).',
    keyPoints: [
      'I + aVF both upright → normal axis.',
      'I up, aVF down → left axis deviation.',
      'I down, aVF up → right axis deviation.',
      'Both down → extreme/northwest axis.',
    ],
  },
  // ── Approach ──────────────────────────────────────────────────────
  {
    id: 'basics.approach.systematic',
    topic: 'approach',
    title: 'Systematic ECG read',
    summary:
      'Always read in the same order: rate, rhythm, axis, intervals (PR, QRS, QT), P-wave morphology, QRS morphology, ST segments, T waves, then put it together in clinical context.',
    keyPoints: [
      'Same order every time prevents missed findings.',
      'Compare with the patient\'s prior ECG when available.',
      'Treat the patient, not the strip.',
    ],
  },
];

export const BASICS_CONCEPT_BY_ID: ReadonlyMap<BasicsConceptId, BasicsConcept> = new Map(
  BASICS_CONCEPTS.map((c) => [c.id, c]),
);

export const BASICS_QUESTIONS: readonly BasicsQuestion[] = [
  // ── Paper ────────────────────────────────────────────────────────
  {
    id: 'q.paper.small-box-time',
    conceptId: 'basics.paper.small-box',
    topic: 'paper',
    difficulty: 'beginner',
    prompt: 'At standard 25 mm/s paper speed, how much time does ONE small box represent?',
    choices: [
      { id: 'a', text: '0.04 seconds (40 ms)' },
      { id: 'b', text: '0.1 seconds (100 ms)' },
      { id: 'c', text: '0.20 seconds (200 ms)' },
      { id: 'd', text: '1 second' },
    ],
    correctChoiceId: 'a',
    explanation:
      'One small box is 1 mm wide. At 25 mm/s, that is 1/25 of a second = 0.04 s. Five small boxes (one large box) = 0.20 s.',
  },
  {
    id: 'q.paper.large-box-time',
    conceptId: 'basics.paper.large-box',
    topic: 'paper',
    difficulty: 'beginner',
    prompt: 'How many seconds does ONE large box represent at standard paper speed?',
    choices: [
      { id: 'a', text: '0.04 seconds' },
      { id: 'b', text: '0.10 seconds' },
      { id: 'c', text: '0.20 seconds' },
      { id: 'd', text: '0.50 seconds' },
    ],
    correctChoiceId: 'c',
    explanation:
      'A large box is 5 small boxes wide. 5 × 0.04 s = 0.20 s. Five large boxes = 1 second.',
  },
  {
    id: 'q.paper.amplitude',
    conceptId: 'basics.paper.small-box',
    topic: 'paper',
    difficulty: 'beginner',
    prompt: 'How much voltage does ONE small box represent vertically (at standard 10 mm/mV gain)?',
    choices: [
      { id: 'a', text: '0.1 mV' },
      { id: 'b', text: '0.5 mV' },
      { id: 'c', text: '1.0 mV' },
      { id: 'd', text: '5.0 mV' },
    ],
    correctChoiceId: 'a',
    explanation:
      'At standard 10 mm/mV gain, 1 mm (one small box) represents 0.1 mV. The calibration spike at the start of an ECG should be 10 mm tall (1 mV).',
  },
  // ── Leads ─────────────────────────────────────────────────────────
  {
    id: 'q.leads.count',
    conceptId: 'basics.leads.standard-12',
    topic: 'leads',
    difficulty: 'beginner',
    prompt: 'How many leads are on a standard 12-lead ECG, and how do they break down?',
    choices: [
      { id: 'a', text: '12 leads: 6 limb + 6 precordial' },
      { id: 'b', text: '12 leads: 4 limb + 8 precordial' },
      { id: 'c', text: '12 leads: 12 individual electrodes' },
      { id: 'd', text: '6 leads: 3 limb + 3 precordial' },
    ],
    correctChoiceId: 'a',
    explanation:
      'A 12-lead ECG = 6 limb leads (I, II, III, aVR, aVL, aVF) + 6 precordial leads (V1–V6). Only 10 electrodes are used to derive these 12 views.',
  },
  {
    id: 'q.leads.v1-position',
    conceptId: 'basics.leads.placement',
    topic: 'leads',
    difficulty: 'beginner',
    prompt: 'Where does the V1 electrode go?',
    choices: [
      { id: 'a', text: '4th intercostal space, right of the sternum' },
      { id: 'b', text: '4th intercostal space, left of the sternum' },
      { id: 'c', text: '5th intercostal space, midclavicular line' },
      { id: 'd', text: 'Midaxillary line at the level of V4' },
    ],
    correctChoiceId: 'a',
    explanation:
      'V1 sits at the 4th ICS to the right of the sternum. V2 is its mirror at the 4th ICS to the left. V4 is at the 5th ICS midclavicular.',
  },
  {
    id: 'q.leads.workhorse',
    conceptId: 'basics.leads.standard-12',
    topic: 'leads',
    difficulty: 'beginner',
    prompt: 'Which limb lead is most commonly used for a continuous rhythm strip?',
    choices: [
      { id: 'a', text: 'Lead I' },
      { id: 'b', text: 'Lead II' },
      { id: 'c', text: 'aVR' },
      { id: 'd', text: 'aVL' },
    ],
    correctChoiceId: 'b',
    explanation:
      "Lead II usually shows the largest, most upright P wave because it is roughly parallel to the heart's normal vector. That makes rhythm analysis easiest.",
  },
  // ── Waves ─────────────────────────────────────────────────────────
  {
    id: 'q.waves.p-represents',
    conceptId: 'basics.waves.p-wave',
    topic: 'waves',
    difficulty: 'beginner',
    prompt: 'What does the P wave represent?',
    choices: [
      { id: 'a', text: 'Atrial depolarization' },
      { id: 'b', text: 'Ventricular depolarization' },
      { id: 'c', text: 'Atrial repolarization' },
      { id: 'd', text: 'Ventricular repolarization' },
    ],
    correctChoiceId: 'a',
    explanation:
      'The P wave is atrial depolarization. Atrial repolarization is hidden inside the QRS. Ventricular depolarization is the QRS, and the T wave is ventricular repolarization.',
  },
  {
    id: 'q.waves.qrs-represents',
    conceptId: 'basics.waves.qrs',
    topic: 'waves',
    difficulty: 'beginner',
    prompt: 'What does the QRS complex represent?',
    choices: [
      { id: 'a', text: 'Ventricular depolarization' },
      { id: 'b', text: 'Ventricular repolarization' },
      { id: 'c', text: 'Atrial depolarization' },
      { id: 'd', text: 'Atrial contraction force' },
    ],
    correctChoiceId: 'a',
    explanation:
      'The QRS represents ventricular depolarization. Normal duration is < 0.12 s; a wider QRS suggests ventricular ectopy, bundle-branch block, or drug/electrolyte effect.',
  },
  {
    id: 'q.waves.t-represents',
    conceptId: 'basics.waves.t-wave',
    topic: 'waves',
    difficulty: 'beginner',
    prompt: 'What does the T wave represent?',
    choices: [
      { id: 'a', text: 'Ventricular repolarization' },
      { id: 'b', text: 'Atrial depolarization' },
      { id: 'c', text: 'AV-node delay' },
      { id: 'd', text: 'Ventricular contraction' },
    ],
    correctChoiceId: 'a',
    explanation:
      'The T wave is ventricular repolarization — the ventricles resetting electrically before the next beat.',
  },
  // ── Intervals ────────────────────────────────────────────────────
  {
    id: 'q.intervals.pr-normal',
    conceptId: 'basics.intervals.pr',
    topic: 'intervals',
    difficulty: 'beginner',
    prompt: 'What is the normal range for the PR interval?',
    choices: [
      { id: 'a', text: '0.06–0.10 seconds' },
      { id: 'b', text: '0.12–0.20 seconds' },
      { id: 'c', text: '0.20–0.40 seconds' },
      { id: 'd', text: '0.40–0.60 seconds' },
    ],
    correctChoiceId: 'b',
    explanation:
      'Normal PR is 0.12–0.20 seconds (3–5 small boxes). Longer than 0.20 s is first-degree AV block; shorter than 0.12 s with a delta wave is WPW.',
  },
  {
    id: 'q.intervals.long-pr',
    conceptId: 'basics.intervals.pr',
    topic: 'intervals',
    difficulty: 'beginner',
    prompt: 'A consistent PR interval of 0.28 s with every P followed by a QRS most likely represents:',
    choices: [
      { id: 'a', text: 'First-degree AV block' },
      { id: 'b', text: 'Second-degree AV block (Mobitz I)' },
      { id: 'c', text: 'Third-degree AV block' },
      { id: 'd', text: 'WPW pre-excitation' },
    ],
    correctChoiceId: 'a',
    explanation:
      'A consistently prolonged PR interval (> 0.20 s) with every P conducted is first-degree AV block. No beats are dropped — just slow conduction through the AV node.',
  },
  {
    id: 'q.intervals.qrs-width',
    conceptId: 'basics.waves.qrs',
    topic: 'intervals',
    difficulty: 'beginner',
    prompt: 'What is the upper limit of normal QRS duration?',
    choices: [
      { id: 'a', text: '0.04 seconds' },
      { id: 'b', text: '0.08 seconds' },
      { id: 'c', text: '0.12 seconds' },
      { id: 'd', text: '0.20 seconds' },
    ],
    correctChoiceId: 'c',
    explanation:
      'Normal QRS is < 0.12 seconds (3 small boxes). Wider QRS suggests ventricular origin, bundle-branch block, hyperkalemia, or sodium-channel-blocker toxicity.',
  },
  // ── Rate ──────────────────────────────────────────────────────────
  {
    id: 'q.rate.300-method-3-boxes',
    conceptId: 'basics.rate.300-method',
    topic: 'rate',
    difficulty: 'beginner',
    prompt:
      'A regular rhythm has 3 large boxes between consecutive R waves. The rate is approximately:',
    choices: [
      { id: 'a', text: '60 bpm' },
      { id: 'b', text: '75 bpm' },
      { id: 'c', text: '100 bpm' },
      { id: 'd', text: '150 bpm' },
    ],
    correctChoiceId: 'c',
    explanation:
      '300 ÷ 3 = 100 bpm. Memorize the sequence: 300, 150, 100, 75, 60, 50 for 1, 2, 3, 4, 5, 6 large boxes.',
  },
  {
    id: 'q.rate.6-second-method',
    conceptId: 'basics.rate.6-second',
    topic: 'rate',
    difficulty: 'beginner',
    prompt:
      'You count 8 QRS complexes on a 6-second rhythm strip in an irregular rhythm. What is the heart rate?',
    choices: [
      { id: 'a', text: '40 bpm' },
      { id: 'b', text: '60 bpm' },
      { id: 'c', text: '80 bpm' },
      { id: 'd', text: '100 bpm' },
    ],
    correctChoiceId: 'c',
    explanation:
      '8 × 10 = 80 bpm. Multiply complexes in a 6-second strip by 10. This is the preferred method for irregular rhythms like AFib.',
  },
  {
    id: 'q.rate.regular-method',
    conceptId: 'basics.rate.300-method',
    topic: 'rate',
    difficulty: 'beginner',
    prompt: 'Which rate-calculation method works ONLY for regular rhythms?',
    choices: [
      { id: 'a', text: 'The 300 (large-box) method' },
      { id: 'b', text: 'The 6-second strip method' },
      { id: 'c', text: 'Counting only the QRS complexes' },
      { id: 'd', text: 'Counting only the P waves' },
    ],
    correctChoiceId: 'a',
    explanation:
      'The 300 method assumes the next R wave will come at the same interval — only valid for regular rhythms. For irregular rhythms, count complexes in 6 seconds and multiply by 10.',
  },
  // ── Axis ──────────────────────────────────────────────────────────
  {
    id: 'q.axis.normal-quadrant',
    conceptId: 'basics.axis.quadrant',
    topic: 'axis',
    difficulty: 'intermediate',
    prompt:
      'In leads I and aVF the QRS is upright (positive) in both. The cardiac axis is:',
    choices: [
      { id: 'a', text: 'Normal' },
      { id: 'b', text: 'Left axis deviation' },
      { id: 'c', text: 'Right axis deviation' },
      { id: 'd', text: 'Extreme / northwest axis' },
    ],
    correctChoiceId: 'a',
    explanation:
      'Both I and aVF positive = normal axis. I up + aVF down = left axis. I down + aVF up = right axis. Both negative = extreme axis (rare and concerning).',
  },
  {
    id: 'q.axis.lad',
    conceptId: 'basics.axis.quadrant',
    topic: 'axis',
    difficulty: 'intermediate',
    prompt:
      'Lead I shows an upright QRS and aVF shows a negative QRS. The axis is:',
    choices: [
      { id: 'a', text: 'Normal' },
      { id: 'b', text: 'Left axis deviation' },
      { id: 'c', text: 'Right axis deviation' },
      { id: 'd', text: 'Indeterminate' },
    ],
    correctChoiceId: 'b',
    explanation:
      'I positive + aVF negative = left axis deviation. Causes include LAFB, LVH, inferior MI, and WPW.',
  },
  // ── Approach ──────────────────────────────────────────────────────
  {
    id: 'q.approach.first-step',
    conceptId: 'basics.approach.systematic',
    topic: 'approach',
    difficulty: 'beginner',
    prompt:
      'Before reading any 12-lead, what should you confirm at the very top of the strip?',
    choices: [
      { id: 'a', text: 'Patient ID, date/time, paper speed (25 mm/s) and gain (10 mm/mV)' },
      { id: 'b', text: 'Whether the patient is awake' },
      { id: 'c', text: 'The cardiac axis' },
      { id: 'd', text: 'The QTc' },
    ],
    correctChoiceId: 'a',
    explanation:
      'Always confirm patient ID + timestamp, calibration (paper speed and gain), and lead labeling before measuring anything. Non-standard speed or gain changes everything you measure.',
  },
];

export const BASICS_QUESTION_BY_ID: ReadonlyMap<string, BasicsQuestion> = new Map(
  BASICS_QUESTIONS.map((q) => [q.id, q]),
);
