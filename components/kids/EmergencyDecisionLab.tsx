"use client";

import { useMemo, useState } from "react";
import { PhoneCall, ShieldCheck } from "lucide-react";

type Choice = {
  id: string;
  label: string;
  correct: boolean;
  feedback: string;
};

type Scenario = {
  id: string;
  title: string;
  situation: string;
  bestAction: string;
  choices: Choice[];
};

const scenarios: Scenario[] = [
  {
    id: "won-wake",
    title: "Someone will not wake up",
    situation: "A grown-up falls down, will not wake up, and is breathing strangely.",
    bestAction: "Call 911 right away and tell a safe grown-up nearby.",
    choices: [
      {
        id: "call",
        label: "Call 911 now",
        correct: true,
        feedback: "Correct. This is an emergency. Call 911 and stay near a safe grown-up if one is there.",
      },
      {
        id: "water",
        label: "Get them water",
        correct: false,
        feedback: "Not first. Someone who will not wake up needs emergency help right away.",
      },
      {
        id: "wait",
        label: "Wait and see",
        correct: false,
        feedback: "Waiting can be dangerous. Call 911 when someone will not wake up.",
      },
    ],
  },
  {
    id: "bike-scrape",
    title: "Small bike scrape",
    situation: "Your friend has a small scrape after falling off a bike and is awake, talking, and walking.",
    bestAction: "Tell a grown-up and get basic first aid.",
    choices: [
      {
        id: "grown-up",
        label: "Tell a grown-up",
        correct: true,
        feedback: "Correct. A grown-up can clean the scrape, check for other injuries, and decide what to do next.",
      },
      {
        id: "hide",
        label: "Hide it",
        correct: false,
        feedback: "Nope. Hiding injuries makes it harder for grown-ups to help.",
      },
      {
        id: "911",
        label: "Always call 911",
        correct: false,
        feedback: "Not every scrape needs 911. If you are unsure, tell a grown-up right away.",
      },
    ],
  },
  {
    id: "smoke",
    title: "Smoke smell inside",
    situation: "You smell smoke inside a building and hear an alarm.",
    bestAction: "Get out, stay out, and call 911 from the family meeting place.",
    choices: [
      {
        id: "out",
        label: "Get out and stay out",
        correct: true,
        feedback: "Correct. Leave quickly, stay outside, and call 911 from the family meeting place.",
      },
      {
        id: "things",
        label: "Grab favorite things",
        correct: false,
        feedback: "Leave things behind. People and pets matter more than stuff.",
      },
      {
        id: "hide",
        label: "Hide in a room",
        correct: false,
        feedback: "Do not hide from smoke or alarms. Get out and stay out.",
      },
    ],
  },
  {
    id: "lost",
    title: "Lost at an event",
    situation: "You cannot find your grown-up at a crowded event.",
    bestAction: "Stay in a safe visible place and ask a uniformed helper or event worker for help.",
    choices: [
      {
        id: "helper",
        label: "Ask a uniformed helper",
        correct: true,
        feedback: "Correct. A firefighter, police officer, EMS crew member, or event worker can help reconnect you.",
      },
      {
        id: "parking",
        label: "Go to the parking lot",
        correct: false,
        feedback: "Parking lots are not a safe first stop. Stay visible and ask a trusted helper.",
      },
      {
        id: "stranger",
        label: "Leave with anyone",
        correct: false,
        feedback: "No. Ask a uniformed helper or event worker, and do not leave the area with a stranger.",
      },
    ],
  },
];

