"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  rhythmsForLevel,
  tierForRhythm,
  LEVEL_LABEL,
  type LevelId,
} from "@/lib/lounge/games/lead-ii/levels/levelRhythms";
import { generateAnswerChoices } from "@/lib/lounge/games/lead-ii/quiz/answerChoices";
import { displayNameFor } from "@/lib/lounge/games/lead-ii/levels/rhythmDisplay";
import { getRateControl } from "@/lib/lounge/games/lead-ii/ecg/rhythmRateControl";
import {
  scoreCorrect,
  scoreWrong,
  MAX_WRONGS_PER_QUESTION,
} from "@/lib/lounge/games/lead-ii/scoring/scoringRules";
import { RHYTHM_BY_ID, RHYTHM_CATALOG } from "@/lib/lounge/games/lead-ii/ecg/rhythmCatalog";
import type { RhythmId } from "@/lib/lounge/games/lead-ii/ecg/types";
import EcgLiveCanvas from "./EcgLiveCanvas";
import { LEAD_II_COLORS, LEAD_II_FONT } from "./theme";
import { beep as audioBeep, ding, buzzer, chime, isMuted, setMuted } from "./LeadIIAudio";

/** Same per-level round length as the native TimedScreen. */
const ROUND_SECONDS_BY_LEVEL: Record<LevelId, number> = {
  beginner: 120,
  intermediate: 90,
  expert: 90,
};

type Route =
  | { name: "intro" }
  | { name: "select" }
  | { name: "timed"; level: LevelId }
  | { name: "learn"; level: LevelId };

export default function LeadIIApp({
  playerName,
  initialLevel,
}: {
  playerName: string;
  initialLevel?: LevelId;
}) {
  const [route, setRoute] = useState<Route>(
    initialLevel ? { name: "timed", level: initialLevel } : { name: "intro" },
  );
  // Load VT323 once.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("vt323-font")) return;
    const link = document.createElement("link");
    link.id = "vt323-font";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=VT323&display=swap";
    document.head.appendChild(link);
  }, []);

  return (
    <div style={{ background: LEAD_II_COLORS.black, minHeight: "100vh", fontFamily: LEAD_II_FONT, color: LEAD_II_COLORS.phosphor }}>
      <TopBar />
      <div style={{ padding: "12px 14px 60px" }}>
        {route.name === "intro" && <IntroScreen onAdvance={() => setRoute({ name: "select" })} />}
        {route.name === "select" && (
          <LevelSelect
            playerName={playerName}
            onTimed={(level) => setRoute({ name: "timed", level })}
            onLearn={(level) => setRoute({ name: "learn", level })}
          />
        )}
        {route.name === "timed" && (
          <TimedScreen
            level={route.level}
            playerName={playerName}
            onExit={() => setRoute({ name: "select" })}
          />
        )}
        {route.name === "learn" && (
          <LearnScreen level={route.level} onExit={() => setRoute({ name: "select" })} />
        )}
      </div>
    </div>
  );
}

// ── Top bar ──────────────────────────────────────────────────────────────
function TopBar() {
  const [muted, setMutedState] = useState(false);
  useEffect(() => { setMutedState(isMuted()); }, []);
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "10px 14px", borderBottom: `1px solid ${LEAD_II_COLORS.shellEdge}`,
      background: LEAD_II_COLORS.panel,
    }}>
      <Link href="/lounge/games" style={{ color: LEAD_II_COLORS.amber, fontFamily: LEAD_II_FONT, fontSize: 18, textDecoration: "none", letterSpacing: "0.06em" }}>
        ← GAMES
      </Link>
      <button
        type="button"
        onClick={() => { const next = !muted; setMuted(next); setMutedState(next); }}
        style={{
          background: LEAD_II_COLORS.black, border: `1px solid ${LEAD_II_COLORS.shellEdge}`, color: muted ? LEAD_II_COLORS.danger : LEAD_II_COLORS.phosphor,
          fontFamily: LEAD_II_FONT, fontSize: 18, padding: "4px 14px", borderRadius: 4, cursor: "pointer",
        }}
      >
        {muted ? "🔇 MUTED" : "🔊 SOUND"}
      </button>
    </div>
  );
}

