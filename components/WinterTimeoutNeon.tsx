"use client";

import { setSnowballTimeout, useSnowballTimeout } from "@/lib/seasonal/snowballTimeout";
import styles from "./WinterTimeoutNeon.module.css";

// The snowball fight's off switch, lit up like a neon sign in the candy-cane ribbon beside the
// weather readout on every public page. While the fight is on, taps in the page throw snowballs
// instead of following links, so the sign says exactly that and calls Time Out; during Time Out
// it says the links work again and offers the fight back.
export default function WinterTimeoutNeon() {
  const timeout = useSnowballTimeout();
  return (
    <>
      <button type="button" className={styles.neon} data-winter-signs="ribbon" data-timeout={timeout} aria-pressed={timeout}
        aria-label={timeout ? "Time out: links work again. Restart the snowball fight." : "Links won't work during the snowball fight. Call time out."}
        onClick={() => setSnowballTimeout(!timeout)}>
        <span className={styles.flake} aria-hidden="true">❄</span>
        <span className={styles.lines} aria-hidden="true">
          <span className={styles.warn}>{timeout ? "Time out · links work again" : "Links won't work during the snowball fight"}</span>
          <span className={styles.call}>
            <span className={styles.click}>{timeout ? "Click here to restart the fight" : "Click here to call Time Out"}</span>
            <span className={styles.tap}>{timeout ? "Tap here to restart the fight" : "Tap here to call Time Out"}</span>
          </span>
        </span>
        <span className={styles.flake} aria-hidden="true">❄</span>
      </button>
      <span className={styles.sr} role="status">{timeout ? "Time out. The snowball fight is paused across the site, and links work." : ""}</span>
    </>
  );
}
