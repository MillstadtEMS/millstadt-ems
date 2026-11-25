import type { CSSProperties } from "react";
import s from "./GingerbreadHouse.module.css";

/* Decorative SVG art for the Christmas gingerbread house. Everything here is aria-hidden. */

const f = (n: number) => Math.round(n * 10) / 10;

/** Deterministic pseudo-random sequence so server markup is stable between renders. */
function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

type Slot = "s" | "m" | "l";

type RoofSpec = {
  key: Slot;
  /** viewBox width; roughly the CSS width the variant is drawn at. */
  vw: number;
  /** Roof overhang beyond each wall, in viewBox units. */
  oh: number;
  /** Rise per run of the roof line. */
  pitch: number;
  /** Vertical thickness of the gingerbread roof band. */
  band: number;
  /** Headroom above the apex for the snow cap and the big peppermint. */
  top: number;
  eave: number;
  candy: number;
  candyStep: number;
  candyStart: number;
  apexClear: number;
  bulb: number;
  bulbStep: number;
  bulbStart: number;
  bulbEnd: number;
  icing: { step: number; bump: number; thick: number; dripStep: number; dripW: number; drips: readonly number[] };
  chimney: { x: number; w: number; rise: number };
  /** Visible width of the Christmas crest inside the gable. */
  crest: number;
  crestGap: number;
};

const ROOFS: readonly RoofSpec[] = [
  {
    key: "s",
    vw: 400,
    oh: 14,
    pitch: 0.66,
    band: 25,
    top: 17,
    eave: 12,
    candy: 0.8,
    candyStep: 31,
    candyStart: 15,
    apexClear: 22,
    bulb: 0.78,
    bulbStep: 30,
    bulbStart: 18,
    bulbEnd: 116,
    icing: { step: 9, bump: 5, thick: 6, dripStep: 12, dripW: 5.5, drips: [8, 3, 11, 4, 6, 3, 13, 4, 7, 3] },
    chimney: { x: 84, w: 25, rise: 40 },
    crest: 116,
    crestGap: 9,
  },
  {
    key: "m",
    vw: 760,
    oh: 26,
    pitch: 0.5,
    band: 35,
    top: 26,
    eave: 16,
    candy: 1.02,
    candyStep: 44,
    candyStart: 26,
    apexClear: 30,
    bulb: 0.95,
    bulbStep: 46,
    bulbStart: 32,
    bulbEnd: 240,
    icing: { step: 12, bump: 7, thick: 8, dripStep: 16, dripW: 7, drips: [11, 4, 15, 5, 8, 3, 18, 5, 12, 4] },
    chimney: { x: 176, w: 40, rise: 58 },
    crest: 182,
    crestGap: 12,
  },
  {
    key: "l",
    vw: 1200,
    oh: 40,
    pitch: 0.42,
    band: 46,
    top: 34,
    eave: 20,
    candy: 1.26,
    candyStep: 57,
    candyStart: 36,
    apexClear: 40,
    bulb: 1.12,
    bulbStep: 60,
    bulbStart: 50,
    bulbEnd: 418,
    icing: { step: 16, bump: 9, thick: 10, dripStep: 21, dripW: 9, drips: [14, 5, 20, 7, 11, 4, 24, 6, 16, 5, 9] },
    chimney: { x: 292, w: 56, rise: 76 },
    crest: 246,
    crestGap: 14,
  },
];

function roofGeometry(spec: RoofSpec) {
  const cx = spec.vw / 2;
  const yWall = spec.top + spec.band + spec.pitch * (cx - spec.oh);
  const yTop = (x: number) => spec.top + spec.pitch * Math.abs(cx - x);
  const eaveTop = yWall - spec.eave * 0.25;
  const eaveBottom = eaveTop + spec.eave;
  const scallop = spec.eave * 0.42;
  const vh = Math.ceil(Math.max(yTop(0) + spec.band + 3, eaveBottom + scallop + 3));
  return { cx, yWall, yTop, eaveTop, eaveBottom, scallop, vh };
}

