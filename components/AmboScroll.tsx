"use client";

import { useEffect, useRef, useState } from "react";

export default function AmboScroll() {
  const [triggered, setTriggered] = useState(false);
  const [driving, setDriving]     = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const cooldownRef = useRef(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !cooldownRef.current) {
          cooldownRef.current = true;
          setTriggered(true);
          setDriving(true);
          // After animation completes (~4s), reset for next scroll
          setTimeout(() => {
            setDriving(false);
            setTimeout(() => {
              setTriggered(false);
              cooldownRef.current = false;
            }, 500);
          }, 4000);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Sentinel div at bottom of page — invisible trigger */}
      <div ref={sentinelRef} style={{ height: "1px", pointerEvents: "none" }} />

      {/* Ambulance */}
      {triggered && (
        <div
          className="fixed bottom-16 md:bottom-2 left-0 right-0 pointer-events-none z-40 overflow-hidden"
          style={{ height: "100px" }}
        >
          {/* Wrapper flips image so ambulance faces left (driving right→left) */}
          <div
            style={{
              position: "absolute",
              bottom: "4px",
              width: "120px",
              transform: "scaleX(-1)", // flip to face left
              animation: driving
                ? `ambo-drive 4s linear forwards, ambo-bounce 0.45s ease-in-out infinite, ambo-img-lights 0.55s linear infinite`
                : undefined,
            }}
            className={driving ? "ambo-img-active" : ""}
          >
            {/* Invisible spacer */}
            <img src="/images/millstadt-ems/ambo-56-nobg.png" alt="" style={{ width: "100%", display: "block", visibility: "hidden" }} />
            {/* Top half — dark */}
            <img
              src="/images/millstadt-ems/ambo-56-nobg.png"
              alt=""
              style={{
                position: "absolute", top: 0, left: 0, width: "100%", display: "block",
                clipPath: "inset(0 0 50% 0)",
                filter: "grayscale(1) contrast(3) brightness(0.2)",
              }}
            />
            {/* Bottom half — yellow */}
            <img
              src="/images/millstadt-ems/ambo-56-nobg.png"
              alt="Millstadt EMS Ambulance"
              style={{
                position: "absolute", top: 0, left: 0, width: "100%", display: "block",
                clipPath: "inset(50% 0 0 0)",
                filter: "grayscale(1) sepia(1) hue-rotate(10deg) saturate(12) contrast(1.3) brightness(1.1)",
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
