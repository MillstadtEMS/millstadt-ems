"use client";

import { useEffect, useState } from "react";

function applyView(next: "auto" | "desktop") {
  if (typeof document === "undefined") return;
  if (next === "desktop") document.documentElement.setAttribute("data-lounge-view", "desktop");
  else document.documentElement.removeAttribute("data-lounge-view");
}

/**
 * "View desktop site" toggle for the lounge.
 *
 * Default behavior: the layout's media queries route phones / tablets
 * into the app-style mobile chrome (bottom tab bar, single-pane
 * Messenger, edge-to-edge cards). If the user explicitly picks
 * "Desktop", we add data-lounge-view="desktop" to <html>, which
 * disables the mobile guardrails defined in app/lounge/layout.tsx
 * and forces a min-width so the rest of the desktop styles fire.
 */
export default function ViewModeToggle() {
  const [view, setView] = useState<"auto" | "desktop">("auto");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("lounge:view") === "desktop" ? "desktop" : "auto";
    setView(stored);
    applyView(stored);
  }, []);

  function pick(next: "auto" | "desktop") {
    setView(next);
    applyView(next);
    try { localStorage.setItem("lounge:view", next); } catch { /* ignore */ }
  }

  return (
    <div style={{
      marginTop: 18,
      padding: "10px 12px",
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12,
    }}>
      <div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 900, letterSpacing: "0.20em", textTransform: "uppercase", marginBottom: 6 }}>
        View mode
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button
          type="button"
          onClick={() => pick("auto")}
          style={pillStyle(view === "auto")}
        >
          Auto
        </button>
        <button
          type="button"
          onClick={() => pick("desktop")}
          style={pillStyle(view === "desktop")}
        >
          Desktop
        </button>
      </div>
    </div>
  );
}

function pillStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: "6px 10px",
    borderRadius: 8,
    background: active ? "#f0b429" : "transparent",
    color: active ? "#040d1a" : "#cbd5e1",
    border: `1px solid ${active ? "#f0b429" : "rgba(255,255,255,0.12)"}`,
    fontFamily: "inherit",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.10em",
    textTransform: "uppercase",
    cursor: "pointer",
  };
}