// ── Intro screen ─────────────────────────────────────────────────────────
function IntroScreen({ onAdvance }: { onAdvance: () => void }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    chime();
    const t1 = setTimeout(() => setStep(1), 700);
    const t2 = setTimeout(() => setStep(2), 1800);
    const t3 = setTimeout(() => setStep(3), 2900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);
  return (
    <div
      onClick={onAdvance}
      style={{
        minHeight: "70vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center",
        cursor: "pointer", padding: "30px 16px",
      }}
    >
      <div style={{
        fontSize: "clamp(48px, 12vw, 120px)", color: LEAD_II_COLORS.phosphor,
        textShadow: `0 0 18px ${LEAD_II_COLORS.phosphor}88`,
        letterSpacing: "0.08em", lineHeight: 1, opacity: step >= 1 ? 1 : 0,
        transition: "opacity 600ms ease-out",
      }}>
        LEAD II
      </div>
      <div style={{
        fontSize: "clamp(18px, 4vw, 32px)", color: LEAD_II_COLORS.amber,
        marginTop: 8, letterSpacing: "0.16em", opacity: step >= 2 ? 1 : 0,
        transition: "opacity 600ms ease-out",
      }}>
        RHYTHM TRAINER
      </div>
      <div style={{
        marginTop: 36, color: LEAD_II_COLORS.phosphorDim, fontSize: 18,
        opacity: step >= 3 ? 1 : 0,
        transition: "opacity 600ms ease-out",
        letterSpacing: "0.12em",
      }}>
        TAP TO BEGIN
      </div>
    </div>
  );
}

