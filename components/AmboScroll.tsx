"use client";

import { useEffect, useRef, useState } from "react";

const DRIVE_MS = 7500;

// Wheel data in original image coordinates (1536×1024 viewBox)
// Measured from the cartoon PNG
const WHEELS = [
  { cx: 400,  cy: 840, r: 95,  rimR: 62,  hubR: 22, spokes: 6 }, // front
  { cx: 1010, cy: 885, r: 108, rimR: 72,  hubR: 26, spokes: 6 }, // rear
];

function Wheel({ cx, cy, r, rimR, hubR, spokes }: typeof WHEELS[0]) {
  const angles = Array.from({ length: spokes }, (_, i) => (i * 360) / spokes);
  return (
    <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: "ambo-wheel-spin 0.55s linear infinite" }}>
      {/* Tire */}
      <circle cx={cx} cy={cy} r={r} fill="#111" />
      <circle cx={cx} cy={cy} r={r - 8} fill="#1c1c1c" />
      {/* Rim */}
      <circle cx={cx} cy={cy} r={rimR} fill="#2e2e2e" />
      <circle cx={cx} cy={cy} r={rimR - 6} fill="#3a3a3a" />
      {/* Spokes */}
      {angles.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <line
            key={deg}
            x1={cx + hubR * Math.cos(rad)}
            y1={cy + hubR * Math.sin(rad)}
            x2={cx + (rimR - 8) * Math.cos(rad)}
            y2={cy + (rimR - 8) * Math.sin(rad)}
            stroke="#555"
            strokeWidth="10"
            strokeLinecap="round"
          />
        );
      })}
      {/* Lug nuts */}
      {angles.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const d = rimR - 20;
        return (
          <circle
            key={deg}
            cx={cx + d * Math.cos(rad)}
            cy={cy + d * Math.sin(rad)}
            r={5}
            fill="#f0b429"
          />
        );
      })}
      {/* Hub cap */}
      <circle cx={cx} cy={cy} r={hubR} fill="#444" />
      <circle cx={cx} cy={cy} r={hubR - 6} fill="#555" />
      <circle cx={cx} cy={cy} r={7} fill="#666" />
    </g>
  );
}

export default function AmboScroll() {
  const [active, setActive] = useState(false);
  const sentinelRef         = useRef<HTMLDivElement>(null);
  const firedRef            = useRef(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !firedRef.current) {
          firedRef.current = true;
          setActive(true);
          setTimeout(() => setActive(false), DRIVE_MS + 800);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} style={{ height: "1px", pointerEvents: "none" }} />

      {active && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: "160px",
            pointerEvents: "none",
            zIndex: 999,
            overflow: "hidden",
          }}
        >
          {/* Drive wrapper */}
          <div
            style={{
              position: "absolute",
              bottom: "6px",
              animation: `ambo-scroll-drive ${DRIVE_MS}ms cubic-bezier(0.25,0.1,0.25,1) forwards`,
            }}
          >
            {/*
              SVG uses the original image viewBox (1536×1024).
              Displayed at 150px tall → width scales proportionally to ~225px.
              Wheels, lights, and gradient mask are all in image coordinate space.
            */}
            <svg
              width="225"
              height="150"
              viewBox="0 0 1536 1024"
              xmlns="http://www.w3.org/2000/svg"
              style={{ display: "block", overflow: "visible" }}
            >
              <defs>
                {/* Mask fades out the shadow at the bottom of the PNG */}
                <linearGradient id="ambo-shadow-fade" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="82%" stopColor="white" stopOpacity="1" />
                  <stop offset="100%" stopColor="white" stopOpacity="0" />
                </linearGradient>
                <mask id="ambo-img-mask">
                  <rect width="1536" height="1024" fill="url(#ambo-shadow-fade)" />
                </mask>

                {/* Red glow radial */}
                <radialGradient id="glow-red" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ff2020" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#ff0000" stopOpacity="0" />
                </radialGradient>

                {/* Blue glow radial */}
                <radialGradient id="glow-blue" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#2060ff" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#0040ff" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Cartoon ambulance PNG — shadow masked */}
              <image
                href="/images/millstadt-ems/cartoon-ambo.png"
                x="0"
                y="0"
                width="1536"
                height="1024"
                mask="url(#ambo-img-mask)"
              />

              {/* Cover original static wheels with dark ellipses */}
              <ellipse cx="400"  cy="845" rx="108" ry="102" fill="#0f0f0f" />
              <ellipse cx="1010" cy="890" rx="122" ry="115" fill="#0f0f0f" />

              {/* Animated spinning wheels */}
              {WHEELS.map((w) => (
                <Wheel key={w.cx} {...w} />
              ))}

              {/* ── Emergency light flashes ── */}

              {/* Front bar lights — left of image (front of ambulance) */}
              <ellipse cx="240" cy="185" rx="140" ry="90"
                fill="url(#glow-red)"
                style={{ animation: "ambo-flash-red 0.4s step-start infinite" }} />
              <ellipse cx="240" cy="185" rx="140" ry="90"
                fill="url(#glow-blue)"
                style={{ animation: "ambo-flash-blue 0.4s step-start infinite" }} />

              {/* Top lightbar center */}
              <ellipse cx="750" cy="120" rx="250" ry="100"
                fill="url(#glow-red)"
                style={{ animation: "ambo-flash-red 0.4s step-start infinite" }} />
              <ellipse cx="750" cy="120" rx="250" ry="100"
                fill="url(#glow-blue)"
                style={{ animation: "ambo-flash-blue 0.4s step-start infinite" }} />

              {/* Right side lights */}
              <ellipse cx="1280" cy="160" rx="180" ry="80"
                fill="url(#glow-red)"
                style={{ animation: "ambo-flash-red 0.4s step-start infinite" }} />
              <ellipse cx="1280" cy="160" rx="180" ry="80"
                fill="url(#glow-blue)"
                style={{ animation: "ambo-flash-blue 0.4s step-start infinite" }} />
            </svg>
          </div>
        </div>
      )}

      <style>{`
        @keyframes ambo-scroll-drive {
          from { transform: translateX(calc(100vw + 300px)); }
          to   { transform: translateX(-300px); }
        }
        @keyframes ambo-wheel-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        @keyframes ambo-flash-red {
          0%  { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes ambo-flash-blue {
          0%  { opacity: 0; }
          50% { opacity: 1; }
        }
      `}</style>
    </>
  );
}
