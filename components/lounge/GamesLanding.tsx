"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ScoreRow {
  id: string;
  level: string | null;
  player: { id: string; firstName: string; lastName: string; photoUrl: string | null };
  score: number;
  createdAt: string;
  details: Record<string, unknown>;
}

const LEVELS: { id: "beginner" | "intermediate" | "expert"; label: string; desc: string; color: string }[] = [
  { id: "beginner",     label: "Beginner",     desc: "Sinus + classic emergencies. 9 rhythms.",            color: "#86efac" },
  { id: "intermediate", label: "Intermediate", desc: "PACs, PVCs, SVT, AIVR, paced rhythms.",              color: "#7dd3fc" },
  { id: "expert",       label: "Expert",       desc: "AV blocks, torsades, escape rhythms.",               color: "#f0b429" },
];

export default function GamesLanding({ meId }: { meId: string }) {
  const [level, setLevel] = useState<"beginner" | "intermediate" | "expert">("beginner");
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [myBest, setMyBest] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/lounge/games/lead-ii/leaderboard?level=${level}`)
      .then((r) => r.ok ? r.json() : { scores: [], myBest: 0 })
      .then((d) => {
        setScores(Array.isArray(d.scores) ? d.scores : []);
        setMyBest(typeof d.myBest === "number" ? d.myBest : 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [level]);

  return (
    <div>
      <header style={{ marginBottom: 18 }}>
        <div style={{ color: "#f0b429", fontSize: "0.7rem", fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
          Games
        </div>
        <h1 style={{ margin: "4px 0 6px", fontSize: "1.85rem", fontWeight: 900, letterSpacing: "-0.015em" }}>
          Lounge arcade
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "0.95rem", lineHeight: 1.55 }}>
          Sharpen rhythm recognition on the clock, see who&apos;s topping the board.
        </p>
      </header>

      <section style={card}>
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ color: "#86efac", fontSize: 11, fontWeight: 900, letterSpacing: "0.20em", textTransform: "uppercase" }}>
              Featured
            </div>
            <h2 style={{ margin: "4px 0 6px", color: "white", fontSize: "1.5rem", fontWeight: 900 }}>Lead II — Rhythm Quiz</h2>
            <p style={{ color: "#cbd5e1", fontSize: 13.5, margin: 0, lineHeight: 1.55 }}>
              10 rhythm strips per round. Identify each one before the clock and your streak burn out. Built for the truck, not the textbook.
            </p>
          </div>
          <div style={{ background: "rgba(134,239,172,0.10)", border: "1px solid rgba(134,239,172,0.30)", borderRadius: 12, padding: "10px 14px", textAlign: "center" }}>
            <div style={{ color: "#86efac", fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase" }}>Your best ({LEVELS.find((l) => l.id === level)?.label})</div>
            <div style={{ color: "#bbf7d0", fontSize: 32, fontWeight: 900, fontFamily: "ui-monospace, SFMono-Regular, monospace", lineHeight: 1, marginTop: 4 }}>{myBest}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 14 }}>
          {LEVELS.map((l) => (
            <Link
              key={l.id}
              href={`/lounge/games/lead-ii?level=${l.id}`}
              style={{
                display: "block",
                padding: "14px 16px",
                background: "rgba(2,9,18,0.55)",
                border: `1px solid ${l.color}55`,
                borderLeft: `4px solid ${l.color}`,
                borderRadius: 14, color: "white", textDecoration: "none",
              }}
            >
              <div style={{ color: l.color, fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>
                {l.label}
              </div>
              <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 4 }}>{l.desc}</div>
              <div style={{ color: "white", fontWeight: 900, fontSize: 13, marginTop: 8, letterSpacing: "0.08em" }}>
                Start round →
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section style={{ ...card, marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
          <h3 style={{ margin: 0, color: "white", fontSize: 15, fontWeight: 900, letterSpacing: "0.04em" }}>
            Leaderboard
          </h3>
          <div style={{ display: "flex", gap: 6 }}>
            {LEVELS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLevel(l.id)}
                style={{
                  padding: "5px 11px", borderRadius: 999,
                  background: level === l.id ? l.color : "transparent",
                  color: level === l.id ? "#040d1a" : l.color,
                  border: `1px solid ${level === l.id ? l.color : `${l.color}55`}`,
                  fontFamily: "inherit", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em",
                  textTransform: "uppercase", cursor: "pointer",
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p style={{ color: "#64748b", fontSize: 13 }}>Loading…</p>
        ) : scores.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Nobody&apos;s posted a score yet — be the first.</p>
        ) : (
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
            {scores.map((s, i) => {
              const isMe = s.player.id === meId;
              return (
                <li key={s.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  gap: 12, padding: "10px 12px",
                  background: isMe ? "rgba(240,180,41,0.08)" : "rgba(2,9,18,0.55)",
                  border: `1px solid ${isMe ? "rgba(240,180,41,0.30)" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 10,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <span style={{ width: 28, textAlign: "right", color: i < 3 ? "#f0b429" : "#94a3b8", fontWeight: 900, fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>{i + 1}</span>
                    <span style={{ color: "white", fontWeight: 800, fontSize: 13.5 }}>{s.player.firstName} {s.player.lastName}</span>
                    {isMe && <span style={{ color: "#f0b429", fontSize: 10, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>You</span>}
                  </div>
                  <span style={{ color: "#bbf7d0", fontWeight: 900, fontSize: 16, fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>{s.score}</span>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#071428",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 16,
  padding: "16px 18px",
};
