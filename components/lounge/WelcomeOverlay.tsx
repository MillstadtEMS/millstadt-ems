"use client";

import { useEffect, useState } from "react";

// Drop the full-color crest at this path and it'll render through the
// welcome animation. Until then we fall back to the white star-of-life SVG.
const CREST_SRC = "/images/millstadt-ems/crest.png";

/**
 * Full-screen "teleport into the lounge" intro. Fires once after login
 * (the login page sets sessionStorage["lounge:welcome"] = "1" right
 * before navigating here). Animation timeline:
 *
 *    0  →  600ms   black blanket pours in + star-of-life materializes
 *  600  → 1400ms   "Hi, {name}." fades up
 * 1400  → 2400ms   "Welcome to the Employee Lounge" fades up + holds
 * 2400  → 3300ms   everything fades out, revealing the dashboard
 *
 * Total: ~3.3s. After dismissal the flag is cleared so refreshes don't
 * replay it.
 */
export default function WelcomeOverlay({ name }: { name: string }) {
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const [crestOk, setCrestOk] = useState(true);

  useEffect(() => {
    let active = false;
    try {
      if (sessionStorage.getItem("lounge:welcome") === "1") {
        sessionStorage.removeItem("lounge:welcome");
        active = true;
      }
    } catch {
      // sessionStorage unavailable — never animate
    }
    if (!active) {
      setPhase("done");
      return;
    }
    setPhase("playing");
    const t = setTimeout(() => setPhase("done"), 3300);
    return () => clearTimeout(t);
  }, []);

  if (phase !== "playing") return null;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: "none",
        background: "#000",
        animation: "lounge-curtain 3300ms ease-in forwards",
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* Center content stack */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 24px",
        }}
      >
        {/* Crest (preferred) — falls back to the star-of-life SVG if the
            file isn't on disk yet. Drop crest.png at /images/millstadt-ems
            to enable. */}
        <div
          style={{
            width: crestOk ? 200 : 96,
            height: crestOk ? 200 : 96,
            borderRadius: crestOk ? 24 : "50%",
            background: crestOk ? "transparent" : "rgba(240,180,41,0.10)",
            border: crestOk ? "none" : "1px solid rgba(240,180,41,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0,
            transform: "scale(0.55)",
            filter: "blur(8px)",
            animation:
              "lounge-pop 700ms 100ms cubic-bezier(0.22,1.2,0.36,1) forwards, " +
              "lounge-pulse 1800ms 800ms ease-in-out infinite",
          }}
        >
          {crestOk ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={CREST_SRC}
              alt=""
              onError={() => setCrestOk(false)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                filter: "drop-shadow(0 12px 30px rgba(0,0,0,0.6)) drop-shadow(0 0 30px rgba(240,180,41,0.45))",
              }}
            />
          ) : (
            <svg viewBox="0 0 32 32" width="50" height="50" fill="none" aria-hidden>
              <rect x="14" y="2" width="4" height="28" rx="2" fill="white" opacity="0.95" />
              <rect x="14" y="2" width="4" height="28" rx="2" fill="white" opacity="0.95" transform="rotate(60 16 16)" />
              <rect x="14" y="2" width="4" height="28" rx="2" fill="white" opacity="0.95" transform="rotate(120 16 16)" />
              <circle cx="16" cy="16" r="3.5" fill="#f0b429" />
            </svg>
          )}
        </div>

        {/* "Hi, Name." */}
        <h1
          style={{
            color: "white",
            margin: "32px 0 0",
            fontWeight: 900,
            fontSize: "clamp(2rem, 6vw, 3.6rem)",
            letterSpacing: "-0.015em",
            opacity: 0,
            transform: "translateY(14px)",
            animation: "lounge-rise 700ms 700ms cubic-bezier(0.22,0.61,0.36,1) forwards",
            textShadow: "0 4px 28px rgba(240,180,41,0.45)",
          }}
        >
          Hi, {name}.
        </h1>

        {/* "Welcome to the Employee Lounge" */}
        <p
          style={{
            color: "#f0b429",
            margin: "16px 0 0",
            fontWeight: 800,
            fontSize: "clamp(0.85rem, 1.7vw, 1.1rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            opacity: 0,
            transform: "translateY(14px)",
            animation: "lounge-rise 700ms 1500ms cubic-bezier(0.22,0.61,0.36,1) forwards",
          }}
        >
          Welcome to the Employee Lounge
        </p>
      </div>
    </div>
  );
}

const KEYFRAMES = `
@keyframes lounge-pop {
  0%   { opacity: 0; transform: scale(0.55); filter: blur(8px); }
  60%  { opacity: 1; transform: scale(1.08); filter: blur(0); }
  100% { opacity: 1; transform: scale(1);    filter: blur(0); }
}
@keyframes lounge-pulse {
  0%, 100% { box-shadow: 0 0 60px rgba(240,180,41,0.45), 0 0 130px rgba(240,180,41,0.22); }
  50%      { box-shadow: 0 0 100px rgba(240,180,41,0.75), 0 0 200px rgba(240,180,41,0.45); }
}
@keyframes lounge-rise {
  to { opacity: 1; transform: translateY(0); }
}
@keyframes lounge-curtain {
  0%, 72%  { opacity: 1; }
  100%     { opacity: 0; }
}
`;