/** CSS custom properties that size the roof box and place the crest for every variant. */
export function roofVars(): CSSProperties {
  const vars: Record<string, string> = {};
  for (const spec of ROOFS) {
    const g = roofGeometry(spec);
    const wall = spec.vw - 2 * spec.oh;
    const imageWidth = (spec.crest * 640) / 610;
    const visibleTop = g.yWall - spec.crestGap - (spec.crest * 538) / 610;
    const imageTop = visibleTop - (imageWidth * 51) / 640;
    vars[`--ar-${spec.key}`] = `${spec.vw} / ${g.vh}`;
    vars[`--oh-${spec.key}`] = `${f((spec.oh / wall) * 1000) / 10}%`;
    vars[`--ov-${spec.key}`] = `${f(((g.vh - g.yWall) / wall) * 1000) / 10}%`;
    vars[`--cw-${spec.key}`] = `${f((imageWidth / spec.vw) * 1000) / 10}%`;
    vars[`--ct-${spec.key}`] = `${f((imageTop / g.vh) * 1000) / 10}%`;
  }
  return vars as CSSProperties;
}

function icingPath(spec: RoofSpec, g: ReturnType<typeof roofGeometry>) {
  const { step, bump, thick, dripStep, dripW, drips } = spec.icing;
  const { cx, yTop } = g;
  const x0 = -6;
  let d = `M${f(x0)},${f(yTop(x0) + thick)} L${f(x0)},${f(yTop(x0) - 2)}`;
  for (let x = x0; x < cx - 0.01; x += step) {
    const nx = Math.min(x + step, cx);
    const mx = (x + nx) / 2;
    d += ` Q${f(mx)},${f(yTop(mx) - bump)} ${f(nx)},${f(yTop(nx) - bump * 0.25)}`;
  }
  d += ` L${f(cx)},${f(yTop(cx) + thick + 1)}`;
  let i = 0;
  for (let x = cx - dripStep * 0.75; x > x0 + dripW; x -= dripStep) {
    const len = drips[i % drips.length];
    i += 1;
    const xr = x + dripW / 2;
    const xl = x - dripW / 2;
    d += ` L${f(xr)},${f(yTop(xr) + thick)}`;
    d += ` C${f(xr + dripW * 0.08)},${f(yTop(xr) + thick + len)} ${f(xl - dripW * 0.08)},${f(yTop(xl) + thick + len)} ${f(xl)},${f(yTop(xl) + thick)}`;
  }
  d += ` L${f(x0)},${f(yTop(x0) + thick)} Z`;
  return d;
}

const CANDY_CYCLE = ["gb-pep", "gb-gum-g", "gb-pep", "gb-gum-r"] as const;
const BULBS_LEFT = ["r", "y", "g", "b"] as const;
const BULBS_RIGHT = ["g", "b", "r", "y"] as const;

