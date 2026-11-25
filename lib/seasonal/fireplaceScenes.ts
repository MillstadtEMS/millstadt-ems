"use client";

// The living-room banner's fireplace scenes take turns through this one arbiter: the turkey heist
// at the fridge, and Gabby hauling Santa out of the chimney over his unfinished milk and cookies.
// A scene reserves the stage before it starts and releases it only once everyone has cleared, so
// two scenes never overlap: one that comes due while the other owns the stage simply waits for a
// later turn. Turns alternate in a fixed order on one shared clock (WinterFireplaceScenes), so no
// independently randomized timers can collide.

export type FireplaceScene = "heist" | "gabby";

let owner: { scene: FireplaceScene; token: symbol } | null = null;

/** Reserve the fireplace stage. Returns a release (safe to call more than once), or null while another scene owns it. */
export function reserveFireplace(scene: FireplaceScene): (() => void) | null {
  if (owner) return null;
  const token = Symbol(scene);
  owner = { scene, token };
  return () => { if (owner?.token === token) owner = null; };
}

// Gabby, once knocked off the lights (or off for her gag), stays down for the rest of the visit
// (a refresh puts her back) and joins the pop-ups instead (WinterSnowballAmbush).
const memory = globalThis as typeof globalThis & { __memsGabbyDone?: boolean };
export const gabbyDone = () => memory.__memsGabbyDone === true;
export function markGabbyDone() { memory.__memsGabbyDone = true; }

export function fireplaceOwner(): FireplaceScene | null {
  return owner?.scene ?? null;
}

// Whose turn it is: the scenes alternate, skipping any that can't play right now (not on this
// layout, still loading, reduced motion) without losing its place for long.
// Once everyone is off the lights, Gabby's chimney gag goes first, then the heist.
const order: readonly FireplaceScene[] = ["gabby", "heist"];
let turn = 0;

/** The next scene due among those that can play now, advancing the rotation past it. */
export function nextFireplaceTurn(canPlay: (scene: FireplaceScene) => boolean): FireplaceScene | null {
  if (owner) return null;
  for (let i = 0; i < order.length; i++) {
    const scene = order[(turn + i) % order.length];
    if (!canPlay(scene)) continue;
    turn = (turn + i + 1) % order.length;
    return scene;
  }
  return null;
}
