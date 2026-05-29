"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * PCR-style signature box. Renders a white canvas the user signs with a
 * touchscreen, stylus, or mouse. Returns the signature as a base-64 PNG
 * data URL via `onChange` whenever a stroke ends. Clears with the
 * "Clear" button. Consumers should require a non-empty value before
 * allowing submit.
 *
 * Sized to feel like a paper-PCR signature line — wide and short.
 */
export default function SignaturePad({
  value,
  onChange,
  label = "Signature",
  height = 180,
  disabled,
}: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  label?: string;
  height?: number;
  disabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(Boolean(value));

  const fitCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111";
    // White background — PCR-style
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

  useEffect(() => {
    fitCanvas();
    const onResize = () => fitCanvas();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pointFromEvent(e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPointRef.current = pointFromEvent(e);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || disabled) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !lastPointRef.current) return;
    const p = pointFromEvent(e);
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPointRef.current = p;
    setHasInk(true);
  }

  function end() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    fitCanvas();
    setHasInk(false);
    onChange(null);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" }}>
          {label}
        </span>
        <button
          type="button"
          onClick={clear}
          disabled={disabled || !hasInk}
          style={{
            background: "transparent",
            border: 0,
            color: !hasInk ? "#475569" : "#fca5a5",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            cursor: !hasInk ? "default" : "pointer",
            fontFamily: "inherit",
            padding: 0,
          }}
        >
          Clear
        </button>
      </div>
      <div
        style={{
          position: "relative",
          background: "white",
          border: hasInk ? "1px solid #f0b429" : "1px solid #cbd5e1",
          borderRadius: 12,
          boxShadow: "inset 0 2px 8px rgba(0,0,0,0.04)",
          overflow: "hidden",
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          onPointerCancel={end}
          style={{
            display: "block",
            width: "100%",
            height,
            touchAction: "none",
            cursor: disabled ? "not-allowed" : "crosshair",
            background: "white",
          }}
        />
        {/* Signature line, like a paper PCR */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: 18,
            height: 1,
            background: "#94a3b8",
            opacity: 0.45,
            pointerEvents: "none",
          }}
        />
        {!hasInk && !disabled && (
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: 18,
              bottom: 22,
              color: "#94a3b8",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              pointerEvents: "none",
            }}
          >
            Sign above the line
          </span>
        )}
      </div>
    </div>
  );
}
