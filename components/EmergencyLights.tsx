import type { CSSProperties } from "react";
import styles from "./EmergencyLights.module.css";

// Red and blue emergency lighting for a piece of vehicle art. Each unit has two lens masks cut from
// its own painting (public/images/winter/fleet/beacons/<unit>-red|blue.webp), so the flash covers
// the real light bar, corner lights and grille lights and nothing else.
export default function EmergencyLights({ unit, on }: { unit: string; on: boolean }) {
  const lens = (color: "red" | "blue") =>
    ({ "--lens": `url("/images/winter/fleet/beacons/${unit}-${color}.webp")` }) as CSSProperties;
  return (
    <span className={styles.beacons} data-on={on} aria-hidden="true">
      <span className={styles.bloom}>
        <i className={styles.red} style={lens("red")} />
        <i className={styles.blue} style={lens("blue")} />
      </span>
      <i className={`${styles.red} ${styles.lens}`} style={lens("red")} />
      <i className={`${styles.blue} ${styles.lens}`} style={lens("blue")} />
    </span>
  );
}
