"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { isTesla } from "@/lib/device/profile";
import { useLaneTuck, type LaneRect } from "@/lib/seasonal/driveLane";
import { useWinterTheme } from "@/lib/seasonal/useWinterTheme";
import styles from "./WinterTrinketHunt.module.css";

// Where's Waldo for the holidays: sixteen little figurines hide on the public pages until the
// Christmas season ends. Each page view tucks one or two the visitor hasn't found into the real
// layout (peeking over a photo or card, leaning out from behind a section, sitting on the end of a
// heading, dangling under an edge), chosen by season, page and Chicago date so a trinket stays put
// all day and moves overnight. A found trinket morphs into the Christmas stocking in the corner,
// which appears with the first find and opens to show the collection. Finds are kept per season.

type Trinket = {
  slug: string;
  name: string;
  /** Size of the trimmed WebP. */
  w: number;
  h: number;
  /** Share of the height that shows when it peeks over a top edge. */
  peek: number;
  /** Which way the face points: -1 left, 1 right, 0 toward the viewer. */
  face: -1 | 0 | 1;
  /** Share of the width that shows when it leans out from behind a side edge. */
  side?: number;
  /** Share of the height that drops below an edge it stands or sits on (unset: it doesn't stand). */
  stand?: number;
  /** Hangs from a bottom edge by its rope. */
  hang?: boolean;
  /** The art is cut flat at the bottom, so it only ever shows against an edge. */
  cutoff?: boolean;
  /** Bright, wide figures (the dragons) hide a little smaller. */
  scale?: number;
};

// The blue dragons are all Trash the Dragon and the little elf-like fellows are all Ned, told apart
// by pose. Slugs stay as they are: saved finds and the art files use them.
const trinkets: readonly Trinket[] = [
  { slug: "perched-dragon", name: "Perched Trash the Dragon", w: 160, h: 151, peek: .42, face: -1, side: .5, stand: .02, scale: .82 },
  { slug: "flying-dragon", name: "Flying Trash the Dragon", w: 160, h: 94, peek: .6, face: 0, scale: .82 },
  { slug: "sitting-dragon", name: "Sitting Trash the Dragon", w: 160, h: 120, peek: .62, face: -1, side: .45, stand: .03, scale: .82 },
  { slug: "snowflake-dragon", name: "Trash the Dragon with a Snowflake", w: 145, h: 160, peek: .46, face: -1, side: .5, stand: .02, scale: .82 },
  { slug: "jester-elf", name: "Jester Ned", w: 110, h: 160, peek: .45, face: 0, side: .55, stand: .02 },
  { slug: "peeking-elf", name: "Peeking Ned", w: 160, h: 117, peek: .92, face: 0, cutoff: true },
  { slug: "nutcracker-elf", name: "Nutcracker Ned", w: 132, h: 160, peek: .48, face: 0, side: .5, stand: .2 },
  { slug: "reindeer-elf", name: "Reindeer Ned", w: 153, h: 160, peek: .62, face: 1, side: .55, stand: .03 },
  { slug: "cocoa-elf", name: "Cocoa Ned", w: 147, h: 160, peek: .55, face: 0, side: .55, stand: .02 },
  { slug: "skating-elf", name: "Skating Ned", w: 149, h: 160, peek: .42, face: 1, side: .55, stand: .01 },
  { slug: "caroling-elf", name: "Caroling Ned", w: 134, h: 160, peek: .4, face: 0, side: .5, stand: .02 },
  { slug: "gingerbread-elf", name: "Gift-Box Ned", w: 135, h: 160, peek: .55, face: 0, stand: .01 },
  { slug: "medic-elf", name: "Medic Ned", w: 140, h: 160, peek: .48, face: 0, side: .55, stand: .02 },
  { slug: "snowman-elf", name: "Snowman Ned", w: 160, h: 144, peek: .6, face: 0, side: .5, stand: .03 },
  { slug: "pajama-elf", name: "Pajama Ned", w: 139, h: 160, peek: .47, face: 0, side: .5, stand: .02 },
  { slug: "star-elf", name: "Star Ned", w: 129, h: 160, peek: .42, face: -1, side: .5, hang: true },
];
const total = trinkets.length;
const bySlug = new Map(trinkets.map((trinket) => [trinket.slug, trinket]));
const artOf = (trinket: Trinket) => `/images/winter/trinkets/${trinket.slug}.webp`;

// Staff tools, utility pages and the protected public forms stay clear.
const skippedRoutes =
  /^\/(?:offline|weather-test|ten-eight|forms|truckcheck|inventory|lounge|admin)(?:\/|$)|^\/careers\/apply(?:\/|$)|^\/board(?!-minutes(?:\/|$))/;

/* ── Season, date and saved finds ──────────────────────────────────────────── */

const chicagoDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit",
});

/** The Chicago date, and the season it belongs to (New Year's Day counts toward the old year). */
function today() {
  const parts = chicagoDate.formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const year = Number(get("year"));
  return { day: `${get("year")}-${get("month")}-${get("day")}`, season: get("month") === "01" ? year - 1 : year };
}

const storePrefix = "millstadt:trinkets:";
const foundEvent = "millstadt:trinkets-change";
const nothingFound: readonly string[] = [];
// The latest write in this tab, so finds still count where storage is blocked.
let written: { key: string; raw: string } | null = null;
let snapshot: { raw: string; list: readonly string[] } = { raw: "", list: nothingFound };

function readFound(): readonly string[] {
  const key = storePrefix + today().season;
  let raw = written?.key === key ? written.raw : null;
  if (raw === null) {
    try { raw = localStorage.getItem(key); } catch { /* Storage blocked: nothing saved yet. */ }
  }
  raw ??= "[]";
  if (raw !== snapshot.raw) {
    let list: string[] = [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed.filter((slug): slug is string => typeof slug === "string" && bySlug.has(slug));
    } catch { /* A damaged entry starts the book over. */ }
    snapshot = { raw, list: [...new Set(list)] };
  }
  return snapshot.list;
}

function rememberFound(slug: string) {
  const key = storePrefix + today().season;
  const list = [...new Set([...readFound(), slug])];
  written = { key, raw: JSON.stringify(list) };
  try { localStorage.setItem(key, written.raw); } catch { /* Private browsing: finds last for this visit. */ }
  window.dispatchEvent(new Event(foundEvent));
  return list;
}

function subscribeFound(onChange: () => void) {
  const fromOtherTab = (event: StorageEvent) => {
    if (event.key !== null && !event.key.startsWith(storePrefix)) return;
    written = null;
    onChange();
  };
  window.addEventListener(foundEvent, onChange);
  window.addEventListener("storage", fromOtherTab);
  return () => {
    window.removeEventListener(foundEvent, onChange);
    window.removeEventListener("storage", fromOtherTab);
  };
}

const subscribeNothing = () => () => {};

/* ── Seeded choices ────────────────────────────────────────────────────────── */

