"use client";

import { useEffect, useRef } from "react";
import { WAVEFORM_GENERATORS } from "@/lib/lounge/games/lead-ii/ecg/waveform";
import type { ECGEvent, ECGSettings, RhythmId } from "@/lib/lounge/games/lead-ii/ecg/types";
import {
  ECG_PAPER_PX_PER_MM,
  qrsEventsDueForBeep,
} from "@/lib/lounge/games/lead-ii/ecg/liveMonitorTiming";
import { DEFAULT_ARTIFACT } from "@/lib/lounge/games/lead-ii/ecg/artifacts";
import { beep } from "./LeadIIAudio";

/**
 * Real-time scrolling rhythm strip on standard ECG paper.
 *
 * Geometry matches AHA / standard 12-lead paper:
 *   - 1 mm small box (0.04 s wide, 0.1 mV tall)
 *   - 5 mm large box (0.20 s wide, 0.5 mV tall)
 *   - 25 mm/sec paper speed
 *   - 10 mm/mV vertical gain
 *
 * Pacemaker spikes are rendered as fixed-height vertical ticks (NOT
 * voltage-scaled) because real bedside monitors synthesize spike markers
 * separately from the 40 Hz-filtered sample stream. Without this overlay
 * the dual-chamber paced rhythm just looks like wide-QRS bradycardia.
 *
 * The render loop pulls samples from the same generator the native app
 * uses (the `/lib/lounge/games/lead-ii/ecg` engine), so timing + RR
 * intervals + morphology match the rule book in
 * `ecgMeasurementStandards.ts` exactly.
 */

const FRAME_INTERVAL_MS = 33;            // ~30 fps
const PX_PER_MM = ECG_PAPER_PX_PER_MM;   // 4 px at 1:1 dpr
const PX_PER_SEC = 25 * PX_PER_MM;       // 25 mm/sec
const PX_PER_MV = 60;                    // 10 mm/mV at 6 px/mm
const SAMPLE_RATE = 250;
const SPIKE_HEIGHT_PX = 70;              // marker height above centerline

// ── Real ECG paper palette ────────────────────────────────────────────
// Matches a standard pink/red printed ECG strip:
//   paper  — slightly warm cream
//   minor  — soft salmon for 1-mm boxes
//   major  — deeper red for 5-mm boxes
//   ink    — dark inky stroke for the trace + spikes
const PAPER = {
  background: "#fff8f4",
  minor:      "#f3c1c1",
  major:      "#dc6a6a",
  center:     "rgba(40,18,18,0.10)",
  ink:        "#1a1010",
  inkSoft:    "rgba(26,16,16,0.50)",
  cornerTag:  "#7a2222",
};

interface Props {
  rhythmId: RhythmId;
  heartRate: number;
  paused?: boolean;
  width: number;
  height: number;
  /** Hide the bottom-right "II · 25 mm/s · 10 mm/mV" label. */
  hideStandardsTag?: boolean;
}

