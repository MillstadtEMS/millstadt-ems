// Small math kit for the chimney gag's puppets (degrees, screen coordinates: y grows downward).

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 0..1 progress of t through [a, b]. */
export const seg = (t: number, a: number, b: number) => (b === a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a), 0, 1));
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const easeIn = (t: number) => t * t;
export const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
export const easeInOut = (t: number) => (t < .5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));
export const deg = (r: number) => (r * 180) / Math.PI;