/** A repeatable random sequence for a key (xmur3 hash into mulberry32). */
function seeded(text: string) {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  let a = (h ^ (h >>> 16)) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(list: readonly T[], random: () => number) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* ── Geometry (document coordinates) ───────────────────────────────────────── */

type Box = { left: number; top: number; right: number; bottom: number };
type Radii = [number, number, number, number];
type Edges = { top: boolean; right: boolean; bottom: boolean; left: boolean };
type Kind = "box" | "image" | "scene" | "footer" | "heading";
type Pose = "peek" | "corner" | "side" | "stand" | "ledge" | "hang" | "under";
type Anchor = { el: Element; kind: Kind; rect: Box; radii: Radii; edges: Edges };
type Spot = { trinket: Trinket; pose: Pose; el: Element; kind: Kind; u: number; dir: -1 | 1; flip: boolean };
type Shape = {
  art: Box; seen: Box[]; sink: Box | null; tap: Box;
  cut: { rect: Box; radii: Radii } | null; flipX: boolean; flipY: boolean; hop: [number, number];
};
type Placement = {
  slug: string; pose: Pose; x: number; y: number; w: number; h: number;
  art: { x: number; y: number; w: number; h: number };
  clip: string | null; flipX: boolean; flipY: boolean; hop: [number, number]; spark: [number, number];
};

const noRadii: Radii = [0, 0, 0, 0];
const allEdges: Edges = { top: true, right: true, bottom: true, left: true };
const area = (b: Box) => Math.max(0, b.right - b.left) * Math.max(0, b.bottom - b.top);
const overlaps = (a: Box, b: Box) =>
  a.left < b.right - .5 && a.right > b.left + .5 && a.top < b.bottom - .5 && a.bottom > b.top + .5;

function intersect(a: Box, b: Box): Box | null {
  const out = {
    left: Math.max(a.left, b.left), top: Math.max(a.top, b.top),
    right: Math.min(a.right, b.right), bottom: Math.min(a.bottom, b.bottom),
  };
  return out.right > out.left && out.bottom > out.top ? out : null;
}

/** Grows a visible area into a comfortable tap target, never toward the edge it hides behind. */
function grow(b: Box, reach: number, across: "both" | "left" | "right", along: "both" | "up" | "down"): Box {
  const pad = 2, min = Math.max(reach, 18);
  let { left, top, right, bottom } = b;
  if (across !== "right") left -= pad;
  if (across !== "left") right += pad;
  if (along !== "down") top -= pad;
  if (along !== "up") bottom += pad;
  const wide = right - left, tall = bottom - top;
  if (wide < min) {
    const d = min - wide;
    if (across === "left") left -= d;
    else if (across === "right") right += d;
    else { left -= d / 2; right += d / 2; }
  }
  if (tall < min) {
    const d = min - tall;
    if (along === "up") top -= d;
    else if (along === "down") bottom += d;
    else { top -= d / 2; bottom += d / 2; }
  }
  return { left, top, right, bottom };
}

/**
 * Where a trinket sits for a pose against an edge. `size` is about how tall the visible part is;
 * the hidden part sits behind the anchor and is cut away by the anchor's own (rounded) outline.
 */
function shapeOf(spot: Spot, rect: Box, radii: Radii, size: number, reach: number): Shape | null {
  const { trinket: t, pose, u, dir } = spot;
  const s = size * (t.scale ?? 1);
  const ratio = t.w / t.h;
  // Leaning out sideways, the face points the way it leans; otherwise the daily flip decides.
  const flipX = (pose === "side" || pose === "corner") && t.face !== 0 ? t.face !== dir : spot.flip;
  const along = (w: number, r1: number, r2: number) => {
    const start = rect.left + Math.max(8, r1 + 4), end = rect.right - Math.max(8, r2 + 4) - w;
    return end < start ? null : start + (end - start) * u;
  };
  const tall = rect.bottom - rect.top;
  let art: Box, seen: Box[], tap: Box, hop: [number, number];
  let sink: Box | null = null, cut = true, flipY = false;
  switch (pose) {
    case "peek": {
      const h = s / t.peek, w = h * ratio, left = along(w, radii[0], radii[1]);
      if (left === null || tall < h * (1 - t.peek) + 4) return null;
      art = { left, top: rect.top - h * t.peek, right: left + w, bottom: rect.top + h * (1 - t.peek) };
      seen = [{ ...art, bottom: rect.top }];
      tap = grow(seen[0], reach, "both", "up");
      hop = [0, rect.top - art.bottom - 4];
      break;
    }
    case "corner": {
      if (t.cutoff) return null;
      const h = s / t.peek, w = h * ratio;
      if (tall < h + 4 || rect.right - rect.left < w * 2.5) return null;
      const left = dir < 0 ? rect.left - w * .4 : rect.right - w * .6;
      art = { left, top: rect.top - h * t.peek, right: left + w, bottom: rect.top + h * (1 - t.peek) };
      const over = { ...art, bottom: rect.top };
      seen = [over, dir < 0 ? { ...art, top: rect.top, right: rect.left } : { ...art, top: rect.top, left: rect.right }];
      tap = grow(over, reach, "both", "up");
      hop = [dir * w * .2, rect.top - art.bottom - 4];
      break;
    }
    case "side": {
      if (!t.side || t.cutoff) return null;
      const h = s * 1.2, w = h * ratio, shown = w * t.side;
      const bottom = rect.bottom - Math.max(2, (dir < 0 ? radii[3] : radii[2]) * .4);
      const left = dir < 0 ? rect.left - shown : rect.right - (w - shown);
      art = { left, top: bottom - h, right: left + w, bottom };
      if (art.top < rect.top + Math.max(radii[0], radii[1], 6)) return null;
      seen = [dir < 0 ? { ...art, right: rect.left } : { ...art, left: rect.right }];
      tap = grow(seen[0], reach, dir < 0 ? "left" : "right", "both");
      hop = [dir * (w - shown + 4), -h * .3];
      break;
    }
    case "stand": {
      if (t.stand === undefined) return null;
      const h = s * 1.12, w = h * ratio, left = along(w, radii[0], radii[1]);
      if (left === null) return null;
      const drop = h * t.stand;
      art = { left, top: rect.top + drop - h, right: left + w, bottom: rect.top + drop };
      seen = [{ ...art, bottom: rect.top }];
      if (drop > .5) sink = { ...art, top: rect.top };
      tap = grow(seen[0], reach, "both", "up");
      cut = false;
      hop = [0, -h * .55];
      break;
    }
    case "ledge": {
      if (t.stand === undefined) return null;
      const h = Math.min(s * 1.12, Math.max(tall * 1.05, s * .8)), w = h * ratio;
      const baseline = rect.top + tall * .8, drop = h * t.stand;
      const left = rect.right + Math.max(3, tall * .12);
      art = { left, top: baseline + drop - h, right: left + w, bottom: baseline + drop };
      seen = [art];
      tap = grow(art, reach, "right", "both");
      cut = false;
      hop = [0, -h * .6];
      break;
    }
    case "hang": {
      if (!t.hang) return null;
      const h = s * 1.5, w = h * ratio, left = along(w, radii[3], radii[2]);
      if (left === null || tall < h * .3) return null;
      art = { left, top: rect.bottom - h * .04, right: left + w, bottom: rect.bottom + h * .96 };
      seen = [{ ...art, top: rect.bottom }];
      tap = grow(seen[0], reach, "both", "down");
      hop = [0, rect.bottom - art.top + 4];
      break;
    }
    case "under": {
      if (!t.cutoff) return null;
      const h = s / .9, w = h * ratio, left = along(w, radii[3], radii[2]);
      if (left === null || tall < h * .3) return null;
      art = { left, top: rect.bottom - h * .1, right: left + w, bottom: rect.bottom + h * .9 };
      seen = [{ ...art, top: rect.bottom }];
      tap = grow(seen[0], reach, "both", "down");
      flipY = true;
      hop = [0, rect.bottom - art.top + 4];
      break;
    }
  }
  return { art, seen, sink, tap, cut: cut ? { rect, radii } : null, flipX, flipY, hop };
}

/** Everything outside the anchor's rounded outline stays visible (an even-odd hole). */
function clipPath(art: Box, cut: Box, radii: Radii) {
  const w = art.right - art.left, h = art.bottom - art.top, m = Math.max(w, h) * 1.5;
  const x0 = -m, y0 = -m, x1 = w + m, y1 = h + m;
  const raw = { l: cut.left - art.left, t: cut.top - art.top, r: cut.right - art.left, b: cut.bottom - art.top };
  const l = Math.max(raw.l, x0 - 1), t = Math.max(raw.t, y0 - 1);
  const r = Math.min(raw.r, x1 + 1), b = Math.min(raw.b, y1 + 1);
  const cl = l !== raw.l, ct = t !== raw.t, cr = r !== raw.r, cb = b !== raw.b;
  const cap = Math.max(0, Math.min(r - l, b - t) / 2);
  const tl = cl || ct ? 0 : Math.min(radii[0], cap), tr = cr || ct ? 0 : Math.min(radii[1], cap);
  const br = cr || cb ? 0 : Math.min(radii[2], cap), bl = cl || cb ? 0 : Math.min(radii[3], cap);
  const f = (n: number) => Math.round(n * 10) / 10;
  const arc = (radius: number, x: number, y: number) => (radius ? `A${f(radius)} ${f(radius)} 0 0 1 ${f(x)} ${f(y)}` : "");
  const d = `M${f(x0)} ${f(y0)}H${f(x1)}V${f(y1)}H${f(x0)}Z`
    + `M${f(l + tl)} ${f(t)}H${f(r - tr)}${arc(tr, r, t + tr)}V${f(b - br)}${arc(br, r - br, b)}`
    + `H${f(l + bl)}${arc(bl, l, b - bl)}V${f(t + tl)}${arc(tl, l + tl, t)}Z`;
  return `path(evenodd, "${d}")`;
}

function placementOf(spot: Spot, shape: Shape, ox: number, oy: number): Placement {
  const f = (n: number) => Math.round(n * 10) / 10;
  const { tap, art } = shape, seen = shape.seen[0];
  return {
    slug: spot.trinket.slug,
    pose: spot.pose,
    x: f(tap.left - ox), y: f(tap.top - oy), w: f(tap.right - tap.left), h: f(tap.bottom - tap.top),
    art: { x: f(art.left - tap.left), y: f(art.top - tap.top), w: f(art.right - art.left), h: f(art.bottom - art.top) },
    clip: shape.cut ? clipPath(art, shape.cut.rect, shape.cut.radii) : null,
    flipX: shape.flipX,
    flipY: shape.flipY,
    hop: [f(shape.hop[0]), f(shape.hop[1])],
    spark: [f((seen.left + seen.right) / 2 - ox), f((seen.top + seen.bottom) / 2 - oy)],
  };
}

/* ── Reading the page ──────────────────────────────────────────────────────── */

// Moving, playable or protected things are never used to hide behind.
const unsteady =
  'form,nav,dialog,iframe,video,audio,canvas,[hidden],[role="dialog"],[aria-modal="true"],[data-winter-parade],'
  + "[data-winter-player],[data-winter-rink],[data-snow-fighter],[data-snow-chief],[data-hanging-chief],[data-no-trinkets]";
// Nothing a visitor reads or uses may be covered, not even by the invisible tap target.
const obstacles =
  'a[href],button,input,select,textarea,label,summary,iframe,video,audio,canvas,embed,object,form,[role="button"],'
  + '[role="link"],[role="tab"],[role="checkbox"],[role="radio"],[role="switch"],[role="slider"],[role="menuitem"],'
  + '[role="option"],[role="combobox"],[tabindex]:not([tabindex="-1"]),[contenteditable="true"],[data-snow-fighter],'
  + "[data-snow-santa],[data-winter-parade],[data-winter-player],[data-winter-rink],[data-section-divider]";
const layerMark = "data-winter-trinkets";

type Lineage = { ok: boolean; clip: Box | null; clipEl: Element | null };
type Reader = ReturnType<typeof createReader>;

function createReader() {
  const sx = window.scrollX, sy = window.scrollY;
  const memo = new Map<Element, Lineage>();
  const open: Lineage = { ok: true, clip: null, clipEl: null };
  const toDoc = (r: Box): Box => ({ left: r.left + sx, top: r.top + sy, right: r.right + sx, bottom: r.bottom + sy });
  /** Not fixed, faded, transformed or excluded: its position on the page is what it looks like. */
  const steady = (el: Element, cs: CSSStyleDeclaration) =>
    cs.position !== "fixed" && cs.position !== "sticky" && cs.visibility !== "hidden" && Number(cs.opacity) >= .9
    && (cs.transform === "none" || cs.transform === "matrix(1, 0, 0, 1, 0, 0)")
    && cs.translate === "none" && cs.rotate === "none" && cs.scale === "none" && !el.matches(unsteady);
  /** Whether descendants of `el` hold still, and the box their ancestors clip them to. */
  function lineage(el: Element | null): Lineage {
    if (!el || el === document.body || el === document.documentElement) return open;
    const cached = memo.get(el);
    if (cached) return cached;
    const up = lineage(el.parentElement);
    let result = up;
    if (up.ok) {
      const cs = getComputedStyle(el);
      if (!steady(el, cs)) result = { ...up, ok: false };
      else if (cs.overflowX !== "visible" || cs.overflowY !== "visible") {
        // Real scrollers (carousels, wide tables) move their contents. overflow-x: hidden alone
        // computes overflow-y to auto without making a box scroll, so that axis is ignored then.
        const clipsX = cs.overflowX === "hidden" || cs.overflowX === "clip";
        const scrolls = (/auto|scroll/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 24)
          || (/auto|scroll/.test(cs.overflowY) && !clipsX && el.scrollHeight > el.clientHeight + 24);
        const own = toDoc(el.getBoundingClientRect());
        const clip = up.clip ? intersect(up.clip, own) : own;
        result = scrolls || !clip ? { ...up, ok: false } : { ok: true, clip, clipEl: el };
      }
    }
    memo.set(el, result);
    return result;
  }
  return { toDoc, steady, lineage };
}

let paletteBrush: CanvasRenderingContext2D | null | undefined;
const colorMemo = new Map<string, number[]>();
/** Any CSS colour (rgb, oklch, color-mix…) as sRGB bytes and alpha, read back from a 1px canvas. */
function rgba(color: string): number[] {
  if (!color || color === "transparent" || color === "rgba(0, 0, 0, 0)") return [0, 0, 0, 0];
  const cached = colorMemo.get(color);
  if (cached) return cached;
  if (paletteBrush === undefined) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    paletteBrush = canvas.getContext("2d", { willReadFrequently: true });
  }
  let out = [0, 0, 0, 0];
  if (paletteBrush) {
    paletteBrush.clearRect(0, 0, 1, 1);
    paletteBrush.fillStyle = "#000";
    paletteBrush.fillStyle = color;
    paletteBrush.fillRect(0, 0, 1, 1);
    const d = paletteBrush.getImageData(0, 0, 1, 1).data;
    out = [d[0], d[1], d[2], d[3] / 255];
  }
  colorMemo.set(color, out);
  return out;
}

