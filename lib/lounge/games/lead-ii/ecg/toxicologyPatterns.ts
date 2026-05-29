/**
 * Toxicology ECG-pattern engine.
 *
 * Severity-tier parameters for the toxic ingestions an emergency clinician
 * needs to recognize on the monitor. The catalog already exposes rhythm
 * ids (`electrolyte.tca-toxicity`, `electrolyte.bb-toxicity`, etc.); this
 * module is the *clinical data layer* — what each tier looks like
 * (QRS width, intervals, rate, characteristic findings), what predicts
 * the next bad thing, and how the simulator should render or quiz it.
 *
 * Pure TypeScript. No React / RN / Skia imports. Same pattern as
 * `coronaryTerritory.ts` — data + helper functions, fully testable.
 *
 * Source basis (paraphrased):
 *   - LITFL toxicology pages
 *   - Goldfrank's Toxicologic Emergencies (chapters on Na-channel
 *     blockade, β-blocker / CCB cardiotoxicity, anticonvulsants,
 *     antipsychotic QT prolongation)
 *   - User's own implementation guide (Parts 13–16)
 */

import type { RhythmId } from './types';

export type ToxSeverity = 'mild' | 'moderate' | 'severe';

export type ToxAgent =
  | 'tca'
  | 'beta-blocker'
  | 'calcium-channel-blocker'
  | 'carbamazepine'
  | 'quetiapine'
  | 'cocaine'
  | 'lithium'
  | 'digoxin';

export interface ToxParameters {
  /** Resting ventricular rate the simulator should produce. */
  rateBpm: number;
  /** PR interval in ms (or null if PR is unmeasurable). */
  prMs: number | null;
  /** QRS duration in ms. */
  qrsMs: number;
  /** Corrected QT in ms. */
  qtcMs: number;
  /** Whether a terminal R wave appears in aVR (≥ 3 mm signals Na-channel toxicity). */
  aVRTerminalRmm: number;
  /** Right-axis deviation flag (terminal 40 ms of QRS). */
  rightAxisDeviationTerminal40ms: boolean;
  /** Imminent arrhythmias the engine should make available to scenario branching. */
  imminentArrhythmias: readonly RhythmId[];
  /** Free-text clinical features (one short clause per item). */
  clinicalFeatures: readonly string[];
}

export interface ToxAgentSpec {
  agent: ToxAgent;
  rhythmId: RhythmId;
  displayName: string;
  mechanism: string;
  antidote: string;
  /** Per-severity ECG parameter envelopes. */
  tiers: Record<ToxSeverity, ToxParameters>;
  /** Clinical pearls — one short sentence each. */
  pearls: readonly string[];
}

// ── Spec library ──────────────────────────────────────────────────────

const tcaSpec: ToxAgentSpec = {
  agent: 'tca',
  rhythmId: 'electrolyte.tca-toxicity',
  displayName: 'Tricyclic antidepressant toxicity',
  mechanism:
    'Sodium-channel blockade slows phase-0 depolarization (QRS widens, terminal R in aVR), with concomitant anticholinergic, α-blocker, and biogenic-amine reuptake effects.',
  antidote: 'IV sodium bicarbonate 1–2 mEq/kg bolus, repeat to target pH 7.45–7.55 and QRS narrowing.',
  tiers: {
    mild: {
      rateBpm: 100,
      prMs: 180,
      qrsMs: 110,
      qtcMs: 460,
      aVRTerminalRmm: 0,
      rightAxisDeviationTerminal40ms: false,
      imminentArrhythmias: [],
      clinicalFeatures: ['Sinus tachycardia', 'Mild QRS widening'],
    },
    moderate: {
      rateBpm: 130,
      prMs: 200,
      qrsMs: 140,
      qtcMs: 520,
      aVRTerminalRmm: 4,
      rightAxisDeviationTerminal40ms: true,
      imminentArrhythmias: ['vent.vtach-stable', 'vent.torsades'],
      clinicalFeatures: [
        'QRS 120–160 ms',
        'Terminal R wave in aVR ≥ 3 mm with R/S ratio > 0.7',
        'Right axis deviation of the terminal QRS',
        'Brugada-like pattern can appear in V1–V2',
      ],
    },
    severe: {
      rateBpm: 60,
      prMs: 240,
      qrsMs: 200,
      qtcMs: 580,
      aVRTerminalRmm: 6,
      rightAxisDeviationTerminal40ms: true,
      imminentArrhythmias: ['vent.vtach-stable', 'vent.vfib', 'vent.asystole'],
      clinicalFeatures: [
        'QRS approaching sine-wave morphology',
        'Bradycardia, hypotension',
        'Imminent VT / VF / asystole — start IV bicarbonate now',
      ],
    },
  },
  pearls: [
    'QRS > 100 ms predicts seizures; QRS > 160 ms predicts ventricular arrhythmias.',
    'Lidocaine — not amiodarone or procainamide — is the antiarrhythmic of choice when ventricular ectopy persists after bicarbonate.',
    'Do not give flumazenil if a benzodiazepine was co-ingested; it can precipitate seizures.',
  ],
};

