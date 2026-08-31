"use client";

import { useEffect, useState } from "react";
import { PLATFORM_ORIGIN_DISCLAIMER } from "@/lib/cad/disclaimers";

function ScoreboardDigit({ digit }: { digit: string }) {
  return (
    <div
      className="relative overflow-hidden inline-flex items-center justify-center bg-[#111] border border-white/10 rounded-md mx-[2px] md:mx-1"
      style={{
        width: "clamp(2.5rem, 7vw, 5rem)",
        height: "clamp(3.5rem, 10vw, 7rem)",
        boxShadow: "inset 0 2px 8px rgba(0,0,0,0.6), 0 4px 20px rgba(0,0,0,0.4)",
      }}
    >
      {/* Split line across the middle */}
      <div className="absolute left-0 right-0 top-1/2 h-px bg-black/40 z-20" />

      {/* Re-key the digit so a changed value replays the short roll-in. */}
      <div
        key={digit}
        className="absolute inset-0 flex items-center justify-center"
        style={{ animation: "roll-in 0.5s ease-out" }}
      >
        <span
          className="font-black text-white tabular-nums"
          style={{ fontSize: "clamp(2rem, 6vw, 4.5rem)", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}
        >
          {digit}
        </span>
      </div>
    </div>
  );
}

export default function CallVolumeCounter() {
  const [apiCount, setApiCount] = useState<number | null>(null);
  const [dataState, setDataState] = useState<"loading" | "ready" | "stale" | "unavailable">("loading");
  const [showDisc, setShowDisc] = useState(false);

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch("/api/cad/summary");
        if (!res.ok) throw new Error(`CAD summary returned ${res.status}`);
        const summary: { total?: unknown } = await res.json();
        if (typeof summary.total !== "number") throw new Error("CAD summary total was invalid");
        setApiCount(summary.total);
        setDataState("ready");
      } catch {
        setDataState((current) => current === "ready" || current === "stale" ? "stale" : "unavailable");
      }
    }
    fetchCount();
    const id = setInterval(fetchCount, 60_000);
    return () => clearInterval(id);
  }, []);

  const total = apiCount;
  const year = new Date().getFullYear();
  const digits = total === null ? ["—"] : String(total).split("");

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Scoreboard digits */}
      <div className="flex items-center">
        {digits.map((d, i) => (
          <ScoreboardDigit key={i} digit={d} />
        ))}
      </div>
      <div
        className="text-[#f0b429] font-black text-sm md:text-base uppercase mt-3"
        style={{ letterSpacing: "0.3em", textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}
      >
        Calls &middot; {year}
      </div>
      {(dataState === "stale" || dataState === "unavailable") && (
        <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/55">
          {dataState === "stale" ? "Last verified total" : "Call total unavailable"}
        </div>
      )}
      {/* Disclaimer collapsed behind a small toggle so it no longer dumps a
          wall of legal text over the section background. */}
      <button
        type="button"
        onClick={() => setShowDisc((v) => !v)}
        aria-expanded={showDisc}
        className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40 transition hover:text-white/70"
        style={{ background: "none", border: "none", cursor: "pointer", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
      >
        <span aria-hidden style={{ fontSize: 11 }}>ⓘ</span>
        Disclaimer
        <span aria-hidden style={{ fontSize: 9, transform: showDisc ? "rotate(180deg)" : "none", transition: "transform 0.15s", display: "inline-block" }}>▾</span>
      </button>
      {showDisc && (
        <p
          className="text-white/45 text-[10px] mt-2 max-w-md text-center leading-relaxed"
          style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
        >
          {PLATFORM_ORIGIN_DISCLAIMER}
        </p>
      )}
    </div>
  );
}
