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

const LEVELS: { id: "beginner" | "intermediate" | "expert"; label: string; color: string }[] = [
  { id: "beginner",     label: "Beginner",     color: "#2ff587" },
  { id: "intermediate", label: "Intermediate", color: "#7dd3fc" },
  { id: "expert",       label: "Expert",       color: "#f2b84b" },
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
      </header>

      <Link
        href="/lounge/games/lead-ii"
        style={{
          display: "block",
          borderRadius: 18,
          overflow: "hidden",
          background: "#030503",
          border: "2px solid rgba(47,245,135,0.40)",
          boxShadow: "0 18px 40px rgba(47,245,135,0.18)",
          textDecoration: "none",
          color: "inherit",
          maxWidth: 520,
          margin: "0 auto",
          aspectRatio: "1 / 1",
          position: "relative",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/lounge/games/lead-ii-icon.png"
          alt="Lead II"
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
        />
        <div style={{
          position: "absolute", left: 0, right: 0, bottom: 0,
          padding: "10px 14px",
          background: "linear-gradient(0deg, rgba(3,5,3,0.95), rgba(3,5,3,0))",
          color: "#8adf9d", fontFamily: "VT323, ui-monospace, monospace", fontSize: 22, letterSpacing: "0.12em", textAlign: "center",
        }}>
          TAP TO PLAY
        </div>
      </Link>

      <section style={{
        marginTop: 20,
        background: "#071428",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        padding: "16px 18px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
          <div>
            <div style={{ color: "#94a3b8", fontSize: 10.5, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase" }}>
              Leaderboard — Lead II
            </div>
            <h3 style={{ margin: "4px 0 0", color: "white", fontSize: 16, fontWeight: 900 }}>
              Your best ({LEVELS.find((l) => l.id === level)?.label}): <span style={{ color: "#86efac", fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>{myBest}</span>
            </h3>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {LEVELS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLevel(l.id)}
                style={{
                  padding: "5px 11px", borderRadius: 999,
                  background: level === l.id ? l.color : "transparent",
                  color: level === l.id ? "#030503" : l.color,
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