export default function EcgLiveCanvas({ rhythmId, heartRate, paused, width, height, hideStandardsTag }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const startedAtRef = useRef<number>(0);
  const lastBeepedTRef = useRef<number>(-Infinity);

  // Reset run when the rhythm changes.
  useEffect(() => {
    startedAtRef.current = performance.now();
    lastBeepedTRef.current = -Infinity;
  }, [rhythmId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = (typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let timer: ReturnType<typeof setInterval> | null = null;

    const visibleSec = width / PX_PER_SEC;
    const cy = height / 2;

    function drawGrid() {
      if (!ctx) return;
      // Paper.
      ctx.fillStyle = PAPER.background;
      ctx.fillRect(0, 0, width, height);

      // Align the major-box grid to the centerline so the trace sits on
      // a clean horizontal rule, the way real ECG paper anchors lead II
      // to a major box edge.
      const xOffset = 0;
      const yOffset = cy % (PX_PER_MM * 5);

      // Minor lines (1 mm).
      ctx.strokeStyle = PAPER.minor;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      for (let x = xOffset; x <= width; x += PX_PER_MM) {
        ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, height);
      }
      for (let y = yOffset; y <= height; y += PX_PER_MM) {
        ctx.moveTo(0, y + 0.5); ctx.lineTo(width, y + 0.5);
      }
      ctx.stroke();

      // Major lines (5 mm).
      ctx.strokeStyle = PAPER.major;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      for (let x = xOffset; x <= width; x += PX_PER_MM * 5) {
        ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, height);
      }
      for (let y = yOffset; y <= height; y += PX_PER_MM * 5) {
        ctx.moveTo(0, y + 0.5); ctx.lineTo(width, y + 0.5);
      }
      ctx.stroke();

      // Subtle centerline (visual aid; not part of the standard grid).
      ctx.strokeStyle = PAPER.center;
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(0, cy + 0.5);
      ctx.lineTo(width, cy + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    function drawStandardsTag() {
      if (!ctx || hideStandardsTag) return;
      ctx.font = "600 10px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = PAPER.cornerTag;
      const tag = "II  ·  25 mm/s  ·  10 mm/mV";
      const tw = ctx.measureText(tag).width;
      ctx.fillText(tag, width - tw - 10, height - 10);
    }

    function renderFrame() {
      if (paused || !ctx) return;
      const nowSec = (performance.now() - startedAtRef.current) / 1000;
      const tStart = Math.max(0, nowSec - visibleSec);
      const tEnd = nowSec;

      const gen = WAVEFORM_GENERATORS[rhythmId];
      if (!gen) return;
      const settings: ECGSettings = {
        rhythmId,
        heartRate,
        sampleRateHz: SAMPLE_RATE,
        artifact: DEFAULT_ARTIFACT,
      };
      let signal;
      try {
        signal = gen(settings, tStart, tEnd);
      } catch (e) {
        console.error("[ecg]", e);
        return;
      }

      drawGrid();

      // ── Trace ──────────────────────────────────────────────────────
      // Plain dark ink, no glow — this is paper, not a CRT.
      ctx.lineWidth = 1.7;
      ctx.strokeStyle = PAPER.ink;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let i = 0; i < signal.points.length; i++) {
        const p = signal.points[i];
        const x = (p.t - tStart) * PX_PER_SEC;
        const y = cy - p.mv * PX_PER_MV;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // ── Pacemaker spike overlay ────────────────────────────────────
      // Real monitors synthesize spike markers separately because the
      // 40 Hz low-pass would smear a needle impulse to a small QRS-shaped
      // blob. We draw each `paced-spike` event as a literal vertical
      // tick of fixed height (independent of mV gain), matching the
      // bedside-monitor convention.
      const spikeTop = Math.max(8, cy - SPIKE_HEIGHT_PX);
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = PAPER.ink;
      ctx.beginPath();
      for (const evt of signal.events as ECGEvent[]) {
        if (evt.kind !== "paced-spike") continue;
        if (!Number.isFinite(evt.tSec) || evt.tSec < tStart || evt.tSec > tEnd) continue;
        const x = (evt.tSec - tStart) * PX_PER_SEC;
        ctx.moveTo(x + 0.5, cy);
        ctx.lineTo(x + 0.5, spikeTop);
      }
      ctx.stroke();

      drawStandardsTag();

      // QRS beep — fire once per detected R wave as the sweep crosses it.
      const dueBeeps = qrsEventsDueForBeep(signal.events as ECGEvent[], lastBeepedTRef.current, nowSec);
      for (const ev of dueBeeps) {
        beep();
        lastBeepedTRef.current = ev.tSec;
      }
    }

    drawGrid();
    drawStandardsTag();
    timer = setInterval(renderFrame, FRAME_INTERVAL_MS);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [rhythmId, heartRate, paused, width, height, hideStandardsTag]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: "block",
        width,
        height,
        borderRadius: 6,
        background: PAPER.background,
        boxShadow: "inset 0 0 0 1px rgba(122,34,34,0.16)",
      }}
    />
  );
}
