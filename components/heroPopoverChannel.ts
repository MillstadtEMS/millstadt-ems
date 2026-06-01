/**
 * One-popover-at-a-time channel for the hero section. The Current
 * Month / Avg / Projected stat tooltips, the Top Call Categories
 * popover, and the District map preview all use it so that opening
 * any one immediately closes the others — no stacking, no leftover
 * popovers blocking the cursor while a different tile is being
 * hovered.
 *
 * Each component:
 *
 *   1. Calls openHeroPopover(myId) the moment it transitions to
 *      "open" — this broadcasts a global event.
 *   2. Subscribes via onHeroPopoverChange and closes itself when
 *      the active id is not its own.
 */

const EVENT_NAME = "millstadtems:hero-popover";

type PopoverId =
  | "stat-monthly"
  | "stat-avg"
  | "stat-projected"
  | "top-categories"
  | "district-map";

interface HeroPopoverDetail { id: PopoverId | null }

export function openHeroPopover(id: PopoverId) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<HeroPopoverDetail>(EVENT_NAME, { detail: { id } }));
}

export function closeHeroPopover(id: PopoverId) {
  if (typeof window === "undefined") return;
  // Only blast a "null" if the active popover was THIS one — otherwise
  // we'd accidentally close whichever sibling just took the focus.
  window.dispatchEvent(new CustomEvent<HeroPopoverDetail>(EVENT_NAME, { detail: { id } }));
}

export function onHeroPopoverChange(handler: (activeId: PopoverId | null) => void): () => void {
  if (typeof window === "undefined") return () => {};
  function listener(e: Event) {
    const detail = (e as CustomEvent<HeroPopoverDetail>).detail;
    handler(detail?.id ?? null);
  }
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}

export type { PopoverId };
