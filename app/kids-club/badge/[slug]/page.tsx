import Link from "next/link";
import { notFound } from "next/navigation";
import { BADGES, KIDS_ACTIVITIES } from "@/lib/kids/activities";

function badgeSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const ALL_BADGES = Array.from(new Set([
  ...BADGES,
  ...KIDS_ACTIVITIES.map((a) => a.badge),
]));

export function generateStaticParams() {
  return ALL_BADGES.map((b) => ({ slug: badgeSlug(b) }));
}

export default async function PrintableBadgePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const badge = ALL_BADGES.find((b) => badgeSlug(b) === slug);
  if (!badge) notFound();

  // If an activity uses this badge, surface its title as the "earned by" line.
  const activity = KIDS_ACTIVITIES.find((a) => a.badge === badge);

  return (
    <main style={{ background: "#f4f8fb", color: "#061121", minHeight: "100vh" }}>
      <div className="badge-screen-only" style={{ padding: "20px", textAlign: "center" }}>
        <Link href="/kids-club/activities#badges" style={{ color: "#061121", fontWeight: 900, textDecoration: "none" }}>
          ← Back to Kids Club badges
        </Link>
        <p style={{ color: "#475569", fontSize: 14, marginTop: 8 }}>
          Press <strong>Ctrl/Cmd + P</strong> to print this certificate.
        </p>
      </div>

      <article
        style={{
          width: "8.5in",
          minHeight: "11in",
          margin: "0 auto",
          padding: "0.75in",
          background: "white",
          boxShadow: "0 18px 60px rgba(2,9,18,0.18)",
          border: "16px solid #061121",
          boxSizing: "border-box",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 22,
        }}
      >
        {/* Decorative inner border */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 12,
            border: "2px solid #f0b429",
            borderRadius: 6,
            pointerEvents: "none",
          }}
        />

        <header style={{ textAlign: "center", marginTop: 16 }}>
          <div style={{ color: "#1b58c9", fontSize: 13, fontWeight: 900, letterSpacing: "0.32em", textTransform: "uppercase" }}>
            Millstadt EMS Kids Club
          </div>
          <h1 style={{ margin: "12px 0 4px", fontSize: 36, fontWeight: 900, letterSpacing: "-0.01em" }}>
            Certificate of Achievement
          </h1>
          <p style={{ color: "#475569", fontSize: 14, margin: 0 }}>This certifies that</p>
        </header>

        <div
          style={{
            borderBottom: "2px dashed #061121",
            width: "70%",
            margin: "32px 0 8px",
            paddingBottom: 14,
            textAlign: "center",
          }}
        >
          <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase" }}>
            (Print name here)
          </div>
        </div>

        <p style={{ fontSize: 16, color: "#1f2937", margin: 0 }}>has earned the</p>

        {/* Big badge */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", margin: "8px 0" }}>
          <BadgeArt name={badge} />
        </div>

        <h2 style={{ margin: 0, fontSize: 36, fontWeight: 900, color: "#061121", textAlign: "center" }}>
          {badge}
        </h2>

        {activity && (
          <p style={{ color: "#475569", fontSize: 15, textAlign: "center", maxWidth: 480, margin: "0 12px" }}>
            Awarded for completing <strong>{activity.title}</strong> ({activity.ageTrack}).
          </p>
        )}

        <p style={{ color: "#1f2937", fontSize: 15, textAlign: "center", margin: "8px 24px 0" }}>
          Way to go! Every mission practiced makes the whole community safer.
        </p>

        <footer style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", width: "100%", paddingTop: 28, borderTop: "1px solid #cbd5e1" }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ borderTop: "1px solid #061121", margin: "0 18px 6px", paddingTop: 4 }} />
            <span style={{ fontSize: 11, color: "#475569", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 700 }}>Grown-up signature</span>
          </div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ borderTop: "1px solid #061121", margin: "0 18px 6px", paddingTop: 4 }} />
            <span style={{ fontSize: 11, color: "#475569", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 700 }}>Date</span>
          </div>
        </footer>
      </article>

      <style>{`
        @media print {
          .badge-screen-only { display: none !important; }
          body { background: white !important; }
          article { box-shadow: none !important; }
        }
        @page { size: letter; margin: 0; }
      `}</style>
    </main>
  );
}

function BadgeArt({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 220 220" width={200} height={200} aria-label={`${name} badge`}>
      <defs>
        <radialGradient id="badgeFill" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="100%" stopColor="#f0b429" />
        </radialGradient>
      </defs>
      {/* Ribbon */}
      <path d="M70 150 L40 220 L80 200 L110 220 L140 200 L180 220 L150 150 Z" fill="#1b58c9" stroke="#061121" strokeWidth="3" />
      {/* Medal */}
      <circle cx="110" cy="100" r="80" fill="url(#badgeFill)" stroke="#061121" strokeWidth="5" />
      <circle cx="110" cy="100" r="62" fill="white" stroke="#061121" strokeWidth="3" />
      {/* Star */}
      <polygon
        points="110,55 122,90 160,90 130,113 142,150 110,128 78,150 90,113 60,90 98,90"
        fill="#f0b429"
        stroke="#061121"
        strokeWidth="3"
      />
    </svg>
  );
}
