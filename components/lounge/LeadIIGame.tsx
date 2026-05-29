"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generateQuizQuestion } from "@/lib/lounge/games/lead-ii/quiz/generateQuizQuestion";
import { RHYTHM_CATALOG, RHYTHM_BY_ID } from "@/lib/lounge/games/lead-ii/ecg/rhythmCatalog";
import { rhythmsForLevel, type LevelId } from "@/lib/lounge/games/lead-ii/levels/levelRhythms";
import { WAVEFORM_GENERATORS } from "@/lib/lounge/games/lead-ii/ecg/waveform";
import { scoreCorrect, scoreWrong } from "@/lib/lounge/games/lead-ii/scoring/scoringRules";
import type { ECGSettings } from "@/lib/lounge/games/lead-ii/ecg/types";
import type { QuizAnswerChoice } from "@/lib/lounge/games/lead-ii/quiz/quizTypes";

const STRIP_DURATION_SEC = 6;
const SAMPLE_RATE = 250;
const QUESTIONS_PER_ROUND = 10;

interface Props {
  playerName: string;
  level: LevelId;
  onExit: () => void;
}

interface QuestionState {
  question: ReturnType<typeof generateQuizQuestion>;
  signalPath: string;
  startedAt: number;
  wrongCount: number;
  answeredAt: number | null;
  pickedId: string | null;
}

export default function LeadIIGame({ playerName, level, onExit }: Props) {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [done, setDone] = useState(false);
  const [submittedToLeaderboard, setSubmittedToLeaderboard] = useState(false);
  const allowedRhythmIds = useMemo(() => new Set(rhythmsForLevel(level)), [level]);
  const startedAtRef = useRef(Date.now());

  const buildQuestion = useCallback((seed: number, excludeIds: string[]) => {
    // Restrict the rhythm catalog to this level only — generateQuizQuestion
    // honors implementedOnly, but doesn't know about Lead II "tiers".
    const subset = RHYTHM_CATALOG.filter((r) => allowedRhythmIds.has(r.id));
    const q = generateQuizQuestion({
      rhythmCatalog: subset,
      quizMode: "live",
      seed,
      exclude: excludeIds as never,
      maxChoices: 4,
    });
    const settings: ECGSettings = {
      rhythmId: q.correctRhythmId,
      heartRate: 80,
      sampleRateHz: SAMPLE_RATE,
      artifact: { level: 0.04, muscleTremor: false, mainsHum: false, mainsHz: 60, wanderingBaseline: false },
    };
    const gen = WAVEFORM_GENERATORS[q.correctRhythmId];
    if (!gen) throw new Error(`No generator for ${q.correctRhythmId}`);
    const signal = gen(settings, 0, STRIP_DURATION_SEC);
    return { question: q, signalPath: pointsToSvgPath(signal.points, STRIP_DURATION_SEC) };
  }, [allowedRhythmIds]);

  const [questions, setQuestions] = useState<QuestionState[]>(() => {
    const initial: QuestionState[] = [];
    const exclude: string[] = [];
    for (let i = 0; i < QUESTIONS_PER_ROUND; i++) {
      const built = buildQuestion(Date.now() + i, exclude);
      exclude.push(built.question.correctRhythmId);
      if (exclude.length > 3) exclude.shift();
      initial.push({
        question: built.question,
        signalPath: built.signalPath,
        startedAt: 0,
        wrongCount: 0,
        answeredAt: null,
        pickedId: null,
      });
    }
    return initial;
  });

  const current = questions[round];

  useEffect(() => {
    if (!current) return;
    if (current.startedAt === 0) {
      setQuestions((s) => s.map((q, i) => (i === round ? { ...q, startedAt: Date.now() } : q)));
    }
  }, [current, round]);

  useEffect(() => {
    if (!done || submittedToLeaderboard) return;
    setSubmittedToLeaderboard(true);
    void fetch("/api/lounge/games/lead-ii/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        score,
        level,
        questionsAnswered: questions.length,
        correct,
        wrong,
        durationMs: Date.now() - startedAtRef.current,
      }),
    });
  }, [done, submittedToLeaderboard, score, level, questions.length, correct, wrong]);

  if (done) {
    return <RoundComplete score={score} correct={correct} wrong={wrong} level={level} onExit={onExit} />;
  }
  if (!current) return null;

  function pickAnswer(choice: QuizAnswerChoice) {
    if (!current || current.answeredAt) return;
    const timeMs = Date.now() - current.startedAt;
    const isCorrect = choice.rhythmId === current.question.correctRhythmId;
    if (isCorrect) {
      const result = scoreCorrect(current.question.correctRhythmId, {
        timeToAnswerSec: timeMs / 1000,
        currentStreak: streak,
        wrongAttemptsOnThisQuestion: current.wrongCount,
      });
      setScore((s) => s + result.total);
      setCorrect((c) => c + 1);
      setStreak((c) => c + 1);
      setQuestions((s) => s.map((q, i) => i === round ? { ...q, answeredAt: Date.now(), pickedId: choice.rhythmId } : q));
      setTimeout(() => {
        if (round + 1 >= questions.length) setDone(true);
        else setRound((r) => r + 1);
      }, 1200);
    } else {
      const penalty = scoreWrong(current.wrongCount);
      setScore((s) => Math.max(0, s + penalty));
      setWrong((w) => w + 1);
      setStreak(0);
      setQuestions((s) => s.map((q, i) => i === round ? { ...q, wrongCount: q.wrongCount + 1 } : q));
      // Auto-advance after the third wrong on a single question — match native app.
      if (current.wrongCount + 1 >= 3) {
        setTimeout(() => {
          setQuestions((s) => s.map((q, i) => i === round ? { ...q, answeredAt: Date.now() } : q));
          setTimeout(() => {
            if (round + 1 >= questions.length) setDone(true);
            else setRound((r) => r + 1);
          }, 600);
        }, 600);
      }
    }
  }

  const total = questions.length;
  const correctName = RHYTHM_BY_ID.get(current.question.correctRhythmId)?.displayName ?? "Unknown";
  const answered = current.answeredAt !== null;

  return (
    <div>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <div>
          <div style={{ color: "#86efac", fontSize: 11, fontWeight: 900, letterSpacing: "0.20em", textTransform: "uppercase" }}>
            Lead II · {capitalize(level)}
          </div>
          <h1 style={{ margin: "4px 0 0", color: "white", fontSize: "1.4rem", fontWeight: 900 }}>
            Question {round + 1} <span style={{ color: "#94a3b8", fontSize: "0.8rem", fontWeight: 700 }}>/ {total}</span>
          </h1>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Stat label="Score" value={score} />
          <Stat label="Streak" value={streak} />
          <button type="button" onClick={onExit} style={ghostBtn}>Exit</button>
        </div>
      </header>

      <div style={{ background: "#020912", border: "1px solid rgba(134,239,172,0.25)", borderRadius: 14, padding: 12 }}>
        <EcgStrip path={current.signalPath} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8, marginTop: 14 }}>
        {current.question.answerChoices.map((choice) => {
          const isCorrect = choice.rhythmId === current.question.correctRhythmId;
          const wasPicked = current.pickedId === choice.rhythmId;
          let bg = "rgba(255,255,255,0.04)";
          let border = "rgba(255,255,255,0.10)";
          let color = "white";
          if (answered) {
            if (isCorrect) { bg = "rgba(134,239,172,0.18)"; border = "rgba(134,239,172,0.55)"; color = "#bbf7d0"; }
            else if (wasPicked) { bg = "rgba(252,165,165,0.15)"; border = "rgba(252,165,165,0.45)"; color = "#fca5a5"; }
          }
          return (
            <button
              key={choice.rhythmId}
              type="button"
              disabled={answered}
              onClick={() => pickAnswer(choice)}
              style={{
                padding: "12px 14px", textAlign: "left",
                background: bg, border: `1px solid ${border}`, color,
                borderRadius: 12, fontFamily: "inherit", fontSize: 14, fontWeight: 700,
                cursor: answered ? "default" : "pointer",
              }}
            >
              {choice.label}
            </button>
          );
        })}
      </div>

      {answered && (
        <p style={{ marginTop: 10, color: "#cbd5e1", fontSize: 13 }}>
          Correct rhythm: <strong style={{ color: "#bbf7d0" }}>{correctName}</strong>
        </p>
      )}
    </div>
  );
}