// ── Level select ─────────────────────────────────────────────────────────
function LevelSelect({
  playerName,
  onTimed,
  onLearn,
}: {
  playerName: string;
  onTimed: (level: LevelId) => void;
  onLearn: (level: LevelId) => void;
}) {
  const [scope, setScope] = useState<"timed" | "learn">("timed");
  const description: Record<LevelId, string> = {
    beginner:     "Sinus + classic emergencies. 9 rhythms.",
    intermediate: "PACs, PVCs, SVT, paced rhythms — 19 total.",
    expert:       "AV blocks, torsades, escape rhythms — 29 total.",
  };
  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginTop: 24 }}>
        <div style={{ color: LEAD_II_COLORS.amber, fontSize: 18, letterSpacing: "0.2em" }}>// SELECT MODE //</div>
        <h2 style={{ color: LEAD_II_COLORS.phosphor, margin: "6px 0 0", fontFamily: LEAD_II_FONT, fontSize: 40, letterSpacing: "0.06em" }}>
          HELLO, {playerName.toUpperCase()}
        </h2>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 22 }}>
        <ModeTab active={scope === "timed"} onClick={() => setScope("timed")}>TIMED</ModeTab>
        <ModeTab active={scope === "learn"} onClick={() => setScope("learn")}>LEARN</ModeTab>
      </div>

      <p style={{ color: LEAD_II_COLORS.phosphorDim, textAlign: "center", marginTop: 12, fontSize: 18, lineHeight: 1.55 }}>
        {scope === "timed"
          ? "A two-minute (90 s on hard) round. Faster + first try = more points. Leaderboard tracks your personal best."
          : "Free-play mode. Pick a rhythm, watch the trace, no clock and no scoring."}
      </p>

      <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
        {(["beginner", "intermediate", "expert"] as LevelId[]).map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => scope === "timed" ? onTimed(level) : onLearn(level)}
            style={{
              background: LEAD_II_COLORS.panel,
              border: `2px solid ${LEAD_II_COLORS.shellEdge}`,
              borderLeft: `6px solid ${level === "beginner" ? LEAD_II_COLORS.phosphor : level === "intermediate" ? "#7dd3fc" : LEAD_II_COLORS.amber}`,
              borderRadius: 4,
              padding: "16px 20px",
              textAlign: "left",
              cursor: "pointer",
              color: LEAD_II_COLORS.phosphor,
              fontFamily: LEAD_II_FONT,
              transition: "transform 120ms ease-out",
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(1px)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <div style={{ fontSize: 30, letterSpacing: "0.08em" }}>{LEVEL_LABEL[level].toUpperCase()}</div>
            <div style={{ color: LEAD_II_COLORS.phosphorDim, fontSize: 18, marginTop: 4 }}>{description[level]}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ModeTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: active ? LEAD_II_COLORS.phosphor : "transparent",
        color: active ? LEAD_II_COLORS.black : LEAD_II_COLORS.phosphor,
        border: `1px solid ${LEAD_II_COLORS.phosphor}`,
        padding: "6px 18px", borderRadius: 2,
        fontFamily: LEAD_II_FONT, fontSize: 20, letterSpacing: "0.10em",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

// ── Timed screen — mirrors the native game loop ──────────────────────────
type TimedPhase = "ready" | "playing" | "ended";

function TimedScreen({ level, playerName, onExit }: { level: LevelId; playerName: string; onExit: () => void }) {
  const pool = useMemo(() => rhythmsForLevel(level), [level]);
  const roundSeconds = ROUND_SECONDS_BY_LEVEL[level];

  const [phase, setPhase] = useState<TimedPhase>("ready");
  const [current, setCurrent] = useState<RhythmId>(() => pickRhythm(pool));
  const [choices, setChoices] = useState(() => buildChoices(current));
  const [secondsLeft, setSecondsLeft] = useState(roundSeconds);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [lockedOut, setLockedOut] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ correct: 0, wrong: 0, bestStreak: 0 });
  // When the player picks the right answer we flash THAT button green for a
  // beat before advancing, so the visual feedback matches the audio ding and
  // the player can see WHICH answer was correct.
  const [correctRevealed, setCorrectRevealed] = useState(false);
  const startRef = useRef<number>(0);
  const submittedToBoard = useRef(false);

  const subject = RHYTHM_BY_ID.get(current);
  const bpm = useMemo(() => defaultBpmFor(current), [current]);
  const canvasWidth = useResponsiveWidth();
  const canvasHeight = 220;

  function nextQuestion(prev: RhythmId) {
    const next = pickRhythm(pool, prev);
    setCurrent(next);
    setChoices(buildChoices(next));
    setWrongAttempts(0);
    setLockedOut(new Set());
    setCorrectRevealed(false);
    startRef.current = performance.now();
  }

  // Countdown
  useEffect(() => {
    if (phase !== "playing") return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          setPhase("ended");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Save round to leaderboard after end.
  useEffect(() => {
    if (phase !== "ended" || submittedToBoard.current) return;
    submittedToBoard.current = true;
    void fetch("/api/lounge/games/lead-ii/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        score,
        level,
        questionsAnswered: stats.correct + stats.wrong,
        correct: stats.correct,
        wrong: stats.wrong,
        durationMs: roundSeconds * 1000,
      }),
    });
  }, [phase, score, level, stats.correct, stats.wrong, roundSeconds]);

  function startRound() {
    submittedToBoard.current = false;
    setScore(0); setStreak(0); setSecondsLeft(roundSeconds);
    setStats({ correct: 0, wrong: 0, bestStreak: 0 });
    setWrongAttempts(0); setLockedOut(new Set());
    const next = pickRhythm(pool);
    setCurrent(next);
    setChoices(buildChoices(next));
    startRef.current = performance.now();
    setPhase("playing");
  }

  function answer(picked: RhythmId) {
    if (phase !== "playing" || lockedOut.has(picked) || correctRevealed) return;
    const isCorrect = picked === current;
    if (isCorrect) {
      ding();
      setCorrectRevealed(true);
      const secs = (performance.now() - startRef.current) / 1000;
      const result = scoreCorrect(current, {
        timeToAnswerSec: secs,
        currentStreak: streak,
        wrongAttemptsOnThisQuestion: wrongAttempts,
      });
      setScore((s) => s + result.total);
      setStreak((s) => {
        const next = s + 1;
        setStats((st) => ({ ...st, correct: st.correct + 1, bestStreak: Math.max(st.bestStreak, next) }));
        return next;
      });
      setTimeout(() => nextQuestion(current), 800);
    } else {
      buzzer();
      const penalty = scoreWrong(wrongAttempts);
      setScore((s) => Math.max(0, s + penalty));
      setStreak(0);
      setStats((st) => ({ ...st, wrong: st.wrong + 1 }));
      const nextWrong = wrongAttempts + 1;
      setWrongAttempts(nextWrong);
      setLockedOut((s) => new Set(s).add(picked));
      if (nextWrong >= MAX_WRONGS_PER_QUESTION) {
        setTimeout(() => nextQuestion(current), 900);
      }
    }
  }

  if (phase === "ready") {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Banner title={`TIMED · ${LEVEL_LABEL[level].toUpperCase()}`}>
          <p style={{ color: LEAD_II_COLORS.phosphorDim, fontSize: 18, marginTop: 6 }}>
            {pool.length} rhythms in rotation. {roundSeconds === 120 ? "Two-minute round" : "Ninety-second round"}.
            First-try answers and speed score the highest.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <PixelButton onClick={startRound}>BEGIN ROUND</PixelButton>
            <PixelButton onClick={onExit} variant="ghost">EXIT</PixelButton>
          </div>
        </Banner>
      </div>
    );
  }

  if (phase === "ended") {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Banner title="TIME UP">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
            <Stat label="FINAL" value={String(score)} accent={LEAD_II_COLORS.phosphor} />
            <Stat label="BEST STREAK" value={String(stats.bestStreak)} accent={LEAD_II_COLORS.amber} />
            <Stat label="CORRECT" value={String(stats.correct)} accent={LEAD_II_COLORS.phosphor} />
            <Stat label="WRONG" value={String(stats.wrong)} accent={LEAD_II_COLORS.danger} />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
            <PixelButton onClick={startRound}>REPLAY</PixelButton>
            <PixelButton onClick={onExit} variant="ghost">BACK</PixelButton>
          </div>
        </Banner>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <HudStrip
        playerName={playerName}
        level={level}
        score={score}
        streak={streak}
        correct={stats.correct}
        wrong={stats.wrong}
        secondsLeft={secondsLeft}
      />
      <div style={{
        marginTop: 10, padding: 10,
        background: LEAD_II_COLORS.panel,
        border: `2px solid ${LEAD_II_COLORS.shellEdge}`,
        borderRadius: 4,
      }}>
        <EcgLiveCanvas
          rhythmId={current}
          heartRate={bpm}
          width={canvasWidth}
          height={canvasHeight}
        />
        <div style={{ marginTop: 6, color: LEAD_II_COLORS.phosphorDim, fontSize: 18, fontFamily: LEAD_II_FONT, letterSpacing: "0.08em", textAlign: "right" }}>
          II  ·  25 mm/s  ·  10 mm/mV  ·  {bpm > 0 ? `${bpm} BPM` : "—"}
        </div>
      </div>

      <div style={{ marginTop: 12, color: LEAD_II_COLORS.amber, fontSize: 22, letterSpacing: "0.12em", textAlign: "center" }}>
        WHAT IS THIS RHYTHM?
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 8 }}>
        {choices.map((choice) => {
          const locked = lockedOut.has(choice.rhythmId);
          const isCorrectReveal = correctRevealed && choice.rhythmId === current;
          return (
            <button
              key={choice.rhythmId}
              type="button"
              onClick={() => answer(choice.rhythmId)}
              disabled={locked || correctRevealed}
              style={{
                padding: "14px 16px",
                background: isCorrectReveal
                  ? LEAD_II_COLORS.phosphor
                  : locked
                    ? "rgba(255,94,79,0.18)"
                    : LEAD_II_COLORS.panel,
                border: `2px solid ${
                  isCorrectReveal ? LEAD_II_COLORS.phosphor
                  : locked ? LEAD_II_COLORS.danger
                  : LEAD_II_COLORS.shellEdge
                }`,
                color: isCorrectReveal
                  ? LEAD_II_COLORS.black
                  : locked
                    ? LEAD_II_COLORS.danger
                    : LEAD_II_COLORS.phosphor,
                fontFamily: LEAD_II_FONT,
                fontSize: 22,
                fontWeight: isCorrectReveal ? 900 : 400,
                letterSpacing: "0.04em",
                textAlign: "left",
                cursor: locked || correctRevealed ? "not-allowed" : "pointer",
                borderRadius: 4,
                boxShadow: isCorrectReveal ? `0 0 22px ${LEAD_II_COLORS.phosphor}88` : "none",
                transition: "background 120ms ease-out, box-shadow 120ms ease-out",
              }}
            >
              {choice.label.toUpperCase()}
            </button>
          );
        })}
      </div>
      {wrongAttempts > 0 && (
        <p style={{ color: LEAD_II_COLORS.danger, marginTop: 8, fontSize: 18 }}>
          {wrongAttempts < MAX_WRONGS_PER_QUESTION
            ? `Wrong (${wrongAttempts}/${MAX_WRONGS_PER_QUESTION}). Try again.`
            : `Out of attempts — moving on.`}
        </p>
      )}
      <p style={{ color: LEAD_II_COLORS.phosphorDim, textAlign: "center", marginTop: 14, fontSize: 14 }}>
        Subject: {displayNameFor(current)} · tier {tierForRhythm(current) ?? "?"}
      </p>
    </div>
  );
}

