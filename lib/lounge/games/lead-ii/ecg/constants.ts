/**
 * Cross-cutting ECG constants. Numbers only — no rhythm-specific waveform
 * coefficients (those live next to their generators).
 */

/** Default sample rate for the simulator. Real monitors use 250–500 Hz. */
export const DEFAULT_SAMPLE_RATE_HZ = 250;

/** Standard ECG paper sweep speed (mm/s). Used by the renderer, not the math. */
export const PAPER_SPEED_MM_PER_S = 25;

/** Standard ECG gain (mm/mV). */
export const PAPER_GAIN_MM_PER_MV = 10;

/** Hard ceiling on quiz answer choices. */
export const MAX_QUIZ_ANSWER_CHOICES = 6;

/** Heart-rate clamp for the rhythm-rate slider. */
export const HR_MIN = 20;
export const HR_MAX = 250;
