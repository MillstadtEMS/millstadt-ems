// The chimney gag's cut-out art: every part's file, drawn size and pivots, in room px (the living-room
// picture is 760 x 200 room px; the files are 2x or 3x that, so they stay crisp on dense screens).
// Gabby's heads are cut from the owner's face-expressions sheet (the yelling and dozing faces are that
// sheet's own faces with the mouth and eyes redrawn), her torso from the owner's storyboard clip, her
// tattooed arms and boots from her painted poses. Santa's head is the sheet's shocked Santa. Pants,
// Santa's body, hats and props are drawn live (gabby-gag/gabby.ts, santa.ts, props.ts).

export const GAG_ART = "/images/winter/kit/gabby-gag";

export type Pt = readonly [number, number];
export type Part = { src: string; w: number; h: number };

export const HEADS = ["neutral", "shock", "grit", "sly", "yell", "sleep"] as const;
export type HeadId = (typeof HEADS)[number];

/** Gabby, facing right. Anchors are in each part's own drawn px. */
export const G = {
  torso: { src: "g-torso.webp", w: 33, h: 50.5, pelvis: [16.5, 42] as Pt, neck: [23.5, 6.5] as Pt, shN: [31, 8] as Pt, shF: [11, 8] as Pt, hipN: [21.5, 42.5] as Pt, hipF: [11.5, 41.5] as Pt },
  head: { w: 42, h: 42, neck: [19.44, 35.27] as Pt, crown: [23, 5.5] as Pt },
  uarm: { w: 12.33, h: 22.67, top: [5.88, 2.3] as Pt, bot: [6.88, 20.5] as Pt },
  farm: {
    open: { w: 10, h: 31.67, top: [4.88, 2.5] as Pt, hand: [3.88, 25.5] as Pt },
    fist: { w: 14, h: 29.67, top: [5.23, 1.72] as Pt, hand: [7.27, 23.99] as Pt },
  },
  boot: { w: 18.67, h: 10.67, ankle: [3.63, 2.13] as Pt, toe: [18.08, 9.46] as Pt, heel: [0.09, 9.37] as Pt },
  thigh: 27,
  shin: 26,
  /** Pelvis height above the floor standing tall (knees barely soft). */
  stand: 58.6,
} as const;

/** Ankle height above the floor with the boot flat. */
export const ANKLE = G.boot.heel[1] - G.boot.ankle[1];

export const SANTA_HEAD = { src: "s-head.webp", w: 48.67, h: 50.33, neck: [22.96, 38.44] as Pt, crown: [25.83, 3.07] as Pt };

/** Pixel-aligned cut-outs of the room picture (room px). */
export const ROOM_CUTS = {
  stockings: { src: "room-stockings.webp", x: 575, y: 88, w: 75, h: 35 },
  chair: { src: "room-chair-front.webp", x: 29, y: 127.5, w: 85.5, h: 64.5 },
} as const;

/** The firebox opening (room px): its sides, the arch's spring line and crown, and the hearth floor. */
export const FIREBOX = { left: 579, right: 656, spring: 125, crown: 111, floor: 181, hearth: 193 } as const;

export const ALL_FILES = [
  G.torso.src, ...HEADS.map(h => `g-head-${h}.webp`), "g-uarm-near.webp", "g-uarm-far.webp",
  "g-farm-open-near.webp", "g-farm-open-far.webp", "g-farm-fist-near.webp", "g-farm-fist-far.webp",
  "g-boot-near.webp", "g-boot-far.webp", SANTA_HEAD.src, ROOM_CUTS.stockings.src, ROOM_CUTS.chair.src,
];
