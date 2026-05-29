"use client";

import { useMemo } from "react";

export interface BirthdayPerson {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
}

/**
 * Marquee-style birthday banner. Pulls the list of folks whose dob
 * matches today, builds a "Happy birthday, {Names}!" message, and
 * scrolls it across the top so even short days catch the eye.
 *
 * Rendered above the command header; nothing renders when the list is
 * empty so we don't add chrome on a typical day.
 */
export default function BirthdayBanner({ people }: { people: BirthdayPerson[] }) {
  const names = useMemo(() => {
    const display = people.map((p) => `${p.firstName} ${p.lastName}`);
    if (display.length === 0) return "";
    if (display.length === 1) return display[0];
    if (display.length === 2) return `${display[0]} & ${display[1]}`;
    return `${display.slice(0, -1).join(", ")} & ${display[display.length - 1]}`;
  }, [people]);

  if (people.length === 0) return null;

  const segment = `🎂  Happy birthday, ${names}!  Wish them a great day on shift today.  🎈`;
  const phrase = `${segment}    ·    ${segment}    ·    ${segment}`;

  return (
    <div
      role="banner"
      style={{
        position: "relative",
        marginBottom: 14,
        padding: "10px 0",
        background: "linear-gradient(90deg, rgba(240,180,41,0.18), rgba(244,114,182,0.18), rgba(56,189,248,0.18), rgba(240,180,41,0.18))",
        border: "1px solid rgba(240,180,41,0.30)",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 6px 28px rgba(240,180,41,0.18)",
      }}
    >
      <style>{`
        @keyframes lounge-birthday-marquee {
          0%   { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
      `}</style>
      <div style={{ display: "flex", gap: 16, whiteSpace: "nowrap", animation: "lounge-birthday-marquee 38s linear infinite", willChange: "transform" }}>
        <span style={{ color: "white", fontWeight: 800, fontSize: 14.5, letterSpacing: "0.04em", paddingLeft: 16 }}>{phrase}</span>
        <span aria-hidden style={{ color: "white", fontWeight: 800, fontSize: 14.5, letterSpacing: "0.04em" }}>{phrase}</span>
      </div>
    </div>
  );
}
