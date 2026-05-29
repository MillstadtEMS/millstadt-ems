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
import { LEAD_II_COLORS } from "./theme";

/**
 * Web port of the native Skia ECG canvas. Mirrors the original's
 * behaviour: real-time scrolling trace, QRS beeps, vintage phosphor
 * green stroke against a black + grid background. 30 fps render loop;
 * window slides left as time advances.
 */

const FRAME_INTERVAL_MS = 33; // ~30 fps
const PX_PER_MM = ECG_PAPER_PX_PER_MM;
const PX_PER_SEC = 25 * PX_PER_MM;       // 25 mm/sec standard paper speed
const PX_PER_MV = 60;                    // 1 mV ≈ 60 px
const SAMPLE_RATE = 250;

interface Props {
  rhythmId: RhythmId;
  heartRate: number;
  paused?: boolean;
  width: number;
  height: number;
}

export default function EcgLiveCanvas({ rhythmId, heartRate, paused, width, height }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const startedAtRef = useRef<number>(performance.now());
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

    let rafId = 0;
    let timer: ReturnType<typeof setInterval> | null = null;

    const visibleSec = width / PX_PER_SEC;
    const ymid = height / 2;

    function drawGrid() {
      if (!ctx) return;
      ctx.fillStyle = LEAD_II_COLORS.black;
      ctx.fillRect(0, 0, width, height);
      // Small grid (1 mm)
      ctx.strokeStyle = "rgba(47,245,135,0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x += PX_PER_MM) {
        ctx.moveTo(x, 0); ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += PX_PER_MM) {
        ctx.moveTo(0, y); ctx.lineTo(width, y);
      }
      ctx.stroke();
      // Large grid (5 mm)
      ctx.strokeStyle = "rgba(47,245,135,0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x += PX_PER_MM * 5) {
        ctx.moveTo(x, 0); ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += PX_PER_MM * 5) {
        ctx.moveTo(0, y); ctx.lineTo(width, y);
      }
      ctx.stroke();
    }

    function renderFrame() {
      if (paused || !ctx) {
        // Paused: keep the last frame visible.
        rafId = requestAnimationFrame(renderFrame);
        return;
      }
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

      // Draw glow under the trace.
      ctx.lineWidth = 6;
      ctx.strokeStyle = "rgba(47,245,135,0.18)";
      ctx.beginPath();
      for (let i = 0; i < signal.points.length; i++) {
        const p = signal.points[i];
        const x = (p.t - tStart) * PX_PER_SEC;
        const y = ymid - p.mv * PX_PER_MV;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Main trace.
      ctx.lineWidth = 1.9;
      ctx.strokeStyle = LEAD_II_COLORS.phosphor;
      ctx.shadowColor = LEAD_II_COLORS.phosphor;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      for (let i = 0; i < signal.points.length; i++) {
        const p = signal.points[i];
        const x = (p.t - tStart) * PX_PER_SEC;
        const y = ymid - p.mv * PX_PER_MV;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // QRS beep — fire once per detected R wave as the sweep crosses it.
      const dueBeeps = qrsEventsDueForBeep(signal.events as ECGEvent[], lastBeepedTRef.current, nowSec);
      for (const ev of dueBeeps) {
        beep();
        lastBeepedTRef.current = ev.tSec;
      }
    }

    drawGrid();
    timer = setInterval(renderFrame, FRAME_INTERVAL_MS);

    return () => {
      if (timer) clearInterval(timer);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [rhythmId, heartRate, paused, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: "block",
        width,
        height,
        borderRadius: 12,
        background: LEAD_II_COLORS.black,
      }}
    />
  );
}
