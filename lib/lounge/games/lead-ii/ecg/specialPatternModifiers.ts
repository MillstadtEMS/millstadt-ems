/**
 * Pre-excitation, Brugada, and hypothermia 12-lead pattern modifiers.
 *
 * These are educational morphology layers. They deliberately operate on the
 * existing 12-lead projection so they can be composed with a sinus base without
 * adding fragile single-lead rhythm behavior.
 */

import type { ECGEvent, GeneratedECGSignal, RhythmId } from './types';
import type { ECGLead } from './leadTypes';
import type { TwelveLeadECG } from './twelveLeadTypes';
import { gaussian } from './generators/gaussianBeat';

type WpwVariant = 'generic' | 'type-a' | 'type-b';
type BrugadaVariant = 'umbrella' | 'type-1' | 'type-2';

function qrsTimes(signal: GeneratedECGSignal): number[] {
  return signal.events
    .filter((e) => e.kind === 'qrs-narrow' || e.kind === 'qrs-wide')
    .map((e) => e.tSec);
}

function tTimes(signal: GeneratedECGSignal): number[] {
  return signal.events
    .filter((e) => e.kind === 't-wave')
    .map((e) => e.tSec);
}

function tagQrs(signal: GeneratedECGSignal, meta: Readonly<Record<string, string | boolean | number>>): GeneratedECGSignal {
  const events: ECGEvent[] = signal.events.map((event) => {
    if (event.kind !== 'qrs-narrow' && event.kind !== 'qrs-wide') return event;
    return {
      ...event,
      kind: 'qrs-wide',
      meta: { ...(event.meta ?? {}), ...meta },
    };
  });
  return { ...signal, events };
}

function deltaAmplitudeForLead(lead: ECGLead, variant: WpwVariant): number {
  if (variant === 'type-a') {
    if (lead === 'V1') return 0.46;
    if (lead === 'V2') return 0.34;
    if (lead === 'V3') return 0.24;
  }
  if (variant === 'type-b') {
    if (lead === 'V1') return -0.46;
    if (lead === 'V2') return -0.32;
    if (lead === 'V3') return -0.18;
  }
  const map: Partial<Record<ECGLead, number>> = {
    I: 0.16,
    II: 0.20,
    III: 0.10,
    aVR: -0.16,
    aVL: 0.12,
    aVF: 0.16,
    V1: variant === 'generic' ? 0.24 : 0,
    V2: variant === 'generic' ? 0.20 : 0,
    V3: 0.18,
    V4: 0.18,
    V5: 0.16,
    V6: 0.14,
  };
  return map[lead] ?? 0.12;
}

function applyDeltaWave(signal: GeneratedECGSignal, lead: ECGLead, variant: WpwVariant): GeneratedECGSignal {
  const deltaMv = deltaAmplitudeForLead(lead, variant);
  const qrs = qrsTimes(signal);
  const points = signal.points.map((point) => {
    let mv = point.mv;
    for (const qrsT of qrs) {
      mv += gaussian(point.t, qrsT - 0.030, 0.022, deltaMv);
      // Subtle broadening into the QRS upstroke makes the onset look slurred.
      mv += gaussian(point.t, qrsT - 0.010, 0.030, deltaMv * 0.45);
    }
    return { t: point.t, mv };
  });
  return tagQrs({ ...signal, points }, { preExcitation: variant, deltaWave: true });
}