const betaBlockerSpec: ToxAgentSpec = {
  agent: 'beta-blocker',
  rhythmId: 'electrolyte.bb-toxicity',
  displayName: 'Beta-blocker toxicity',
  mechanism:
    'β1 receptor blockade reduces cAMP → diminished chronotropy, dromotropy, and inotropy. Hypotension is from reduced cardiac output (not vasodilation).',
  antidote: 'High-dose insulin euglycemia (HIET) is the modern cornerstone. Glucagon, IV calcium, lipid emulsion, and norepinephrine adjuncts.',
  tiers: {
    mild: {
      rateBpm: 55,
      prMs: 200,
      qrsMs: 90,
      qtcMs: 420,
      aVRTerminalRmm: 0,
      rightAxisDeviationTerminal40ms: false,
      imminentArrhythmias: [],
      clinicalFeatures: ['Sinus bradycardia', 'PR interval at the upper limit of normal'],
    },
    moderate: {
      rateBpm: 45,
      prMs: 240,
      qrsMs: 95,
      qtcMs: 440,
      aVRTerminalRmm: 0,
      rightAxisDeviationTerminal40ms: false,
      imminentArrhythmias: ['av-block.second-mobitz-i'],
      clinicalFeatures: ['Sinus bradycardia or junctional escape', '1st or 2nd-degree AV block', 'Narrow QRS'],
    },
    severe: {
      rateBpm: 30,
      prMs: null,
      qrsMs: 90,
      qtcMs: 460,
      aVRTerminalRmm: 0,
      rightAxisDeviationTerminal40ms: false,
      imminentArrhythmias: ['av-block.third-degree', 'vent.asystole'],
      clinicalFeatures: [
        'Junctional or ventricular escape rhythm',
        'Complete heart block',
        'Persistent hypotension despite atropine',
        'QRS usually still narrow — distinguishes from CCB-with-DHP and from TCA',
      ],
    },
  },
  pearls: [
    'QRS is usually NARROW in β-blocker toxicity — wide QRS suggests a sodium-channel blocker (propranolol, sotalol).',
    'Sotalol toxicity is a special case: adds Class III effect → QT prolongation and risk of torsades.',
    'Propranolol toxicity additionally causes sodium-channel blockade — looks like a TCA on the ECG.',
  ],
};

const ccbSpec: ToxAgentSpec = {
  agent: 'calcium-channel-blocker',
  rhythmId: 'electrolyte.ccb-toxicity',
  displayName: 'Calcium-channel blocker toxicity',
  mechanism:
    'L-type calcium-channel blockade reduces SA / AV nodal conduction and impairs myocardial contractility. Non-dihydropyridines (verapamil, diltiazem) dominate cardiac toxicity; dihydropyridines cause vasodilation and reflex tachycardia.',
  antidote: 'IV calcium gluconate or chloride; high-dose insulin euglycemia; vasopressors; lipid emulsion for refractory cases.',
  tiers: {
    mild: {
      rateBpm: 50,
      prMs: 210,
      qrsMs: 90,
      qtcMs: 420,
      aVRTerminalRmm: 0,
      rightAxisDeviationTerminal40ms: false,
      imminentArrhythmias: [],
      clinicalFeatures: ['Sinus bradycardia', 'Mild PR prolongation'],
    },
    moderate: {
      rateBpm: 40,
      prMs: 260,
      qrsMs: 92,
      qtcMs: 430,
      aVRTerminalRmm: 0,
      rightAxisDeviationTerminal40ms: false,
      imminentArrhythmias: ['av-block.second-mobitz-i'],
      clinicalFeatures: ['Mobitz I conduction with grouped beating', 'Hypotension responsive to fluids and calcium'],
    },
    severe: {
      rateBpm: 28,
      prMs: null,
      qrsMs: 95,
      qtcMs: 440,
      aVRTerminalRmm: 0,
      rightAxisDeviationTerminal40ms: false,
      imminentArrhythmias: ['av-block.third-degree', 'vent.idioventricular', 'vent.asystole'],
      clinicalFeatures: [
        'Complete heart block with a slow junctional / ventricular escape',
        'Profound hypotension; cardiogenic shock',
        'QRS usually narrow — wide QRS only with dihydropyridine + tachycardia or very late presentation',
      ],
    },
  },
  pearls: [
    'Verapamil and diltiazem give bradycardia + AV block; nifedipine and amlodipine give reflex tachycardia and refractory hypotension.',
    'High-dose insulin (1 unit/kg bolus, then 0.5–1 unit/kg/hr titrated to BP) is now the cornerstone — keep glucose 100–200 with concurrent dextrose infusion.',
    'Calcium gluconate 3 g IV is the rapid bedside move; central calcium chloride is preferred for severe cases.',
  ],
};

