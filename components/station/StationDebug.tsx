"use client";

import { useEffect, useState } from "react";
import type { StationDisplay } from "@/lib/station/display";
import { useStationLoop } from "./StationDirector";
import { useStationVideo } from "./useStationVideo";
import styles from "./StationTV.module.css";

/** ?station-debug=1: what the TV really is (CSS viewport, pixel ratio, physical pixels, the art tier
 *  picked) and where the attract loop and the music video are. */
export default function StationDebug({ display, weatherAt }: { display: StationDisplay | null; weatherAt: number | null }) {
  const loop = useStationLoop();
  const video = useStationVideo();
  const [now, setNow] = useState(0);
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (!display || !now) return null;
  const rows: Array<[string, string]> = [
    ["CSS viewport", `${display.viewport.width} × ${display.viewport.height}`],
    ["Pixel ratio", String(Math.round(display.devicePixelRatio * 100) / 100)],
    ["Screen (CSS)", `${display.screen.width} × ${display.screen.height}`],
    ["Physical", `${display.physical.width} × ${display.physical.height}`],
    ["Drawing at", `${display.render.width} × ${display.render.height}`],
    ["Tier", `${display.tier}${display.hdr ? " · HDR" : ""}`],
    ["Layout scale", `${display.scale.toFixed(2)}× of 1920 × 1080`],
    ["Loop", `#${loop.loop} ${loop.phase} · ${Math.max(0, Math.round((now - loop.since) / 1000))} s`],
    ["Falls", loop.order.join(", ") || "—"],
    ["Video", video.playing ? `${video.playing} (asked ${video.asked ?? "—"})` : "not started"],
    ["Weather", weatherAt ? `${Math.max(0, Math.round((now - weatherAt) / 60_000))} min ago` : "—"],
  ];
  return (
    <aside className={styles.debug} aria-label="Station diagnostics">
      <b>Station TV diagnostics</b>
      <dl>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
    </aside>
  );
}