function RoofArt({ spec }: { spec: RoofSpec }) {
  const g = roofGeometry(spec);
  const { vw, oh, band } = spec;
  const { cx, yWall, yTop, eaveTop, eaveBottom, scallop, vh } = g;
  const id = `gb-icing-${spec.key}`;
  const icing = icingPath(spec, g);
  const mirror = `matrix(-1 0 0 1 ${vw} 0)`;

  const candies: { x: number; y: number; ref: string }[] = [];
  let k = 0;
  for (let x = spec.candyStart; x < cx - spec.apexClear - spec.candyStep * 0.35; x += spec.candyStep) {
    const ref = CANDY_CYCLE[k % CANDY_CYCLE.length];
    const y = yTop(x) + band * 0.6;
    candies.push({ x, y, ref }, { x: vw - x, y, ref });
    k += 1;
  }

  // The light string hangs a little below the band and stops short of the crest.
  const drop = band * 0.26;
  const sag = spec.bulbStep * 0.3;
  const anchorY = (x: number) => yTop(x) + band + drop;
  const anchors: number[] = [];
  for (let x = spec.bulbStart; x <= spec.bulbEnd; x += spec.bulbStep) anchors.push(x);
  let stringPath = `M${f(anchors[0])},${f(anchorY(anchors[0]))}`;
  const bulbs: { x: number; y: number; i: number }[] = [];
  for (let i = 0; i < anchors.length - 1; i += 1) {
    const mx = (anchors[i] + anchors[i + 1]) / 2;
    stringPath += ` Q${f(mx)},${f(anchorY(mx) + sag)} ${f(anchors[i + 1])},${f(anchorY(anchors[i + 1]))}`;
    bulbs.push({ x: mx, y: anchorY(mx) + sag / 2 - 1, i });
  }

  const c = spec.chimney;
  const chimneyScale = c.w / 42;
  const chimneyTop = yTop(c.x) - c.rise;
  const chimneyBody = (yTop(c.x - c.w / 2) + band * 0.7 - chimneyTop) / chimneyScale;

  const eaveLeft = oh - spec.eave * 0.3;
  const eaveRight = vw - eaveLeft;
  const scallopW = spec.eave * 0.68;
  let scallops = `M${f(eaveLeft + spec.eave * 0.3)},${f(eaveBottom - 0.5)}`;
  for (let x = eaveLeft + spec.eave * 0.3; x + scallopW <= eaveRight - spec.eave * 0.3 + 0.01; x += scallopW) {
    scallops += ` q${f(scallopW / 2)},${f(scallop * 1.6)} ${f(scallopW)},0`;
  }

  return (
    <svg
      className={`${s.roofArt} ${s[`roofArt_${spec.key}`]}`}
      viewBox={`0 0 ${vw} ${vh}`}
      aria-hidden="true"
      focusable="false"
    >
      {/* Chimney sits behind the roof band. */}
      <g transform={`translate(${f(c.x)} ${f(chimneyTop)}) scale(${f(chimneyScale * 100) / 100})`}>
        <g className={s.smoke} fill="url(#gb-smoke-fill)">
          <circle className={s.puff} cx="3" cy="-12" r="11" />
          <circle className={s.puff} cx="3" cy="-12" r="11" />
          <circle className={s.puff} cx="3" cy="-12" r="11" />
          <circle className={s.puff} cx="3" cy="-12" r="11" />
          <circle className={s.puff} cx="3" cy="-12" r="11" />
        </g>
        <g className={s.smokeStill} fill="url(#gb-smoke-fill)">
          <circle cx="6" cy="-24" r="10" opacity="0.7" />
          <circle cx="15" cy="-42" r="13" opacity="0.5" />
          <circle cx="30" cy="-62" r="16" opacity="0.36" />
          <circle cx="50" cy="-82" r="18" opacity="0.22" />
        </g>
        <rect x="-21" y="0" width="42" height={f(chimneyBody)} fill="#b4652d" />
        <rect x="-21" y="0" width="42" height={f(chimneyBody)} fill="url(#gb-speck)" />
        <path
          d="M-21,14h42 M-21,28h42 M-21,42h42 M-21,56h42 M-11,0v14 M11,0v14 M0,14v14 M-11,28v14 M11,28v14 M0,42v14"
          fill="none"
          stroke="#fff8ee"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.9"
        />
        <rect x="-27" y="-8" width="54" height="11" rx="3" fill="#8a4720" />
        <path
          d="M-29,-6 Q-27,-16 -17,-14 Q-11,-21 -2,-16 Q6,-22 14,-16 Q23,-19 29,-10 Q27,-4 19,-6 Q15,-1 10,-6 Q3,-1 -3,-6 Q-11,0 -17,-6 Q-25,-2 -29,-6 Z"
          fill="#fbfdff"
        />
        <circle cx="0" cy="21" r="7.5" fill="none" stroke="#1f7a45" strokeWidth="4.5" />
        <g fill="#d0202f">
          <circle cx="-5" cy="16.5" r="1.4" />
          <circle cx="5.5" cy="24" r="1.4" />
          <circle cx="6" cy="17" r="1.3" />
          <path d="M0,27.5 L-4.5,31.5 L-4,25.8 Z" />
          <path d="M0,27.5 L4.5,31.5 L4,25.8 Z" />
        </g>
      </g>

      {/* Gable and eave board */}
      <polygon points={`${oh},${f(yWall + 3)} ${cx},${f(spec.top + band * 0.5)} ${vw - oh},${f(yWall + 3)}`} fill="url(#gb-gable)" />
      <polygon points={`${oh},${f(yWall + 3)} ${cx},${f(spec.top + band * 0.5)} ${vw - oh},${f(yWall + 3)}`} fill="url(#gb-speck)" />
      <rect x={f(eaveLeft)} y={f(eaveTop)} width={f(eaveRight - eaveLeft)} height={spec.eave} rx={f(spec.eave * 0.22)} fill="#874420" />
      <rect x={f(eaveLeft)} y={f(eaveTop)} width={f(eaveRight - eaveLeft)} height={f(spec.eave * 0.22)} rx={f(spec.eave * 0.11)} fill="#a95f2d" />
      <path d={scallops} fill="none" stroke="#fffaf2" strokeWidth={f(spec.eave * 0.13)} strokeLinecap="round" />
      <path
        d={`M${f(eaveLeft + spec.eave * 0.5)},${f(eaveTop + spec.eave * 0.52)} H${f(eaveRight - spec.eave * 0.5)}`}
        stroke="#fffaf2"
        strokeWidth={f(spec.eave * 0.23)}
        strokeLinecap="round"
        strokeDasharray={`0.1 ${f(spec.eave * 0.62)}`}
      />

      {/* Roof band */}
      <polygon
        points={`0,${f(yTop(0))} ${cx},${spec.top} ${vw},${f(yTop(0))} ${vw},${f(yTop(0) + band)} ${cx},${spec.top + band} 0,${f(yTop(0) + band)}`}
        fill="url(#gb-band)"
      />
      <polyline
        points={`0,${f(yTop(0) + band)} ${cx},${spec.top + band} ${vw},${f(yTop(0) + band)}`}
        fill="none"
        stroke="#fffaf2"
        strokeWidth={f(band * 0.055)}
        strokeLinejoin="round"
      />
      <rect x="0" y={f(yTop(0) - 1)} width={f(band * 0.14)} height={f(band + 2)} rx="2" fill="#3f1d0c" />
      <rect x={f(vw - band * 0.14)} y={f(yTop(0) - 1)} width={f(band * 0.14)} height={f(band + 2)} rx="2" fill="#3f1d0c" />

      {/* Icing with drips (and its cool shadow), mirrored onto the right slope */}
      <path d={icing} id={`${id}-shade`} fill="#b9cbe2" transform={`translate(0 ${f(band * 0.06)})`} />
      <use href={`#${id}-shade`} transform={mirror} />
      <path d={icing} id={id} fill="#fbfdff" />
      <use href={`#${id}`} transform={mirror} />
      <ellipse cx={cx} cy={f(spec.top - band * 0.06)} rx={f(band * 0.42)} ry={f(band * 0.24)} fill="#fbfdff" />

      {candies.map((candy) => (
        <use
          key={`${candy.ref}-${f(candy.x)}`}
          href={`#${candy.ref}`}
          transform={`translate(${f(candy.x)} ${f(candy.y)}) scale(${spec.candy})`}
        />
      ))}
      <use href="#gb-pep" transform={`translate(${cx} ${f(spec.top + band * 0.52)}) scale(${f(spec.candy * 1.32 * 100) / 100})`} />

      {/* Light strings and twinkling bulbs */}
      <path d={stringPath} fill="none" stroke="#1d3b2a" strokeWidth={f(1.4 * spec.bulb)} />
      <path d={stringPath} fill="none" stroke="#1d3b2a" strokeWidth={f(1.4 * spec.bulb)} transform={mirror} />
      {bulbs.flatMap(({ x, y, i }) => [
        { x, y, color: BULBS_LEFT[i % 4], delay: (i * 0.83) % 3.2 },
        { x: vw - x, y, color: BULBS_RIGHT[i % 4], delay: (i * 0.83 + 1.4) % 3.2 },
      ]).map((bulb) => (
        <g key={`${f(bulb.x)}-${bulb.color}`} transform={`translate(${f(bulb.x)} ${f(bulb.y)}) scale(${spec.bulb})`}>
          <use href={`#gb-glow-${bulb.color}`} className={s.glow} style={{ animationDelay: `-${f(bulb.delay)}s` }} />
          <use href={`#gb-bulb-${bulb.color}`} />
        </g>
      ))}
    </svg>
  );
}

