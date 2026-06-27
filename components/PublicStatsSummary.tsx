"use client";

/**
 * Compact homepage call-statistics band. Self-contained (its own fetch),
 * so it never touches the fragile hero. Links to the full /statistics
 * page. Aggregate percentages only — no patient detail, no age bands.
 */

import Link from "next/link";
import { useEffect, useState } from "react";

interface Stats {
  year: number;
  total: number;
  groups: { trauma: { pct: number; count: number }; medical: { pct: number; count: number } };
  fire: { pct: number; count: number };
  cardiac: { count: number };
}

export default function PublicStatsSummary() {
  const [data, setData] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/cad/stats", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data || data.total === 0) return null;

  const items = [
    { label: "Medical", value: `${data.groups.medical.pct.toFixed(0)}%`, tone: "#86efac" },
    { label: "Trauma", value: `${data.groups.trauma.pct.toFixed(0)}%`, tone: "#fca5a5" },
    { label: "Fire Response", value: `${data.fire.pct.toFixed(0)}%`, tone: "#fdba74" },
    { label: "Cardiac Arrests", value: data.cardiac.count.toLocaleString(), tone: "#f0b429" },
  ];

  return (
    <section className="bg-[#040d1a]" style={{ paddingTop: 18, paddingBottom: 18 }}>
      <div className="wrap">
        <div
          style={{
            background: "#071428", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16,
            padding: 18, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ color: "#f0b429", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              {data.year} Year to Date · {data.total.toLocaleString()} calls
            </div>
            <div style={{ color: "white", fontSize: 17, fontWeight: 700, marginTop: 3 }}>Call Statistics</div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
            {items.map((it) => (
              <div key={it.label} style={{ minWidth: 78 }}>
                <div style={{ color: it.tone, fontSize: 22, fontWeight: 800, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{it.value}</div>
                <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 3 }}>{it.label}</div>
              </div>
            ))}
          </div>

          <Link
            href="/statistics"
            style={{
              background: "rgba(240,180,41,0.12)", border: "1px solid rgba(240,180,41,0.3)", color: "#f0b429",
              borderRadius: 12, padding: "10px 16px", fontSize: 13, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap",
            }}
          >
            View full statistics →
          </Link>
        </div>
      </div>
    </section>
  );
}
