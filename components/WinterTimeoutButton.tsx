"use client";

import { setSnowballTimeout, useSnowballTimeout } from "@/lib/seasonal/snowballTimeout";
import styles from "./WinterTimeoutButton.module.css";

// Lives in the winter candy-cane ribbon. One tap calms every automatic snowball antic on the
// site; another tap lets the fight resume. `floating` docks it in the corner of staff pages that
// have no ribbon; `quiet` skips the spoken status for extra copies (the ribbon's copy announces).
export default function WinterTimeoutButton({ floating = false, inline = false, quiet = false }: { floating?: boolean; inline?: boolean; quiet?: boolean }) {
  const timeout = useSnowballTimeout();
  // Phones show the short label so the weather readout keeps its room.
  const label = timeout ? "Back in the fight" : "Call time out";
  const short = timeout ? "Resume" : "Time out";
  return (
    <>
      <button type="button" className={[styles.button, floating && styles.floating, inline && styles.inline].filter(Boolean).join(" ")} data-timeout={timeout} aria-pressed={timeout}
        aria-label={timeout ? "Resume the snowball fight" : "Call time out on the snowball fight"}
        onClick={() => setSnowballTimeout(!timeout)}>
        <svg className={styles.icon} viewBox="0 0 28 20" aria-hidden="true" focusable="false">
          {/* A pitcher's arm finishing a throw, the snowball leaving the glove with speed lines. */}
          <path className={styles.arm} d="M3.5 17.5c1.8-3.6 3.9-6 6.6-7.4l3.4-1.6" />
          <circle className={styles.glove} cx="14.6" cy="7.9" r="2.1" />
          <g className={styles.ball}>
            <path className={styles.trail} d="M16.8 4.2h3.1M15.9 7.1h3.6M16.8 10h3.1" />
            <circle cx="23.2" cy="7.1" r="3.6" />
            <path className={styles.shine} d="M21.6 5.6a2.1 2.1 0 0 1 1.8-.9" />
          </g>
        </svg>
        <span className={styles.text} aria-hidden="true">{label}</span>
        <span className={styles.short} aria-hidden="true">{short}</span>
      </button>
      {!quiet && <span className={styles.sr} role="status">
        {timeout ? "Time out. The snowball fight is paused across the site." : ""}
      </span>}
    </>
  );
}