export function GingerbreadRoofs() {
  return (
    <>
      {ROOFS.map((spec) => (
        <RoofArt key={spec.key} spec={spec} />
      ))}
    </>
  );
}

const pepSwirl = "M0,0 C2.2,-3.6 1.8,-7 0,-9.5 A9.5 9.5 0 0 1 8.23,-4.75 C4.6,-3.4 2.4,-1.8 0,0 Z";
const gumBody = "M-8.5,5.5 C-8.5,-4 -5,-8.5 0,-8.5 C5,-8.5 8.5,-4 8.5,5.5 Z";

function Gumdrop({ id, fill }: { id: string; fill: string }) {
  return (
    <g id={id}>
      <path d={gumBody} fill={fill} />
      <path d="M-8.5,5.5 C-8.5,3.6 -4.6,2.6 0,2.6 C4.6,2.6 8.5,3.6 8.5,5.5 Z" fill="#000000" opacity="0.12" />
      <ellipse cx="-3.2" cy="-3.6" rx="2" ry="3" fill="#ffffff" opacity="0.38" />
      <g fill="#ffffff" opacity="0.78">
        <circle cx="2" cy="-4" r="0.8" />
        <circle cx="4.2" cy="1" r="0.9" />
        <circle cx="-4.6" cy="2" r="0.8" />
        <circle cx="0" cy="0.5" r="0.7" />
        <circle cx="5.4" cy="-2.4" r="0.6" />
      </g>
    </g>
  );
}