function HudStrip({ playerName, level, score, streak, correct, wrong, secondsLeft }: {
  playerName: string; level: LevelId; score: number; streak: number;
  correct: number; wrong: number; secondsLeft: number;
}) {
  void streak;
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 6,
      padding: "10px 12px", background: LEAD_II_COLORS.panel,
      border: `1px solid ${LEAD_II_COLORS.shellEdge}`, borderRadius: 4,
    }}>
      <HudCell label="PLAYER" value={playerName.toUpperCase().slice(0, 10)} />
      <HudCell label="LEVEL" value={LEVEL_LABEL[level].toUpperCase()} />
      <HudCell label="RIGHT" value={String(correct)} accent={LEAD_II_COLORS.phosphor} />
      <HudCell label="WRONG" value={String(wrong)} accent={LEAD_II_COLORS.danger} />
      <HudCell label="SCORE" value={String(score)} accent={LEAD_II_COLORS.amber} />
      <HudCell label="TIME" value={`${mm}:${ss}`} accent={secondsLeft <= 10 ? LEAD_II_COLORS.danger : LEAD_II_COLORS.phosphor} />
    </div>
  );
}
function HudCell({ label, value, accent = LEAD_II_COLORS.phosphor }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ color: LEAD_II_COLORS.phosphorDim, fontSize: 10, letterSpacing: "0.16em" }}>{label}</div>
      <div style={{ color: accent, fontFamily: LEAD_II_FONT, fontSize: 22, lineHeight: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
}

function Banner({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      marginTop: 30,
      padding: "22px 22px",
      background: LEAD_II_COLORS.panel,
      border: `2px solid ${LEAD_II_COLORS.shellEdge}`,
      borderRadius: 6,
    }}>
      <div style={{ color: LEAD_II_COLORS.amber, fontSize: 28, letterSpacing: "0.16em" }}>{title}</div>
      {children}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ background: LEAD_II_COLORS.black, border: `1px solid ${LEAD_II_COLORS.shellEdge}`, padding: "10px 14px", borderRadius: 4 }}>
      <div style={{ color: LEAD_II_COLORS.phosphorDim, fontSize: 12, letterSpacing: "0.18em" }}>{label}</div>
      <div style={{ color: accent, fontFamily: LEAD_II_FONT, fontSize: 36 }}>{value}</div>
    </div>
  );
}

