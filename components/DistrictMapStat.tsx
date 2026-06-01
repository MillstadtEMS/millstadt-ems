"use client";

/**
 * Bottom-bar stat tile for "District · Millstadt" with two extra
 * interactions:
 *
 *   - Hover (desktop / mouse): floats a small preview of the
 *     district map next to the tile, fades out when the cursor
 *     leaves. Uses a portal + position:fixed so it can't be clipped
 *     by the hero section's overflow:hidden.
 *
 *   - Click (any device): opens a full-screen modal with the full
 *     1244×1496 PNG and a basic zoom/pan UI — wheel + +/- buttons
 *     to zoom, click-and-drag (or touch pan) to move around. Pinch
 *     zoom is left to the browser via touch-action: pinch-zoom.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { onHeroPopoverChange, openHeroPopover } from "./heroPopoverChannel";

const MAP_SRC = "/images/millstadt-ems/district-map.png";
const MAP_W = 1244;
const MAP_H = 1496;

export default function DistrictMapStat({ num, label }: { num: string; label: string }) {
  // ── Preview sizing (compact so it sits right above the tile instead
  //    of stretching from top-of-viewport down to the tile).
  const PREVIEW_W = 240;
  const PREVIEW_PAD = 8;
  const PREVIEW_BORDER = 1;
  const CAPTION_H = 22;
  // Natural aspect of the map is 1244 × 1496 → 1.203 tall per wide.
  const previewImgW = PREVIEW_W - PREVIEW_PAD * 2 - PREVIEW_BORDER * 2;
  const previewImgH = Math.round(previewImgW * (MAP_H / MAP_W));
  const PREVIEW_H = previewImgH + PREVIEW_PAD * 2 + PREVIEW_BORDER * 2 + CAPTION_H;

  const [mounted, setMounted] = useState(false);
  const [hover, setHover] = useState(false);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ left: number; top: number; placement: "above" | "below" } | null>(null);
  const tileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Lock body scroll while the zoom modal is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // ESC closes the modal.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Recompute the preview popover position whenever the tile or
  // viewport moves while it's open. Prefer "above the tile" because
  // the District stat sits at the bottom of the hero and that's where
  // the user's eye is; flip "below the tile" only if there isn't
  // room above without clipping the viewport.
  useEffect(() => {
    if (!hover || open || !tileRef.current) return;
    function update() {
      if (!tileRef.current) return;
      const r = tileRef.current.getBoundingClientRect();
      const wantAbove = r.top - 12 - PREVIEW_H >= 12;
      const placement: "above" | "below" = wantAbove ? "above" : "below";
      const top = placement === "above" ? r.top - 12 : r.bottom + 12;
      setCoords({ left: r.left + r.width / 2, top, placement });
    }
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [hover, open, PREVIEW_H]);

  const stopHover = useCallback(() => setHover(false), []);

  // Broadcast on open + listen for sibling popovers so any of the call-
  // stats tooltips or the Top Categories popover taking focus closes
  // this preview, and vice versa.
  useEffect(() => {
    if (hover) openHeroPopover("district-map");
  }, [hover]);
  useEffect(() => {
    if (open) openHeroPopover("district-map");
  }, [open]);
  useEffect(() => {
    return onHeroPopoverChange((activeId) => {
      if (activeId && activeId !== "district-map") {
        setHover(false);
        // Don't auto-close the full-screen zoom modal — the user
        // explicitly opened it; only the hover preview dismisses.
      }
    });
  }, []);

  return (
    <>
      <div
        ref={tileRef}
        role="button"
        tabIndex={0}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={stopHover}
        onFocus={() => setHover(true)}
        onBlur={stopHover}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(true); }
        }}
        className="text-center px-6 py-2"
        style={{
          cursor: "pointer",
          borderRadius: 10,
          transition: "background-color 0.15s",
          background: hover && !open ? "rgba(240,180,41,0.06)" : "transparent",
        }}
        aria-label={`${num} ${label} — open district map`}
      >
        <div className="text-[#f0b429] font-black text-3xl tracking-tight">{num}</div>
        <div className="text-slate-400 text-sm uppercase tracking-widest mt-2">{label}</div>
      </div>

      {/* Hover preview — portal'd so the hero section's overflow:hidden can't clip it */}
      {mounted && hover && !open && coords && createPortal(
        <div
          aria-hidden
          style={{
            position: "fixed",
            top: coords.top,
            left: coords.left,
            // Above-placement anchors the box's BOTTOM at coords.top.
            // Below-placement anchors the box's TOP at coords.top.
            transform: coords.placement === "above"
              ? "translate(-50%, -100%)"
              : "translate(-50%, 0)",
            zIndex: 9998,
            pointerEvents: "none",
            background: "#ffffff",
            border: "2px solid #f0b429",
            borderRadius: 12,
            boxShadow:
              "0 22px 50px rgba(0,0,0,0.75), 0 0 0 4px rgba(240,180,41,0.18)",
            padding: PREVIEW_PAD,
            width: PREVIEW_W,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={MAP_SRC}
            alt=""
            width={MAP_W}
            height={MAP_H}
            style={{
              display: "block",
              width: "100%",
              height: previewImgH,
              objectFit: "contain",
              borderRadius: 6,
              background: "#ffffff",
            }}
          />
          <div style={{
            color: "#0f172a", fontSize: 10, fontWeight: 900,
            letterSpacing: "0.18em", textTransform: "uppercase",
            textAlign: "center", marginTop: 4, height: CAPTION_H - 4,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            Click to open full map
          </div>
        </div>,
        document.body,
      )}

      {/* Full zoom modal */}
      {mounted && open && createPortal(
        <ZoomModal onClose={() => setOpen(false)} />,
        document.body,
      )}
    </>
  );
}

function ZoomModal({ onClose }: { onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const setZoomClamped = useCallback((next: number | ((cur: number) => number)) => {
    setZoom((cur) => {
      const v = typeof next === "function" ? next(cur) : next;
      return Math.min(6, Math.max(1, v));
    });
  }, []);

  // When zooming back to 1×, re-center.
  useEffect(() => {
    if (zoom === 1) setPan({ x: 0, y: 0 });
  }, [zoom]);

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setZoomClamped((z) => z + delta);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (zoom <= 1) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy });
  }
  function onPointerUp() {
    dragRef.current = null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Millstadt EMS district map"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(2,9,18,0.92)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "max(env(safe-area-inset-top), 18px) max(env(safe-area-inset-right), 18px) max(env(safe-area-inset-bottom), 18px) max(env(safe-area-inset-left), 18px)",
      }}
    >
      {/* Controls bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          top: "max(env(safe-area-inset-top), 22px)",
          right: "max(env(safe-area-inset-right), 22px)",
          display: "flex", alignItems: "center", gap: 8,
          padding: "6px 8px",
          background: "rgba(7,20,40,0.92)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 999,
          boxShadow: "0 14px 30px rgba(0,0,0,0.5)",
          zIndex: 2,
        }}
      >
        <button type="button" onClick={() => setZoomClamped((z) => z - 0.5)} style={btn} aria-label="Zoom out">−</button>
        <span style={{
          color: "white", fontWeight: 800, fontSize: 12, minWidth: 44,
          textAlign: "center", fontVariantNumeric: "tabular-nums",
          fontFamily: "var(--font-mas-mono), ui-monospace, monospace",
        }}>
          {Math.round(zoom * 100)}%
        </span>
        <button type="button" onClick={() => setZoomClamped((z) => z + 0.5)} style={btn} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} style={btn} aria-label="Reset zoom">Reset</button>
        <button type="button" onClick={onClose} style={{ ...btn, background: "rgba(248,113,113,0.18)", color: "#fca5a5", border: "1px solid rgba(248,113,113,0.35)" }} aria-label="Close">×</button>
      </div>

      {/* Image viewport — eats wheel + pointer to drive zoom/pan */}
      <div
        onClick={(e) => e.stopPropagation()}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          width: "100%", height: "100%",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden",
          cursor: zoom > 1 ? (dragRef.current ? "grabbing" : "grab") : "default",
          touchAction: "pinch-zoom",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={MAP_SRC}
          alt="Millstadt Ambulance Service district coverage map"
          draggable={false}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            transformOrigin: "center center",
            transition: dragRef.current ? "none" : "transform 0.12s ease-out",
            userSelect: "none",
            pointerEvents: "auto",
            borderRadius: 8,
            boxShadow: "0 24px 60px rgba(0,0,0,0.65)",
          }}
        />
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)",
  color: "white",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 999,
  fontFamily: "inherit",
  fontWeight: 800,
  fontSize: 13,
  letterSpacing: "0.06em",
  padding: "6px 12px",
  minWidth: 34,
  cursor: "pointer",
};