function Bulb({ color, fill }: { color: string; fill: string }) {
  return (
    <>
      <circle id={`gb-glow-${color}`} cx="0" cy="8" r="12" fill={`url(#gb-glowfill-${color})`} />
      <g id={`gb-bulb-${color}`}>
        <rect x="-2.2" y="-1" width="4.4" height="4.5" rx="1" fill="#183626" />
        <ellipse cx="0" cy="8.5" rx="3.6" ry="5.4" fill={fill} />
        <ellipse cx="-1.2" cy="7" rx="1" ry="1.9" fill="#ffffff" opacity="0.75" />
      </g>
    </>
  );
}

/** Shared gradients and candy symbols. Kept rendered (0×0) so every SVG can reference them. */
export function GingerbreadDefs() {
  const glows = { r: "#ff5a5a", y: "#ffd24d", g: "#5ee08f", b: "#6fb2ff" };
  return (
    <svg className={s.defs} width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="gb-gable" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d28a4b" />
          <stop offset="1" stopColor="#b86b31" />
        </linearGradient>
        <linearGradient id="gb-band" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7a3d1d" />
          <stop offset="1" stopColor="#4e2510" />
        </linearGradient>
        <pattern id="gb-speck" width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="4" r="0.9" fill="#7a3d16" opacity="0.35" />
          <circle cx="11" cy="9" r="0.8" fill="#f0b47a" opacity="0.35" />
          <circle cx="15" cy="15" r="0.8" fill="#7a3d16" opacity="0.3" />
          <circle cx="6" cy="14" r="0.6" fill="#f0b47a" opacity="0.3" />
        </pattern>
        {Object.entries(glows).map(([key, color]) => (
          <radialGradient key={key} id={`gb-glowfill-${key}`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={color} stopOpacity="0.8" />
            <stop offset="0.45" stopColor={color} stopOpacity="0.26" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </radialGradient>
        ))}
        <linearGradient id="gb-tank" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#76828f" />
          <stop offset="0.14" stopColor="#a8b3bf" />
          <stop offset="0.34" stopColor="#eef2f6" />
          <stop offset="0.52" stopColor="#d6dde4" />
          <stop offset="0.8" stopColor="#9ca8b5" />
          <stop offset="1" stopColor="#6a7684" />
        </linearGradient>
        <linearGradient id="gb-tank-warm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffc68a" stopOpacity="0" />
          <stop offset="1" stopColor="#ffc68a" stopOpacity="0.28" />
        </linearGradient>
        <linearGradient id="gb-cone" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7a8693" />
          <stop offset="0.32" stopColor="#e3e9ef" />
          <stop offset="0.6" stopColor="#bcc5cf" />
          <stop offset="1" stopColor="#66727f" />
        </linearGradient>
        <radialGradient id="gb-bowl" cx="0.36" cy="0.15" r="0.95">
          <stop offset="0" stopColor="#e9eef3" />
          <stop offset="0.45" stopColor="#b4bec9" />
          <stop offset="1" stopColor="#5f6b79" />
        </radialGradient>
        <linearGradient id="gb-pipe" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7d8996" />
          <stop offset="0.4" stopColor="#d9dfe6" />
          <stop offset="1" stopColor="#6f7b88" />
        </linearGradient>
        <linearGradient id="gb-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d6e3f1" />
        </linearGradient>
        <radialGradient id="gb-smoke-fill" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#f2f6fb" stopOpacity="0.95" />
          <stop offset="0.55" stopColor="#e3eaf3" stopOpacity="0.7" />
          <stop offset="1" stopColor="#dbe4ef" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="gb-moon-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff1c4" stopOpacity="0.5" />
          <stop offset="0.4" stopColor="#ffe6a3" stopOpacity="0.14" />
          <stop offset="1" stopColor="#ffe6a3" stopOpacity="0" />
        </radialGradient>
        <filter id="gb-ink" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="0 0 0 0 0.106  0 0 0 0 0.11  0 0 0 0 0.125  0 0 0 0.94 0" />
        </filter>

        <g id="gb-pep">
          <circle r="9.5" fill="#fffdf8" stroke="#e5cfbf" strokeWidth="1" />
          <path d={pepSwirl} fill="#d42a35" />
          <path d={pepSwirl} fill="#d42a35" transform="rotate(120)" />
          <path d={pepSwirl} fill="#d42a35" transform="rotate(240)" />
          <circle r="1.4" fill="#d42a35" />
          <path d="M-6.2,-4.6 A7.6 7.6 0 0 1 1.5,-7.5" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
        </g>
        <Gumdrop id="gb-gum-g" fill="#2fa35a" />
        <Gumdrop id="gb-gum-r" fill="#e0303f" />
        <Gumdrop id="gb-gum-y" fill="#f2b33d" />
        <Bulb color="r" fill="#ff4a4a" />
        <Bulb color="y" fill="#ffc93c" />
        <Bulb color="g" fill="#3fdc7c" />
        <Bulb color="b" fill="#5aa9ff" />
        <g id="gb-holly">
          <g transform="translate(17 13) rotate(200) scale(0.75)">
            <path d="M0,0 Q3,-6 6,-4 Q8,-8 11,-5 Q14,-8 16,-4 Q19,-4 20,0 Q19,4 16,4 Q14,8 11,5 Q8,8 6,4 Q3,6 0,0 Z" fill="#1f7a45" />
            <path d="M1,0 L18,0" stroke="#125a30" strokeWidth="0.9" />
          </g>
          <g transform="translate(17 13) rotate(-20) scale(0.75)">
            <path d="M0,0 Q3,-6 6,-4 Q8,-8 11,-5 Q14,-8 16,-4 Q19,-4 20,0 Q19,4 16,4 Q14,8 11,5 Q8,8 6,4 Q3,6 0,0 Z" fill="#1f7a45" />
            <path d="M1,0 L18,0" stroke="#125a30" strokeWidth="0.9" />
          </g>
          <circle cx="14.5" cy="13" r="3.1" fill="#d0202f" />
          <circle cx="19.8" cy="13.6" r="2.9" fill="#d0202f" />
          <circle cx="17.3" cy="9" r="2.8" fill="#d0202f" />
          <circle cx="13.6" cy="12" r="0.9" fill="#ffffff" opacity="0.75" />
          <circle cx="16.4" cy="8" r="0.8" fill="#ffffff" opacity="0.75" />
        </g>
        <path id="gb-sparkle" d="M0,-6 Q0.9,-0.9 6,0 Q0.9,0.9 0,6 Q-0.9,0.9 -6,0 Q-0.9,-0.9 0,-6Z" />
      </defs>
    </svg>
  );
}

export function Holly({ className, flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 34 22" aria-hidden="true" focusable="false">
      <use href="#gb-holly" transform={flip ? "matrix(-1 0 0 1 34 0)" : undefined} />
    </svg>
  );
}

export function Sparkle({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="-6 -6 12 12" aria-hidden="true" focusable="false">
      <use href="#gb-sparkle" />
    </svg>
  );
}

export function Candy({ kind, className }: { kind: "pep" | "gum-r" | "gum-g" | "gum-y"; className?: string }) {
  return (
    <svg className={className} viewBox="-11 -11 22 22" aria-hidden="true" focusable="false">
      <use href={`#gb-${kind}`} />
    </svg>
  );
}

/** The silver village water tower, after the Millstadt landmark. */
export function WaterTower({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="-100 -192 200 504" aria-hidden="true" focusable="false">
      <g fill="none" strokeLinecap="round">
        <path
          d="M-68.3,6 L-36.1,170 M-30.1,6 L-80.8,170 M68.3,6 L36.1,170 M30.1,6 L80.8,170 M-30.1,6 L36.1,170 M30.1,6 L-36.1,170 M-80.8,170 L-40.8,300 M-36.1,170 L-90.7,300 M80.8,170 L40.8,300 M36.1,170 L90.7,300 M-36.1,170 L40.8,300 M36.1,170 L-40.8,300"
          stroke="#8895a3"
          strokeWidth="1.1"
        />
        <path d="M-80.8,170 L80.8,170" stroke="#9aa6b3" strokeWidth="2.6" />
        <path d="M-68,2 L-91,304 M68,2 L91,304" stroke="#97a3b0" strokeWidth="6" />
        <path d="M-69.2,2 L-92.2,304 M66.8,2 L89.8,304" stroke="#dfe5ec" strokeWidth="1.4" />
      </g>
      <rect x="-7" y="44" width="14" height="260" fill="url(#gb-pipe)" />
      <path d="M-65,0 A65 58 0 0 0 65,0 Z" fill="url(#gb-bowl)" />
      <g fill="none" strokeLinecap="round">
        <path d="M-30,4 L-41,304 M30,4 L41,304" stroke="#a7b2be" strokeWidth="5.5" />
        <path d="M-31.2,4 L-42.2,304 M28.8,4 L39.8,304" stroke="#e6ebf1" strokeWidth="1.3" />
      </g>
      <ellipse cx="0" cy="3" rx="73" ry="4.5" fill="#5b6774" />
      <rect x="-65" y="-130" width="130" height="129" fill="url(#gb-tank)" />
      <rect x="-65" y="-46" width="130" height="45" fill="url(#gb-tank-warm)" />
      <rect x="-73" y="-2.5" width="146" height="5" rx="2" fill="#8692a0" />
      <g stroke="#6b7784" strokeWidth="0.9" fill="none">
        <path d="M-60,-127 V-3 M-54.5,-127 V-3" />
        <path d="M-60,-121h5.5M-60,-115h5.5M-60,-109h5.5M-60,-103h5.5M-60,-97h5.5M-60,-91h5.5M-60,-85h5.5M-60,-79h5.5M-60,-73h5.5M-60,-67h5.5M-60,-61h5.5M-60,-55h5.5M-60,-49h5.5M-60,-43h5.5M-60,-37h5.5M-60,-31h5.5M-60,-25h5.5M-60,-19h5.5M-60,-13h5.5M-60,-7h5.5" />
      </g>
      <path id="gb-tower-arc" d="M-49,-86 Q6,-101 61,-86" fill="none" />
      <text className={s.towerText} fontSize="15.5" letterSpacing="1.2" fill="#1b1c20">
        <textPath href="#gb-tower-arc" startOffset="50%" textAnchor="middle">
          VILLAGE OF
        </textPath>
      </text>
      <image
        href="/images/winter/kit/millstadt-wordmark.png"
        x="-52"
        y="-80"
        width="116"
        height="47.4"
        filter="url(#gb-ink)"
        preserveAspectRatio="xMidYMid meet"
      />
      <g stroke="#56626f" fill="none">
        <path d="M-73,-15 H73" strokeWidth="1.8" />
        <path d="M-73,-8.5 H73" strokeWidth="1.1" />
        <path
          d="M-72,-15v12M-62.4,-15v12M-52.8,-15v12M-43.2,-15v12M-33.6,-15v12M-24,-15v12M-14.4,-15v12M-4.8,-15v12M4.8,-15v12M14.4,-15v12M24,-15v12M33.6,-15v12M43.2,-15v12M52.8,-15v12M62.4,-15v12M72,-15v12"
          strokeWidth="1.2"
        />
      </g>
      <path d="M-68,-130 L0,-166 L68,-130 Z" fill="url(#gb-cone)" />
      <path
        d="M0,-167.5 C9,-164 22,-157 30,-152.5 C27,-148.5 24,-151.5 21,-148.5 C18,-145.5 14,-150 10,-147.5 C6,-145 3,-149.5 0,-147 C-3,-144.5 -7,-149.5 -10,-147.5 C-14,-145 -18,-150 -21,-148 C-24,-146 -27,-149.5 -30,-152.5 C-22,-157 -9,-164 0,-167.5 Z"
        fill="#f3f7fc"
      />
      <rect x="-69.5" y="-133" width="139" height="6" rx="2.5" fill="#83909e" />
      <path d="M-50,-139 V-149 M50,-139 V-149" stroke="#56626f" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="-5" y="-173.5" width="10" height="8" fill="#a9b3be" />
      <rect x="-7" y="-176" width="14" height="3.2" rx="1.2" fill="#87939f" />
      <circle cx="0" cy="-180.5" r="4" fill="#e1e6ec" stroke="#7d8996" strokeWidth="0.8" />
    </svg>
  );
}

/** Stars, glints and falling-snow dots for the night sky. */
export function NightSky({ className }: { className?: string }) {
  const rand = seeded(1980);
  const stars = Array.from({ length: 110 }, () => ({
    x: rand() * 1440,
    y: rand() * 760,
    r: 0.6 + rand() * 0.8,
    o: 0.45 + rand() * 0.5,
  }));
  const flakes = Array.from({ length: 70 }, () => {
    const edge = rand();
    const x = edge < 0.35 ? rand() * 220 : edge < 0.7 ? 1220 + rand() * 220 : rand() * 1440;
    return { x, y: rand() * 900, r: 1.2 + rand() * 2, o: 0.45 + rand() * 0.45 };
  });
  const glints = [
    [250, 120, 1.1], [1190, 92, 1], [1040, 210, 0.7], [128, 300, 0.8], [520, 70, 0.6],
    [890, 46, 0.75], [320, 250, 0.6], [1330, 330, 0.8], [700, 150, 0.55], [60, 520, 0.6],
    [1390, 610, 0.7], [960, 300, 0.5],
  ] as const;
  return (
    <svg className={className} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMin slice" aria-hidden="true" focusable="false">
      <g fill="#ffffff">
        {stars.map((star, i) => (
          <circle key={i} cx={f(star.x)} cy={f(star.y)} r={f(star.r)} opacity={f(star.o * 100) / 100} />
        ))}
      </g>
      <g fill="#fff6d8">
        {glints.map(([x, y, scale], i) => (
          <use
            key={i}
            href="#gb-sparkle"
            className={i % 3 === 0 ? undefined : s.twinkle}
            transform={`translate(${x} ${y}) scale(${scale})`}
            style={{ animationDelay: `-${f((i * 0.9) % 4.2)}s` }}
          />
        ))}
      </g>
      <g fill="#ffffff">
        {flakes.map((flake, i) => (
          <circle key={i} cx={f(flake.x)} cy={f(flake.y)} r={f(flake.r)} opacity={f(flake.o * 100) / 100} />
        ))}
      </g>
    </svg>
  );
}

export function Moon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="-130 -130 260 260" aria-hidden="true" focusable="false">
      <circle r="128" fill="url(#gb-moon-glow)" />
      <circle r="40" fill="#fff3cf" />
      <g fill="#f1dfae">
        <circle cx="-12" cy="-12" r="7.5" />
        <circle cx="13" cy="12" r="9.5" />
        <circle cx="10" cy="-17" r="4.2" />
        <circle cx="-15" cy="15" r="4.6" />
      </g>
    </svg>
  );
}

