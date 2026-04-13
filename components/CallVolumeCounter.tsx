"use client";

import { useEffect, useState } from "react";
import { staticCalls } from "@/lib/cad/static-calls";

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
    // Poll every 60s so it stays in sync with the ticker
    const id = setInterval(fetchCount, 60_000);
    return () => clearInterval(id);
  }, []);

  const total = apiCount + staticCalls.length;
  const year = new Date().getFullYear();

  return (
    <div className="relative flex flex-col items-center justify-center py-16">
      {/* Star of Life — background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" aria-hidden>
        <svg
          viewBox="0 0 200 200"
          className="w-[280px] h-[280px] md:w-[360px] md:h-[360px] text-[#f0b429]/8"
          fill="currentColor"
        >
          {/* Star of Life — 6-armed cross */}
          <g transform="translate(100,100)">
            {[0, 60, 120, 180, 240, 300].map((angle) => (
              <rect
                key={angle}
                x={-16}
                y={-90}
                width={32}
                height={80}
                rx={4}
                transform={`rotate(${angle})`}
              />
            ))}
            <circle r={28} />
          </g>
        </svg>
      </div>

      {/* Call count — in front */}
      <div className="relative z-10 flex flex-col items-center">
        <div
          className="font-black text-white tracking-tighter leading-none"
          style={{ fontSize: "clamp(4rem, 10vw, 8rem)" }}
        >
          {loaded ? total : "—"}
        </div>
        <div className="text-[#f0b429] font-black text-xl md:text-2xl uppercase tracking-[0.25em] mt-2">
          Calls &middot; {year}
        </div>
        <p className="text-slate-600 text-[10px] mt-4 max-w-md text-center leading-relaxed">
          CENCOM 911 dispatch data may contain occasional errors. Actual call volume can vary but by minimal difference. Millstadt EMS makes every effort to monitor and correct the log to reflect accurate information.
        </p>
      </div>
    </div>
  );
}