const toneMemo = new Map<string, number[] | null>();
/** Rough average colour of a background: its lowest opaque gradient layer, else its solid colour. */
function toneOf(cs: CSSStyleDeclaration): number[] | null {
  const image = cs.backgroundImage, color = cs.backgroundColor, key = `${image}|${color}`;
  if (toneMemo.has(key)) return toneMemo.get(key) ?? null;
  let tone: number[] | null = null;
  if (image !== "none") {
    const layers: string[] = [];
    let depth = 0, start = 0;
    for (let i = 0; i < image.length; i++) {
      if (image[i] === "(") depth++;
      else if (image[i] === ")") depth--;
      else if (image[i] === "," && depth === 0) { layers.push(image.slice(start, i)); start = i + 1; }
    }
    layers.push(image.slice(start));
    for (const layer of layers.reverse()) {
      if (!layer.includes("gradient") || layer.includes("transparent")) continue;
      const stops = [...layer.matchAll(/(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^()]*\)/g)].map((match) => rgba(match[0]));
      if (!stops.length || stops.some((stop) => stop[3] < .6)) continue;
      tone = [0, 1, 2].map((channel) => stops.reduce((sum, stop) => sum + stop[channel], 0) / stops.length);
      break;
    }
  }
  if (!tone) {
    const fill = rgba(color);
    if (fill[3] >= .85) tone = fill;
  }
  toneMemo.set(key, tone);
  return tone;
}

const contrast = (a: number[], b: number[]) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) >= 36;

/** The colour showing around an element: the nearest painted ancestor (the page is navy). */
function surroundingTone(el: Element) {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const tone = toneOf(getComputedStyle(node));
    if (tone) return tone;
  }
  return [4, 13, 26];
}

/** The colour just past a top or bottom edge: the in-flow sibling meeting it there, else the surroundings. */
function toneBeyond(el: Element, rect: DOMRect, edge: "top" | "bottom") {
  const y = edge === "top" ? rect.top : rect.bottom;
  for (let node = edge === "top" ? el.previousElementSibling : el.nextElementSibling; node;
    node = edge === "top" ? node.previousElementSibling : node.nextElementSibling) {
    const r = node.getBoundingClientRect();
    if (r.height < 1 || r.right <= rect.left || r.left >= rect.right) continue;
    const cs = getComputedStyle(node);
    if (cs.position === "fixed" || cs.position === "absolute") continue;
    if (Math.abs((edge === "top" ? r.bottom : r.top) - y) > 3) break;
    return toneOf(cs) ?? surroundingTone(el);
  }
  return surroundingTone(el);
}