export function Pines({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 56" aria-hidden="true" focusable="false">
      <g fill="#1f3f4f">
        <path d="M22,4 L34,26 L28,26 L40,52 L4,52 L16,26 L10,26 Z" />
        <path d="M52,18 L61,34 L56.5,34 L66,54 L38,54 L47.5,34 L43,34 Z" />
        <path d="M92,10 L102,29 L97,29 L108,53 L76,53 L87,29 L82,29 Z" />
      </g>
      <g fill="#eef4fb">
        <path d="M22,4 L26.6,12.4 L17.4,12.4 Z" />
        <path d="M52,18 L55.4,24 L48.6,24 Z" />
        <path d="M92,10 L96,17.6 L88,17.6 Z" />
      </g>
    </svg>
  );
}

export function CandyCane({ className }: { className?: string }) {
  const d = "M12,176 V36 C12,10 40,10 40,36 V48";
  return (
    <svg className={className} viewBox="0 0 52 180" aria-hidden="true" focusable="false">
      <path d={d} fill="none" stroke="#7a1420" strokeOpacity="0.25" strokeWidth="13" strokeLinecap="round" transform="translate(2 3)" />
      <path d={d} fill="none" stroke="#fffaf2" strokeWidth="12" strokeLinecap="round" />
      <path d={d} fill="none" stroke="#d0202f" strokeWidth="12" strokeDasharray="8 8" />
      <path d="M8,174 V38 C8,18 22,13 32,17" fill="none" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

const GROUND_CANDIES = ["gum-r", "pep", "gum-g", "gum-y", "pep", "gum-r", "gum-g", "pep", "gum-y", "gum-r", "pep", "gum-g", "gum-y", "pep"] as const;

export function SnowGround() {
  return (
    <div className={s.ground} aria-hidden="true">
      <svg className={s.drift} viewBox="0 0 1440 120" preserveAspectRatio="none" focusable="false">
        <path
          d="M0,34 C70,14 142,18 216,24 C300,31 372,14 460,17 C548,20 618,33 720,26 C826,19 902,34 990,30 C1078,26 1148,15 1236,22 C1310,28 1376,34 1440,22 L1440,120 L0,120 Z"
          fill="url(#gb-snow)"
        />
        <path
          d="M0,34 C70,14 142,18 216,24 C300,31 372,14 460,17 C548,20 618,33 720,26 C826,19 902,34 990,30 C1078,26 1148,15 1236,22 C1310,28 1376,34 1440,22"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <ul className={s.candyRow}>
        {GROUND_CANDIES.map((kind, i) => (
          <li key={i}>
            <Candy kind={kind} className={kind === "pep" ? s.groundPep : s.groundGum} />
          </li>
        ))}
      </ul>
      {[[6, 38], [21, 70], [37, 44], [53, 76], [70, 40], [84, 68], [96, 46]].map(([left, top], i) => (
        <Sparkle
          key={i}
          className={s.snowGlint}
          style={{ left: `${left}%`, top: `${top}%`, animationDelay: `-${f(i * 0.7)}s` }}
        />
      ))}
    </div>
  );
}
