"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import StationCalls from "@/components/station/StationCalls";
import StationTV from "@/components/station/StationTV";
import styles from "./preview.module.css";

// The station screen's proportions (components/station/StationTV): an 11-unit bar and an 18.5-unit
// living room over the village, where the call panel will be mounted. Placeholders stand in for the
// bar and the room so the panel can be judged at its real size.
type Frame = "village" | "full" | "station";

/** The real station TV with the panel laid over its village section (how it will be mounted). */
function OnStation({ mode, initialWinter, onCounts }: { mode: "demo" | "demo3" | null; initialWinter: boolean; onCounts: (active: number, shown: number) => void }) {
  const [village, setVillage] = useState<HTMLElement | null>(null);
  useEffect(() => {
    let frame = 0;
    const find = () => {
      const el = document.querySelector<HTMLElement>("[data-station-village]");
      if (el) setVillage(el);
      else frame = window.requestAnimationFrame(find);
    };
    frame = window.requestAnimationFrame(find);
    return () => window.cancelAnimationFrame(frame);
  }, []);
  return (<>
    <StationTV initialWinter={initialWinter} driveBy={false} review />
    {village && createPortal(<StationCalls demo={mode ?? undefined} onActiveChange={onCounts} />, village)}
  </>);
}

export default function CallsPreview({ mode, frame, initialWinter = true }: { mode: "demo" | "demo3" | null; frame: Frame; initialWinter?: boolean }) {
  const [counts, setCounts] = useState({ active: 0, shown: 0 });
  if (frame === "station") {
    return (<>
      <OnStation mode={mode} initialWinter={initialWinter} onCounts={(active, shown) => setCounts({ active, shown })} />
      <output className={styles.readout}>{mode ? `demo: ${mode}` : "live feed"} · active {counts.active} · shown {counts.shown}</output>
    </>);
  }
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
