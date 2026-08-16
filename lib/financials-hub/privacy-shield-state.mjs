/** @typedef {{ shielded: boolean, canDismiss: boolean }} PrivacyShieldState */
/** @typedef {"background" | "foreground" | "manual" | "dismiss"} PrivacyShieldEvent */

/** @type {PrivacyShieldState} */
export const initialPrivacyShieldState = Object.freeze({
  shielded: false,
  canDismiss: true,
});

/**
 * @param {PrivacyShieldState} state
 * @param {PrivacyShieldEvent} event
 * @returns {PrivacyShieldState}
 */
export function privacyShieldTransition(state, event) {
  if (event === "background") return { shielded: true, canDismiss: false };
  if (event === "foreground" && state.shielded) return { shielded: true, canDismiss: true };
  if (event === "manual") return { shielded: true, canDismiss: true };
  if (event === "dismiss" && state.canDismiss) return { shielded: false, canDismiss: true };
  return state;
}
