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

type LevelId = "beginner" | "intermediate" | "expert";

const LEVELS: { id: LevelId; label: string; color: string }[] = [
  { id: "beginner",     label: "Beginner",     color: "#2ff587" },
  { id: "intermediate", label: "Intermediate", color: "#7dd3fc" },
  { id: "expert",       label: "Expert",       color: "#f2b84b" },
];

interface GameDef {
  key: string;
  href: string;
  title: string;
  iconSrc: string;
  alt: string;
  apiBase: string;
  borderColor: string;
  shadow: string;
  captionColor: string;
}

const GAMES: GameDef[] = [
  {
    key: "lead-ii",
    href: "/lounge/games/lead-ii",
    title: "Lead II",
    iconSrc: "/lounge/games/lead-ii-icon.png",
    alt: "Lead II",
    apiBase: "/api/lounge/games/lead-ii",
    borderColor: "rgba(47,245,135,0.40)",
    shadow: "0 18px 40px rgba(47,245,135,0.18)",
    captionColor: "#8adf9d",
  },
  {
    key: "abg-sim",
    href: "/lounge/games/abg-sim",
    title: "ABG Simulator",
    iconSrc: "/lounge/games/abg-sim-icon.png",
    alt: "ABG Simulator",
    apiBase: "/api/lounge/games/abg-sim",
    borderColor: "rgba(220,38,38,0.45)",
    shadow: "0 18px 40px rgba(220,38,38,0.18)",
    captionColor: "#fca5a5",
  },
];

export default function GamesLanding({ meId }: { meId: string }) {
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

      <div style={{ display: "grid", gap: 36 }}>
        {GAMES.map((g) => <GameSection key={g.key} game={g} meId={meId} />)}
      </div>
    </div>
  );
}

function GameSection({ game, meId }: { game: GameDef; meId: string }) {
  const [level, setLevel] = useState<LevelId>("beginner");
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [myBest, setMyBest] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${game.apiBase}/leaderboard?level=${level}`)
      .then((r) => r.ok ? r.json() : { scores: [], myBest: 0 })
      .then((d) => {
        setScores(Array.isArray(d.scores) ? d.scores : []);
        setMyBest(typeof d.myBest === "number" ? d.myBest : 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [level, game.apiBase]);

  return (
    <div>
      <Link
        href={game.href}
        style={{
          display: "block",
          borderRadius: 18,
          overflow: "hidden",
          background: "#030503",
          border: `2px solid ${game.borderColor}`,
          boxShadow: game.shadow,
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
          src={game.iconSrc}
          alt={game.alt}
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
        />
        <div style={{
          position: "absolute", left: 0, right: 0, bottom: 0,
          padding: "10px 14px",
          background: "linear-gradient(0deg, rgba(3,5,3,0.95), rgba(3,5,3,0))",
          color: game.captionColor, fontFamily: "VT323, ui-monospace, monospace", fontSize: 22, letterSpacing: "0.12em", textAlign: "center",
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
              Leaderboard — {game.title}
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
                onClick={() => { setLevel(l.id); setExpanded(false); }}
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
          <>
            <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
              {scores.slice(0, expanded ? 10 : 3).map((s, i) => {
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
            {scores.length > 3 && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                style={{
                  marginTop: 10,
                  width: "100%",
                  background: "transparent",
                  border: "1px solid rgba(240,180,41,0.30)",
                  color: "#f0b429",
                  padding: "8px 12px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {expanded ? "Show top 3 ▴" : `Show top ${Math.min(10, scores.length)} ▾`}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
