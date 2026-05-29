"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  generateBloodGasCase,
  visibleBloodGasQuestions,
  labelForBloodGasAnswer,
  bloodGasTeachingBullets,
  dynamicCaseToBloodGasValues,
  type BloodGasLevel,
  type BloodGasMode,
  type BloodGasQuestionDef,
  type DynamicBloodGasCase,
} from "@/lib/lounge/games/abg-sim/abgDynamicEngine";
import type { BloodGasValue } from "@/lib/lounge/games/abg-sim/abgTypes";
import { LEAD_II_COLORS as C, LEAD_II_FONT as F } from "../lead-ii/theme";
import { ding, buzzer, chime, isMuted, setMuted } from "../lead-ii/LeadIIAudio";

type LevelId = "beginner" | "intermediate" | "expert";

const LEVEL_TO_ENGINE: Record<LevelId, BloodGasLevel> = {
  beginner: "baby",
  intermediate: "intermediate",
  expert: "expert",
};
const LEVEL_LABEL: Record<LevelId, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  expert: "Expert",
};
const LEVEL_DESC: Record<LevelId, string> = {
  beginner:     "pH + primary problem. Two-question cases — get the diagnosis right.",
  intermediate: "Adds compensation status, oxygenation, anion gap. Four to five questions per case.",
  expert:       "Mixed disorders, Winter's, delta-delta, A-a, clinical priority. Up to nine questions per case.",
};
const LEVEL_ACCENT: Record<LevelId, string> = {
  beginner: C.phosphor,
  intermediate: "#7dd3fc",
  expert: C.amber,
};
const POINTS_PER_CORRECT: Record<LevelId, number> = {
  beginner: 20,
  intermediate: 18,
  expert: 22,
};
const WRONG_PENALTY = 5;
const ROUND_SECONDS = 180;
const MAX_WRONGS_PER_QUESTION = 2;

type Route =
  | { name: "intro" }
  | { name: "select" }
  | { name: "timed"; level: LevelId }
  | { name: "learn"; level: LevelId };

export default function AbgSimApp({ playerName }: { playerName: string }) {
  const [route, setRoute] = useState<Route>({ name: "intro" });

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
    <div style={{ background: C.black, minHeight: "100vh", fontFamily: F, color: C.phosphor }}>
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
          <TimedScreen level={route.level} playerName={playerName} onExit={() => setRoute({ name: "select" })} />
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
      padding: "10px 14px", borderBottom: `1px solid ${C.shellEdge}`,
      background: C.panel,
    }}>
      <Link href="/lounge/games" style={{ color: C.amber, fontFamily: F, fontSize: 18, textDecoration: "none", letterSpacing: "0.06em" }}>
        ← GAMES
      </Link>
      <button
        type="button"
        onClick={() => { const next = !muted; setMuted(next); setMutedState(next); }}
        style={{
          background: C.black, border: `1px solid ${C.shellEdge}`, color: muted ? C.danger : C.phosphor,
          fontFamily: F, fontSize: 18, padding: "4px 14px", borderRadius: 4, cursor: "pointer",
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
        fontSize: "clamp(56px, 14vw, 144px)", color: C.phosphor,
        textShadow: `0 0 18px ${C.phosphor}88`,
        letterSpacing: "0.08em", lineHeight: 1, opacity: step >= 1 ? 1 : 0,
        transition: "opacity 600ms ease-out",
      }}>
        ABG
      </div>
      <div style={{
        fontSize: "clamp(18px, 4vw, 28px)", color: C.amber,
        marginTop: 8, letterSpacing: "0.16em", opacity: step >= 2 ? 1 : 0,
        transition: "opacity 600ms ease-out",
      }}>
        BLOOD GAS SIMULATOR
      </div>
      <div style={{
        marginTop: 36, color: C.phosphorDim, fontSize: 18,
        opacity: step >= 3 ? 1 : 0, transition: "opacity 600ms ease-out",
        letterSpacing: "0.12em",
      }}>
        TAP TO BEGIN
      </div>
    </div>
  );
}

