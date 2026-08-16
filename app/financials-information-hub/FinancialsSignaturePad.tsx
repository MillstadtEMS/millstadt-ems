"use client";

import { Eraser, PenLine, Type } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type FinancialsSignature = {
  method: "drawn" | "typed";
  dataUrl: string;
  typedName: string;
};

export default function FinancialsSignaturePad({
  value,
  legalName,
  contextLabel = "request",
  onChange,
}: {
  value: FinancialsSignature;
  legalName: string;
  contextLabel?: "request" | "report";
  onChange: (signature: FinancialsSignature) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const inkRef = useRef(Boolean(value.dataUrl));
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const valueRef = useRef(value);
  const [hasInk, setHasInk] = useState(Boolean(value.dataUrl));

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    function fitCanvas() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const savedImage = valueRef.current.dataUrl || (hasInk ? canvas.toDataURL("image/png") : "");
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.round(170 * ratio);
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, rect.width, 170);
      context.lineWidth = 2.4;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = "#111827";
      if (savedImage) {
        const image = new Image();
        image.onload = () => context.drawImage(image, 0, 0, rect.width, 170);
        image.src = savedImage;
      }
    }

    fitCanvas();
    window.addEventListener("resize", fitCanvas);
    return () => window.removeEventListener("resize", fitCanvas);
  }, [hasInk]);

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    lastPointRef.current = pointFromEvent(event);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || !lastPointRef.current) return;
    event.preventDefault();
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const point = pointFromEvent(event);
    context.beginPath();
    context.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    context.lineTo(point.x, point.y);
    context.stroke();
    lastPointRef.current = point;
    inkRef.current = true;
    setHasInk(true);
  }

  function finishDrawing() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    if (!inkRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    setHasInk(true);
    onChange({ ...valueRef.current, method: "drawn", dataUrl });
  }

  function clearDrawing() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) {
      context.save();
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.restore();
    }
    setHasInk(false);
    inkRef.current = false;
    onChange({ ...valueRef.current, dataUrl: "" });
  }

  function changeMethod(method: FinancialsSignature["method"]) {
    const nextHasInk = method === "drawn" && Boolean(valueRef.current.dataUrl);
    inkRef.current = nextHasInk;
    setHasInk(nextHasInk);
    onChange({
      method,
      dataUrl: method === "drawn" ? valueRef.current.dataUrl : "",
      typedName:
        method === "typed"
          ? valueRef.current.typedName || legalName
          : valueRef.current.typedName,
    });
  }

  return (
    <div className="financials-signature-capture">
      <div className="financials-signature-modes" role="group" aria-label="Signature method">
        <button
          type="button"
          aria-pressed={value.method === "drawn"}
          onClick={() => changeMethod("drawn")}
        >
          <PenLine aria-hidden="true" />
          Draw signature
        </button>
        <button
          type="button"
          aria-pressed={value.method === "typed"}
          onClick={() => changeMethod("typed")}
        >
          <Type aria-hidden="true" />
          Type signature
        </button>
      </div>

      {value.method === "drawn" ? (
        <div>
          <div className="financials-signature-label-row">
            <span id="financials-signature-label">Sign in the box</span>
            <button type="button" onClick={clearDrawing} disabled={!hasInk}>
              <Eraser aria-hidden="true" />
              Clear
            </button>
          </div>
          <div className="financials-signature-canvas">
            <canvas
              ref={canvasRef}
              aria-labelledby="financials-signature-label"
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={finishDrawing}
              onPointerCancel={finishDrawing}
              onPointerLeave={finishDrawing}
            />
            {!hasInk && <span aria-hidden="true">Sign above the line</span>}
          </div>
        </div>
      ) : (
        <label className="financials-field financials-typed-signature">
          <span>Type your full legal name as your signature</span>
          <input
            autoComplete="name"
            value={value.typedName}
            onChange={(event) =>
              onChange({ ...valueRef.current, method: "typed", typedName: event.target.value })
            }
          />
          <small>The typed signature must match the full name on this {contextLabel}.</small>
        </label>
      )}
    </div>
  );
}
