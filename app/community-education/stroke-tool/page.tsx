import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "BE-FAST Stroke Recognition Tool",
  description:
    "Use the BE-FAST stroke recognition tool to identify stroke warning signs — Balance, Eyes, Face drooping, Arm weakness, Speech difficulty, Time to call 911.",
};

const steps = [
  {
    letter: "B",
    word: "Balance",
    question: "Is the person suddenly losing balance or coordination?",
    normal: {
      label: "Normal",
      desc: "Standing steadily, walking in a straight line, coordinated movement.",
      visual: (
        <div className="flex flex-col items-center gap-3">
          <svg viewBox="0 0 80 120" className="w-20 h-28 text-emerald-400 fill-current" aria-hidden>
            {/* Body */}
            <circle cx="40" cy="15" r="12" />
            <line x1="40" y1="27" x2="40" y2="80" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
            {/* Arms level */}
            <line x1="10" y1="50" x2="70" y2="50" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
            {/* Legs balanced */}
            <line x1="40" y1="80" x2="20" y2="115" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
            <line x1="40" y1="80" x2="60" y2="115" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
          </svg>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Balanced</span>
          </div>
        </div>
      ),
    },
    abnormal: {
      label: "Abnormal — Warning Sign",
      desc: "Sudden dizziness, stumbling, inability to walk, loss of coordination with no apparent cause.",
      visual: (
        <div className="flex flex-col items-center gap-3">
          <svg viewBox="0 0 80 120" className="w-20 h-28 text-red-400 fill-current" aria-hidden>
            {/* Body tilted */}
            <circle cx="40" cy="15" r="12" />
            <line x1="40" y1="27" x2="35" y2="80" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
            {/* Arms uneven */}
            <line x1="12" y1="40" x2="60" y2="58" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
            {/* Legs splayed */}
            <line x1="35" y1="80" x2="10" y2="112" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
            <line x1="35" y1="80" x2="55" y2="118" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
          </svg>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-red-400 text-xs font-bold uppercase tracking-wider">Imbalanced</span>
          </div>
        </div>
      ),
    },
  },
  {
    letter: "E",
    word: "Eyes",
    question: "Is the person experiencing sudden vision changes?",
    normal: {
      label: "Normal",
      desc: "Clear, equal vision in both eyes. No sudden changes.",
      visual: (
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-5">
            {/* Normal eye */}
            {[0, 1].map((i) => (
              <svg key={i} viewBox="0 0 60 40" className="w-20 h-14 text-emerald-400" aria-hidden>
                <ellipse cx="30" cy="20" rx="28" ry="16" fill="none" stroke="currentColor" strokeWidth="3" />
                <circle cx="30" cy="20" r="10" fill="currentColor" opacity="0.3" />
                <circle cx="30" cy="20" r="6" fill="currentColor" />
                <circle cx="35" cy="15" r="2" fill="white" />
              </svg>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Normal Vision</span>
          </div>
        </div>
      ),
    },
    abnormal: {
      label: "Abnormal — Warning Sign",
      desc: "Sudden blurry or double vision, vision loss in one or both eyes, or sudden inability to see on one side.",
      visual: (
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-5 items-center">
            {/* Left eye normal */}
            <svg viewBox="0 0 60 40" className="w-20 h-14 text-emerald-400" aria-hidden>
              <ellipse cx="30" cy="20" rx="28" ry="16" fill="none" stroke="currentColor" strokeWidth="3" />
              <circle cx="30" cy="20" r="10" fill="currentColor" opacity="0.3" />
              <circle cx="30" cy="20" r="6" fill="currentColor" />
              <circle cx="35" cy="15" r="2" fill="white" />
            </svg>
            {/* Right eye blurred/closed */}
            <svg viewBox="0 0 60 40" className="w-20 h-14 text-red-400" aria-hidden>
              <ellipse cx="30" cy="20" rx="28" ry="16" fill="none" stroke="currentColor" strokeWidth="3" />
              {/* X marks vision loss */}
              <line x1="15" y1="10" x2="45" y2="30" stroke="currentColor" strokeWidth="3" />
              <line x1="45" y1="10" x2="15" y2="30" stroke="currentColor" strokeWidth="3" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-red-400 text-xs font-bold uppercase tracking-wider">Vision Loss</span>
          </div>
        </div>
      ),
    },
  },
  {
    letter: "F",
    word: "Face",
    question: "Ask the person to smile. Does one side of the face droop?",
    normal: {
      label: "Normal",
      desc: "Both sides of the face move equally. The smile is symmetrical.",
      visual: (
        <div className="flex flex-col items-center gap-3">
          <svg viewBox="0 0 100 100" className="w-28 h-28" aria-hidden>
            <circle cx="50" cy="50" r="45" fill="#1a3a6e" stroke="#34d399" strokeWidth="2" />
            {/* Eyes */}
            <ellipse cx="35" cy="40" rx="5" ry="6" fill="#34d399" />
            <ellipse cx="65" cy="40" rx="5" ry="6" fill="#34d399" />
            {/* Symmetric smile */}
            <path d="M30 62 Q50 78 70 62" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Symmetric</span>
          </div>
        </div>
      ),
    },
    abnormal: {
      label: "Abnormal — Warning Sign",
      desc: "One side of the face droops or is numb. The smile is uneven or one side doesn't move.",
      visual: (
        <div className="flex flex-col items-center gap-3">
          <svg viewBox="0 0 100 100" className="w-28 h-28" aria-hidden>
            <circle cx="50" cy="50" r="45" fill="#1a3a6e" stroke="#f87171" strokeWidth="2" />
            {/* Eyes — left drooping */}
            <ellipse cx="35" cy="42" rx="5" ry="4" fill="#f87171" />
            <ellipse cx="65" cy="40" rx="5" ry="6" fill="#f87171" />
            {/* Drooping left side of mouth */}
            <path d="M30 65 Q40 72 50 65 Q60 62 70 62" fill="none" stroke="#f87171" strokeWidth="3" strokeLinecap="round" />
            {/* Droop indicator line */}
            <line x1="30" y1="62" x2="30" y2="70" stroke="#f87171" strokeWidth="2" strokeDasharray="3 2" />
          </svg>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-red-400 text-xs font-bold uppercase tracking-wider">Drooping</span>
          </div>
        </div>
      ),
    },
  },
  {
    letter: "A",
    word: "Arms",
    question: "Ask the person to raise both arms. Does one arm drift downward?",
    normal: {
      label: "Normal",
      desc: "Both arms raise equally and stay up with palms facing upward.",
      visual: (
        <div className="flex flex-col items-center gap-3">
          <svg viewBox="0 0 100 100" className="w-28 h-28 text-emerald-400 fill-current" aria-hidden>
            <circle cx="50" cy="22" r="10" />
            <line x1="50" y1="32" x2="50" y2="68" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
            {/* Both arms raised equally */}
            <line x1="50" y1="44" x2="18" y2="28" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
            <line x1="50" y1="44" x2="82" y2="28" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
            <line x1="50" y1="68" x2="35" y2="90" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
            <line x1="50" y1="68" x2="65" y2="90" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          </svg>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Both Arms Up</span>
          </div>
        </div>
      ),
    },
    abnormal: {
      label: "Abnormal — Warning Sign",
      desc: "One arm drifts down, feels weak or numb, or cannot be raised at all.",
      visual: (
        <div className="flex flex-col items-center gap-3">
          <svg viewBox="0 0 100 100" className="w-28 h-28 text-red-400 fill-current" aria-hidden>
            <circle cx="50" cy="22" r="10" />
            <line x1="50" y1="32" x2="50" y2="68" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
            {/* Left arm raised, right arm drooping */}
            <line x1="50" y1="44" x2="18" y2="28" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
            <line x1="50" y1="44" x2="82" y2="60" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
            {/* Arrow showing drift */}
            <line x1="82" y1="52" x2="82" y2="66" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2" />
            <polygon points="78,64 82,72 86,64" fill="currentColor" />
            <line x1="50" y1="68" x2="35" y2="90" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
            <line x1="50" y1="68" x2="65" y2="90" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          </svg>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-red-400 text-xs font-bold uppercase tracking-wider">Arm Drift</span>
          </div>
        </div>
      ),
    },
  },
  {
    letter: "S",
    word: "Speech",
    question: "Ask the person to repeat a simple phrase. Is their speech slurred or strange?",
    normal: {
      label: "Normal",
      desc: "Clear, easily understood speech. Can repeat a simple sentence without difficulty.",
      visual: (
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <svg viewBox="0 0 100 80" className="w-32 h-20 text-emerald-400" aria-hidden>
              <rect x="5" y="5" width="70" height="50" rx="10" fill="#0f2a4a" stroke="currentColor" strokeWidth="2.5" />
              <polygon points="25,55 45,55 35,70" fill="currentColor" />
              <text x="40" y="37" textAnchor="middle" fill="currentColor" fontSize="14" fontWeight="bold">&ldquo;The sky is blue&rdquo;</text>
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Clear Speech</span>
          </div>
        </div>
      ),
    },
    abnormal: {
      label: "Abnormal — Warning Sign",
      desc: "Slurred, garbled, or confused speech. Cannot repeat a simple phrase or uses wrong words.",
      visual: (
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <svg viewBox="0 0 100 80" className="w-32 h-20 text-red-400" aria-hidden>
              <rect x="5" y="5" width="70" height="50" rx="10" fill="#2d0d0d" stroke="currentColor" strokeWidth="2.5" />
              <polygon points="25,55 45,55 35,70" fill="currentColor" />
              <text x="40" y="37" textAnchor="middle" fill="currentColor" fontSize="13" fontWeight="bold">&ldquo;Duh sk- buu&rdquo;</text>
              {/* Wavy underline indicating slurred */}
              <path d="M15 47 Q22 44 29 47 Q36 50 43 47 Q50 44 57 47 Q64 50 65 47" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-red-400 text-xs font-bold uppercase tracking-wider">Slurred / Confused</span>
          </div>
        </div>
      ),
    },
  },
  {
    letter: "T",
    word: "Time — Call 911",
    question: "If ANY sign is present, call 911 immediately. Note the time symptoms started.",
    isTime: true,
    normal: {
      label: "No Signs",
      desc: "No stroke signs detected. Continue to monitor. If symptoms develop, call 911 immediately.",
      visual: (
        <div className="flex flex-col items-center gap-3">
          <svg viewBox="0 0 80 80" className="w-24 h-24 text-emerald-400" aria-hidden>
            <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="3" />
            <polyline points="24,40 36,52 58,30" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Monitor &amp; Stay Alert</span>
          </div>
        </div>
      ),
    },
    abnormal: {
      label: "ANY Sign Present — Call 911 NOW",
      desc: "Do not drive to the hospital. Call 911 immediately. Note the exact time symptoms began — this is critical for treatment decisions.",
      visual: (
        <div className="flex flex-col items-center gap-3">
          <svg viewBox="0 0 80 80" className="w-24 h-24 text-red-400" aria-hidden>
            <circle cx="40" cy="40" r="36" fill="#2d0d0d" stroke="currentColor" strokeWidth="3" />
            {/* Phone icon */}
            <path d="M28 22c0-1.1.9-2 2-2h20c1.1 0 2 .9 2 2v36c0 1.1-.9 2-2 2H30c-1.1 0-2-.9-2-2V22zm2 0v36h20V22H30zm10 32a2 2 0 100-4 2 2 0 000 4z" fill="currentColor" />
          </svg>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="text-red-400 text-xs font-bold uppercase tracking-wider">Call 911 Now</span>
          </div>
        </div>
      ),
    },
  },
];

export default function StrokeToolPage() {
  return (
    <>
      {/* Page Header */}
      <section className="relative pt-16 pb-28 bg-[#040d1a] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#071428] to-[#040d1a]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f0b429]/30 to-transparent" />
        <div className="relative wrap">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Community Education</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-6">
            BE-FAST Stroke<br />Recognition
          </h1>
          <ul className="space-y-5 max-w-2xl">
            {[
              "Stroke is a medical emergency. Every minute without treatment, approximately 1.9 million brain cells die.",
              "Use the BE-FAST tool to quickly identify warning signs. If ANY sign is present, call 911 immediately.",
            ].map((text) => (
              <li key={text} className="flex items-start gap-4">
                <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={20} height={20} className="shrink-0 mt-1" style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 3px #f0b429)" }} />
                <span className="text-slate-300 text-xl leading-relaxed">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-24 bg-[#040d1a]" />

      {/* Quick Reference Bar */}
      <section className="pb-24 bg-[#040d1a]">
        <div className="wrap">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {["B", "E", "F", "A", "S", "T"].map((l, i) => {
              const words = ["Balance", "Eyes", "Face", "Arms", "Speech", "Time"];
              const isT = l === "T";
              return (
                <div key={l} className={`rounded-2xl border py-6 px-4 text-center ${isT ? "border-red-500/40 bg-red-500/10" : "border-white/8 bg-[#071428]"}`}>
                  <div className={`text-5xl font-black mb-2 ${isT ? "text-red-400" : "text-[#f0b429]"}`}>{l}</div>
                  <div className="text-slate-400 text-xs uppercase tracking-wider">{words[i]}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-24 bg-[#040d1a]" />

      {/* Step-by-step assessments */}
      <section className="pb-40 bg-[#040d1a]">
        <div className="wrap space-y-20">
          {steps.map((step) => (
            <div key={step.letter} className={`rounded-2xl border overflow-hidden ${"isTime" in step && step.isTime ? "border-red-500/30" : "border-white/8"}`}>

              {/* Step Header */}
              <div className={`px-10 py-12 flex items-center gap-8 ${"isTime" in step && step.isTime ? "bg-red-950/40" : "bg-[#071428]"}`}>
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center font-black text-4xl shrink-0 ${"isTime" in step && step.isTime ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-[#f0b429]/10 text-[#f0b429] border border-[#f0b429]/20"}`}>
                  {step.letter}
                </div>
                <div>
                  <div className={`font-black text-3xl mb-3 ${"isTime" in step && step.isTime ? "text-red-300" : "text-white"}`}>{step.word}</div>
                  <p className="text-slate-400 text-lg leading-relaxed">{step.question}</p>
                </div>
              </div>

              {/* Normal / Abnormal */}
              <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/8">

                {/* Normal */}
                <div className="p-12 bg-[#040d1a] flex flex-col items-center text-center gap-10">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-emerald-400 font-bold text-sm uppercase tracking-wider">{step.normal.label}</span>
                  </div>
                  <div className="w-56 h-52 flex items-center justify-center rounded-2xl bg-emerald-400/5 border border-emerald-400/15">
                    {step.normal.visual}
                  </div>
                  <p className="text-slate-300 text-base leading-relaxed max-w-xs">{step.normal.desc}</p>
                </div>

                {/* Abnormal */}
                <div className={`p-12 flex flex-col items-center text-center gap-10 ${"isTime" in step && step.isTime ? "bg-red-950/20" : "bg-[#040d1a]"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full shrink-0 ${"isTime" in step && step.isTime ? "bg-red-400 animate-pulse" : "bg-red-400"}`} />
                    <span className="text-red-400 font-bold text-sm uppercase tracking-wider">{step.abnormal.label}</span>
                  </div>
                  <div className="w-56 h-52 flex items-center justify-center rounded-2xl bg-red-400/5 border border-red-400/15">
                    {step.abnormal.visual}
                  </div>
                  <p className="text-slate-300 text-base leading-relaxed max-w-xs">{step.abnormal.desc}</p>
                </div>

              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-40 bg-gradient-to-b from-[#040d1a] to-[#071428]" />

      {/* Key Facts */}
      <section className="py-28 bg-[#071428]">
        <div className="wrap">
          <div className="flex items-center gap-3 mb-8">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Critical Facts</span>
          </div>
          <h2 className="text-5xl font-black text-white mb-16">Time Is Brain</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                stat: "1.9M",
                label: "Brain cells lost per minute during a stroke without treatment",
              },
              {
                stat: "3–4.5 hrs",
                label: "Treatment window for clot-busting medication (tPA) — time of onset must be known",
              },
              {
                stat: "24 hrs",
                label: "TIA warning window — a mini-stroke significantly raises risk of major stroke within 24 hours",
              },
              {
                stat: "Call 911",
                label: "Never drive a stroke victim to the hospital — EMS can begin assessment and alert the hospital en route",
              },
              {
                stat: "Note Time",
                label: "The exact time symptoms began is the most critical piece of information for stroke treatment",
              },
              {
                stat: "Any Sign",
                label: "If ANY single BE-FAST sign is present, treat it as a stroke emergency — do not wait to see if it improves",
              },
            ].map((item) => (
              <div key={item.stat} className="p-10 rounded-2xl bg-[#040d1a] border border-white/8 hover:border-[#f0b429]/20 transition-colors">
                <div className="text-[#f0b429] font-black text-3xl mb-4">{item.stat}</div>
                <p className="text-slate-400 text-base leading-relaxed">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-40 bg-[#040d1a]" />
    </>
  );
}
