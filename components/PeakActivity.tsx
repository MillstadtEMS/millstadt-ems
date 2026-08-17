"use client";

/**
 * Peak-activity heatmap. For each month we get a 7×3 grid (day-of-week ×
 * time-window) of call counts. The latest month is shown by default and
 * stays live as the parent re-polls; hovering a month chip swaps to that
 * (archived) month so you can see its busiest day/window with numbers.
 *
 * Time windows match the dispatch shifts: 0500–1300, 1301–2100, 2101–0459.
 */

import { useState } from "react";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOW_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const BLOCKS = [
  { label: "Day", range: "0500–1300" },
  { label: "Evening", range: "1301–2100" },
  { label: "Overnight", range: "2101–0459" },
];

export interface MonthPeak { key: string; label: string; year: number; grid: number[][]; total: number }

function hexToRgb(hex: string) {
  const m = hex.replace("#", "");
  return { r: parseInt(m.slice(0, 2), 16), g: parseInt(m.slice(2, 4), 16), b: parseInt(m.slice(4, 6), 16) };
}

export default function PeakActivity({ months, accent = "#f0b429" }: { months: MonthPeak[]; accent?: string }) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  if (!months || months.length === 0) return null;

  const active = months.find((m) => m.key === activeKey) ?? months[months.length - 1];
  const grid = active.grid;
  const byDow = DOW.map((_, d) => grid[d].reduce((a, b) => a + b, 0));
  const byBlock = [0, 1, 2].map((b) => grid.reduce((a, row) => a + row[b], 0));
  const maxCell = Math.max(1, ...grid.flat());
  const busiestDow = byDow.some((n) => n > 0) ? byDow.indexOf(Math.max(...byDow)) : -1;
  const busiestBlock = byBlock.some((n) => n > 0) ? byBlock.indexOf(Math.max(...byBlock)) : -1;
  const { r, g, b } = hexToRgb(accent);
  const cellBg = (n: number) => (n === 0 ? "rgba(255,255,255,0.03)" : `rgba(${r},${g},${b},${(0.14 + 0.78 * (n / maxCell)).toFixed(3)})`);
  const isLatest = active.key === months[months.length - 1].key;

  return (
    <section style={card}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
        <h3 style={{ color: accent, fontSize: 13, fontWeight: 700, margin: 0, letterSpacing: "0.01em" }}>Peak activity</h3>
        <span style={{ color: "#94a3b8", fontSize: 11.5 }}>
          {active.label} {active.year}{isLatest ? " · live" : " · archived"} · {active.total} call{active.total === 1 ? "" : "s"}
        </span>
      </div>

      {/* Busiest callouts */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, margin: "8px 0 12px" }}>
        <Callout label="Busiest day" value={busiestDow >= 0 ? DOW_LONG[busiestDow] : "—"} sub={busiestDow >= 0 ? `${byDow[busiestDow]} calls` : ""} accent={accent} />
        <Callout label="Busiest window" value={busiestBlock >= 0 ? BLOCKS[busiestBlock].range : "—"} sub={busiestBlock >= 0 ? `${BLOCKS[busiestBlock].label} · ${byBlock[busiestBlock]} calls` : ""} accent={accent} />
      </div>

      {/* Heatmap: rows = time windows, cols = days */}
      <div style={{ display: "grid", gridTemplateColumns: "78px repeat(7, 1fr)", gap: 4 }}>
        <div />
        {DOW.map((d, i) => (
          <div key={d} style={{ textAlign: "center", color: i === busiestDow ? accent : "#94a3b8", fontSize: 11, fontWeight: i === busiestDow ? 700 : 500 }}>{d}</div>
        ))}
        {BLOCKS.map((blk, bi) => (
          <div key={blk.label} style={{ display: "contents" }}>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", color: bi === busiestBlock ? accent : "#94a3b8", fontSize: 10.5, lineHeight: 1.15, fontWeight: bi === busiestBlock ? 700 : 500 }}>
              <span>{blk.label}</span>
              <span style={{ color: "#64748b", fontSize: 9.5 }}>{blk.range}</span>
            </div>
            {DOW.map((d, di) => {
              const n = grid[di][bi];
              const peak = di === busiestDow && bi === busiestBlock && n > 0;
              return (
                <div
                  key={d}
                  title={`${DOW_LONG[di]} · ${blk.range} (${blk.label}) · ${n} call${n === 1 ? "" : "s"}`}
                  style={{
                    height: 38, borderRadius: 7, background: cellBg(n),
                    border: peak ? `1.5px solid ${accent}` : "1px solid rgba(255,255,255,0.05)",
                    boxShadow: peak ? `0 0 12px rgba(${r},${g},${b},0.45)` : "none",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: n > maxCell * 0.55 ? "#06101f" : "#cbd5e1",
                    fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {n > 0 ? n : ""}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Monthly archive — hover to inspect a past month */}
      {months.length > 1 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ color: "#64748b", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>Hover a month</div>
          <div
            style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
            onMouseLeave={() => setActiveKey(null)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setActiveKey(null);
            }}
          >
            {months.map((m) => {
              const on = m.key === active.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  onMouseEnter={() => setActiveKey(m.key)}
                  onFocus={() => setActiveKey(m.key)}
                  title={`${m.label} ${m.year} · ${m.total} calls`}
                  style={{
                    cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: on ? 700 : 600,
                    padding: "6px 11px", borderRadius: 999,
                    color: on ? "#06101f" : "#cbd5e1",
                    background: on ? accent : "rgba(255,255,255,0.04)",
                    border: `1px solid ${on ? accent : "rgba(255,255,255,0.12)"}`,
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function Callout({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div style={{ flex: "1 1 180px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 11, padding: "10px 13px" }}>
      <div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: accent, fontSize: 17, fontWeight: 800, marginTop: 3 }}>{value}</div>
      {sub && <div style={{ color: "#94a3b8", fontSize: 11.5, marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#071428", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16,
};
