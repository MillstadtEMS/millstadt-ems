"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const DRIVE_MS = 9000;
const SESSION_KEY = "millstadt:ambulance-drive-by-shown";

// Employee-facing areas that should never show the cartoon ambulance —
// the lounge, admin tools, inventory, and truck-check. The drive-by stays
// on the public marketing site only.
const EMPLOYEE_PREFIXES = ["/lounge", "/admin", "/inventory", "/truckcheck"];

export default function AmboScroll({ enabled }: { enabled: boolean }) {
  const pathname = usePathname() || "";
  const isEmployeeArea = EMPLOYEE_PREFIXES.some((p) => pathname.startsWith(p));

  const [active, setActive] = useState(false);
  const sentinelRef         = useRef<HTMLDivElement>(null);
  const firedRef            = useRef(false);

  useEffect(() => {
    if (!enabled || isEmployeeArea) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const lowPowerDevice = connection?.saveData === true || (navigator.hardwareConcurrency || 4) <= 2;
    if (reducedMotion || lowPowerDevice || sessionStorage.getItem(SESSION_KEY) === "true") return;

    const el = sentinelRef.current;
    if (!el) return;
    let stopTimer: ReturnType<typeof setTimeout> | undefined;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !firedRef.current) {
          firedRef.current = true;
          sessionStorage.setItem(SESSION_KEY, "true");
          setActive(true);
          stopTimer = setTimeout(() => setActive(false), DRIVE_MS + 800);
          obs.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      if (stopTimer) clearTimeout(stopTimer);
    };
  }, [enabled, isEmployeeArea]);

  // Public marketing site only — never render in the lounge/admin/etc.
  if (!enabled || isEmployeeArea) return null;

  return (
    <>
      <div ref={sentinelRef} style={{ height: "1px", pointerEvents: "none" }} />

      {active && (
        <div
          aria-hidden="true"
          style={{
            position:      "fixed",
            bottom:        "14px",
            left:          0,
            right:         0,
            height:        "72px",
            pointerEvents: "none",
            zIndex:        30,
            overflow:      "hidden",
          }}
        >
          <Image
            src="/images/millstadt-ems/cartoon-ambo.png"
            alt=""
            aria-hidden="true"
            width={1536}
            height={1024}
            sizes="96px"
            style={{
              position:  "absolute",
              bottom:    0,
              height:    "64px",
              width:     "auto",
              display:   "block",
              filter:    "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.42))",
              animation: `ambo-drive ${DRIVE_MS}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
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
