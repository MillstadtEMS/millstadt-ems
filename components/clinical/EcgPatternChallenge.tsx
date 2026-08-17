"use client";

import { useMemo, useState } from "react";
import { HeartPulse, ShieldCheck } from "lucide-react";

type EcgCase = {
  id: string;
  title: string;
  level: "Warm-up" | "Intermediate" | "Advanced";
  prompt: string;
  answer: string;
  explanation: string;
  path: string;
  choices: string[];
};

const cases: EcgCase[] = [
  {
    id: "sinus",
    title: "Clean and regular",
    level: "Warm-up",
    prompt: "Regular rhythm, narrow QRS, and a consistent P wave before each complex.",
    answer: "Normal sinus rhythm",
    explanation: "The strip is regular, and each narrow QRS has a consistent preceding P wave in this synthetic teaching example.",
    path: "M0 72 L22 72 L26 66 L30 72 L42 72 L46 30 L50 92 L55 72 L86 72 L91 66 L95 72 L108 72 L112 30 L116 92 L121 72 L152 72 L157 66 L161 72 L174 72 L178 30 L182 92 L187 72 L220 72 L225 66 L229 72 L242 72 L246 30 L250 92 L255 72 L288 72 L293 66 L297 72 L310 72 L314 30 L318 92 L323 72 L360 72",
    choices: ["Normal sinus rhythm", "Atrial fibrillation", "Ventricular tachycardia"],
  },
  {
    id: "afib",
    title: "Irregularly irregular",
    level: "Intermediate",
    prompt: "Narrow complexes with uneven spacing and no consistent P waves.",
    answer: "Atrial fibrillation",
    explanation: "The key clue is the irregularly irregular R-R spacing without organized P waves before each QRS.",
    path: "M0 74 L18 73 L24 70 L29 74 L48 74 L52 35 L56 91 L61 74 L91 75 L97 70 L102 74 L128 74 L132 36 L136 92 L141 74 L164 75 L171 71 L176 75 L193 75 L197 34 L201 92 L207 75 L248 74 L252 36 L256 90 L261 74 L281 75 L287 70 L292 74 L324 74 L328 34 L332 92 L337 74 L360 74",
    choices: ["Atrial fibrillation", "Sinus bradycardia", "Atrial flutter"],
  },
  {
    id: "flutter",
    title: "Sawtooth baseline",
    level: "Intermediate",
    prompt: "Regular narrow complexes with repeating flutter-like baseline activity.",
    answer: "Atrial flutter",
    explanation: "The organized sawtooth baseline between narrow complexes points toward atrial flutter in this teaching strip.",
    path: "M0 72 L12 66 L24 78 L36 66 L48 78 L60 66 L70 72 L74 32 L78 92 L84 72 L96 66 L108 78 L120 66 L132 78 L144 66 L154 72 L158 32 L162 92 L168 72 L180 66 L192 78 L204 66 L216 78 L228 66 L238 72 L242 32 L246 92 L252 72 L264 66 L276 78 L288 66 L300 78 L312 66 L322 72 L326 32 L330 92 L336 72 L360 72",
    choices: ["Atrial flutter", "Normal sinus rhythm", "Junctional rhythm"],
  },
  {
    id: "vtach",
    title: "Wide and fast",
    level: "Advanced",
    prompt: "Regular, rapid, wide-complex rhythm in a short training strip.",
    answer: "Ventricular tachycardia",
    explanation: "The wide, regular, rapid complexes are the pattern-recognition clue. Real patient care depends on patient presentation and protocols.",
    path: "M0 72 L10 72 L18 38 L31 108 L45 42 L58 72 L76 72 L84 38 L97 108 L111 42 L124 72 L142 72 L150 38 L163 108 L177 42 L190 72 L208 72 L216 38 L229 108 L243 42 L256 72 L274 72 L282 38 L295 108 L309 42 L322 72 L360 72",
    choices: ["Ventricular tachycardia", "Atrial fibrillation", "First-degree AV block"],
  },
];

