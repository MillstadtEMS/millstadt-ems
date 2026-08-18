"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

type GameKind = "ambulance" | "decisions";

const AmbulanceExplorer = dynamic(() => import("@/components/kids/AmbulanceExplorer"), {
  loading: () => <GameLoading tone="light" title="Loading ambulance explorer" />,
});

const EmergencyDecisionLab = dynamic(() => import("@/components/kids/EmergencyDecisionLab"), {
  loading: () => <GameLoading tone="dark" title="Loading 911 decision lab" />,
});

export default function LazyKidsGame({ game }: { game: GameKind }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const title = game === "ambulance" ? "Ambulance explorer" : "911 decision lab";

  useEffect(() => {
    if (shouldLoad) return;
    const root = rootRef.current;
    if (!root) return;
    if (typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(() => setShouldLoad(true));
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShouldLoad(true);
        observer.disconnect();
      },
      { rootMargin: game === "ambulance" ? "360px 0px" : "0px" },
    );

    observer.observe(root);
    return () => observer.disconnect();
  }, [game, shouldLoad]);

  return (
    <div ref={rootRef} aria-busy={!shouldLoad}>
      <span className="sr-only" role="status" aria-live="polite">
        {shouldLoad ? `${title} ready` : `${title} loading`}
      </span>
      {shouldLoad ? (
        game === "ambulance" ? <AmbulanceExplorer /> : <EmergencyDecisionLab />
      ) : (
        <GameLoading
          tone={game === "ambulance" ? "light" : "dark"}
          title={title}
        />
      )}
    </div>
  );
}

function GameLoading({ tone, title }: { tone: "light" | "dark"; title: string }) {
  const dark = tone === "dark";

  return (
    <section
      aria-busy="true"
      className={`py-14 ${dark ? "bg-[#061121] text-white" : "bg-[#f4f8fb] text-[#061121]"}`}
    >
      <div className="wrap">
        <div
          className={`min-h-[340px] rounded-lg border p-8 ${
            dark
              ? "border-white/10 bg-white/5 text-slate-300"
              : "border-[#061121]/10 bg-white text-slate-700 shadow-xl shadow-slate-200/60"
          }`}
        >
          <div className={`text-xs font-black uppercase tracking-[0.24em] ${dark ? "text-[#f0b429]" : "text-[#1b58c9]"}`}>
            Safety Games
          </div>
          <h2 className={`mt-4 text-3xl font-black leading-tight ${dark ? "text-white" : "text-[#061121]"}`}>
            {title}
          </h2>
          <p className="mt-4 max-w-2xl text-base font-semibold leading-7">
            Getting the interactive activity ready...
          </p>
        </div>
      </div>
    </section>
  );
}
