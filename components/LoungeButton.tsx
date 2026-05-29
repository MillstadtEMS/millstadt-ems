"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

/**
 * Floating Employee Lounge entry point. Anchored bottom-right on every
 * main-site page (SiteShell hides it on /lounge, /inventory, /truckcheck
 * because those are standalone). Sits above the mobile bottom tab bar so
 * the two never overlap.
 */
export default function LoungeButton() {
  const [hover, setHover] = useState(false);

  return (
    <Link
      href="/lounge"
      aria-label="Employee Lounge"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="mems-lounge-button"
      style={{
        position: "fixed",
        right: 14,
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)",
        zIndex: 50,
        display: "block",
        width: 220,
        height: 220,
        background: "transparent",
        transition:
          "transform 0.25s cubic-bezier(0.22,0.61,0.36,1), filter 0.25s",
        transform: hover ? "translateY(-4px) scale(1.05)" : "translateY(0) scale(1)",
        filter: hover
          ? "drop-shadow(0 16px 30px rgba(240,180,41,0.50)) drop-shadow(0 6px 12px rgba(0,0,0,0.55))"
          : "drop-shadow(0 10px 22px rgba(0,0,0,0.55))",
        cursor: "pointer",
      }}
    >
      {/* Push the button above the sticky mobile bottom tab bar on phones */}
      <style>{`
        @media (max-width: 767px) {
          .mems-lounge-button {
            bottom: calc(env(safe-area-inset-bottom, 0px) + 86px) !important;
            width: 132px !important;
            height: 132px !important;
            right: 10px !important;
          }
        }
      `}</style>
      <Image
        src="/lounge/lounge-button.png"
        alt=""
        width={440}
        height={440}
        priority={false}
        sizes="(max-width: 767px) 132px, 220px"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          background: "transparent",
          pointerEvents: "none",
        }}
      />
      <span
        aria-hidden
        style={{
          position: "absolute",
          right: "calc(100% + 10px)",
          top: "50%",
          transform: hover ? "translateY(-50%) translateX(0)" : "translateY(-50%) translateX(6px)",
          opacity: hover ? 1 : 0,
          pointerEvents: "none",
          transition: "opacity 0.2s, transform 0.2s",
          whiteSpace: "nowrap",
          background: "#040d1a",
          color: "#f0b429",
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid rgba(240,180,41,0.35)",
          boxShadow: "0 8px 20px rgba(0,0,0,0.45)",
        }}
      >
        Employee Lounge
      </span>
    </Link>
  );
}