const carbamazepineSpec: ToxAgentSpec = {
  agent: 'carbamazepine',
  rhythmId: 'electrolyte.carbamazepine-toxicity',
  displayName: 'Carbamazepine toxicity',
  mechanism:
    'Sodium-channel blockade (similar to TCAs) plus anticholinergic effects plus active 10,11-epoxide metabolite that prolongs CNS toxicity.',
  antidote: 'IV sodium bicarbonate for wide QRS; multiple-dose activated charcoal accelerates clearance; hemodialysis in severe.',
  tiers: {
    mild: {
      rateBpm: 100,
      prMs: 180,
      qrsMs: 95,
      qtcMs: 450,
      aVRTerminalRmm: 0,
      rightAxisDeviationTerminal40ms: false,
      imminentArrhythmias: [],
      clinicalFeatures: ['Sinus tachycardia', 'Mild PR prolongation', 'Diplopia, ataxia, nystagmus'],
    },
    moderate: {
      rateBpm: 80,
      prMs: 220,
      qrsMs: 130,
      qtcMs: 490,
      aVRTerminalRmm: 3,
      rightAxisDeviationTerminal40ms: true,
      imminentArrhythmias: ['av-block.second-mobitz-i'],
      clinicalFeatures: [
        'QRS prolongation similar to TCA',
        'AV block — typically Mobitz I',
        'Coma, seizures',
      ],
    },
    severe: {
      rateBpm: 50,
      prMs: 280,
      qrsMs: 170,
      qtcMs: 530,
      aVRTerminalRmm: 5,
      rightAxisDeviationTerminal40ms: true,
      imminentArrhythmias: ['av-block.third-degree', 'vent.vfib'],
      clinicalFeatures: [
        'Bradycardia, hypotension',
        'High-grade AV block',
        'Status epilepticus',
        'Refractory shock — early dialysis',
      ],
    },
  },
  pearls: [
    'Same QRS-widening pattern as TCA toxicity; bicarbonate is the bedside move.',
    'Auto-induces its own CYP450 metabolism — chronic toxicity can look milder serologically than the clinical picture suggests.',
    'Whole-bowel irrigation + multiple-dose charcoal because of slow GI absorption and enterohepatic recirculation.',
  ],
};

const quetiapineSpec: ToxAgentSpec = {
  agent: 'quetiapine',
  rhythmId: 'electrolyte.quetiapine-toxicity',
  displayName: 'Quetiapine toxicity',
  mechanism:
    'Anticholinergic + α1-blockade + hERG potassium channel inhibition (QT prolongation). Mild sodium-channel effects at very high doses.',
  antidote: 'Supportive (airway, fluids, vasopressor). Magnesium for torsades. Bicarbonate only if QRS widens.',
  tiers: {
    mild: {
      rateBpm: 110,
      prMs: 180,
      qrsMs: 90,
      qtcMs: 460,
      aVRTerminalRmm: 0,
      rightAxisDeviationTerminal40ms: false,
      imminentArrhythmias: [],
      clinicalFeatures: ['Sinus tachycardia (anticholinergic)', 'Mild somnolence'],
    },
    moderate: {
      rateBpm: 120,
      prMs: 180,
      qrsMs: 100,
      qtcMs: 500,
      aVRTerminalRmm: 0,
      rightAxisDeviationTerminal40ms: false,
      imminentArrhythmias: ['vent.torsades'],
      clinicalFeatures: [
        'Sinus tachycardia',
        'QT prolongation > 500 ms',
        'Hypotension from α1 blockade',
        'Flattened or inverted T waves',
      ],
    },
    severe: {
      rateBpm: 130,
      prMs: 180,
      qrsMs: 130,
      qtcMs: 580,
      aVRTerminalRmm: 0,
      rightAxisDeviationTerminal40ms: false,
      imminentArrhythmias: ['vent.torsades', 'vent.vfib'],
      clinicalFeatures: [
        'QTc > 550 ms — torsades risk',
        'Mild QRS widening only with very high doses',
        'Coma, refractory hypotension',
      ],
    },
  },
  pearls: [
    'QT prolongation is the dominant cardiac finding — keep magnesium at the bedside.',
    'QRS widening is uncommon unless co-ingested with another sodium-channel blocker.',
    'Routine cardiac monitoring × 24 hours after a large overdose because of delayed QT effects.',
  ],
};