function pointsToSvgPath(points: { t: number; mv: number }[], durationSec: number): string {
  if (points.length === 0) return "";
  const W = 1000;
  const H = 200;
  const ymid = H / 2;
  const yScale = 35;
  const xScale = W / durationSec;
  let out = "";
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const x = (p.t * xScale).toFixed(2);
    const y = (ymid - p.mv * yScale).toFixed(2);
    out += `${i === 0 ? "M" : "L"}${x} ${y} `;
  }
  return out;
}

function EcgStrip({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 1000 200"
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      <defs>
        <pattern id="ecg-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0 L0 0 0 40" fill="none" stroke="rgba(134,239,172,0.10)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="1000" height="200" fill="url(#ecg-grid)" />
      <path d={path} fill="none" stroke="#86efac" strokeWidth="1.8" />
    </svg>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ padding: "4px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, textAlign: "center" }}>
      <div style={{ color: "#94a3b8", fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: "#f0b429", fontSize: 18, fontWeight: 900, fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>{value}</div>
    </div>
  );
}

function RoundComplete({ score, correct, wrong, level, onExit }: { score: number; correct: number; wrong: number; level: LevelId; onExit: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "30px 20px" }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>🏁</div>
      <h2 style={{ margin: 0, color: "white", fontSize: "1.8rem", fontWeight: 900 }}>Round complete</h2>
      <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 6 }}>
        Lead II · {capitalize(level)} · {correct} correct / {wrong} wrong
      </p>
      <div style={{ marginTop: 18, padding: "20px 24px", background: "linear-gradient(140deg, rgba(134,239,172,0.10), rgba(240,180,41,0.08))", border: "1px solid rgba(134,239,172,0.30)", borderRadius: 16, display: "inline-block" }}>
        <div style={{ color: "#86efac", fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase" }}>Final score</div>
        <div style={{ color: "#f0b429", fontSize: 56, fontWeight: 900, fontFamily: "ui-monospace, SFMono-Regular, monospace", lineHeight: 1 }}>{score}</div>
      </div>
      <div style={{ marginTop: 22, display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={() => location.reload()} style={primaryBtn}>Play again</button>
        <button type="button" onClick={onExit} style={ghostBtn}>Back to Games</button>
      </div>
    </div>
  );
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

const ghostBtn: React.CSSProperties = {
  padding: "8px 14px", background: "transparent", border: "1px solid rgba(255,255,255,0.14)",
  color: "#cbd5e1", borderRadius: 10, fontFamily: "inherit", fontWeight: 800, fontSize: 12,
  cursor: "pointer",
};
const primaryBtn: React.CSSProperties = {
  padding: "10px 18px", background: "#f0b429", color: "#040d1a", border: 0, borderRadius: 12,
  fontFamily: "inherit", fontWeight: 900, fontSize: 14, cursor: "pointer",
};
