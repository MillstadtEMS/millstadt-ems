"use client";

import { useEffect, useRef, useState } from "react";

/*
  AmboScroll — cartoon ambulance drives right→left across the bottom of the page
  when the user scrolls near the end. Triggers once per page load.
  The cartoon image faces LEFT already — no flip needed.
*/

const DRIVE_DURATION = 4200; // ms to cross the full screen

export default function AmboScroll() {
  const [active, setActive] = useState(false);
  const sentinelRef         = useRef<HTMLDivElement>(null);
  const firedRef            = useRef(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !firedRef.current) {
          firedRef.current = true;
          setActive(true);
          setTimeout(() => setActive(false), DRIVE_DURATION + 600);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Invisible sentinel at the very bottom of page content */}
      <div ref={sentinelRef} style={{ height: "1px", pointerEvents: "none" }} />

      {active && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: "170px",
            pointerEvents: "none",
            zIndex: 999,
            overflow: "hidden",
          }}
        >
          {/* Drive: translateX from off-screen right → off-screen left */}
          <div
            style={{
              position: "absolute",
              bottom: "8px",
              animation: `ambo-scroll-drive ${DRIVE_DURATION}ms cubic-bezier(0.25,0.1,0.25,1) forwards`,
            }}
          >
            {/* Bounce: simulates rolling wheels */}
            <div style={{ animation: "ambo-scroll-bounce 0.36s ease-in-out infinite" }}>

              <div style={{ position: "relative", display: "inline-block" }}>

                {/* The cartoon ambulance */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/millstadt-ems/cartoon-ambo.png"
                  alt=""
                  draggable={false}
                  style={{
                    height: "150px",
                    width: "auto",
                    display: "block",
                    userSelect: "none",
                  }}
                />

                {/* Red glow — front lightbar left side + side reds */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "radial-gradient(ellipse 22% 18% at 12% 8%, rgba(255,30,30,0.9) 0%, transparent 100%)," +
                      "radial-gradient(ellipse 14% 12% at 88% 8%, rgba(255,30,30,0.8) 0%, transparent 100%)",
                    mixBlendMode: "screen",
                    animation: "ambo-scroll-red 0.4s step-start infinite",
                    borderRadius: "4px",
                    pointerEvents: "none",
                  }}
                />

                {/* Blue glow — center and right of lightbar */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "radial-gradient(ellipse 30% 18% at 52% 6%, rgba(30,100,255,0.9) 0%, transparent 100%)," +
                      "radial-gradient(ellipse 16% 12% at 75% 8%, rgba(30,100,255,0.8) 0%, transparent 100%)",
                    mixBlendMode: "screen",
                    animation: "ambo-scroll-blue 0.4s step-start infinite",
                    borderRadius: "4px",
                    pointerEvents: "none",
                  }}
                />

              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes ambo-scroll-drive {
          from { transform: translateX(calc(100vw + 300px)); }
          to   { transform: translateX(-300px); }
        }

        @keyframes ambo-scroll-bounce {
          0%   { transform: translateY(0px) rotate(0deg); }
          20%  { transform: translateY(-4px) rotate(-0.4deg); }
          40%  { transform: translateY(-1px) rotate(0.2deg); }
          60%  { transform: translateY(-3px) rotate(-0.3deg); }
          80%  { transform: translateY(-1px) rotate(0.2deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }

        @keyframes ambo-scroll-red {
          0%  { opacity: 1; }
          50% { opacity: 0; }
        }

        @keyframes ambo-scroll-blue {
          0%  { opacity: 0; }
          50% { opacity: 1; }
        }
      `}</style>
    </>
  );
}