// ── Level select ─────────────────────────────────────────────────────────
function LevelSelect({
  playerName, onTimed, onLearn,
}: {
  playerName: string;
  onTimed: (level: LevelId) => void;
  onLearn: (level: LevelId) => void;
}) {
  const [scope, setScope] = useState<"timed" | "learn">("timed");
  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginTop: 24 }}>
        <div style={{ color: C.amber, fontSize: 18, letterSpacing: "0.2em" }}>// SELECT MODE //</div>
        <h2 style={{ color: C.phosphor, margin: "6px 0 0", fontFamily: F, fontSize: 40, letterSpacing: "0.06em" }}>
          HELLO, {playerName.toUpperCase()}
        </h2>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 22 }}>
        <ModeTab active={scope === "timed"} onClick={() => setScope("timed")}>TIMED</ModeTab>
        <ModeTab active={scope === "learn"} onClick={() => setScope("learn")}>LEARN</ModeTab>
      </div>

      <p style={{ color: C.phosphorDim, textAlign: "center", marginTop: 12, fontSize: 18, lineHeight: 1.55 }}>
        {scope === "timed"
          ? "Three-minute round. Each case asks a few interpretation questions. Faster + first-try answers = more points."
          : "Free-play. Generate a case, work through every question, see the full teaching breakdown."}
      </p>

      <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
        {(["beginner", "intermediate", "expert"] as LevelId[]).map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => scope === "timed" ? onTimed(level) : onLearn(level)}
            style={{
              background: C.panel,
              border: `2px solid ${C.shellEdge}`,
              borderLeft: `6px solid ${LEVEL_ACCENT[level]}`,
              borderRadius: 4,
              padding: "16px 20px",
              textAlign: "left",
              cursor: "pointer",
              color: C.phosphor,
              fontFamily: F,
              transition: "transform 120ms ease-out",
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(1px)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <div style={{ fontSize: 30, letterSpacing: "0.08em" }}>{LEVEL_LABEL[level].toUpperCase()}</div>
            <div style={{ color: C.phosphorDim, fontSize: 18, marginTop: 4 }}>{LEVEL_DESC[level]}</div>
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
        background: active ? C.phosphor : "transparent",
        color: active ? C.black : C.phosphor,
        border: `1px solid ${C.phosphor}`,
        padding: "6px 18px", borderRadius: 2,
        fontFamily: F, fontSize: 20, letterSpacing: "0.10em",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

// ── Timed screen ─────────────────────────────────────────────────────────
type TimedPhase = "ready" | "playing" | "ended";

interface QuestionState {
  qIndex: number;          // index into the visible-questions array for the current case
  wrongAttempts: number;
  lockedOut: Set<string>;
}

function TimedScreen({ level, playerName, onExit }: { level: LevelId; playerName: string; onExit: () => void }) {
  const engineLevel = LEVEL_TO_ENGINE[level];

  const [phase, setPhase] = useState<TimedPhase>("ready");
  const [gasCase, setGasCase] = useState<DynamicBloodGasCase>(() => generateBloodGasCase({ mode: "ABG", level: engineLevel }));
  const [qState, setQState] = useState<QuestionState>({ qIndex: 0, wrongAttempts: 0, lockedOut: new Set() });
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [stats, setStats] = useState({ correct: 0, wrong: 0, casesFinished: 0, bestStreak: 0 });
  const startedAt = useRef(0);
  const submitted = useRef(false);

  const visible = useMemo(() => visibleBloodGasQuestions(gasCase, engineLevel), [gasCase, engineLevel]);
  const printout = useMemo(() => dynamicCaseToBloodGasValues(gasCase), [gasCase]);
  const currentQuestion = visible[qState.qIndex];

  function newCase() {
    const next = generateBloodGasCase({ mode: "ABG", level: engineLevel });
    setGasCase(next);
    setQState({ qIndex: 0, wrongAttempts: 0, lockedOut: new Set() });
  }

  function startRound() {
    submitted.current = false;
    setScore(0); setStreak(0); setSecondsLeft(ROUND_SECONDS);
    setStats({ correct: 0, wrong: 0, casesFinished: 0, bestStreak: 0 });
    newCase();
    startedAt.current = performance.now();
    setPhase("playing");
  }

  // Countdown
  useEffect(() => {
    if (phase !== "playing") return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { clearInterval(t); setPhase("ended"); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Save round to leaderboard once.
  useEffect(() => {
    if (phase !== "ended" || submitted.current) return;
    submitted.current = true;
    void fetch("/api/lounge/games/abg-sim/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        score,
        level,
        questionsAnswered: stats.correct + stats.wrong,
        correct: stats.correct,
        wrong: stats.wrong,
        casesFinished: stats.casesFinished,
        durationMs: ROUND_SECONDS * 1000,
      }),
    });
  }, [phase, score, level, stats]);

  function answer(choiceId: string) {
    if (phase !== "playing" || !currentQuestion) return;
    if (qState.lockedOut.has(choiceId)) return;

    const correct = gasCase.answer[currentQuestion.id];
    const isCorrect = choiceId === correct;
    if (isCorrect) {
      ding();
      const gain = POINTS_PER_CORRECT[level] + (qState.wrongAttempts === 0 ? 5 : 0);
      setScore((s) => s + gain);
      setStreak((s) => {
        const next = s + 1;
        setStats((st) => ({ ...st, correct: st.correct + 1, bestStreak: Math.max(st.bestStreak, next) }));
        return next;
      });
      // advance question (or new case if done)
      const nextIdx = qState.qIndex + 1;
      if (nextIdx >= visible.length) {
        setStats((st) => ({ ...st, casesFinished: st.casesFinished + 1 }));
        setTimeout(newCase, 600);
      } else {
        setQState({ qIndex: nextIdx, wrongAttempts: 0, lockedOut: new Set() });
      }
    } else {
      buzzer();
      setScore((s) => Math.max(0, s - WRONG_PENALTY));
      setStreak(0);
      setStats((st) => ({ ...st, wrong: st.wrong + 1 }));
      const nextWrong = qState.wrongAttempts + 1;
      setQState((q) => ({ qIndex: q.qIndex, wrongAttempts: nextWrong, lockedOut: new Set(q.lockedOut).add(choiceId) }));
      if (nextWrong >= MAX_WRONGS_PER_QUESTION) {
        // forced advance after too many wrongs
        const nextIdx = qState.qIndex + 1;
        if (nextIdx >= visible.length) {
          setStats((st) => ({ ...st, casesFinished: st.casesFinished + 1 }));
          setTimeout(newCase, 700);
        } else {
          setTimeout(() => setQState({ qIndex: nextIdx, wrongAttempts: 0, lockedOut: new Set() }), 700);
        }
      }
    }
  }

  if (phase === "ready") {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Banner title={`TIMED · ${LEVEL_LABEL[level].toUpperCase()}`}>
          <p style={{ color: C.phosphorDim, fontSize: 18, marginTop: 6 }}>
            {LEVEL_DESC[level]} Cases are generated fresh each round — no two strips will be identical.
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
            <Stat label="FINAL" value={String(score)} accent={C.phosphor} />
            <Stat label="BEST STREAK" value={String(stats.bestStreak)} accent={C.amber} />
            <Stat label="CORRECT" value={String(stats.correct)} accent={C.phosphor} />
            <Stat label="WRONG" value={String(stats.wrong)} accent={C.danger} />
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
      <HudStrip playerName={playerName} level={level} score={score} streak={streak} secondsLeft={secondsLeft} />
      <BmpPrintout gasCase={gasCase} printout={printout} />
      {currentQuestion && (
        <QuestionPanel
          question={currentQuestion}
          progress={`${qState.qIndex + 1} / ${visible.length}`}
          lockedOut={qState.lockedOut}
          onPick={answer}
        />
      )}
    </div>
  );
}

function HudStrip({ playerName, level, score, streak, secondsLeft }: {
  playerName: string; level: LevelId; score: number; streak: number; secondsLeft: number;
}) {
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8,
      padding: "10px 12px", background: C.panel,
      border: `1px solid ${C.shellEdge}`, borderRadius: 4,
    }}>
      <HudCell label="PLAYER" value={playerName.toUpperCase().slice(0, 12)} />
      <HudCell label="LEVEL" value={LEVEL_LABEL[level].toUpperCase()} />
      <HudCell label="SCORE" value={String(score)} accent={C.amber} />
      <HudCell label="TIME" value={`${mm}:${ss}`} accent={secondsLeft <= 10 ? C.danger : C.phosphor} />
    </div>
  );
}
function HudCell({ label, value, accent = C.phosphor }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <div style={{ color: C.phosphorDim, fontSize: 12, letterSpacing: "0.18em" }}>{label}</div>
      <div style={{ color: accent, fontFamily: F, fontSize: 26, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

// ── BMP printout card ────────────────────────────────────────────────────
function BmpPrintout({ gasCase, printout }: { gasCase: DynamicBloodGasCase; printout: readonly BloodGasValue[] }) {
  return (
    <section style={{
      marginTop: 10, padding: "14px 14px 16px",
      background: C.panel, border: `2px solid ${C.shellEdge}`, borderRadius: 4,
    }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div style={{ color: C.amber, fontSize: 18, letterSpacing: "0.14em" }}>I-STAT · {gasCase.sample}</div>
        <div style={{ color: C.phosphorDim, fontSize: 14, letterSpacing: "0.08em" }}>
          FiO₂ {gasCase.fio2.toFixed(2)} · 37.0°C
        </div>
      </header>
      <div style={{ color: C.phosphor, fontSize: 16, marginTop: 6 }}>{gasCase.title}</div>
      {gasCase.vignette && (
        <p style={{ color: C.phosphorDim, fontSize: 14, lineHeight: 1.5, margin: "4px 0 10px" }}>{gasCase.vignette}</p>
      )}
      <hr style={{ border: 0, borderTop: `1px dashed ${C.shellEdge}`, margin: "8px 0" }} />
      <div style={{
        display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: "4px 14px",
        fontFamily: F, fontSize: 18,
      }}>
        {printout.map((row) => (
          <PrintoutRow key={row.name} row={row} />
        ))}
      </div>
    </section>
  );
}

function PrintoutRow({ row }: { row: BloodGasValue }) {
  const flagColor =
    row.flag === "LL" || row.flag === "HH" ? C.danger :
    row.flag === "L" || row.flag === "H" ? C.amber : C.phosphorDim;
  return (
    <>
      <span style={{ color: C.phosphorDim }}>{row.name}</span>
      <span style={{ color: row.flag ? flagColor : C.phosphor }}>{row.value}{row.unit ? ` ${row.unit}` : ""}</span>
      <span style={{ color: C.phosphorDim, fontSize: 13 }}>{row.ref}</span>
      <span style={{ color: flagColor, width: 28, textAlign: "right" }}>{row.flag}</span>
    </>
  );
}

// ── Question panel ───────────────────────────────────────────────────────
function QuestionPanel({
  question, progress, lockedOut, onPick,
}: {
  question: BloodGasQuestionDef;
  progress: string;
  lockedOut: Set<string>;
  onPick: (id: string) => void;
}) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", color: C.amber, fontSize: 18, letterSpacing: "0.10em" }}>
        <span>{question.title.toUpperCase()}</span>
        <span style={{ color: C.phosphorDim }}>{progress}</span>
      </div>
      <p style={{ color: C.phosphorDim, fontSize: 14, lineHeight: 1.5, margin: "4px 0 10px" }}>{question.hint}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        {question.options.map((opt) => {
          const locked = lockedOut.has(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onPick(opt.id)}
              disabled={locked}
              style={{
                padding: "12px 14px",
                background: locked ? "rgba(255,94,79,0.10)" : C.panel,
                border: `2px solid ${locked ? C.danger : C.shellEdge}`,
                color: locked ? C.danger : C.phosphor,
                fontFamily: F, fontSize: 20, letterSpacing: "0.04em",
                textAlign: "left", cursor: locked ? "not-allowed" : "pointer",
                borderRadius: 4,
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Learn screen ─────────────────────────────────────────────────────────
function LearnScreen({ level, onExit }: { level: LevelId; onExit: () => void }) {
  const engineLevel = LEVEL_TO_ENGINE[level];
  const [seed, setSeed] = useState(() => Date.now());
  const gasCase = useMemo(() => generateBloodGasCase({ mode: "ABG", level: engineLevel, seed }), [engineLevel, seed]);
  const printout = useMemo(() => dynamicCaseToBloodGasValues(gasCase), [gasCase]);
  const visible = useMemo(() => visibleBloodGasQuestions(gasCase, engineLevel), [gasCase, engineLevel]);
  const teaching = useMemo(() => bloodGasTeachingBullets(gasCase, engineLevel), [gasCase, engineLevel]);

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <Banner title={`LEARN · ${LEVEL_LABEL[level].toUpperCase()}`}>
        <p style={{ color: C.phosphorDim, fontSize: 18 }}>
          A new ABG every roll. Full teaching breakdown shown — no clock, no scoring.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <PixelButton onClick={() => setSeed(Date.now())}>NEW CASE</PixelButton>
          <PixelButton onClick={onExit} variant="ghost">EXIT</PixelButton>
        </div>
      </Banner>

      <BmpPrintout gasCase={gasCase} printout={printout} />

      <section style={{
        marginTop: 12, padding: "14px 16px",
        background: C.panel, border: `2px solid ${C.shellEdge}`, borderRadius: 4,
      }}>
        <div style={{ color: C.amber, fontSize: 18, letterSpacing: "0.14em" }}>INTERPRETATION</div>
        <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0, display: "grid", gap: 8 }}>
          {visible.map((q) => (
            <li key={q.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 18 }}>
              <span style={{ color: C.phosphorDim }}>{q.title}</span>
              <span style={{ color: C.phosphor, fontFamily: F }}>{labelForBloodGasAnswer(q.id, gasCase.answer[q.id])}</span>
            </li>
          ))}
        </ul>
      </section>

      <section style={{
        marginTop: 12, padding: "14px 16px",
        background: C.panel, border: `2px solid ${C.shellEdge}`, borderRadius: 4,
      }}>
        <div style={{ color: C.amber, fontSize: 18, letterSpacing: "0.14em" }}>TEACHING POINTS</div>
        <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: C.phosphor, fontSize: 16, lineHeight: 1.55 }}>
          {teaching.map((line, i) => <li key={i} style={{ marginBottom: 6 }}>{line}</li>)}
        </ul>
      </section>
    </div>
  );
}

// ── Shared chrome ────────────────────────────────────────────────────────
function Banner({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      marginTop: 24, padding: "22px 22px",
      background: C.panel, border: `2px solid ${C.shellEdge}`, borderRadius: 6,
    }}>
      <div style={{ color: C.amber, fontSize: 28, letterSpacing: "0.16em" }}>{title}</div>
      {children}
    </div>
  );
}
function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ background: C.black, border: `1px solid ${C.shellEdge}`, padding: "10px 14px", borderRadius: 4 }}>
      <div style={{ color: C.phosphorDim, fontSize: 12, letterSpacing: "0.18em" }}>{label}</div>
      <div style={{ color: accent, fontFamily: F, fontSize: 36 }}>{value}</div>
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
        background: ghost ? "transparent" : C.phosphor,
        color: ghost ? C.phosphor : C.black,
        border: `2px solid ${C.phosphor}`,
        padding: "10px 20px",
        fontFamily: F, fontSize: 22, letterSpacing: "0.10em",
        borderRadius: 4, cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