export default function EmergencyDecisionLab() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const scenario = scenarios[activeIndex];
  const selectedId = answers[scenario.id];
  const selectedChoice = scenario.choices.find((choice) => choice.id === selectedId);
  const completeCount = Object.keys(answers).length;
  const score = useMemo(
    () =>
      scenarios.reduce((total, item) => {
        const answerId = answers[item.id];
        const answer = item.choices.find((choice) => choice.id === answerId);
        return total + (answer?.correct ? 1 : 0);
      }, 0),
    [answers],
  );
  const isComplete = completeCount === scenarios.length;

  function choose(choice: Choice) {
    if (selectedId) return;
    setAnswers((current) => ({ ...current, [scenario.id]: choice.id }));
  }

  function goNext() {
    setActiveIndex((current) => Math.min(current + 1, scenarios.length - 1));
  }

  function reset() {
    setAnswers({});
    setActiveIndex(0);
  }

  return (
    <section className="bg-[#061121] py-14 text-white">
      <div className="wrap box-border">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.24em] text-[#f0b429]">
              911 Decision Lab
            </div>
            <h2 className="mt-4 text-balance text-4xl font-black leading-tight md:text-5xl">
              Practice the first choice.
            </h2>
            <p className="mt-5 max-w-xl text-lg font-semibold leading-8 text-slate-300">
              Kids pick what to do in simple, grown-up assisted safety
              scenarios. The goal is calm recognition, not medical training.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-white/10 bg-white/5 p-5">
                <strong className="block text-3xl font-black text-[#f0b429]">{score}</strong>
                <span className="mt-1 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  Right choices
                </span>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-5">
                <strong className="block text-3xl font-black text-cyan-200">{completeCount}/{scenarios.length}</strong>
                <span className="mt-1 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  Completed
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-white/12 bg-[#0b1728] p-5 shadow-2xl shadow-black/35 md:p-7">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                  Scenario {activeIndex + 1}
                </div>
                <h3 className="mt-3 text-3xl font-black leading-tight">{scenario.title}</h3>
              </div>
              <span className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#f0b429]/30 bg-[#f0b429]/10 px-4 text-xs font-black uppercase tracking-[0.14em] text-[#f8d980]">
                <PhoneCall className="h-4 w-4" aria-hidden />
                Think first
              </span>
            </div>

            <p className="mt-6 rounded-lg border border-white/10 bg-white/6 p-5 text-lg font-bold leading-8 text-slate-100">
              {scenario.situation}
            </p>

            <div className="mt-5 grid gap-3">
              {scenario.choices.map((choice) => {
                const chosen = selectedId === choice.id;
                const showResult = Boolean(selectedId);
                const feedbackId = `${scenario.id}-feedback`;
                const stateClass =
                  showResult && chosen && choice.correct
                    ? "border-emerald-300 bg-emerald-400/18 text-emerald-50"
                    : showResult && chosen
                      ? "border-rose-300 bg-rose-400/18 text-rose-50"
                      : showResult && choice.correct
                        ? "border-emerald-300/60 bg-emerald-400/10 text-emerald-50"
                        : "border-white/12 bg-[#061121] text-white hover:border-[#f0b429]/45";

                return (
                  <button
                    key={choice.id}
                    type="button"
                    disabled={showResult}
                    aria-pressed={chosen}
                    aria-describedby={showResult ? feedbackId : undefined}
                    onClick={() => choose(choice)}
                    className={`min-h-14 rounded-lg border px-5 py-4 text-left text-base font-black leading-6 transition focus:outline-none focus:ring-2 focus:ring-[#f0b429] focus:ring-offset-2 focus:ring-offset-[#0b1728] ${showResult ? "cursor-default" : ""} ${stateClass}`}
                  >
                    {choice.label}
                  </button>
                );
              })}
            </div>

            {selectedChoice && (
              <div id={`${scenario.id}-feedback`} role="status" aria-live="polite" className="mt-5 rounded-lg border border-white/12 bg-white/6 p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className={`mt-1 h-6 w-6 shrink-0 ${selectedChoice.correct ? "text-emerald-300" : "text-[#f0b429]"}`} aria-hidden />
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                      Best action
                    </div>
                    <p className="mt-2 text-base font-black leading-7 text-white">{scenario.bestAction}</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">{selectedChoice.feedback}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={goNext}
                disabled={!selectedId || activeIndex === scenarios.length - 1}
                className="inline-flex min-h-13 flex-1 items-center justify-center rounded-lg bg-[#f0b429] px-6 text-sm font-black uppercase tracking-[0.14em] text-[#061121] transition hover:bg-[#ffd45c] disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
              >
                Next scenario
              </button>
              <button
                type="button"
                onClick={reset}
                className="inline-flex min-h-13 flex-1 items-center justify-center rounded-lg border border-white/25 px-6 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:border-[#f0b429] hover:bg-[#f0b429]/10"
              >
                Start over
              </button>
            </div>

            {isComplete && (
              <div className="mt-6 rounded-lg border border-[#f0b429]/30 bg-[#f0b429]/12 p-5 text-[#f8d980]">
                <div className="text-xs font-black uppercase tracking-[0.2em]">Mission complete</div>
                <p className="mt-2 text-lg font-black leading-7">
                  You finished the lab with {score} out of {scenarios.length} right choices.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
