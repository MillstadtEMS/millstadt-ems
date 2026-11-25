"use client";

import { useState } from "react";
import StationCalls from "@/components/station/StationCalls";
import styles from "./preview.module.css";

// The station screen's proportions (components/station/StationTV): an 11-unit bar and an 18.5-unit
// living room over the village, where the call panel will be mounted. Placeholders stand in for the
// bar and the room so the panel can be judged at its real size.
export default function CallsPreview({ mode, frame }: { mode: "demo" | "demo3" | null; frame: "village" | "full" }) {
  const [counts, setCounts] = useState({ active: 0, shown: 0 });
  return (
    <div className={styles.screen} data-frame={frame}>
      {frame === "village" && (
        <>
          <div className={styles.bar}>Station bar · clock · countdown · weather</div>
          <div className={styles.room}>Living room</div>
        </>
      )}
      <section className={styles.village} data-station-village="">
        <div className={styles.villageArt}>Village (the call panel covers this while calls are active)</div>
        <StationCalls demo={mode ?? undefined} onActiveChange={(active, shown) => setCounts({ active, shown })} />
      </section>
      <output className={styles.readout} data-testid="calls-readout">
        {mode ? `demo: ${mode}` : "live feed"} · active {counts.active} · shown {counts.shown}
      </output>
    </div>
  );
}