export default function EcgPatternChallenge() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const active = cases[activeIndex];
  const selected = answers[active.id];
  const selectedCorrect = selected === active.answer;
  const score = useMemo(
    () => cases.filter((item) => answers[item.id] === item.answer).length,
    [answers],
  );

  function answer(choice: string) {
    if (selected) return;
    setAnswers((current) => ({ ...current, [active.id]: choice }));
  }

  function next() {
    setActiveIndex((current) => Math.min(current + 1, cases.length - 1));
  }

  function reset() {
    setActiveIndex(0);
    setAnswers({});
  }

  return (
    <section className="bg-[#040d1a] py-14 text-white">
      <div className="wrap">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.24em] text-[#f0b429]">
              Public ECG Challenge
            </div>
            <h2 className="mt-4 text-balance text-4xl font-black leading-tight md:text-5xl">
              Pattern recognition for clinicians.
            </h2>
            <p className="mt-5 max-w-xl text-lg font-semibold leading-8 text-slate-300">
              A quick rhythm warm-up for EMTs, medics, nurses, students, and
              medically knowledgeable visitors. This is education only, not a
              patient-care tool.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              <ScoreTile label="Correct" value={score.toString()} />
              <ScoreTile label="Cases" value={`${Object.keys(answers).length}/${cases.length}`} />
            </div>
          </div>

          <div className="rounded-2xl border border-white/12 bg-[#071428] p-5 shadow-2xl shadow-black/35 md:p-7">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                  {active.level} case {activeIndex + 1}
                </div>
                <h3 className="mt-3 text-3xl font-black leading-tight">{active.title}</h3>
              </div>
              <span className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 text-xs font-black uppercase tracking-[0.14em] text-cyan-100">
                <HeartPulse className="h-4 w-4" aria-hidden />
                Lead II style
              </span>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-[#020912] p-4">
              <svg viewBox="0 0 360 128" role="img" aria-label={`ECG training strip for ${active.title}`} className="h-auto w-full">
                <defs>
                  <pattern id="ecg-grid-small" width="8" height="8" patternUnits="userSpaceOnUse">
                    <path d="M8 0H0V8" fill="none" stroke="rgba(248,113,113,0.16)" strokeWidth="0.7" />
                  </pattern>
                  <pattern id="ecg-grid-large" width="40" height="40" patternUnits="userSpaceOnUse">
                    <rect width="40" height="40" fill="url(#ecg-grid-small)" />
                    <path d="M40 0H0V40" fill="none" stroke="rgba(248,113,113,0.28)" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="360" height="128" rx="10" fill="url(#ecg-grid-large)" />
                <path d={active.path} fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <p className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5 text-base font-bold leading-7 text-slate-100">
              {active.prompt}
            </p>

            <div className="mt-5 grid gap-3">
              {active.choices.map((choice) => {
                const chosen = selected === choice;
                const correct = choice === active.answer;
                const feedbackId = `${active.id}-feedback`;
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
                    onClick={() => answer(choice)}
                    className={`min-h-14 rounded-xl border px-5 py-4 text-left text-base font-black leading-6 transition focus:outline-none focus:ring-2 focus:ring-[#f0b429] focus:ring-offset-2 focus:ring-offset-[#071428] ${selected ? "cursor-default" : ""} ${className}`}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>

            {selected && (
              <div id={`${active.id}-feedback`} role="status" aria-live="polite" className="mt-5 rounded-2xl border border-white/12 bg-white/5 p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className={`mt-1 h-6 w-6 shrink-0 ${selectedCorrect ? "text-emerald-300" : "text-[#f0b429]"}`} aria-hidden />
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                      Answer
                    </div>
                    <p className="mt-2 text-base font-black leading-7 text-white">{active.answer}</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">{active.explanation}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={next}
                disabled={!selected || activeIndex === cases.length - 1}
                className="inline-flex min-h-13 flex-1 items-center justify-center rounded-xl bg-[#f0b429] px-6 text-sm font-black uppercase tracking-[0.14em] text-[#061121] transition hover:bg-[#ffd45c] disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
              >
                Next strip
              </button>
              <button
                type="button"
                onClick={reset}
                className="inline-flex min-h-13 flex-1 items-center justify-center rounded-xl border border-white/25 px-6 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:border-[#f0b429] hover:bg-[#f0b429]/10"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <p className="mt-8 rounded-2xl border border-[#f0b429]/24 bg-[#f0b429]/10 p-5 text-sm font-bold leading-7 text-[#f8d980]">
          Educational rhythm-pattern practice only. This page is not medical
          advice, does not replace EMS education, and must not be used for
          patient-care decisions.
        </p>
      </div>
    </section>
  );
}

function ScoreTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <strong className="block text-3xl font-black text-[#f0b429]">{value}</strong>
      <span className="mt-1 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </span>
    </div>
  );
}