function applyWpwVariant(base: TwelveLeadECG, patternId: RhythmId, variant: WpwVariant): TwelveLeadECG {
  const leads = { ...base.leads };
  for (const lead of Object.keys(leads) as ECGLead[]) {
    leads[lead] = applyDeltaWave(leads[lead], lead, variant);
  }
  const variantHint = variant === 'type-a'
    ? 'Type A: positive/dominant V1 pre-excitation pattern'
    : variant === 'type-b'
    ? 'Type B: negative/dominant S in V1 pre-excitation pattern'
    : 'Short PR with delta-wave slurred QRS onset';

  return {
    ...base,
    patternIds: [...base.patternIds, patternId],
    leads,
    interpretationHints: [
      ...base.interpretationHints,
      'WPW/pre-excitation: short PR, delta wave, widened QRS onset',
      variantHint,
      'If AF becomes fast, broad, and irregular, avoid AV-nodal blockers',
    ],
    metadata: {
      ...base.metadata,
      conductionPatternId: patternId,
      affectedLeads: ['I', 'II', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'],
      reciprocalLeads: [],
      patternCategory: 'conduction',
    },
  };
}

export function applyWpw(base: TwelveLeadECG): TwelveLeadECG {
  return applyWpwVariant(base, 'conduction.wpw', 'generic');
}

export function applyWpwTypeA(base: TwelveLeadECG): TwelveLeadECG {
  return applyWpwVariant(base, 'conduction.wpw-type-a', 'type-a');
}

export function applyWpwTypeB(base: TwelveLeadECG): TwelveLeadECG {
  return applyWpwVariant(base, 'conduction.wpw-type-b', 'type-b');
}

function applyBrugadaShape(signal: GeneratedECGSignal, variant: BrugadaVariant): GeneratedECGSignal {
  const qrs = qrsTimes(signal);
  const ts = tTimes(signal);
  const points = signal.points.map((point) => {
    let mv = point.mv;
    for (const qrsT of qrs) {
      if (variant === 'type-2') {
        mv += gaussian(point.t, qrsT + 0.052, 0.018, 0.34); // high takeoff
        mv += gaussian(point.t, qrsT + 0.120, 0.032, -0.10); // saddle dip
        mv += gaussian(point.t, qrsT + 0.185, 0.045, 0.18); // second upward deflection
      } else {
        const stStart = qrsT + 0.040;
        const stEnd = qrsT + 0.210;
        if (point.t >= stStart && point.t <= stEnd) {
          const progress = (point.t - stStart) / Math.max(0.001, stEnd - stStart);
          mv += 0.32 - progress * 0.20; // coved descent from >=2 mm to lower ST
        }
      }
    }
    for (const t of ts) {
      if (variant === 'type-2') {
        mv += gaussian(point.t, t, 0.052, 0.12);
      } else {
        mv += gaussian(point.t, t, 0.060, -0.36);
      }
    }
    return { t: point.t, mv };
  });
  return tagQrs({ ...signal, points }, { brugadaPattern: variant });
}

function applyBrugadaVariant(base: TwelveLeadECG, patternId: RhythmId, variant: BrugadaVariant): TwelveLeadECG {
  const leads = { ...base.leads };
  for (const lead of ['V1', 'V2', 'V3'] as ECGLead[]) {
    leads[lead] = applyBrugadaShape(leads[lead], variant);
  }
  return {
    ...base,
    patternIds: [...base.patternIds, patternId],
    leads,
    interpretationHints: [
      ...base.interpretationHints,
      variant === 'type-2'
        ? 'Brugada Type 2: saddleback ST elevation in V1-V2; suggestive, not diagnostic by itself'
        : 'Brugada Type 1: coved ST elevation >=2 mm in V1-V2 followed by inverted T wave',
      'Can mimic incomplete RBBB or septal STEMI; clinical context matters',
    ],
    metadata: {
      ...base.metadata,
      conductionPatternId: patternId === 'conduction.brugada-pattern' ? patternId : base.metadata.conductionPatternId,
      specialPatternId: patternId,
      affectedLeads: ['V1', 'V2', 'V3'],
      reciprocalLeads: [],
      patternCategory: 'special',
    },
  };
}

export function applyBrugadaPattern(base: TwelveLeadECG): TwelveLeadECG {
  return applyBrugadaVariant(base, 'conduction.brugada-pattern', 'umbrella');
}

export function applyBrugadaType1(base: TwelveLeadECG): TwelveLeadECG {
  return applyBrugadaVariant(base, 'special.brugada-type-1', 'type-1');
}

export function applyBrugadaType2(base: TwelveLeadECG): TwelveLeadECG {
  return applyBrugadaVariant(base, 'special.brugada-type-2', 'type-2');
}

function applyOsbornWave(signal: GeneratedECGSignal, lead: ECGLead): GeneratedECGSignal {
  const qrs = qrsTimes(signal);
  const lateralOrInferior = ['II', 'aVL', 'aVF', 'V4', 'V5', 'V6'].includes(lead);
  const amplitude = lateralOrInferior ? 0.34 : 0.16;
  const points = signal.points.map((point) => {
    let mv = point.mv;
    for (const qrsT of qrs) {
      mv += gaussian(point.t, qrsT + 0.052, 0.020, amplitude);
      // Mild interval/repolarization effect: broaden the T wave and pull rate context into the visual.
      mv += gaussian(point.t, qrsT + 0.310, 0.095, 0.05);
    }
    // Shivering/tremor artifact: deterministic high-frequency ripple.
    mv += 0.018 * Math.sin(2 * Math.PI * 8 * point.t) + 0.010 * Math.sin(2 * Math.PI * 14 * point.t);
    return { t: point.t, mv };
  });
  return { ...signal, points };
}

export function applyHypothermia(base: TwelveLeadECG): TwelveLeadECG {
  const leads = { ...base.leads };
  for (const lead of Object.keys(leads) as ECGLead[]) {
    leads[lead] = applyOsbornWave(leads[lead], lead);
  }
  return {
    ...base,
    patternIds: [...base.patternIds, 'special.hypothermia'],
    leads,
    interpretationHints: [
      ...base.interpretationHints,
      'Hypothermia: Osborn/J waves at the J point, most visible in lateral leads',
      'Expect bradycardia, interval prolongation, and tremor artifact in the right scenario context',
    ],
    metadata: {
      ...base.metadata,
      specialPatternId: 'special.hypothermia',
      affectedLeads: ['II', 'aVL', 'aVF', 'V4', 'V5', 'V6'],
      reciprocalLeads: [],
      patternCategory: 'special',
    },
  };
}
