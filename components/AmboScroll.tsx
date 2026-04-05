"use client";

import { useEffect, useRef, useState } from "react";

const DRIVE_MS = 7500;

// ─── Wheel positions measured in 1536×1024 image coordinate space ───────────
// Front wheel (under cab, left of image):   cx=456, cy=800, r=82
// Rear wheel  (under box body, right side):  cx=1080, cy=810, r=96
// Cover ellipses are slightly larger to fully hide the original painted wheels.

const FRONT = { cx: 456,  cy: 800, r: 82,  cover: { rx: 105, ry: 100 } };
const REAR  = { cx: 1080, cy: 810, r: 96,  cover: { rx: 118, ry: 112 } };

// Build a single spinning wheel group.
// KEY: transformBox "fill-box" + transformOrigin "center center" makes
// CSS rotation work correctly inside a scaled SVG viewBox.
function Wheel({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const spokes = 6;
  const hubR   = r * 0.27;
  const rimR   = r * 0.72;

  return (
    <g
      style={{
        transformBox:    "fill-box",
        transformOrigin: "center center",
        animation:       "ambo-spin 0.5s linear infinite",
      }}
    >
      {/* Outer tyre */}
      <circle cx={cx} cy={cy} r={r}      fill="#111" />
      <circle cx={cx} cy={cy} r={r - 7}  fill="#1c1c1c" />
      {/* Alloy rim */}
      <circle cx={cx} cy={cy} r={rimR}   fill="#2d2d2d" />
      <circle cx={cx} cy={cy} r={rimR - 7} fill="#383838" />
      {/* Spokes */}
      {Array.from({ length: spokes }).map((_, i) => {
        const a = (i / spokes) * Math.PI * 2;
        return (
          <line
            key={i}
            x1={cx + hubR * Math.cos(a)}     y1={cy + hubR * Math.sin(a)}
            x2={cx + (rimR - 9) * Math.cos(a)} y2={cy + (rimR - 9) * Math.sin(a)}
            stroke="#505050" strokeWidth={r * 0.13} strokeLinecap="round"
          />
        );
      })}
      {/* Lug nuts (yellow to match ambulance) */}
      {Array.from({ length: spokes }).map((_, i) => {
        const a   = (i / spokes) * Math.PI * 2;
        const nut = rimR - 18;
        return (
          <circle key={i}
            cx={cx + nut * Math.cos(a)}
            cy={cy + nut * Math.sin(a)}
            r={6} fill="#f0b429"
          />
        );
      })}
      {/* Hub cap */}
      <circle cx={cx} cy={cy} r={hubR}     fill="#3a3a3a" />
      <circle cx={cx} cy={cy} r={hubR - 7} fill="#505050" />
      <circle cx={cx} cy={cy} r={7}        fill="#686868" />
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
          <div
            style={{
              position:  "absolute",
              bottom:    "4px",
              animation: `ambo-drive ${DRIVE_MS}ms cubic-bezier(0.25,0.1,0.25,1) forwards`,
            }}
          >
            {/*
              viewBox="0 0 1536 1024" matches the original PNG dimensions.
              Displayed at height=165px → width≈248px.
              All coordinates inside are in 1536×1024 space.
            */}
            <svg
              width="248"
              height="165"
              viewBox="0 0 1536 1024"
              xmlns="http://www.w3.org/2000/svg"
              style={{ display: "block", overflow: "visible" }}
            >
              <defs>
                {/* Gradient mask: full opacity top→87%, then fades to 0 at bottom.
                    This erases the grey ground shadow without cutting the wheels. */}
                <linearGradient id="ambo-fade" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="87%" stopColor="white" stopOpacity="1" />
                  <stop offset="100%" stopColor="white" stopOpacity="0" />
                </linearGradient>
                <mask id="ambo-mask" maskContentUnits="objectBoundingBox">
                  <rect width="1" height="1" fill="url(#ambo-fade)" />
                </mask>

                {/* Light glow gradients */}
                <radialGradient id="g-red" cx="50%" cy="50%" r="50%">
                  <stop offset="0%"   stopColor="#ff2020" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#ff0000" stopOpacity="0"    />
                </radialGradient>
                <radialGradient id="g-blue" cx="50%" cy="50%" r="50%">
                  <stop offset="0%"   stopColor="#2060ff" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#0040ff" stopOpacity="0"    />
                </radialGradient>
              </defs>

              {/* ── Ambulance PNG with shadow masked ── */}
              <image
                href="/images/millstadt-ems/cartoon-ambo.png"
                x="0" y="0" width="1536" height="1024"
                mask="url(#ambo-mask)"
              />

              {/* ── Cover original static wheels ── */}
              <ellipse cx={FRONT.cx} cy={FRONT.cy} rx={FRONT.cover.rx} ry={FRONT.cover.ry} fill="#111" />
              <ellipse cx={REAR.cx}  cy={REAR.cy}  rx={REAR.cover.rx}  ry={REAR.cover.ry}  fill="#111" />

              {/* ── Spinning SVG wheels on top ── */}
              <Wheel cx={FRONT.cx} cy={FRONT.cy} r={FRONT.r} />
              <Wheel cx={REAR.cx}  cy={REAR.cy}  r={REAR.r}  />

              {/* ── Red light flash ── */}
              <g style={{ animation: "ambo-red 0.4s step-start infinite" }}>
                <ellipse cx="200"  cy="185" rx="140" ry="90"  fill="url(#g-red)" />
                <ellipse cx="800"  cy="115" rx="220" ry="100" fill="url(#g-red)" />
                <ellipse cx="1360" cy="155" rx="150" ry="80"  fill="url(#g-red)" />
              </g>

              {/* ── Blue light flash (offset from red) ── */}
              <g style={{ animation: "ambo-blue 0.4s step-start infinite" }}>
                <ellipse cx="200"  cy="185" rx="140" ry="90"  fill="url(#g-blue)" />
                <ellipse cx="800"  cy="115" rx="220" ry="100" fill="url(#g-blue)" />
                <ellipse cx="1360" cy="155" rx="150" ry="80"  fill="url(#g-blue)" />
              </g>
            </svg>
          </div>
        </div>
      )}

      <style>{`
        @keyframes ambo-drive {
          from { transform: translateX(calc(100vw + 300px)); }
          to   { transform: translateX(-300px); }
        }
        @keyframes ambo-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        @keyframes ambo-red {
          0%  { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes ambo-blue {
          0%  { opacity: 0; }
          50% { opacity: 1; }
        }
      `}</style>
    </>
  );
}
