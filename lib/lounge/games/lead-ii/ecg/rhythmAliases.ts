/**
 * Rhythm alias / canonical-group registry.
 *
 * Some rhythms in the catalog are clinically identical but historically
 * have different names — e.g. IVR and Ventricular Escape, ARVD and ARVC,
 * Yamaguchi and Apical HCM, Wellens Type A/B and "Wellens syndrome".
 * If a quiz surfaces two of these as separate answer choices, the
 * question becomes unfair: both choices are correct.
 *
 * This module maps each RhythmId to a stable "canonical group" string.
 * Two RhythmIds in the same group are aliases for quiz purposes. The
 * answer-choice generator uses `areAliases()` to ensure distractors and
 * correct answer come from distinct groups.
 *
 * Pure TypeScript. No React / RN / Skia imports.
 */

import type { RhythmId } from './types';

/**
 * Canonical-group registry.
 *
 * If a RhythmId is NOT in this map, its canonical group is its own id —
 * i.e., it has no aliases. Only register IDs that share a group with at
 * least one OTHER id.
 *
 * Sources: standard clinical teaching (LITFL, AHA naming guidance, and
 * the user's own quiz deduplication spec).
 */
const ALIAS_MAP: ReadonlyMap<RhythmId, string> = new Map<RhythmId, string>([
  // ── Ventricular escape vs Idioventricular rhythm ────────────────────
  // At escape rate (20-40 bpm) these are the same rhythm — escape focus
  // taking over because the SA and AV nodes have failed. "IVR" and
  // "ventricular escape rhythm" are interchangeable in EMS / ICU usage.
  ['vent.idioventricular', 'g.ventricular-escape'],
  ['vent.ventricular-escape', 'g.ventricular-escape'],

  // ── ARVD / ARVC ─────────────────────────────────────────────────────
  // Arrhythmogenic right ventricular dysplasia was renamed cardiomyopathy
  // (ARVC) in the 2010 task-force criteria. Same disease, two names.
  ['special.arvc', 'g.arvc'],

  // ── Lateral STEMI variants ──────────────────────────────────────────
  // High-lateral and lateral STEMI both indicate occlusion of the LCx or
  // a diagonal branch supplying the lateral wall. Per the user's quiz
  // dedup spec, they collapse to one answer.
  ['ischemia.lateral-stemi', 'g.lateral-stemi'],
  ['ischemia.high-lateral-stemi', 'g.lateral-stemi'],

  // ── Wellens family ──────────────────────────────────────────────────
  // Wellens syndrome has two ECG types: A (biphasic T) and B (deep
  // inverted T). They are the same clinical syndrome — critical LAD
  // stenosis — and collapse to "Wellens" in quiz context.
  ['ischemia.wellens', 'g.wellens'],
  ['ischemia.wellens-type-a', 'g.wellens'],
  ['ischemia.wellens-type-b', 'g.wellens'],

  // ── LV aneurysm = persistent ST elevation post-old-MI ───────────────
  // Per the user's dedup spec, "Old MI with persistent ST elevation" and
  // "LV aneurysm morphology" are the same quiz answer.
  ['ischemia.lv-aneurysm', 'g.old-mi-lv-aneurysm'],

  // ── WPW variants ────────────────────────────────────────────────────
  // Type A and Type B WPW differ by accessory-pathway location but are
  // both "WPW pattern" for quiz purposes. The generic conduction.wpw
  // entry is the same group.
  ['conduction.wpw', 'g.wpw'],
  ['conduction.wpw-type-a', 'g.wpw'],
  ['conduction.wpw-type-b', 'g.wpw'],

  // ── Sgarbossa variants ──────────────────────────────────────────────
  // Original and modified (Smith) Sgarbossa criteria both diagnose MI in
  // the setting of LBBB. They are the same clinical answer in quiz
  // form — "MI in LBBB."
  ['ischemia.sgarbossa', 'g.sgarbossa'],
  ['ischemia.modified-sgarbossa', 'g.sgarbossa'],

  // ── Brugada Type 1 / Type 2 ─────────────────────────────────────────
  // Type 1 is diagnostic, Type 2 is suggestive. They are clinically
  // distinct (Type 2 needs provocation to confirm) but represent the
  // same disease entity — Brugada syndrome. For "name this pattern"
  // quizzes, both should not co-appear: the answer should specify the
  // type. Keep them separate by default. (Override if/when teaching
  // requires.) — NOT aliased.

  // ── Fine vs Coarse VFib ─────────────────────────────────────────────
  // Both are VFib; the distinction is amplitude. For quiz purposes,
  // "Ventricular fibrillation" subsumes both. The catalog keeps them
  // separate so the generator can render either, but the quiz should
  // never offer both as separate answers.
  ['vent.vfib', 'g.vfib'],
  ['vent.vfib-fine', 'g.vfib'],

  // ── PVC variants that are about timing pattern, not identity ────────
  // PVC couplet and PVC triplet are real catalog entries but the
  // baseline "PVC" identity is the same. We do NOT alias these — a
  // teaching quiz often asks "couplet vs triplet vs single PVC" and the
  // student is supposed to pick the timing pattern specifically.

  // ── AFib variants ───────────────────────────────────────────────────
  // Rate-controlled AFib (atrial.fib) and AFib with RVR (atrial.fib-rvr)
  // are both atrial fibrillation; the distinction is ventricular rate.
  // For "name the rhythm" quizzes they collapse to AFib. For "what's
  // the management" quizzes the rate matters. The dedup is reasonable
  // default-on; teaching authors can override per-question.
  ['atrial.fib', 'g.atrial-fib'],
  ['atrial.fib-rvr', 'g.atrial-fib'],

  // ── Atrial flutter (typical vs atypical) ────────────────────────────
  // Both are atrial flutter; the distinction is direction of the reentry
  // circuit. For most quiz contexts they collapse to "atrial flutter".
  ['atrial.flutter', 'g.atrial-flutter'],
  ['atrial.flutter-atypical', 'g.atrial-flutter'],

  // ── SVT == AVNRT ────────────────────────────────────────────────────
  // AVNRT is the most common mechanism producing what bedside teaching
  // calls "SVT". Per user directive: a narrow-regular-tachycardia that
  // breaks with adenosine IS AVNRT. The legacy `atrial.svt` umbrella
  // entry is now an alias of AVNRT — no quiz should ever offer both.
  ['atrial.svt', 'g.avnrt'],
  ['atrial.avnrt', 'g.avnrt'],

  // ── HCM (general vs apical) ─────────────────────────────────────────
  // The catalog does not currently distinguish apical HCM (Yamaguchi)
  // from the general hcm entry. Reserved for future split.
]);

/**
 * Return the canonical group string for a rhythm. Rhythms without an
 * explicit alias map to their own id, so they have no group siblings.
 */
export function canonicalGroupOf(id: RhythmId): string {
  return ALIAS_MAP.get(id) ?? `id.${id}`;
}

/** Whether two rhythm ids belong to the same canonical group. */
export function areAliases(a: RhythmId, b: RhythmId): boolean {
  if (a === b) return true;
  return canonicalGroupOf(a) === canonicalGroupOf(b);
}

/** All rhythm ids that share a group with the given id (excluding itself). */
export function siblingsOf(id: RhythmId): readonly RhythmId[] {
  const group = canonicalGroupOf(id);
  const out: RhythmId[] = [];
  for (const [rid, g] of ALIAS_MAP.entries()) {
    if (g === group && rid !== id) out.push(rid);
  }
  return out;
}
