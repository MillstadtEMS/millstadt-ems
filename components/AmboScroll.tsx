"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const DRIVE_MS = 12000;

// Employee-facing areas that should never show the cartoon ambulance —
// the lounge, admin tools, inventory, and truck-check. The drive-by stays
// on the public marketing site only.
const EMPLOYEE_PREFIXES = ["/lounge", "/admin", "/inventory", "/truckcheck"];

export default function AmboScroll() {
  const pathname = usePathname() || "";
  const isEmployeeArea = EMPLOYEE_PREFIXES.some((p) => pathname.startsWith(p));

  const [active, setActive] = useState(false);
  const sentinelRef         = useRef<HTMLDivElement>(null);
  const firedRef            = useRef(false);

  useEffect(() => {
    if (isEmployeeArea) return;
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
  }, [isEmployeeArea]);

  // Public marketing site only — never render in the lounge/admin/etc.
  if (isEmployeeArea) return null;

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
              animation: `ambo-drive ${DRIVE_MS}ms linear forwards, ambo-lights 0.4s step-start infinite`,
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes ambo-drive {
          from { transform: translateX(calc(100vw + 300px)); }
          to   { transform: translateX(-300px); }
        }
        @keyframes ambo-lights {
          0%,  49% { filter: drop-shadow(0 0 18px #ff2020) drop-shadow(0 0 40px #ff0000); }
          50%, 100% { filter: drop-shadow(0 0 18px #2060ff) drop-shadow(0 0 40px #0040ff); }
        }
      `}</style>
    </>
  );
}
