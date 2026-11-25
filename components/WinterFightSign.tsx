"use client";

import { setSnowballTimeout, useSnowballTimeout } from "@/lib/seasonal/snowballTimeout";
import styles from "./WinterFightSign.module.css";

// Roadside signs standing in the winter scene at the top of every public page: an amber
// "snowball fight ahead" warning (someone already hit it) and, on the plaque, the Time Out call.
// While the fight is on, the stats and maps stay still so taps throw freely; Time Out hands the
// page back (see winter-snowball-play.css).
export default function WinterFightSign({ placement = "scene" }: { placement?: "scene" | "village" | "floating" }) {
  const timeout = useSnowballTimeout();
  return (
    <div className={placement === "scene" ? styles.signs : `${styles.signs} ${styles[placement]}`}
      data-winter-signs={placement} data-timeout={timeout}>
      <span className={styles.warning} aria-hidden="true">
        <i className={styles.beacon} />
        <svg className={styles.diamond} viewBox="0 0 120 120" focusable="false">
          <defs>
            <linearGradient id="signSheen" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffe08a" /><stop offset=".45" stopColor="#f8b80b" /><stop offset="1" stopColor="#d99600" />
            </linearGradient>
          </defs>
          {/* The sign plate, its black inset border, and a little road grime. */}
          <rect x="17.6" y="17.6" width="84.8" height="84.8" rx="7" transform="rotate(45 60 60)" fill="url(#signSheen)" stroke="#2a1c05" strokeWidth="1.6" />
          <rect x="23" y="23" width="74" height="74" rx="5" transform="rotate(45 60 60)" fill="none" stroke="#14100a" strokeWidth="3.4" />
          {/* Pictogram: someone winding up a snowball, two already in the air. */}
          <g fill="none" stroke="#14100a" strokeLinecap="round" strokeLinejoin="round">
            <path d="M57.5 49 L61 68" strokeWidth="9" />
            <path d="M58 53 L47.5 51 L42.5 40.5" strokeWidth="5.6" />
            <path d="M59.5 54 L68 59 L76 55" strokeWidth="5.6" />
            <path d="M62 67.5 L70 77 L76 88" strokeWidth="6.6" />
            <path d="M60 68.5 L53 79 L46 87" strokeWidth="6.6" />
            <path d="M74.5 47.5 h6.5 M75.5 52.5 h4.5 M84 39 h5" strokeWidth="2" />
          </g>
          <circle cx="57" cy="41.5" r="6.3" fill="#14100a" />
          <g fill="#fbfdff" stroke="#14100a" strokeWidth="1.8">
            <circle cx="41.5" cy="35" r="5" />
            <circle cx="86" cy="48" r="4.2" />
            <circle cx="93.5" cy="40.5" r="3" />
          </g>
          {/* Snow piled on the top corner, and a fresh snowball splat on the side. */}
          <path d="M39 21 Q43 9 51 7.5 Q57 1 65.5 5 Q76 6 81 21 Q73 16.5 67 18.5 Q61 15 55 18.5 Q47 16 39 21Z" fill="#fbfdff" stroke="#b7c9dc" strokeWidth="1" />
          <g fill="#fbfdff">
            <circle cx="95" cy="66.5" r="6.4" /><circle cx="100.5" cy="62" r="3" /><circle cx="89" cy="71" r="2.4" />
            <circle cx="99.5" cy="71.5" r="2" /><path d="M93.5 71 q1.2 5 3 8.5 q-2.6 -1.4 -4.2 -6Z" />
          </g>
          {/* Time out: a strip of tape across the sign. */}
          <g className={styles.tape}>
            <rect x="14" y="51" width="92" height="17" rx="2.5" transform="rotate(-13 60 60)" fill="#fbfdff" stroke="#b9161f" strokeWidth="1.6" />
            <text x="60" y="64" transform="rotate(-13 60 60)" textAnchor="middle" fill="#b9161f"
              fontFamily="Arial Narrow, Roboto Condensed, system-ui, sans-serif" fontWeight="900" fontSize="12.5" letterSpacing=".6">TIME OUT</text>
          </g>
        </svg>
        <i className={styles.post} />
      </span>
      <span className={styles.plaqueWrap}>
        <button type="button" className={styles.plaque} aria-pressed={timeout}
          aria-label={timeout ? "Resume the snowball fight" : "Call time out on the snowball fight to use the page"}
          onClick={() => setSnowballTimeout(!timeout)}>
          <small aria-hidden="true">{timeout ? "Time out · page is yours" : "Snowball fight ahead"}</small>
          <strong aria-hidden="true">{timeout ? "Back in the fight" : "Call time out"}</strong>
          {/* The how-to line: "click" with a mouse, "tap" on a touchscreen. */}
          <span className={styles.click} aria-hidden="true">{timeout ? "Click here to restart the snowball fight" : "Click here to pause the snowball fight"}</span>
          <span className={styles.tap} aria-hidden="true">{timeout ? "Tap here to restart the snowball fight" : "Tap here to pause the snowball fight"}</span>
        </button>
        <i className={styles.post} />
      </span>
      <i className={styles.mound} aria-hidden="true" />
      <span className={styles.sr} role="status">{timeout ? "Time out. The snowball fight is paused across the site." : ""}</span>
    </div>
  );
}