// Cocaine, lithium, digoxin — placeholders that the existing catalog
// already covers from their own files. We keep simple stubs here so the
// validation engine can still ask "what does the chart look like for X?"

const cocaineSpec: ToxAgentSpec = {
  agent: 'cocaine',
  rhythmId: 'electrolyte.cocaine-toxicity',
  displayName: 'Cocaine toxicity',
  mechanism: 'Sympathomimetic + sodium-channel blockade. Acute hypertension, tachycardia, vasospasm, demand ischemia.',
  antidote: 'Benzodiazepines first-line; nitrates and CCBs for ischemia; AVOID β-blockers (unopposed α).',
  tiers: {
    mild: {
      rateBpm: 130,
      prMs: 150,
      qrsMs: 90,
      qtcMs: 440,
      aVRTerminalRmm: 0,
      rightAxisDeviationTerminal40ms: false,
      imminentArrhythmias: [],
      clinicalFeatures: ['Sinus tachycardia', 'Hypertension'],
    },
    moderate: {
      rateBpm: 140,
      prMs: 150,
      qrsMs: 120,
      qtcMs: 470,
      aVRTerminalRmm: 3,
      rightAxisDeviationTerminal40ms: false,
      imminentArrhythmias: ['vent.vtach-stable'],
      clinicalFeatures: ['QRS widening from sodium-channel blockade', 'Demand ischemia / vasospastic ST changes'],
    },
    severe: {
      rateBpm: 150,
      prMs: 150,
      qrsMs: 160,
      qtcMs: 520,
      aVRTerminalRmm: 5,
      rightAxisDeviationTerminal40ms: true,
      imminentArrhythmias: ['vent.vfib', 'ischemia.anterior-stemi'],
      clinicalFeatures: ['Sodium-channel block + acute coronary occlusion physiology', 'Hyperthermia, agitation'],
    },
  },
  pearls: [
    'β-blockers are contraindicated in suspected cocaine ACS — unopposed α causes coronary vasospasm.',
    'Bicarbonate narrows the QRS when sodium-channel blockade dominates.',
    'Benzodiazepines treat both the cardiovascular and neurologic components.',
  ],
};

const lithiumSpec: ToxAgentSpec = {
  agent: 'lithium',
  rhythmId: 'electrolyte.lithium-toxicity',
  displayName: 'Lithium toxicity',
  mechanism: 'Inhibits Na/K-ATPase and disrupts ion gradients; cardiac effects mimic chronic hypokalemia plus diffuse T-wave changes.',
  antidote: 'Volume resuscitation; hemodialysis is the definitive treatment for severe levels.',
  tiers: {
    mild: {
      rateBpm: 70,
      prMs: 180,
      qrsMs: 90,
      qtcMs: 430,
      aVRTerminalRmm: 0,
      rightAxisDeviationTerminal40ms: false,
      imminentArrhythmias: [],
      clinicalFeatures: ['Flattened T waves', 'Tremor, ataxia'],
    },
    moderate: {
      rateBpm: 60,
      prMs: 200,
      qrsMs: 95,
      qtcMs: 470,
      aVRTerminalRmm: 0,
      rightAxisDeviationTerminal40ms: false,
      imminentArrhythmias: ['av-block.first-degree'],
      clinicalFeatures: ['T-wave inversion', 'Prolonged QT', 'Sinus bradycardia'],
    },
    severe: {
      rateBpm: 45,
      prMs: 240,
      qrsMs: 110,
      qtcMs: 530,
      aVRTerminalRmm: 0,
      rightAxisDeviationTerminal40ms: false,
      imminentArrhythmias: ['vent.torsades'],
      clinicalFeatures: ['SA / AV nodal block', 'Diffuse T inversion', 'Acute kidney injury accelerating toxicity'],
    },
  },
  pearls: [
    'Levels > 2.5 mEq/L with neurologic findings = dialysis.',
    'Cardiac findings lag clinical neurologic toxicity; never wait for ECG before treating.',
    'NS volume helps mild toxicity; saline does NOT lower a high lithium level meaningfully in moderate / severe.',
  ],
};

