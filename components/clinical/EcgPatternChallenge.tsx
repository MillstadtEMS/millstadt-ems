"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HeartPulse, Pause, Play, RotateCcw, ShieldCheck } from "lucide-react";
import {
  PUBLIC_ECG_CHALLENGE_VERSION,
  casesForSkill,
  chicagoDateKey,
  dailyCaseIndex,
  orderedChallengeCases,
  type PublicEcgCase,
  type PublicEcgSkill,
} from "@/lib/clinical/public-ecg";

type ChallengeMode = "daily" | "practice" | "timed";

const TIMED_SECONDS = 60;

export default function EcgPatternChallenge() {
  const [mode, setMode] = useState<ChallengeMode>("daily");
  const [skill, setSkill] = useState<PublicEcgSkill>("student");
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(TIMED_SECONDS);
  const [dateKey, setDateKey] = useState(chicagoDateKey);

  const cases = useMemo(() => {
    const skillCases = casesForSkill(skill);
    if (mode === "daily") {
      return [skillCases[dailyCaseIndex(dateKey, skillCases.length)]];
    }
    if (mode === "timed") return orderedChallengeCases(skill, dateKey);
    return skillCases;
  }, [dateKey, mode, skill]);

  const active = cases[activeIndex];
  const selected = active ? answers[active.id] : undefined;
  const score = cases.filter((item) => answers[item.id] === item.answer).length;
  const completedCount = cases.filter((item) => answers[item.id]).length;
  const timedOut = mode === "timed" && started && remainingSeconds === 0;
  const resultVisible = finished || timedOut;

  const resetSession = useCallback((nextMode = mode, nextSkill = skill) => {
    setMode(nextMode);
    setSkill(nextSkill);
    setActiveIndex(0);
    setAnswers({});
    setFinished(false);
    setStarted(nextMode !== "timed");
    setPaused(false);
    setRemainingSeconds(TIMED_SECONDS);
  }, [mode, skill]);

  const answer = useCallback((choice: string) => {
    if (!active || selected || resultVisible || (mode === "timed" && (!started || paused))) return;
    setAnswers((current) => ({ ...current, [active.id]: choice }));
  }, [active, mode, paused, resultVisible, selected, started]);

  const advance = useCallback(() => {
    if (!selected || resultVisible) return;
    if (activeIndex >= cases.length - 1) {
      setFinished(true);
      return;
    }
    setActiveIndex((current) => current + 1);
  }, [activeIndex, cases.length, resultVisible, selected]);

  useEffect(() => {
    const calendarTimer = window.setInterval(() => setDateKey(chicagoDateKey()), 60_000);
    return () => window.clearInterval(calendarTimer);
  }, []);

  useEffect(() => {
    if (mode !== "timed" || !started || paused || resultVisible) return;
    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [mode, paused, resultVisible, started]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || resultVisible) return;
      if (event.key >= "1" && event.key <= "3" && active) {
        const choice = active.choices[Number(event.key) - 1];
        if (choice) answer(choice);
      } else if (event.key.toLowerCase() === "n") {
        advance();
      } else if (event.key.toLowerCase() === "p" && mode === "timed" && started) {
        setPaused((current) => !current);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, advance, answer, mode, resultVisible, started]);

  return (
    <section className="bg-[#040d1a] py-14 text-white" aria-labelledby="ecg-challenge-heading">
      <div className="wrap">
        <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-[#f0b429]">
              Public ECG Challenge
            </div>
            <h2 id="ecg-challenge-heading" className="mt-4 text-4xl font-black leading-tight md:text-5xl">
              Read the pattern. Pick the rhythm.
            </h2>
            <p className="mt-5 max-w-xl text-lg font-semibold leading-8 text-slate-300">
              Four synthetic teaching strips for EMS students and clinicians.
              No patient data, treatment direction, or employee score history is used here.
            </p>

            <fieldset className="mt-8 border-0 p-0">
              <legend className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Session</legend>
              <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-lg border border-white/15" role="group">
                <ModeButton active={mode === "daily"} onClick={() => resetSession("daily", skill)}>Daily</ModeButton>
                <ModeButton active={mode === "practice"} onClick={() => resetSession("practice", skill)}>Practice</ModeButton>
                <ModeButton active={mode === "timed"} onClick={() => resetSession("timed", skill)}>Timed</ModeButton>
              </div>
            </fieldset>

            <fieldset className="mt-6 border-0 p-0">
              <legend className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Level</legend>
              <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-lg border border-white/15" role="group">
                <ModeButton active={skill === "student"} onClick={() => resetSession(mode, "student")}>Student</ModeButton>
                <ModeButton active={skill === "clinician"} onClick={() => resetSession(mode, "clinician")}>Clinician</ModeButton>
              </div>
            </fieldset>

            <dl className="mt-7 grid grid-cols-2 border-y border-white/12 py-5">
              <ScoreValue label="Correct" value={score.toString()} />
              <ScoreValue label="Completed" value={`${completedCount}/${cases.length}`} />
            </dl>

            <p className="mt-5 text-sm font-semibold leading-6 text-slate-400">
              Daily selection follows the calendar date in America/Chicago.
              Timed sessions allow pause; practice and daily sessions are untimed.
            </p>
          </div>

          <div className="border border-white/12 bg-[#071428] p-5 shadow-xl shadow-black/30 md:p-7">
            {mode === "timed" && !started ? (
              <TimedStart skill={skill} caseCount={cases.length} onStart={() => setStarted(true)} />
            ) : resultVisible ? (
              <ResultPanel
                score={score}
                total={cases.length}
                timedOut={timedOut}
                mode={mode}
                onRestart={() => resetSession(mode, skill)}
              />
            ) : active ? (
              <>
                <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">
                      {active.level} strip {activeIndex + 1} of {cases.length}
                    </div>
                    <h3 className="mt-3 text-3xl font-black leading-tight">{active.title}</h3>
                  </div>
                  {mode === "timed" ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-bold tabular-nums text-[#f0b429]" aria-label={`${remainingSeconds} seconds remaining`}>
                        {formatTime(remainingSeconds)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPaused((current) => !current)}
                        className="grid h-11 w-11 place-items-center border border-white/20 text-white hover:border-[#f0b429] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0b429]"
                        aria-label={paused ? "Resume timed challenge" : "Pause timed challenge"}
                      >
                        {paused ? <Play className="h-5 w-5" aria-hidden /> : <Pause className="h-5 w-5" aria-hidden />}
                      </button>
                    </div>
                  ) : (
                    <span className="inline-flex min-h-10 items-center gap-2 border border-cyan-300/30 bg-cyan-300/10 px-4 text-xs font-black uppercase tracking-[0.12em] text-cyan-100">
                      <HeartPulse className="h-4 w-4" aria-hidden />
                      Synthetic Lead II
                    </span>
                  )}
                </div>

                {paused ? (
                  <div className="grid min-h-[390px] place-items-center text-center">
                    <div>
                      <Pause className="mx-auto h-10 w-10 text-[#f0b429]" aria-hidden />
                      <h3 className="mt-4 text-2xl font-black">Challenge paused</h3>
                      <button
                        type="button"
                        onClick={() => setPaused(false)}
                        className="mt-6 inline-flex min-h-12 items-center gap-2 bg-[#f0b429] px-6 font-black text-[#061121] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      >
                        <Play className="h-4 w-4" aria-hidden /> Resume
                      </button>
                    </div>
                  </div>
                ) : (
                  <CaseQuestion active={active} selected={selected} onAnswer={answer} />
                )}

                {!paused && selected ? (
                  <button
                    type="button"
                    onClick={advance}
                    className="mt-6 inline-flex min-h-13 w-full items-center justify-center bg-[#f0b429] px-6 text-sm font-black uppercase tracking-[0.12em] text-[#061121] hover:bg-[#ffd45c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    {activeIndex === cases.length - 1 ? "See result" : "Next strip"}
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-8 border-l-4 border-[#f0b429] bg-[#0b1728] px-5 py-4 text-sm font-bold leading-7 text-[#f8d980]">
          Educational pattern practice only. It is not medical advice, does not
          establish clinical competence, and must not be used for patient-care decisions.
          Advanced content remains unavailable until clinical review is complete.
        </div>
        <p className="mt-3 text-xs text-slate-500">Challenge version {PUBLIC_ECG_CHALLENGE_VERSION}</p>
      </div>
    </section>
  );
}

function CaseQuestion({
  active,
  selected,
  onAnswer,
}: {
  active: PublicEcgCase;
  selected?: string;
  onAnswer: (choice: string) => void;
}) {
  const selectedCorrect = selected === active.answer;
  const feedbackId = `${active.id}-feedback`;

  return (
    <>
      <div className="mt-6 border border-white/10 bg-[#020912] p-4">
        <svg viewBox="0 0 360 128" role="img" aria-label={`Synthetic ECG training strip: ${active.title}`} className="h-auto w-full">
          <defs>
            <pattern id="ecg-grid-small" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M8 0H0V8" fill="none" stroke="rgba(248,113,113,0.16)" strokeWidth="0.7" />
            </pattern>
            <pattern id="ecg-grid-large" width="40" height="40" patternUnits="userSpaceOnUse">
              <rect width="40" height="40" fill="url(#ecg-grid-small)" />
              <path d="M40 0H0V40" fill="none" stroke="rgba(248,113,113,0.28)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="360" height="128" fill="url(#ecg-grid-large)" />
          <path d={active.path} fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <p className="mt-5 border-l-2 border-cyan-300/50 bg-white/5 px-5 py-4 text-base font-bold leading-7 text-slate-100">
        {active.prompt}
      </p>

      <div className="mt-5 grid gap-3">
        {active.choices.map((choice, index) => {
          const chosen = selected === choice;
          const correct = choice === active.answer;
          const className =
            selected && chosen && correct
              ? "border-emerald-300 bg-emerald-400/16 text-emerald-50"
              : selected && chosen
                ? "border-rose-300 bg-rose-400/16 text-rose-50"
                : selected && correct
                  ? "border-emerald-300/60 bg-emerald-400/10 text-emerald-50"
                  : "border-white/12 bg-[#040d1a] text-white hover:border-[#f0b429]/45";

          return (
            <button
              key={choice}
              type="button"
              disabled={Boolean(selected)}
              aria-pressed={chosen}
              aria-describedby={selected ? feedbackId : undefined}
              onClick={() => onAnswer(choice)}
              className={`min-h-14 border px-5 py-4 text-left text-base font-black leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0b429] ${selected ? "cursor-default" : ""} ${className}`}
            >
              <span className="mr-3 font-mono text-xs text-slate-400" aria-hidden>{index + 1}</span>
              {choice}
            </button>
          );
        })}
      </div>

      {selected ? (
        <div id={feedbackId} role="status" aria-live="polite" className="mt-5 border border-white/12 bg-white/5 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className={`mt-1 h-6 w-6 shrink-0 ${selectedCorrect ? "text-emerald-300" : "text-[#f0b429]"}`} aria-hidden />
            <div>
              <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Answer</div>
              <p className="mt-2 text-base font-black leading-7 text-white">{active.answer}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">{active.explanation}</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function TimedStart({ skill, caseCount, onStart }: { skill: PublicEcgSkill; caseCount: number; onStart: () => void }) {
  return (
    <div className="grid min-h-[520px] place-items-center text-center">
      <div className="max-w-xl">
        <HeartPulse className="mx-auto h-12 w-12 text-cyan-200" aria-hidden />
        <div className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-[#f0b429]">60-second challenge</div>
        <h3 className="mt-3 text-3xl font-black">{caseCount} {skill === "student" ? "foundation" : "mixed"} strips</h3>
        <p className="mt-4 text-base font-semibold leading-7 text-slate-300">
          The clock starts when you press Start. You may pause at any time; no score is submitted or stored.
        </p>
        <button
          type="button"
          onClick={onStart}
          className="mt-7 inline-flex min-h-13 items-center gap-2 bg-[#f0b429] px-7 text-sm font-black uppercase tracking-[0.12em] text-[#061121] hover:bg-[#ffd45c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <Play className="h-5 w-5" aria-hidden /> Start
        </button>
      </div>
    </div>
  );
}

function ResultPanel({
  score,
  total,
  timedOut,
  mode,
  onRestart,
}: {
  score: number;
  total: number;
  timedOut: boolean;
  mode: ChallengeMode;
  onRestart: () => void;
}) {
  return (
    <div className="grid min-h-[520px] place-items-center text-center" role="status" aria-live="polite">
      <div>
        <div className="text-xs font-black uppercase tracking-[0.16em] text-[#f0b429]">
          {timedOut ? "Time" : mode === "daily" ? "Daily strip complete" : "Session complete"}
        </div>
        <strong className="mt-4 block font-mono text-7xl font-black tabular-nums text-white">{score}/{total}</strong>
        <p className="mt-5 max-w-md text-base font-semibold leading-7 text-slate-300">
          This score stays in your browser session and is not sent to Millstadt EMS.
        </p>
        <button
          type="button"
          onClick={onRestart}
          className="mt-7 inline-flex min-h-13 items-center gap-2 border border-white/25 px-7 text-sm font-black uppercase tracking-[0.12em] text-white hover:border-[#f0b429] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0b429]"
        >
          <RotateCcw className="h-4 w-4" aria-hidden /> Try again
        </button>
      </div>
    </div>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-12 border-r border-white/10 px-3 text-sm font-black last:border-r-0 focus-visible:relative focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f0b429] ${active ? "bg-[#f0b429] text-[#061121]" : "bg-[#071428] text-slate-300 hover:bg-white/5 hover:text-white"}`}
    >
      {children}
    </button>
  );
}

function ScoreValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 first:border-r first:border-white/12 first:pl-0">
      <dt className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</dt>
      <dd className="mt-2 font-mono text-3xl font-black tabular-nums text-[#f0b429]">{value}</dd>
    </div>
  );
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
