/**
 * Conduction modifiers — Right and Left Bundle Branch Block.
 *
 * A modifier takes a base 12-lead ECG and returns a 12-lead ECG with the
 * conduction layer applied:
 *   - QRS widens (extra "tail" component added per lead)
 *   - Per-lead morphology adjustments per RBBB / LBBB conventions
 *   - Metadata tagged with the conduction pattern
 *
 * Phase-6 single-lead caveat: real RBBB shows V1 rsR' (a second positive
 * deflection) — we approximate with an additional positive bump on V1 and
 * an additional terminal negative bump on lateral leads (I, V6). LBBB
 * inverts the V1 polarity dominance and broadens lateral lead R waves with
 * notching. These are educational morphology hints, not full vector models.
 */

import type { ECGEvent, GeneratedECGSignal } from './types';
import type { ECGLead } from './leadTypes';
import type { TwelveLeadECG } from './twelveLeadTypes';
import { gaussian } from './generators/gaussianBeat';

interface QrsTerminalBump {
  /** Time offset (seconds) AFTER the QRS R-peak event. */
  offsetSec: number;
  amplitudeMv: number;
  sigmaSec: number;
}

interface ConductionPerLeadShape {
  bumps: QrsTerminalBump[];
}

/** RBBB per-lead terminal QRS shaping. */
const RBBB_PER_LEAD: Partial<Record<ECGLead, ConductionPerLeadShape>> = {
  // V1: rsR' — second positive deflection ~60ms after R
  V1: { bumps: [{ offsetSec: 0.060, amplitudeMv: 0.45, sigmaSec: 0.020 }] },
  V2: { bumps: [{ offsetSec: 0.060, amplitudeMv: 0.30, sigmaSec: 0.020 }] },
  // I, V5, V6: terminal slurred negative S (broad downward bump)
  I:  { bumps: [{ offsetSec: 0.055, amplitudeMv: -0.30, sigmaSec: 0.025 }] },
  V5: { bumps: [{ offsetSec: 0.055, amplitudeMv: -0.30, sigmaSec: 0.025 }] },
  V6: { bumps: [{ offsetSec: 0.055, amplitudeMv: -0.30, sigmaSec: 0.025 }] },
  // aVL/aVR get small contributions; II/III/aVF mostly preserved
};

/** LBBB per-lead terminal QRS shaping (broad notched, opposite polarity in V1). */
const LBBB_PER_LEAD: Partial<Record<ECGLead, ConductionPerLeadShape>> = {
  // V1: deep broad S — extra negative bump
  V1: { bumps: [{ offsetSec: 0.040, amplitudeMv: -0.60, sigmaSec: 0.030 }] },
  V2: { bumps: [{ offsetSec: 0.040, amplitudeMv: -0.45, sigmaSec: 0.030 }] },
  // I, aVL, V5, V6: broad notched R — extra positive bump after R + small notch
  I:   { bumps: [{ offsetSec: 0.040, amplitudeMv: 0.55, sigmaSec: 0.030 }] },
  aVL: { bumps: [{ offsetSec: 0.040, amplitudeMv: 0.45, sigmaSec: 0.030 }] },
  V5:  { bumps: [{ offsetSec: 0.040, amplitudeMv: 0.55, sigmaSec: 0.030 }] },
  V6:  { bumps: [{ offsetSec: 0.040, amplitudeMv: 0.55, sigmaSec: 0.030 }] },
};

/**
 * Apply per-lead bumps anchored to QRS events. Returns a new signal with
 * modified `points` and an extra event of `kind: 'qrs-wide'` (with
 * `meta.conductionBlock`) at each QRS center.
 */
function applyPerLeadBumps(
  signal: GeneratedECGSignal,
  shape: ConductionPerLeadShape | undefined,
  conductionLabel: 'rbbb' | 'lbbb',
): GeneratedECGSignal {
  if (!shape) {
    // Lead unaffected morphologically — still mark QRS as wide for the layer.
    return tagQrsAsWide(signal, conductionLabel);
  }
  const qrsTimes = signal.events
    .filter((e) => e.kind === 'qrs-narrow' || e.kind === 'qrs-wide')
    .map((e) => e.tSec);
  const newPoints = signal.points.map((p) => {
    let mv = p.mv;
    for (const qrsT of qrsTimes) {
      for (const bump of shape.bumps) {
        const center = qrsT + bump.offsetSec;
        const dist = Math.abs(p.t - center);
        if (dist > 0.20) continue;
        mv += gaussian(p.t, center, bump.sigmaSec, bump.amplitudeMv);
      }
    }
    return { t: p.t, mv };
  });
  return tagQrsAsWide({ ...signal, points: newPoints }, conductionLabel);
}

/** Replace `qrs-narrow` events with `qrs-wide` and add metadata for the layer. */
function tagQrsAsWide(
  signal: GeneratedECGSignal,
  conductionLabel: 'rbbb' | 'lbbb',
): GeneratedECGSignal {
  const newEvents: ECGEvent[] = signal.events.map((e) => {
    if (e.kind === 'qrs-narrow' || e.kind === 'qrs-wide') {
      return {
        ...e,
        kind: 'qrs-wide',
        meta: { ...(e.meta ?? {}), conductionBlock: conductionLabel },
      };
    }
    return e;
  });
  return { ...signal, events: newEvents };
}

/**
 * Apply RBBB to a base 12-lead ECG.
 */
export function applyRbbb(base: TwelveLeadECG): TwelveLeadECG {
  const newLeads = { ...base.leads };
  for (const lead of Object.keys(base.leads) as ECGLead[]) {
    newLeads[lead] = applyPerLeadBumps(base.leads[lead], RBBB_PER_LEAD[lead], 'rbbb');
  }
  return {
    ...base,
    patternIds: [...base.patternIds, 'conduction.rbbb'],
    leads: newLeads,
    interpretationHints: [
      ...base.interpretationHints,
      'Wide QRS (≥ 120 ms) with rSR\' / "rabbit-ear" pattern in V1',
      'Broad slurred terminal S in I, V5–V6',
    ],
    metadata: {
      ...base.metadata,
      conductionPatternId: 'conduction.rbbb',
      affectedLeads: ['V1', 'I', 'V5', 'V6'],
      reciprocalLeads: [],
      patternCategory: 'conduction',
    },
  };
}

/**
 * Apply LBBB to a base 12-lead ECG.
 */
export function applyLbbb(base: TwelveLeadECG): TwelveLeadECG {
  const newLeads = { ...base.leads };
  for (const lead of Object.keys(base.leads) as ECGLead[]) {
    newLeads[lead] = applyPerLeadBumps(base.leads[lead], LBBB_PER_LEAD[lead], 'lbbb');
  }
  return {
    ...base,
    patternIds: [...base.patternIds, 'conduction.lbbb'],
    leads: newLeads,
    interpretationHints: [
      ...base.interpretationHints,
      'Wide QRS (≥ 120 ms) with broad / monomorphic R in I, aVL, V5–V6',
      'Deep S or QS in V1',
      'Discordant ST-T direction is expected and does NOT in itself imply ischemia',
    ],
    metadata: {
      ...base.metadata,
      conductionPatternId: 'conduction.lbbb',
      affectedLeads: ['V1', 'I', 'aVL', 'V5', 'V6'],
      reciprocalLeads: [],
      patternCategory: 'conduction',
    },
  };
}
