"use client";

import { useEffect, useState, useRef } from "react";

function ScoreboardDigit({ digit }: { digit: string }) {
  const [current, setCurrent] = useState(digit);
  const [prev, setPrev] = useState(digit);
  const [rolling, setRolling] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (digit !== current) {
      setPrev(current);
      setCurrent(digit);
      setRolling(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setRolling(false), 500);
    }
  }, [digit, current]);

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

      {/* Previous digit — rolls up and out */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-transform duration-500 ease-in-out ${rolling ? "-translate-y-full" : "translate-y-0"}`}
        style={{ opacity: rolling ? 1 : 0 }}
      >
        <span
          className="font-black text-white tabular-nums"
          style={{ fontSize: "clamp(2rem, 6vw, 4.5rem)", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}
        >
          {prev}
        </span>
      </div>

      {/* Current digit — rolls in from below */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-transform duration-500 ease-in-out ${rolling ? "translate-y-0" : "translate-y-0"}`}
        style={{
          transform: rolling ? "translateY(0)" : "translateY(0)",
          animation: rolling ? "roll-in 0.5s ease-out" : "none",
        }}
      >
        <span
          className="font-black text-white tabular-nums"
          style={{ fontSize: "clamp(2rem, 6vw, 4.5rem)", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}
        >
          {current}
        </span>
      </div>
    </div>
  );
}

export default function CallVolumeCounter() {
  const [apiCount, setApiCount] = useState<number>(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch("/api/cad/log", { cache: "no-store" });
        if (res.ok) {
          const calls = await res.json();
          setApiCount(calls.length);
        }
      } catch { /* silent */ }
      setLoaded(true);
    }
    fetchCount();
    const id = setInterval(fetchCount, 60_000);
    return () => clearInterval(id);
  }, []);

  const total = apiCount;
  const year = new Date().getFullYear();
  const digits = loaded ? String(total).split("") : ["—"];

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
      <p
        className="text-white/30 text-[8px] mt-2 max-w-xs text-center leading-relaxed"
        style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
      >
        CENCOM 911 dispatch data may contain occasional errors. Actual call volume can vary but by minimal difference. Millstadt EMS makes every effort to monitor and correct the log to reflect accurate information.
      </p>
    </div>
  );
}
