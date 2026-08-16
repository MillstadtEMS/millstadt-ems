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
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const nextWidth = Math.max(1, Math.round(rect.width * ratio));
      const nextHeight = Math.max(1, Math.round(rect.height * ratio));
      if (canvas.width === nextWidth && canvas.height === nextHeight) return;

      const snapshot = document.createElement("canvas");
      snapshot.width = canvas.width;
      snapshot.height = canvas.height;
      if (inkRef.current && canvas.width && canvas.height) {
        snapshot.getContext("2d")?.drawImage(canvas, 0, 0);
      }

      canvas.width = nextWidth;
      canvas.height = nextHeight;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.lineWidth = 2.4 * (canvas.width / rect.width);
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = "#111827";

      if (snapshot.width && snapshot.height && inkRef.current) {
        context.drawImage(snapshot, 0, 0, snapshot.width, snapshot.height, 0, 0, canvas.width, canvas.height);
      } else if (valueRef.current.dataUrl) {
        const image = new Image();
        image.onload = () => {
          const currentCanvas = canvasRef.current;
          const currentContext = currentCanvas?.getContext("2d");
          if (!currentCanvas || !currentContext) return;
          currentContext.drawImage(image, 0, 0, currentCanvas.width, currentCanvas.height);
          inkRef.current = true;
          setHasInk(true);
        };
        image.src = valueRef.current.dataUrl;
      }
    }

    fitCanvas();
    const canvas = canvasRef.current;
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fitCanvas);
    if (canvas) observer?.observe(canvas);
    window.addEventListener("resize", fitCanvas);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", fitCanvas);
    };
  }, [value.method]);

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    const point = pointFromEvent(event);
    lastPointRef.current = point;
    const context = event.currentTarget.getContext("2d");
    if (context) {
      context.fillStyle = "#111827";
      context.beginPath();
      context.arc(point.x, point.y, Math.max(1.5, context.lineWidth / 2), 0, Math.PI * 2);
      context.fill();
      inkRef.current = true;
      setHasInk(true);
    }
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || !lastPointRef.current) return;
    event.preventDefault();
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const pointerEvents = event.nativeEvent.getCoalescedEvents?.() ?? [event.nativeEvent];
    for (const pointerEvent of pointerEvents) {
      const rect = event.currentTarget.getBoundingClientRect();
      const point = {
        x: (pointerEvent.clientX - rect.left) * (event.currentTarget.width / rect.width),
        y: (pointerEvent.clientY - rect.top) * (event.currentTarget.height / rect.height),
      };
      context.beginPath();
      context.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      context.lineTo(point.x, point.y);
      context.stroke();
      lastPointRef.current = point;
    }
    inkRef.current = true;
    setHasInk(true);
  }

  function finishDrawing(event?: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    if (event?.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
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
