import styles from "./StationSky.module.css";

// The snowy night around the village postcard: a winter moon, a scatter of twinkling stars and a
// stand of snow-laden pines along the bottom of the edges, so the spare space on a wide TV looks
// like part of the scene, not empty screen.

// Pines: x (percent of the width, the tree's center), size (in units of the screen), depth (0 back).
const PINES: ReadonlyArray<readonly [number, number, number]> = [
  [1.5, 25, 0], [7.5, 19, 1], [12.5, 23, 0], [18.5, 15, 1], [4.5, 13, 2], [15.5, 11, 2],
  [81.5, 16, 1], [87, 24, 0], [93, 18, 1], [98.5, 23, 0], [84.5, 12, 2], [95.5, 12, 2],
];
// Stars: x, y (percent), size, twinkle delay.
const STARS: ReadonlyArray<readonly [number, number, number, number]> = [
  [3, 8, 1, 0], [9, 22, .7, 1.4], [15, 12, .9, 2.7], [6, 41, .6, .8], [19, 34, .8, 3.3], [12, 55, .6, 2.1],
  [82, 10, .8, 1.1], [90, 26, 1, 2.4], [96, 15, .7, .4], [85, 46, .6, 3], [93, 58, .8, 1.8], [79, 30, .6, 2.9],
];

function Pine({ depth }: { depth: number }) {
  const green = ["#173f2c", "#1b4a33", "#21563c"][depth], shade = ["#0f2c1f", "#123424", "#173f2c"][depth];
  return (
    <svg viewBox="0 0 100 170" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">
      <rect x="44" y="146" width="12" height="24" rx="2" fill="#4a2f1b" />
      {[[0, 150, 50], [22, 118, 40], [44, 86, 31], [66, 54, 22]].map(([dy, base, half], i) => (
        <g key={i}>
          <path d={`M50 ${8 + dy} L${50 + half} ${base} Q50 ${base + 7} ${50 - half} ${base} Z`} fill={green} stroke={shade} strokeWidth="1.5" strokeLinejoin="round" />
          {/* Snow along each tier's lower edge and on its shoulders. */}
          <path d={`M${50 - half} ${base} Q${50 - half * .55} ${base - 9} ${50 - half * .25} ${base - 3} Q50 ${base - 8} ${50 + half * .3} ${base - 2} Q${50 + half * .6} ${base - 9} ${50 + half} ${base} Q50 ${base + 7} ${50 - half} ${base} Z`}
            fill="#eef6fb" stroke="#b9cfe0" strokeWidth="1" />
        </g>
      ))}
      <path d="M50 2 L56 18 L44 18 Z" fill="#eef6fb" />
    </svg>
  );
}

export default function StationSky() {
  return (
    <div className={styles.sky} aria-hidden="true">
      <span className={styles.moon} />
      {STARS.map(([x, y, size, delay]) => (
        <i key={`${x}-${y}`} className={styles.star} style={{ left: `${x}%`, top: `${y}%`, "--star": size, animationDelay: `-${delay}s` } as React.CSSProperties} />
      ))}
      <span className={styles.drift} />
      {PINES.map(([x, size, depth]) => (
        <span key={x} className={styles.pine} data-depth={depth} style={{ left: `${x}%`, "--pine": size } as React.CSSProperties}>
          <Pine depth={depth} />
        </span>
      ))}
    </div>
  );
}