/**
 * Which edges of a box can actually be seen: drawn with a border, or painted in a colour that
 * stands out from what is beyond that edge. Spacers that blend into their neighbours have none.
 */
function boxEdges(el: Element, cs: CSSStyleDeclaration, own: DOMRect): Edges | null {
  const tone = toneOf(cs);
  if (!tone) return null;
  const line = (side: "Top" | "Right" | "Bottom" | "Left") =>
    parseFloat(cs.getPropertyValue(`border-${side.toLowerCase()}-width`)) >= 1 && rgba(cs.getPropertyValue(`border-${side.toLowerCase()}-color`))[3] >= .3;
  const around = surroundingTone(el);
  const edges = {
    top: line("Top") || contrast(tone, toneBeyond(el, own, "top")),
    bottom: line("Bottom") || contrast(tone, toneBeyond(el, own, "bottom")),
    left: line("Left") || contrast(tone, around),
    right: line("Right") || contrast(tone, around),
  };
  return edges.top || edges.bottom || edges.left || edges.right ? edges : null;
}

/**
 * Photos have solid edges; cut-out art (characters, garlands, snowbanks) has transparent ones and
 * can't be hidden behind. Decided from markup alone, never from what has loaded, so lazy images
 * below the fold count the same on every visit and a trinket stays put all day.
 */
