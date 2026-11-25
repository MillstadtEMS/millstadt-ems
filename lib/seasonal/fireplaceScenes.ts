"use client";

// The living-room banner's fireplace scenes take turns through this one arbiter: the turkey heist
// at the fridge, and Gabby hauling Santa out of the chimney over his unfinished milk and cookies.
// A scene reserves the stage before it starts and releases it only once everyone has cleared, so
// two scenes never overlap: one that comes due while the other owns the stage simply waits for a
// later turn. Turns alternate in a fixed order on one shared clock (WinterFireplaceScenes), so no
// independently randomized timers can collide.

// "ladder" is the station TV's crew reset (/station): it holds the stage while everyone climbs back.
export type FireplaceScene = "heist" | "gabby" | "ladder";

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
/** Station TV: Gabby climbs back on the lights with everyone else, ready for her gag next time round. */
export function resetGabbyDone() { memory.__memsGabbyDone = false; }

export function fireplaceOwner(): FireplaceScene | null {
  return owner?.scene ?? null;
}

// Whose turn it is: the scenes alternate, skipping any that can't play right now (not on this
// layout, still loading, reduced motion) without losing its place for long.
// Once everyone is off the lights, Gabby's chimney gag goes first, then the heist.
const siteOrder: readonly FireplaceScene[] = ["gabby", "heist"];
let order: readonly FireplaceScene[] = siteOrder;
let turn = 0;
let gap: number | null = null;

/** Station TV only: its own running order (the heist first, then the gag) and gap between the shows.
 *  Called with nothing, the site's order and timing come back. */
export function setFireplaceProgram(program?: { order: readonly FireplaceScene[]; gapMs: number }) {
  order = program?.order ?? siteOrder;
  gap = program?.gapMs ?? null;
  turn = 0;
}

/** The pause after a heist before the next turn (the site's own, unless the station set one). */
export function fireplaceGap(siteGapMs: number): number {
  return gap ?? siteGapMs;
}

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
