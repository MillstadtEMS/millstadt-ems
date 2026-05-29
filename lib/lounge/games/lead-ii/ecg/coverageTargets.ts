/**
 * Required teaching targets the coverage manifest MUST account for.
 *
 * These lists are part of the product taxonomy — not test fixtures. They live
 * here (alongside the manifest) so any module that needs to know "what does
 * this product promise to teach?" reads from one place. The coverage tests
 * import these and assert that every entry resolves to a manifest row.
 *
 * Adding a new required target:
 *   1. Append to the appropriate list below.
 *   2. Add a manifest row in `coverageManifest.ts` with the chosen status.
 *   3. The coverage test will fail until step 2 is done.
 */

/**
 * Targets that the original product brief explicitly requested.
 * Each entry MUST appear in the coverage manifest with one of:
 * covered / merged-into / out-of-scope / planned.
 */
export const REQUIRED_PROMPT_TARGETS: readonly string[] = [
  // Sinus rhythms
  'Normal Sinus Rhythm',
  'Sinus Bradycardia',
  'Sinus Tachycardia',
  'Sinus Arrhythmia',
  'Sinus Arrest / Pause',

  // Atrial rhythms
  'Atrial Fibrillation',
  'Atrial Flutter',
  'Supraventricular Tachycardia',
  'Premature Atrial Contractions',
  'Wandering Atrial Pacemaker',
  'Multifocal Atrial Tachycardia',

  // Junctional rhythms
  'Junctional Rhythm',
  'Accelerated Junctional Rhythm',
  'Junctional Tachycardia',
  'Premature Junctional Contractions',

  // Ventricular rhythms
  'Premature Ventricular Contractions',
  'PVC Couplets',
  'PVC Triplets',
  'Ventricular Bigeminy',
  'Ventricular Trigeminy',
  'R-on-T PVC',
  'Idioventricular Rhythm',
  'Accelerated Idioventricular Rhythm',
  'Stable Ventricular Tachycardia',
  'Unstable Ventricular Tachycardia',
  'Ventricular Fibrillation',
  'Torsades de Pointes',
  'Polymorphic Ventricular Tachycardia',
  'Asystole',
  'Pulseless Electrical Activity',

  // AV blocks
  'First-Degree AV Block',
  'Second-Degree AV Block Type I (Wenckebach)',
  'Second-Degree AV Block Type II (Mobitz II)',
  'Third-Degree AV Block (Complete Heart Block)',
  'High-Grade AV Block',
  'AV Dissociation',

  // Pacemaker rhythms
  'Atrial Paced Rhythm',
  'Ventricular Paced Rhythm',
  'AV Paced / Dual Chamber Paced Rhythm',
  'Failure to Pace',
  'Failure to Capture',
  'Failure to Sense',
  'Oversensing',
  'Undersensing',

  // Conduction abnormalities
  'Right Bundle Branch Block',
  'Left Bundle Branch Block',
  'Wide-Complex Tachycardia',
  'Irregular Wide-Complex Tachycardia',
  'WPW / Pre-excitation',
  'Long QT',
  'Short QT',
  'Brugada Pattern',

  // Ischemia / STEMI / 12-lead patterns
  'ST Depression / Ischemia',
  'Inferior STEMI',
  'Anterior STEMI',
  'Lateral STEMI',
  'Anterolateral STEMI',
  'Septal STEMI',
  'Posterior STEMI',
  'Right Ventricular STEMI',
  'Sgarbossa Criteria',
  'Modified Sgarbossa Criteria',
  'Wellens Pattern',
  'De Winter Pattern',
  'Pericarditis Mimic',

  // Electrolyte / toxicologic patterns
  'Hyperkalemia with Peaked T Waves',
  'Hyperkalemia Progression',
  'Sine-Wave Hyperkalemia Pattern',
];

/**
 * LITFL-style teaching topics requested in the correction pass.
 * Each entry MUST appear in the coverage manifest.
 */
export const REQUIRED_LITFL_STYLE_TARGETS: readonly string[] = [
  'Aslanger Pattern',
  'Bundgaard Syndrome',
  'Masquerading Bundle Branch Block',
  'Fusion Beats',
  'Low QRS Voltage',
  'ECG Motion Artefact',
  'Myocarditis',
  'Poor R Wave Progression',
  'Ventricular Flutter',
  'Carbamazepine Toxicity',
  'Quetiapine Toxicity',
  'Hyperthyroidism ECG Changes',
  'Hypothyroidism ECG Changes',
  'R-Wave Peak Time',
  'Q Wave',
  'R Wave',
  'U Wave',
  'J Wave',
  'Delta Wave',
  'Epsilon Wave',
  'PR Segment',
  'ST Segment',
  'J Point',
  'VT vs SVT Differentiation',
  'Pediatric ECG Interpretation',
];