function photoEdges(img: HTMLImageElement, cs: CSSStyleDeclaration): Edges | null {
  if (img.complete && !img.naturalWidth) return null; // A broken picture shows nothing to hide behind.
  const src = img.getAttribute("src") ?? "";
  const jpeg = /\.jpe?g(?:$|[?#&])/i.test(src) || /[?&]url=[^&]*\.jpe?g/i.test(src);
  return cs.objectFit === "cover" || (jpeg && cs.objectFit !== "contain" && cs.objectFit !== "scale-down") ? allEdges : null;
}

function radiiOf(cs: CSSStyleDeclaration, rect: Box): Radii {
  const w = rect.right - rect.left, cap = Math.min(w, rect.bottom - rect.top) / 2;
  const one = (value: string) => {
    const first = value.split(" ")[0] ?? "0";
    const n = parseFloat(first) || 0;
    return Math.min(cap, first.endsWith("%") ? (n / 100) * w : n);
  };
  return [one(cs.borderTopLeftRadius), one(cs.borderTopRightRadius), one(cs.borderBottomRightRadius), one(cs.borderBottomLeftRadius)];
}

/** The box an element shows on the page, cut to its clipping ancestors (with their rounded corners). */
function anchorOf(el: Element, reader: Reader) {
  const up = reader.lineage(el.parentElement);
  if (!up.ok) return null;
  const cs = getComputedStyle(el);
  if (!reader.steady(el, cs)) return null;
  const own = el.getBoundingClientRect();
  if (own.width < 1 || own.height < 1) return null;
  let rect = reader.toDoc(own);
  let radii = radiiOf(cs, rect);
  if (up.clip && up.clipEl) {
    const clipped = intersect(rect, up.clip);
    if (!clipped || area(clipped) < area(rect) * .5) return null;
    // Corners that meet the clipping box take its rounding (a photo inside a rounded card).
    const outer = reader.toDoc(up.clipEl.getBoundingClientRect());
    const round = radiiOf(getComputedStyle(up.clipEl), outer);
    const at = (a: number, b: number) => Math.abs(a - b) < 1.5;
    radii = [
      at(clipped.left, outer.left) && at(clipped.top, outer.top) ? Math.max(radii[0], round[0]) : radii[0],
      at(clipped.right, outer.right) && at(clipped.top, outer.top) ? Math.max(radii[1], round[1]) : radii[1],
      at(clipped.right, outer.right) && at(clipped.bottom, outer.bottom) ? Math.max(radii[2], round[2]) : radii[2],
      at(clipped.left, outer.left) && at(clipped.bottom, outer.bottom) ? Math.max(radii[3], round[3]) : radii[3],
    ];
    rect = clipped;
  }
  return { rect, radii, cs };
}

/** The last line of a heading, for a trinket to sit on its end. */
function ledgeOf(heading: Element, reader: Reader) {
  const up = reader.lineage(heading.parentElement);
  if (!up.ok || !reader.steady(heading, getComputedStyle(heading))) return null;
  const range = document.createRange();
  range.selectNodeContents(heading);
  const rects = [...range.getClientRects()].filter((r) => r.width > 2 && r.height > 8);
  if (!rects.length) return null;
  const bottom = Math.max(...rects.map((r) => r.bottom));
  const last = rects.filter((r) => r.bottom > bottom - 4);
  const line = reader.toDoc({
    left: Math.min(...last.map((r) => r.left)), top: Math.min(...last.map((r) => r.top)),
    right: Math.max(...last.map((r) => r.right)), bottom,
  });
  if (up.clip && (line.left < up.clip.left || line.right > up.clip.right || line.top < up.clip.top || line.bottom > up.clip.bottom)) return null;
  return { rect: line, radii: noRadii };
}

/** Bands of the page that fixed bars always cover: the header and the crew hanging from its lights. */
function reserves() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const fixedBar = (y: number) => {
    for (const hit of document.elementsFromPoint(vw / 2, y)) {
      let fixed: Element | null = null;
      for (let el: Element | null = hit; el && el !== document.body; el = el.parentElement) {
        if (getComputedStyle(el).position === "fixed") { fixed = el; break; }
      }
      if (!fixed) return null;
      const r = fixed.getBoundingClientRect();
      if (r.width >= vw * .7 && r.height < vh * .4) return r;
      // A full-screen layer (snowfall, snowball flights): look underneath it.
    }
    return null;
  };
  let top = 0;
  for (let i = 0; i < 4; i++) {
    const bar = fixedBar(top + 2);
    if (!bar || bar.bottom <= top) break;
    top = bar.bottom;
  }
  for (const el of document.body.children) {
    if (el.hasAttribute(layerMark)) continue;
    const cs = getComputedStyle(el);
    if (cs.position !== "fixed" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (r.height > 4 || r.top > top + 24) continue;
    for (const art of el.querySelectorAll("img, svg")) {
      const a = art.getBoundingClientRect();
      if (a.width && a.height && a.bottom < vh * .75) top = Math.max(top, a.bottom);
    }
  }
  let bottom = vh;
  for (let i = 0; i < 3; i++) {
    const bar = fixedBar(bottom - 2);
    if (!bar || bar.top >= bottom) break;
    bottom = bar.top;
  }
  // Rounded up so the swinging crew don't nudge the choice from one visit to the next.
  return { top: Math.ceil((top + 8) / 24) * 24, bottom: bottom < vh ? Math.ceil((vh - bottom + 8) / 8) * 8 : 0 };
}

type Obstacle = Box & { el: Element; text: boolean };

/** Every place a trinket could hide on this page, and everything it must not cover. */
function survey(main: HTMLElement, footer: HTMLElement | null) {
  const reader = createReader();
  const width = document.documentElement.clientWidth;
  const keep = reserves();
  const top = keep.top, bottom = document.documentElement.scrollHeight - keep.bottom;

  const anchors: Anchor[] = [];
  const seenRects = new Set<string>();
  const consider = (el: Element, kind: Kind) => {
    const own = el.getBoundingClientRect();
    if (own.width < 72 || own.height < 40) return;
    const found = anchorOf(el, reader);
    if (!found) return;
    const { rect, radii, cs } = found;
    if (rect.right - rect.left < 72 || rect.bottom - rect.top < 40 || rect.left < -1 || rect.right > width + 1) return;
    const edges = el instanceof HTMLImageElement ? photoEdges(el, cs) : boxEdges(el, cs, own);
    if (!edges) return;
    const key = [rect.left, rect.top, rect.right, rect.bottom].map(Math.round).join(",");
    if (seenRects.has(key)) return;
    seenRects.add(key);
    anchors.push({ el, kind, rect, radii, edges });
  };
  for (const el of main.querySelectorAll("img, section, article, aside, figure, header, div, li, blockquote, table")) {
    consider(el, el instanceof HTMLImageElement ? (el.closest("[data-hunt-scene]") ? "scene" : "image") : "box");
  }
  if (footer) {
    consider(footer, "footer");
    for (const el of footer.querySelectorAll("img, div")) consider(el, el instanceof HTMLImageElement ? "image" : "footer");
  }

  const ledges: { el: Element; rect: Box }[] = [];
  for (const heading of main.querySelectorAll("h1, h2, h3")) {
    if (heading.closest(obstacles)) continue;
    const line = ledgeOf(heading, reader);
    if (line) ledges.push({ el: heading, rect: line.rect });
  }

  // Obstacles from every block in the normal flow (main, the ornament shelf, the footer…).
  const rows = new Map<number, Obstacle[]>();
  const band = 200;
  const add = (el: Element, r: Box, text: boolean) => {
    if (r.right - r.left < 1 || r.bottom - r.top < 1) return;
    const o = { ...reader.toDoc(r), el, text };
    for (let row = Math.floor(o.top / band); row <= Math.floor(o.bottom / band); row++) {
      const list = rows.get(row);
      if (list) list.push(o);
      else rows.set(row, [o]);
    }
  };
  const screen = window.innerWidth * window.innerHeight;
  const range = document.createRange();
  for (const root of document.body.children) {
    if (root.hasAttribute(layerMark) || root.matches("script, style, template, noscript")) continue;
    const position = getComputedStyle(root).position;
    if (position !== "static" && position !== "relative") continue;
    for (const el of root.querySelectorAll(obstacles)) for (const r of el.getClientRects()) add(el, r, false);
    for (const el of root.querySelectorAll("img, svg")) {
      const r = el.getBoundingClientRect();
      if (r.width * r.height < screen * .35) add(el, r, false);
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      if (!parent || !/\S/.test(node.nodeValue ?? "") || parent.closest("script, style, noscript, template")) continue;
      range.selectNodeContents(node);
      for (const r of range.getClientRects()) add(parent, r, true);
    }
  }
  const hits = (b: Box, anchor: Element | null, textOnly = false) => {
    for (let row = Math.floor(b.top / band); row <= Math.floor(b.bottom / band); row++) {
      for (const o of rows.get(row) ?? []) {
        if (textOnly && !o.text) continue;
        if (o.el === anchor && !o.text) continue;
        if (overlaps(o, b)) return true;
      }
    }
    return false;
  };
  const inside = (b: Box) => b.left >= 4 && b.right <= width - 4 && b.top >= top && b.bottom <= bottom;
  /** In bounds, off every control, picture and line of text. */
  const clear = (shape: Shape, el: Element) => {
    const { art, tap, seen, sink } = shape;
    if (!inside(tap) || art.left < 0 || art.right > width || art.bottom > bottom) return false;
    if (seen.some((b) => !inside(b) || hits(b, el)) || hits(tap, el)) return false;
    return !sink || !hits(sink, el, true);
  };
  return { anchors, ledges, width, top, bottom, clear };
}

function sizing() {
  const vw = document.documentElement.clientWidth;
  // Desktop clamp(18px, 2vw, 32px); phones about 20-26px.
  const size = vw < 640 ? Math.min(26, Math.max(20, vw * .064)) : Math.min(32, Math.max(18, vw * .02));
  const touch = window.matchMedia("(any-pointer: coarse)").matches;
  return { size, reach: isTesla() ? 64 : touch ? 44 : 0 };
}

const poseOrder: Pose[] = ["peek", "corner", "side", "stand", "ledge", "hang", "under"];
const posesFor = (t: Trinket) => poseOrder.filter((pose) =>
  pose === "peek" || (pose === "corner" && !t.cutoff) || (pose === "side" && !!t.side && !t.cutoff)
  || ((pose === "stand" || pose === "ledge") && t.stand !== undefined) || (pose === "hang" && !!t.hang)
  || (pose === "under" && !!t.cutoff));
const edgeFor = (edges: Edges, pose: Pose, dir: -1 | 1) =>
  pose === "peek" || pose === "stand" ? edges.top
    : pose === "corner" ? edges.top && (dir < 0 ? edges.left : edges.right)
      : pose === "side" ? (dir < 0 ? edges.left : edges.right)
        : edges.bottom;
// The village postcard and the footer are favourite hiding places; photos are natural ones.
const kindBonus: Record<Kind, number> = { scene: .07, footer: .05, image: .02, heading: 0, box: 0 };
// Mostly half hidden; standing in plain view on an edge is the fallback.
const posePenalty: Record<Pose, number> = { peek: 0, corner: 0, hang: 0, under: 0, side: .02, ledge: .04, stand: .1 };

type Pick = { spot: Spot; shape: Shape; score: number };

/** Each trinket aims for its own seeded point on the page and takes the closest clear hiding place. */
function choose(list: Trinket[], key: string, page: ReturnType<typeof survey>) {
  const { size, reach } = sizing();
  const span = Math.max(1, page.bottom - page.top);
  const picks: Pick[] = [];
  for (const trinket of list) {
    const random = seeded(`${key}|${trinket.slug}`);
    const tx = .06 + random() * .88, ty = random(), offset = random(), flip = random() < .5;
    const ranked = shuffled(posesFor(trinket), random);
    const candidates: Pick[] = [];
    const consider = (spot: Spot, rect: Box, radii: Radii, rank: number) => {
      const shape = shapeOf(spot, rect, radii, size, reach);
      if (!shape) return;
      const seen = shape.seen[0];
      const x = (seen.left + seen.right) / 2 / page.width, y = ((seen.top + seen.bottom) / 2 - page.top) / span;
      candidates.push({ spot, shape, score: Math.hypot((x - tx) * .55, y - ty) + rank * .04 + posePenalty[spot.pose] - kindBonus[spot.kind] });
    };
    ranked.forEach((pose, rank) => {
      if (pose === "ledge") {
        for (const ledge of page.ledges) consider({ trinket, pose, el: ledge.el, kind: "heading", u: 0, dir: 1, flip }, ledge.rect, noRadii, rank);
        return;
      }
      const sideways = pose === "corner" || pose === "side";
      const dirs: (-1 | 1)[] = sideways ? [-1, 1] : [1];
      const positions = sideways ? [0] : [0, 1, 2, 3, 4].map((k) => (k + offset) / 5);
      for (const anchor of page.anchors) {
        for (const dir of dirs) {
          if (!edgeFor(anchor.edges, pose, dir)) continue;
          for (const u of positions) consider({ trinket, pose, el: anchor.el, kind: anchor.kind, u, dir, flip }, anchor.rect, anchor.radii, rank);
        }
      }
    });
    candidates.sort((a, b) => a.score - b.score);
    const apart = Math.min(420, span * .3);
    const centre = (b: Box) => [(b.left + b.right) / 2, (b.top + b.bottom) / 2];
    for (const candidate of candidates) {
      const [cx, cy] = centre(candidate.shape.seen[0]);
      if (picks.some((p) => {
        const [px, py] = centre(p.shape.seen[0]);
        return p.spot.el === candidate.spot.el || Math.hypot(px - cx, py - cy) < apart;
      })) continue;
      if (!page.clear(candidate.shape, candidate.spot.el)) continue;
      picks.push(candidate);
      break;
    }
  }
  return picks;
}

/** The current box of a chosen hiding place, or null when it is gone or no longer still. */
function locate(spot: Spot) {
  if (!spot.el.isConnected) return null;
  const reader = createReader();
  if (spot.pose === "ledge") return ledgeOf(spot.el, reader);
  const found = anchorOf(spot.el, reader);
  return found && { rect: found.rect, radii: found.radii };
}

/* ── Effects ───────────────────────────────────────────────────────────────── */

function sparkle(host: HTMLElement, x: number, y: number, light: boolean) {
  const burst = document.createElement("span");
  burst.className = styles.burst;
  burst.style.left = `${x}px`;
  burst.style.top = `${y}px`;
  const count = light ? 6 : 10;
  for (let i = 0; i < count; i++) {
    const spark = document.createElement("i");
    const angle = (i / count) * Math.PI * 2 + Math.random() * .6;
    const distance = 14 + Math.random() * 18;
    spark.style.setProperty("--dx", `${(Math.cos(angle) * distance).toFixed(1)}px`);
    spark.style.setProperty("--dy", `${(Math.sin(angle) * distance).toFixed(1)}px`);
    spark.style.setProperty("--delay", `${Math.round(Math.random() * 70)}ms`);
    spark.dataset.tone = String(i % 4);
    burst.append(spark);
  }
  host.append(burst);
  window.setTimeout(() => burst.remove(), 1000);
}

const easeInOut = (p: number) => (p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

/** Squash and stretch: it crouches, springs clear of its hiding place and hangs at the top. */
function hopFrames(p: Placement): Keyframe[] {
  const fx = p.flipX ? -1 : 1, fy = p.flipY ? -1 : 1, [hx, hy] = p.hop;
  // The squash stays planted on its feet (on its head when it hangs upside down).
  const at = (x: number, y: number, sx: number, sy: number) =>
    `translate(${x.toFixed(1)}px, ${(y + ((1 - sy) * p.art.h / 2) * fy).toFixed(1)}px) scale(${(fx * sx).toFixed(3)}, ${(fy * sy).toFixed(3)})`;
  return [
    { transform: at(0, 0, 1, 1) },
    { transform: at(0, 0, 1.17, .8), offset: .26 },
    { transform: at(hx * .6, hy * 1.14, .86, 1.2), offset: .66 },
    { transform: at(hx, hy, 1, 1) },
  ];
}

/**
 * The morph into the stocking: along a rising curve it shrinks and spins a full turn (finishing
 * upright), then narrows and drops into the stocking's mouth as it fades.
 */
function stockingFrames(from: DOMRect, mouth: DOMRect, flipX: boolean, flipY: boolean): Keyframe[] {
  const dx = mouth.left + mouth.width / 2 - (from.left + from.width / 2);
  const dy = mouth.top + mouth.height / 2 - (from.top + from.height / 2);
  const lift = Math.min(220, 80 + Math.hypot(dx, dy) * .16);
  const cx = dx * .3, cy = Math.min(0, dy) - lift;
  const end = Math.max(.08, Math.min(.6, (mouth.width * .6) / Math.max(1, from.width)));
  const frames: Keyframe[] = [];
  for (let i = 0; i <= 20; i++) {
    const p = i / 20, t = easeInOut(p);
    const x = 2 * (1 - t) * t * cx + t * t * dx;
    const slurp = p > .8 ? (p - .8) / .2 : 0;
    const y = 2 * (1 - t) * t * cy + t * t * dy + slurp * mouth.height * .7;
    const shrink = 1 + (end - 1) * Math.pow(p, 1.35);
    const sx = (flipX ? -1 : 1) * shrink * (1 - .5 * slurp);
    const sy = (flipY ? -Math.cos(Math.PI * Math.min(1, p / .7)) : 1) * shrink * (1 + .35 * slurp);
    frames.push({
      offset: p,
      transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${(360 * t).toFixed(1)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`,
      opacity: p < .8 ? 1 : Math.max(0, 1 - (p - .8) / .2),
    });
  }
  return frames;
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const stockingBody = "M52 16H90V54C90 71 81 84 66 84H46C39 84 34 79 34 73C34 66 39 62 46 61C50 60.5 52 58 52 54Z";
const stockingCuff = "M48 11Q48 5 54 5.5Q58 3.6 62 5.2Q66 3.6 70 5.1Q74 3.4 78 5.1Q82 3.6 86 5.2Q93.6 5 94 11V19"
  + "Q94 24 89 24.2Q85 26 81 24.3Q77 26.2 73 24.4Q69 26.1 65 24.3Q61 26 57 24.4Q53 25.8 50.6 24Q48 22.8 48 19Z";
const hollyLeaf = "M0 0L2.3-2.3L3.6-1.5L5.3-3.4L6.7-2.1L8.6-3.4L9.8-1.7L12.4 0L9.8 1.7L8.6 3.4L6.7 2.1L5.3 3.4L3.6 1.5L2.3 2.3Z";

/** The hand-drawn stocking: red velvet, a fur cuff, a holly sprig and a gold tag for the count. */
function StockingArt({ id, tag = true }: { id: string; tag?: boolean }) {
  const ref = (name: string) => `url(#${id}-${name})`;
  return (
    <svg className={styles.stockingArt} viewBox={tag ? "-8 0 108 88" : "30 0 70 88"} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${id}-velvet`} cx="40%" cy="28%" r="78%">
          <stop offset="0" stopColor="#f4505f" />
          <stop offset=".42" stopColor="#cc1a31" />
          <stop offset=".8" stopColor="#990f26" />
          <stop offset="1" stopColor="#6d0819" />
        </radialGradient>
        <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="1" y2="0">
          <stop offset=".5" stopColor="#3a0010" stopOpacity="0" />
          <stop offset="1" stopColor="#3a0010" stopOpacity=".55" />
        </linearGradient>
        <linearGradient id={`${id}-under`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a0010" stopOpacity=".6" />
          <stop offset="1" stopColor="#3a0010" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-fur`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".5" stopColor="#f5f0e7" />
          <stop offset="1" stopColor="#d3c6b1" />
        </linearGradient>
        <linearGradient id={`${id}-leaf`} x1="0" y1="-3" x2="12" y2="3" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3cad66" />
          <stop offset="1" stopColor="#0b5530" />
        </linearGradient>
        <radialGradient id={`${id}-berry`} cx="35%" cy="32%" r="70%">
          <stop offset="0" stopColor="#ff8a8d" />
          <stop offset=".45" stopColor="#e0213a" />
          <stop offset="1" stopColor="#8a0a1e" />
        </radialGradient>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3c2" />
          <stop offset=".45" stopColor="#f5c64f" />
          <stop offset="1" stopColor="#b47b0e" />
        </linearGradient>
        <pattern id={`${id}-nap`} width="2.6" height="2.6" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
          <rect width="2.6" height=".9" fill="#ffffff" fillOpacity=".055" />
        </pattern>
        <clipPath id={`${id}-body`}><path d={stockingBody} /></clipPath>
      </defs>
      {tag && (
        <g>
          <path d="M50 15.5C44.5 21 38.5 28 33.2 35" fill="none" stroke="#5a3c0a" strokeOpacity=".5" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M50 15.5C44.5 21 38.5 28 33.2 35" fill="none" stroke="#f1d27a" strokeWidth=".8" strokeLinecap="round" />
          <g transform="translate(33.4 35.6) rotate(-12)">
            <path d="M-36 -6.8Q-36 -8.6 -34.2 -8.6H-1.6L3.6 0L-1.6 8.6H-34.2Q-36 8.6 -36 6.8Z" fill={ref("gold")} stroke="#8f600c" strokeWidth=".7" />
            <path d="M-34 -6.6H-2.6" stroke="#fffbe6" strokeOpacity=".75" strokeWidth=".7" strokeLinecap="round" />
            <circle cx="-.2" cy="0" r="1.3" fill="#5b3a06" />
          </g>
        </g>
      )}
      <path d={stockingBody} fill={ref("velvet")} />
      <g clipPath={ref("body")}>
        <rect x="30" y="10" width="66" height="80" fill={ref("nap")} />
        <rect x="30" y="10" width="66" height="80" fill={ref("shade")} />
        <rect x="48" y="22" width="46" height="9" fill={ref("under")} />
        <path d="M90 57C90 72 81 84 66 84C71 79 75 72 75 64C75 60 81 58 90 57Z" fill="#7e0a1f" fillOpacity=".55" />
        <path d="M34 73C34 79 39 84 46 84H49C45.5 80 44 75 44.6 68.5C45 65 45.4 62.8 46.4 61C39.4 62 34 66 34 73Z" fill="#7e0a1f" fillOpacity=".55" />
      </g>
      {/* Gold blanket stitch around the heel and toe, and the velvet's sheen. */}
      <path d="M66 84C71 79 75 72 75 64C75 60 81 58 90 57M49 84C45.5 80 44 75 44.6 68.5C45 65 45.4 62.8 46.4 61"
        fill="none" stroke="#ffd36a" strokeOpacity=".9" strokeWidth=".9" strokeDasharray="1.6 1.5" strokeLinecap="round" />
      <path d={stockingBody} fill="none" stroke="#4d0512" strokeOpacity=".45" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M58.5 29C57.5 38 57.5 46 59 53" fill="none" stroke="#ffffff" strokeOpacity=".17" strokeWidth="5" strokeLinecap="round" />
      <path d="M39.5 69C41 65.5 43.5 63.8 47 63.3" fill="none" stroke="#ffffff" strokeOpacity=".2" strokeWidth="2.4" strokeLinecap="round" />
      <path d={stockingCuff} fill={ref("fur")} stroke="#a8977c" strokeOpacity=".45" strokeWidth=".6" />
      <path d="M55 11.5q1.6-1.6 3.2 0M63 15.5q1.6-1.6 3.2 0M71.5 11q1.6-1.6 3.2 0M79.5 15.5q1.6-1.6 3.2 0M87 11.5q1.6-1.6 3.2 0M58.5 20q1.6-1.6 3.2 0M67.5 20.5q1.6-1.6 3.2 0M76 19.8q1.6-1.6 3.2 0M84.5 20.4q1.6-1.6 3.2 0"
        fill="none" stroke="#c4b49b" strokeOpacity=".75" strokeWidth=".8" strokeLinecap="round" />
      <path d="M88.6 6.6C87.8 1.4 93.6 .4 94.2 5.4" fill="none" stroke={ref("gold")} strokeWidth="1.5" strokeLinecap="round" />
      <g transform="translate(57 13)">
        <path d={hollyLeaf} transform="rotate(196)" fill={ref("leaf")} />
        <path d={hollyLeaf} transform="rotate(-16)" fill={ref("leaf")} />
        <path d="M0 0L-11.4-3.3M0 0L11.5-3.3" stroke="#a6e3bb" strokeOpacity=".55" strokeWidth=".5" />
        <circle cx="-1.8" cy="1.5" r="2.2" fill={ref("berry")} />
        <circle cx="1.9" cy="1.7" r="2.1" fill={ref("berry")} />
        <circle cx=".1" cy="-1.2" r="2" fill={ref("berry")} />
        <path d="M-2.5 .7h.01M1.2 .9h.01M-.6-1.9h.01" stroke="#ffffff" strokeOpacity=".9" strokeWidth="1.1" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/* ── Components ────────────────────────────────────────────────────────────── */

export default function WinterTrinketHunt({ pathname }: { pathname: string }) {
  const winter = useWinterTheme();
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);
  if (!winter || !mounted || skippedRoutes.test(pathname)) return null;
  return <TrinketHunt pathname={pathname} />;
}

type Toast = { slug: string; count: number; id: number };

function TrinketHunt({ pathname }: { pathname: string }) {
  const found = useSyncExternalStore(subscribeFound, readFound, () => nothingFound);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [flying, setFlying] = useState(0);
  const [landed, setLanded] = useState(0);
  const [toast, setToast] = useState<Toast | null>(null);
  const [message, setMessage] = useState("");
  const layer = useRef<HTMLDivElement>(null);
  const fx = useRef<HTMLDivElement>(null);
  const sky = useRef<HTMLDivElement>(null);
  const badge = useRef<HTMLButtonElement>(null);
  const mouth = useRef<HTMLSpanElement>(null);
  const book = useRef<HTMLDialogElement>(null);
  const closer = useRef<HTMLButtonElement>(null);
  const taken = useRef(new Set<string>());
  const engine = useRef<{ drop: (slug: string) => void } | null>(null);
  const toasts = useRef(0);
  const focusBadge = useRef(false);
  const note = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  // A drive-by coming through the corner: the stocking and its note duck below the edge just before
  // it gets there and pop back up once it has gone by (lib/seasonal/driveLane). A find on its way in
  // keeps the stocking up to catch it.
  const tucked = useLaneTuck(() => {
    if (flying > 0) return null;
    let rect: LaneRect | null = null;
    // Resting boxes: a fixed element's offsets ignore the tuck's own translate.
    for (const el of [badge.current, note.current]) {
      if (!el) continue;
      const box = { left: el.offsetLeft, top: el.offsetTop, right: el.offsetLeft + el.offsetWidth, bottom: el.offsetTop + el.offsetHeight };
      rect = rect ? { left: Math.min(rect.left, box.left), top: Math.min(rect.top, box.top), right: Math.max(rect.right, box.right), bottom: Math.max(rect.bottom, box.bottom) } : box;
    }
    return rect;
  }, { recheck: `${found.length > 0}|${toast?.id ?? 0}|${flying}` });

  // Hide this page's trinkets once the page has settled, then keep them on their anchors.
  useEffect(() => {
    taken.current = new Set();
    setPlacements([]);
    let disposed = false, frame = 0, timer = 0, planned = false, signature = "";
    let width = document.documentElement.clientWidth;
    let chosen: { key: string; list: Trinket[] } | null = null;
    let spots: Spot[] = [];
    const watcher = new ResizeObserver(() => schedule());

    function publish() {
      const host = layer.current?.getBoundingClientRect();
      const ox = (host?.left ?? -window.scrollX) + window.scrollX, oy = (host?.top ?? -window.scrollY) + window.scrollY;
      const { size, reach } = sizing();
      const next: Placement[] = [];
      for (const spot of spots) {
        const where = locate(spot);
        const shape = where && shapeOf(spot, where.rect, where.radii, size, reach);
        if (!shape) { queuePlan(300); return; }
        next.push(placementOf(spot, shape, ox, oy));
      }
      const sig = JSON.stringify(next);
      if (sig !== signature) {
        signature = sig;
        setPlacements(next);
      }
    }

    function plan() {
      timer = 0;
      if (disposed) return;
      planned = true;
      if (!chosen) {
        const { day, season } = today();
        const key = `${season}|${pathname.replace(/\/+$/, "") || "/"}|${day}`;
        const random = seeded(key);
        const count = random() < .5 ? 1 : 2;
        const have = new Set(readFound());
        chosen = { key, list: shuffled(trinkets, random).filter((t) => !have.has(t.slug)).slice(0, count) };
      }
      const list = chosen.list.filter((t) => !taken.current.has(t.slug));
      const main = document.querySelector<HTMLElement>("main.mems-main-pad") ?? document.querySelector<HTMLElement>("main");
      try {
        spots = list.length && main
          ? choose(list, chosen.key, survey(main, document.querySelector<HTMLElement>("footer.mems-footer"))).map((pick) => pick.spot)
          : [];
      } catch {
        spots = []; // An unexpected page shape simply hides nothing.
      }
      watcher.disconnect();
      watcher.observe(document.body);
      for (const spot of spots) watcher.observe(spot.el);
      publish();
    }

    function queuePlan(ms: number) {
      window.clearTimeout(timer);
      timer = window.setTimeout(plan, ms);
    }

    function schedule() {
      if (frame || disposed) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const w = document.documentElement.clientWidth;
        if (Math.abs(w - width) > 1) {
          // A new width can rearrange the page: choose again (same trinkets, fresh hiding places).
          width = w;
          if (planned) queuePlan(250);
        } else if (planned && !timer) publish();
      });
    }

    const start = () => { if (!planned) queuePlan(700); };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    const fallback = window.setTimeout(() => { if (!planned && !timer) plan(); }, 4500);
    const listeners: [EventTarget, string, boolean][] = [
      [window, "resize", false], [window, "pageshow", false],
      [document, "load", true], [document, "transitionend", true], [document, "animationend", true],
    ];
    for (const [target, type, capture] of listeners) target.addEventListener(type, schedule, capture);
    document.fonts?.ready.then(() => schedule(), () => {});

    engine.current = {
      drop(slug) {
        spots = spots.filter((spot) => spot.trinket.slug !== slug);
        publish();
      },
    };
    return () => {
      disposed = true;
      engine.current = null;
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      window.clearTimeout(fallback);
      window.removeEventListener("load", start);
      for (const [target, type, capture] of listeners) target.removeEventListener(type, schedule, capture);
      watcher.disconnect();
    };
  }, [pathname]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!focusBadge.current) return;
    focusBadge.current = false;
    badge.current?.focus({ preventScroll: true });
  }, [landed]);

  // About a second in all: hop (230ms), the morph into the stocking (600ms), then the stocking
  // jiggles while sparkles pop and the count ticks up. Reduced motion: a fade, then the count.
  async function celebrate(placement: Placement, art: HTMLImageElement | null, count: number, keyboard: boolean) {
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let flyer: HTMLImageElement | null = null;
    try {
      if (calm) {
        if (art) await art.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: "ease-out", fill: "forwards" }).finished;
      } else if (art) {
        if (fx.current) sparkle(fx.current, placement.spark[0], placement.spark[1], true);
        await art.animate(hopFrames(placement), { duration: 230, easing: "cubic-bezier(.3,.7,.4,1)", fill: "forwards" }).finished;
        await nextFrame();
        const target = mouth.current?.getBoundingClientRect();
        if (target && sky.current) {
          const from = art.getBoundingClientRect();
          flyer = document.createElement("img");
          flyer.src = art.currentSrc || art.src;
          flyer.alt = "";
          flyer.className = styles.flyer;
          Object.assign(flyer.style, {
            left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`,
          });
          sky.current.append(flyer);
          engine.current?.drop(placement.slug);
          await flyer.animate(stockingFrames(from, target, placement.flipX, placement.flipY), { duration: 600, easing: "linear", fill: "forwards" }).finished;
          const landing = mouth.current?.getBoundingClientRect() ?? target;
          sparkle(sky.current, landing.left + landing.width / 2, landing.top + landing.height / 2, isTesla());
        }
      }
    } catch { /* An interrupted animation still counts the find. */ } finally {
      flyer?.remove();
    }
    engine.current?.drop(placement.slug);
    // Keyboard players lose focus with the trinket; it moves to the stocking once that lands.
    if (keyboard) focusBadge.current = true;
    setFlying((n) => Math.max(0, n - 1));
    setLanded((n) => n + 1);
    toasts.current += 1;
    setToast({ slug: placement.slug, count, id: toasts.current });
  }

  function collect(placement: Placement, event: MouseEvent<HTMLButtonElement>) {
    const trinket = bySlug.get(placement.slug);
    if (!trinket || taken.current.has(trinket.slug)) return;
    taken.current.add(trinket.slug);
    const count = rememberFound(trinket.slug).length;
    setMessage(count === total
      ? `Collected ${count} of ${total}: ${trinket.name}. Your stocking is full. Merry Christmas!`
      : `Collected ${count} of ${total}: ${trinket.name}.`);
    setFlying((n) => n + 1);
    void celebrate(placement, event.currentTarget.querySelector("img"), count, event.detail === 0);
  }

  function openBook() {
    const dialog = book.current;
    if (!dialog || dialog.open) return;
    setToast(null);
    dialog.showModal();
    // Start on Close rather than the scrollable sheet (Chrome makes overflowing boxes focusable).
    closer.current?.focus();
  }

  function bookClosed() {
    const active = document.activeElement;
    if (!active || active === document.body) badge.current?.focus({ preventScroll: true });
  }

  const have = new Set(found);
  const shown = Math.max(0, found.length - flying);
  const complete = found.length >= total;
  const toastTrinket = toast ? bySlug.get(toast.slug) : undefined;
  const season = today().season;

  return createPortal(
    <>
      <div ref={layer} className={styles.layer} data-winter-trinkets="">
        {placements.map((p) => (
          <button key={p.slug} type="button" className={styles.trinket} data-pose={p.pose}
            aria-label={`Hidden Christmas trinket: ${bySlug.get(p.slug)?.name ?? "a little friend"}`} onClick={(event) => collect(p, event)}
            style={{ left: p.x, top: p.y, width: p.w, height: p.h }}>
            <span className={styles.figure}
              style={{ left: p.art.x, top: p.art.y, width: p.art.w, height: p.art.h, clipPath: p.clip ?? undefined }}>
              <Image src={`/images/winter/trinkets/${p.slug}.webp`} width={bySlug.get(p.slug)?.w ?? 160} height={bySlug.get(p.slug)?.h ?? 160}
                alt="" className={styles.art} draggable={false} loading="eager" unoptimized
                style={{ transform: `scale(${p.flipX ? -1 : 1}, ${p.flipY ? -1 : 1})` }} />
            </span>
          </button>
        ))}
        <div ref={fx} className={styles.fx} />
      </div>
      <div ref={sky} className={styles.sky} aria-hidden="true" data-winter-trinkets="" />

      {/* The stocking hangs in the corner from the first find; the count rides on its gold tag. */}
      {found.length > 0 && (
        <button ref={badge} type="button" className={styles.stocking} data-complete={complete}
          data-enter={found.length === 1 && flying > 0 && landed === 0 ? "" : undefined} data-lane-away={tucked || undefined}
          aria-haspopup="dialog" aria-label={`Peek in your stocking: ${shown} of ${total} Christmas trinkets collected`}
          title="Peek in your stocking" onClick={openBook} data-winter-trinkets="">
          <span key={landed} className={styles.sway} data-bump={landed > 0 ? "" : undefined}>
            <span className={styles.bulge}>
              <StockingArt id="mems-stocking" />
              <span ref={mouth} className={styles.mouth} />
              <span className={styles.tag} aria-hidden="true">
                <b key={shown} data-tick={landed > 0 ? "" : undefined}>{shown}</b><small>/{total}</small>
              </span>
            </span>
          </span>
        </button>
      )}

      {toast && toastTrinket && (
        <button ref={note} key={toast.id} type="button" className={styles.toast} data-complete={toast.count >= total} data-lane-away={tucked || undefined}
          aria-haspopup="dialog" aria-label={`Collected ${toast.count} of ${total}: ${toastTrinket.name}. Peek in your stocking`}
          onClick={openBook} data-winter-trinkets="">
          <span className={styles.toastArt}>
            <Image src={artOf(toastTrinket)} width={toastTrinket.w} height={toastTrinket.h} alt="" unoptimized />
          </span>
          <span className={styles.toastText}>
            <strong><b>Collected {toast.count}/{total}</b> · {toastTrinket.name}</strong>
            <span>{toast.count >= total ? `All ${total} found · Merry Christmas!` : "Peek in your stocking"}</span>
          </span>
        </button>
      )}

      <p className={styles.sr} role="status" data-winter-trinkets="">{message}</p>

      <dialog ref={book} className={styles.book} aria-labelledby={titleId} onClose={bookClosed}
        onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}
        data-winter-trinkets="">
        <div className={styles.sheet}>
          <div className={styles.bookHead}>
            <span className={styles.bookIcon}><StockingArt id="mems-stocking-book" tag={false} /></span>
            <div className={styles.bookTitles}>
              <p className={styles.kicker}>Millstadt EMS · Christmas {season}</p>
              <h2 id={titleId} className={styles.bookTitle}>Your stocking</h2>
              <p className={styles.bookTally}><b>{found.length}</b> of {total} collected</p>
            </div>
            <button ref={closer} type="button" className={styles.close} aria-label="Close your stocking" onClick={() => book.current?.close()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                <path d="m6 6 12 12m0-12L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          {complete ? (
            <p className={styles.cheer}>
              <strong>All {total} found. Merry Christmas!</strong>
              <span>Trash the Dragon and every Ned are tucked in your stocking. Thank you for exploring with the Millstadt EMS crew.</span>
            </p>
          ) : (
            <p className={styles.lede}>
              Trash the Dragon and Ned are hiding all over the website. One or two tuck into each page, peeking over
              photos, cards and the footer, and they move every day until the Christmas decorations come down.
            </p>
          )}
          <ul className={styles.grid}>
            {trinkets.map((trinket) => {
              const got = have.has(trinket.slug);
              return (
                <li key={trinket.slug} className={styles.tile} data-found={got}>
                  <span className={styles.tileArt} aria-hidden="true">
                    {got ? (
                      <Image src={artOf(trinket)} width={trinket.w} height={trinket.h} alt="" unoptimized />
                    ) : (
                      <span className={styles.shadow} style={{ WebkitMaskImage: `url(${artOf(trinket)})`, maskImage: `url(${artOf(trinket)})` }} />
                    )}
                  </span>
                  <span className={styles.tileName}>{got ? trinket.name : "Still hiding"}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </dialog>
    </>,
    document.body,
  );
}
