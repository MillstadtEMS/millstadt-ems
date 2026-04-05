"use client";

import { useEffect, useRef, useState } from "react";

const DRIVE_MS = 12000;

export default function AmboScroll() {
  const [active, setActive] = useState(false);
  const sentinelRef         = useRef<HTMLDivElement>(null);
  const firedRef            = useRef(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !firedRef.current) {
          firedRef.current = true;
          setActive(true);
          setTimeout(() => setActive(false), DRIVE_MS + 800);
        }
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} style={{ height: "1px", pointerEvents: "none" }} />

      {active && (
        <div
          aria-hidden="true"
          style={{
            position:      "fixed",
            bottom:        0,
            left:          0,
            right:         0,
            height:        "175px",
            pointerEvents: "none",
            zIndex:        999,
            overflow:      "hidden",
          }}
        >
          <img
            src="/images/millstadt-ems/cartoon-ambo.png"
            alt=""
            style={{
              position:  "absolute",
              bottom:    "4px",
              height:    "165px",
              width:     "auto",
              display:   "block",
              animation: `ambo-drive ${DRIVE_MS}ms linear forwards`,
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes ambo-drive {
          from { transform: translateX(calc(100vw + 300px)); }
          to   { transform: translateX(-300px); }
        }
      `}</style>
    </>
  );
}