const digoxinSpec: ToxAgentSpec = {
  agent: 'digoxin',
  rhythmId: 'electrolyte.digoxin-toxicity',
  displayName: 'Digoxin toxicity',
  mechanism: 'Na/K-ATPase inhibition → intracellular hyperkalemia and increased intracellular calcium → enhanced automaticity + AV block.',
  antidote: 'Digoxin-specific antibody fragments (DigiFab). Avoid IV calcium even with hyperkalemia.',
  tiers: {
    mild: {
      rateBpm: 60,
      prMs: 220,
      qrsMs: 90,
      qtcMs: 360,
      aVRTerminalRmm: 0,
      rightAxisDeviationTerminal40ms: false,
      imminentArrhythmias: [],
      clinicalFeatures: ['Scooped "Salvador Dali" ST depression', 'Slightly prolonged PR', 'Shortened QT'],
    },
    moderate: {
      rateBpm: 50,
      prMs: 260,
      qrsMs: 95,
      qtcMs: 370,
      aVRTerminalRmm: 0,
      rightAxisDeviationTerminal40ms: false,
      imminentArrhythmias: ['av-block.second-mobitz-i'],
      clinicalFeatures: ['Frequent PVCs / bigeminy', 'Atrial tachycardia with block (classic)', 'Junctional escape'],
    },
    severe: {
      rateBpm: 40,
      prMs: null,
      qrsMs: 100,
      qtcMs: 380,
      aVRTerminalRmm: 0,
      rightAxisDeviationTerminal40ms: false,
      imminentArrhythmias: ['vent.bidirectional-vt', 'vent.vfib', 'av-block.third-degree'],
      clinicalFeatures: [
        'Bidirectional VT — nearly pathognomonic',
        'Regularization of AFib (junctional takeover)',
        'High-grade or complete heart block',
        'Hyperkalemia (intracellular ATPase failure)',
      ],
    },
  },
  pearls: [
    'Bidirectional VT in the right clinical context is digoxin until proven otherwise.',
    'Regularization of irregular AFib means complete heart block with a regular junctional escape — concerning, not reassuring.',
    'AVOID cardioversion — can precipitate refractory VF. DigiFab is the answer.',
  ],
};

export const TOX_AGENT_SPECS: readonly ToxAgentSpec[] = [
  tcaSpec,
  betaBlockerSpec,
  ccbSpec,
  carbamazepineSpec,
  quetiapineSpec,
  cocaineSpec,
  lithiumSpec,
  digoxinSpec,
];

export const TOX_AGENT_SPECS_BY_AGENT: ReadonlyMap<ToxAgent, ToxAgentSpec> = new Map(
  TOX_AGENT_SPECS.map((s) => [s.agent, s]),
);

export const TOX_AGENT_SPECS_BY_RHYTHM_ID: ReadonlyMap<RhythmId, ToxAgentSpec> = new Map(
  TOX_AGENT_SPECS.map((s) => [s.rhythmId, s]),
);

/** Look up the ECG parameters for an (agent, severity) combination. */
export function toxParameters(agent: ToxAgent, severity: ToxSeverity): ToxParameters | undefined {
  return TOX_AGENT_SPECS_BY_AGENT.get(agent)?.tiers[severity];
}

/**
 * Given a QRS width, classify TCA / Na-channel-blocker severity per the
 * canonical clinical thresholds (QRS > 100 ms = seizure risk; > 160 ms =
 * ventricular arrhythmia risk).
 */
export function classifySodiumChannelSeverity(qrsMs: number, aVRTerminalRmm = 0): ToxSeverity {
  if (qrsMs >= 160 || aVRTerminalRmm >= 5) return 'severe';
  if (qrsMs >= 120 || aVRTerminalRmm >= 3) return 'moderate';
  return 'mild';
}
