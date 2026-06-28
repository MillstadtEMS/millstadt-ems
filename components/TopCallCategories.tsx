"use client";

/**
 * Public "Top Call Categories" tile that mounts directly below the
 * existing call-stats row on the homepage. Shows the top 3 categories
 * year-to-date with their counts + percentages. On hover/tap a popover
 * lists the top 5 categories ranked high → low.
 *
 * The popover uses a portal (same pattern as CallStatsExtras) so the
 * hero section's overflow:hidden can't clip it.
 *
 * No projection here — every number is real ticker data through today.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { onHeroPopoverChange, openHeroPopover } from "./heroPopoverChannel";
import { PLATFORM_ORIGIN_DISCLAIMER } from "@/lib/cad/disclaimers";

interface Cat { name: string; count: number; pct: number }

export default function TopCallCategories() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<{ categories: Cat[]; total: number; year: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/cad/top-categories", { cache: "no-store" });
      if (!r.ok) { setData(null); return; }
      setData(await r.json());
    } catch { setData(null); }
  }, []);

  useEffect(() => {
    setMounted(true);
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!open || !wrapRef.current) return;
    function update() {
      if (!wrapRef.current) return;
      const r = wrapRef.current.getBoundingClientRect();
      setCoords({ top: r.bottom + 8, left: r.left + r.width / 2, width: r.width });
    }
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  function openHover() {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    setOpen(true);
    openHeroPopover("top-categories");
  }
  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 180);
  }

  // Close immediately if a sibling hero popover (stat tooltip, district
  // map) opens. Prevents stacking + the cursor getting trapped on this
  // popover when the user wants to hover one of the others.
  useEffect(() => {
    return onHeroPopoverChange((activeId) => {
      if (activeId && activeId !== "top-categories") {
        if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
        setOpen(false);
      }
    });
  }, []);

  // Click-anywhere-outside dismiss so a tapped-open popover doesn't
  // linger after the user pokes a different tile.
  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      const target = e.target as Element | null;
      if (target?.closest("[data-top-categories-root]") || target?.closest("[data-top-categories-popover]")) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  if (!mounted || !data || data.categories.length === 0) return null;
  const top5 = data.categories.slice(0, 5);

  return (
    <div
      ref={wrapRef}
      data-top-categories-root
      style={{
        width: "100%", maxWidth: 500,
        margin: "16px auto 0", padding: "0 16px",
        position: "relative",
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          setOpen((v) => {
            const next = !v;
            if (next) openHeroPopover("top-categories");
            return next;
          });
        }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((v) => !v); } }}
        onMouseEnter={openHover}
        onMouseLeave={scheduleClose}
        onFocus={openHover}
        onBlur={scheduleClose}
        style={{
          background: "rgba(7,20,40,0.55)",
          border: `1px solid ${open ? "#f0b429" : "rgba(255,255,255,0.08)"}`,
          borderRadius: 14, padding: "12px 16px",
          cursor: "pointer",
          transition: "border-color 0.15s",
          textAlign: "left",
        }}
        aria-expanded={open}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, gap: 10 }}>
          <span style={{ color: "#f0b429", fontSize: 10, fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
            Top Call Categories
          </span>
          <span style={{ color: "#94a3b8", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
            {data.year} YTD · {data.total} calls
          </span>
        </div>
        <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 5 }}>
          {top5.map((c, i) => (
            <li key={c.name} style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{
                display: "inline-block", minWidth: 18, textAlign: "center",
                color: ["#f0b429","#7dd3fc","#c4b5fd","#86efac","#fda4af"][i] ?? "#94a3b8",
                fontWeight: 900, fontVariantNumeric: "tabular-nums",
                fontFamily: "var(--font-mas-mono), ui-monospace, monospace",
                fontSize: 11.5,
              }}>{i + 1}.</span>
              <span style={{ color: "white", fontWeight: 700, fontSize: 13.5, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
              <span style={{ color: "#cbd5e1", fontSize: 12, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                {c.count} <span style={{ color: "#64748b" }}>· {c.pct.toFixed(1)}%</span>
              </span>
            </li>
          ))}
        </ol>
        <div style={{
          marginTop: 8, paddingTop: 8,
          borderTop: "1px solid rgba(255,255,255,0.05)",
          color: "#64748b", fontSize: 10, fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase", textAlign: "center",
        }}>
          Hover for the full year-to-date list
        </div>
      </div>

      {/* Hover popover with EVERY category for the year */}
      {open && coords && createPortal(
        <div
          role="dialog"
          data-top-categories-popover
          onMouseEnter={openHover}
          onMouseLeave={scheduleClose}
          style={{
            position: "fixed", top: coords.top, left: coords.left,
            transform: "translateX(-50%)",
            zIndex: 9999, width: Math.min(460, Math.max(320, coords.width + 40)),
            maxHeight: "calc(100vh - 80px)", overflowY: "auto",
            background: "#020912", border: "1px solid rgba(240,180,41,0.40)",
            borderRadius: 12, boxShadow: "0 18px 40px rgba(0,0,0,0.65)",
            padding: 14, textAlign: "left",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10, gap: 8 }}>
            <span style={{ color: "#f0b429", fontSize: 10, fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
              {data.year} YTD · All categories
            </span>
            <span style={{ color: "#64748b", fontSize: 10.5, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {data.categories.length} types · {data.total} calls
            </span>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 3 }}>
            {data.categories.map((c, i) => (
              <li
                key={c.name}
                style={{
                  display: "flex", justifyContent: "space-between", gap: 8,
                  padding: "4px 6px", borderRadius: 6,
                  background: i < 5 ? "rgba(240,180,41,0.08)" : "transparent",
                  fontSize: 12.5,
                  color: i < 5 ? "white" : "#cbd5e1",
                  fontWeight: i < 5 ? 800 : 500,
                }}
              >
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {i + 1}. {c.name}
                </span>
                <span style={{ fontVariantNumeric: "tabular-nums", color: "#94a3b8", whiteSpace: "nowrap" }}>
                  {c.count} · {c.pct.toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
          <div style={{
            marginTop: 10, paddingTop: 10,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            color: "#64748b", fontSize: 10.5, lineHeight: 1.5,
          }}>
            <p style={{ margin: "0 0 6px" }}>
              <strong style={{ color: "#94a3b8" }}>Disclaimer.</strong> Call category statistics are based on dispatch / ticker information only and may not reflect the final patient care report impression, diagnosis, or billing classification. Categories are subject to change as ticker entries are edited or updated.
            </p>
            <p style={{ margin: "0 0 6px" }}>{PLATFORM_ORIGIN_DISCLAIMER}</p>
            <div style={{
              fontFamily: "var(--font-mas-mono), ui-monospace, monospace",
              fontSize: 10, color: "#475569",
            }}>
              <span style={{ color: "#f0b429" }}>Category %</span> = category count ÷ total calls year-to-date × 100
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