function PixelButton({ children, onClick, variant }: { children: React.ReactNode; onClick: () => void; variant?: "ghost" }) {
  const ghost = variant === "ghost";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: ghost ? "transparent" : LEAD_II_COLORS.phosphor,
        color: ghost ? LEAD_II_COLORS.phosphor : LEAD_II_COLORS.black,
        border: `2px solid ${LEAD_II_COLORS.phosphor}`,
        padding: "10px 20px",
        fontFamily: LEAD_II_FONT,
        fontSize: 22,
        letterSpacing: "0.10em",
        borderRadius: 4,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

// ── Learn screen ─────────────────────────────────────────────────────────
function LearnScreen({ level, onExit }: { level: LevelId; onExit: () => void }) {
  const pool = useMemo(() => rhythmsForLevel(level), [level]);
  const [picked, setPicked] = useState<RhythmId>(pool[0]);
  const bpm = defaultBpmFor(picked);
  const canvasWidth = useResponsiveWidth();

  const def = RHYTHM_BY_ID.get(picked);

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <Banner title={`LEARN · ${LEVEL_LABEL[level].toUpperCase()}`}>
        <p style={{ color: LEAD_II_COLORS.phosphorDim, fontSize: 18 }}>
          Pick any rhythm in the pool below. No clock, no scoring — just watch the trace.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <PixelButton onClick={onExit} variant="ghost">EXIT</PixelButton>
        </div>
      </Banner>

      <div style={{ marginTop: 14, padding: 10, background: LEAD_II_COLORS.panel, border: `2px solid ${LEAD_II_COLORS.shellEdge}`, borderRadius: 4 }}>
        <EcgLiveCanvas rhythmId={picked} heartRate={bpm} width={canvasWidth} height={220} />
        <div style={{ marginTop: 6, color: LEAD_II_COLORS.phosphorDim, fontSize: 16, fontFamily: LEAD_II_FONT, letterSpacing: "0.08em", textAlign: "right" }}>
          II  ·  25 mm/s  ·  10 mm/mV  ·  {bpm > 0 ? `${bpm} BPM` : "—"}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ color: LEAD_II_COLORS.amber, fontSize: 20, letterSpacing: "0.12em" }}>
          NOW SHOWING — {displayNameFor(picked).toUpperCase()}
        </div>
        <p style={{ color: LEAD_II_COLORS.phosphorDim, marginTop: 4, fontSize: 16, lineHeight: 1.55 }}>
          Family: {def?.family ?? "?"} · Difficulty: {def?.difficulty ?? "?"}.
        </p>
      </div>

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
        {pool.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setPicked(id)}
            style={{
              background: id === picked ? LEAD_II_COLORS.phosphor : LEAD_II_COLORS.panel,
              color: id === picked ? LEAD_II_COLORS.black : LEAD_II_COLORS.phosphor,
              border: `1px solid ${LEAD_II_COLORS.shellEdge}`,
              padding: "8px 12px", borderRadius: 4,
              fontFamily: LEAD_II_FONT, fontSize: 18,
              cursor: "pointer", textAlign: "left",
            }}
          >
            {displayNameFor(id).toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────
function pickRhythm(pool: readonly RhythmId[], avoid?: RhythmId): RhythmId {
  const candidates = avoid ? pool.filter((id) => id !== avoid) : pool;
  return candidates[Math.floor(Math.random() * candidates.length)] ?? pool[0];
}
function buildChoices(correct: RhythmId) {
  const tier = tierForRhythm(correct) ?? "beginner";
  return generateAnswerChoices({
    correctRhythmId: correct,
    rhythmCatalog: RHYTHM_CATALOG,
    quizMode: "live",
    difficultyMode: tier === "expert" ? "expert" : tier === "intermediate" ? "intermediate" : "beginner",
    maxChoices: 4,
  }).choices;
}
function defaultBpmFor(id: RhythmId): number {
  const rc = getRateControl(id);
  if (!rc) return 80;
  if (rc.kind === "adjustable") return rc.defaultBpm;
  if (rc.kind === "locked-fixed") return rc.fixedBpm;
  return 0;
}
function useResponsiveWidth(): number {
  const [w, setW] = useState<number>(() => {
    if (typeof window === "undefined") return 720;
    return Math.min(800, Math.max(320, window.innerWidth - 80));
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setW(Math.min(800, Math.max(320, window.innerWidth - 80)));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  // Suppress unused warning by tying to audioBeep import that side-effects.
  void audioBeep;
  return w;
}
