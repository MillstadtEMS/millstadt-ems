"use client";

import { useState } from "react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────
type Status = "idle" | "normal" | "elevated" | "warning" | "danger";
interface VitalResult { status: Status; label: string; notes: string[]; }
interface Zone { from: number; to: number; status: Status; }

// ── Classification ─────────────────────────────────────────────────────
function classifyTemp(v: number): VitalResult {
  if (v < 95)     return { status: "danger",   label: "Hypothermia",         notes: ["Core temperature below 95°F (35°C) is critically low.", "May relate to cold exposure, shock, severe infection, or endocrine problems.", "Symptoms may include confusion, shivering, and loss of coordination."] };
  if (v < 97)     return { status: "elevated", label: "Low Temperature",      notes: ["Below the typical adult resting range.", "Can relate to medications, thyroid conditions, or a cool environment."] };
  if (v <= 99)    return { status: "normal",   label: "Normal Temperature",   notes: ["Most adults fall between 97°F–99°F at rest.", "Temperature varies with time of day, activity, and measurement site."] };
  if (v <= 100.4) return { status: "warning",  label: "Mildly Elevated",      notes: ["Low-grade elevation may occur with minor infections, stress, or recent activity.", "Other symptoms are often more meaningful than the exact number."] };
                  return { status: "danger",   label: "Fever / Hyperthermia", notes: ["Often linked with infection, significant inflammation, or heat-related illness.", "Symptoms may include chills, sweats, muscle aches, or feeling generally unwell."] };
}

function classifyBP(s: number, d: number): VitalResult {
  if (s > 180 || d > 120) return { status: "danger",   label: "Hypertensive Emergency", notes: ["Systolic above 180 or diastolic above 120 mm Hg.", "When combined with symptoms, this is treated as a medical emergency.", "Symptoms can include chest pain, severe headache, vision changes, or confusion."] };
  if (s < 90 || d < 60)   return { status: "warning",  label: "Hypotension",            notes: ["Often described as below about 90/60 mm Hg in adults.", "May cause dizziness, fainting, blurred vision, or fatigue.", "Can relate to dehydration, blood loss, infection, or medications."] };
  if (s >= 140 || d >= 90) return { status: "warning", label: "Hypertension",            notes: ["Systolic ≥140 or diastolic ≥90 mm Hg.", "Usually requires active management and regular follow-up.", "Long-term control reduces risk to heart, brain, kidneys, and eyes."] };
  if (s >= 130 || d >= 80) return { status: "elevated",label: "Elevated / Stage 1",     notes: ["Systolic 130–139 or diastolic 80–89 mm Hg.", "Often managed with lifestyle changes and sometimes medication."] };
  if (s >= 120 && d < 80)  return { status: "elevated",label: "Elevated Systolic",      notes: ["Systolic 120–129 with diastolic under 80 mm Hg.", "Associated with increased risk of developing hypertension over time."] };
                            return { status: "normal",  label: "Normal Blood Pressure",  notes: ["Below 120/80 mm Hg is considered normal for most adults at rest.", "Individual targets can vary based on age, conditions, and treatment plans."] };
}

function classifyPulse(v: number): VitalResult {
  if (v < 40)   return { status: "danger",   label: "Critically Low Heart Rate", notes: ["Below ~40 bpm is very low in most adults.", "Can associate with heart conduction problems or medication effects.", "May cause dizziness, weakness, or fainting."] };
  if (v < 60)   return { status: "warning",  label: "Bradycardia Range",          notes: ["40–59 bpm is lower than the typical adult resting range.", "Can relate to athletic conditioning, medications, or heart rhythm conditions."] };
  if (v <= 100) return { status: "normal",   label: "Normal Heart Rate",           notes: ["Most adults have a resting heart rate between 60–100 bpm.", "Stress, activity, hydration, and medications all affect heart rate."] };
  if (v <= 130) return { status: "warning",  label: "Tachycardia Range",           notes: ["Above 100 bpm at rest is elevated for most adults.", "Can increase with pain, fever, dehydration, anxiety, or heart rhythm conditions."] };
                return { status: "danger",   label: "Very Fast Heart Rate",        notes: ["Above ~130 bpm at rest is very fast in most adults.", "May be associated with significant cardiac stress or abnormal rhythms."] };
}

function classifyResp(v: number): VitalResult {
  if (v < 8)   return { status: "danger",   label: "Critically Low Rate",       notes: ["Fewer than ~8 breaths/min at rest is very low in most adults.", "Can reduce ventilation; may be seen with sedating medications or serious illness."] };
  if (v < 12)  return { status: "warning",  label: "Low Breathing Rate",         notes: ["8–11 breaths/min is below the typical adult range.", "May occur with medications or conditions that depress breathing."] };
  if (v <= 20) return { status: "normal",   label: "Normal Breathing Rate",      notes: ["Most healthy adults breathe about 12–20 times per minute at rest.", "Rate increases with talking, exertion, or strong emotions."] };
  if (v <= 30) return { status: "warning",  label: "Elevated Breathing Rate",    notes: ["Above 20 breaths/min at rest is elevated for most adults.", "Can be seen with pain, anxiety, fever, lung disease, or metabolic acidosis."] };
               return { status: "danger",   label: "Very Fast Breathing Rate",   notes: ["Above ~30 breaths/min at rest is very fast in most adults.", "May reflect significant respiratory or metabolic stress."] };
}

function classifySpO2(v: number): VitalResult {
  if (v < 90) return { status: "danger",   label: "Hypoxemia Range",           notes: ["SpO₂ below 90% on room air is a clinically significant threshold.", "Can occur with lung disease, heart problems, or inadequate ventilation.", "Probe placement, circulation, and nail polish can affect readings."] };
  if (v < 95) return { status: "warning",  label: "Borderline Oxygen Level",   notes: ["Lower than typical for most healthy adults.", "May be expected in some chronic lung conditions; trends and symptoms matter most."] };
              return { status: "normal",   label: "Normal Oxygen Level",       notes: ["Common target for healthy adults is 95–100% on room air.", "Values can vary slightly with altitude, device, and circulation."] };
}

function classifyGlucose(v: number): VitalResult {
  if (v < 70)  return { status: "danger",   label: "Hypoglycemia Range",       notes: ["Many guidelines define low blood sugar as below ~70 mg/dL.", "Symptoms may include shakiness, sweating, hunger, irritability, or confusion.", "Can occur with diabetes medications, missed meals, heavy exercise, or alcohol."] };
  if (v < 100) return { status: "normal",   label: "Normal Fasting Glucose",   notes: ["Common fasting target range is about 70–99 mg/dL.", "Goals can differ depending on health conditions and treatment plans."] };
  if (v < 126) return { status: "warning",  label: "Prediabetes Range",        notes: ["Fasting values of 100–125 mg/dL are often in the prediabetes range.", "Trends over time and formal testing are used to confirm diagnosis."] };
               return { status: "danger",   label: "Hyperglycemia Range",      notes: ["Fasting ≥126 mg/dL or random ≥200 mg/dL are considered high.", "Can relate to diabetes, stress, illness, medications, or endocrine conditions."] };
}

// ── Status palette ────────────────────────────────────────────────────���
const S: Record<Status, { ring: string; glow: string; bg: string; text: string; dot: string; track: string }> = {
  idle:     { ring: "rgba(255,255,255,0.07)", glow: "none",                                bg: "transparent",             text: "#64748b", dot: "#334155", track: "rgba(255,255,255,0.04)" },
  normal:   { ring: "rgba(16,185,129,0.45)",  glow: "0 0 50px rgba(16,185,129,0.18)",      bg: "rgba(16,185,129,0.1)",    text: "#34d399",  dot: "#10b981",  track: "rgba(16,185,129,0.25)" },
  elevated: { ring: "rgba(245,158,11,0.45)",  glow: "0 0 50px rgba(245,158,11,0.18)",      bg: "rgba(245,158,11,0.1)",    text: "#fbbf24",  dot: "#f59e0b",  track: "rgba(245,158,11,0.25)" },
  warning:  { ring: "rgba(249,115,22,0.45)",  glow: "0 0 50px rgba(249,115,22,0.18)",      bg: "rgba(249,115,22,0.1)",    text: "#fb923c",  dot: "#f97316",  track: "rgba(249,115,22,0.25)" },
  danger:   { ring: "rgba(239,68,68,0.55)",   glow: "0 0 60px rgba(239,68,68,0.28)",       bg: "rgba(239,68,68,0.1)",     text: "#f87171",  dot: "#ef4444",  track: "rgba(239,68,68,0.3)"  },
};

// ── Range Bar ──────────────────────────────────────────────────────────
function RangeBar({ value, min, max, zones, status }: { value: number | null; min: number; max: number; zones: Zone[]; status: Status }) {
  const pct = (v: number) => Math.max(0, Math.min(100, (v - min) / (max - min) * 100));
  const pos = value !== null && !isNaN(value) ? pct(value) : null;
  const s = S[status];

  return (
    <div className="mt-6 mb-2">
      <div className="relative" style={{ height: "6px" }}>
        <div className="absolute inset-0 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
          {zones.map((z, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${pct(z.from)}%`,
                width: `${pct(z.to) - pct(z.from)}%`,
                height: "100%",
                background: S[z.status].track,
                transition: "background 0.4s",
              }}
            />
          ))}
        </div>
        {pos !== null && (
          <div
            style={{
              position: "absolute",
              left: `${pos}%`,
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: "16px",
              height: "16px",
              borderRadius: "50%",
              background: s.dot,
              boxShadow: `0 0 12px ${s.dot}, 0 0 4px ${s.dot}`,
              border: "2px solid rgba(255,255,255,0.25)",
              transition: "left 0.4s cubic-bezier(0.34,1.56,0.64,1), background 0.5s, box-shadow 0.5s",
              zIndex: 1,
            }}
          />
        )}
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-slate-700 text-xs font-mono">{min}</span>
        <span className="text-slate-700 text-xs font-mono">{max}</span>
      </div>
    </div>
  );
}

// ── ECG Band ───────────────────────────────────────────────────────────
function getECGPath() {
  let d = "M0,30";
  for (let i = 0; i < 12; i++) {
    const x = i * 200;
    d += ` L${x+40},30 L${x+43},25 L${x+46},30 L${x+65},30 L${x+68},36 L${x+71},4 L${x+75},54 L${x+79},30 L${x+100},30 L${x+104},21 L${x+115},21 L${x+120},30 L${x+200},30`;
  }
  return d;
}

function ECGBand() {
  const path = getECGPath();
  return (
    <div style={{ overflow: "hidden", background: "#040d1a", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", height: "64px", position: "relative" }}>
      <svg
        viewBox="0 0 2400 60"
        style={{ width: "200%", height: "64px", display: "block", animation: "ecgScroll 4s linear infinite", position: "absolute", top: 2, left: 0 }}
        preserveAspectRatio="none"
      >
        {/* Outer glow */}
        <path d={path} fill="none" stroke="#f0b429" strokeWidth="8" opacity="0.08" style={{ filter: "blur(5px)" }} />
        {/* Mid glow */}
        <path d={path} fill="none" stroke="#f0b429" strokeWidth="3" opacity="0.18" style={{ filter: "blur(2px)" }} />
        {/* Crisp line */}
        <path d={path} fill="none" stroke="#f0b429" strokeWidth="1.5" opacity="0.75" />
        {/* Bright core */}
        <path d={path} fill="none" stroke="#fff8e1" strokeWidth="0.5" opacity="0.35" />
      </svg>
    </div>
  );
}

// ── VitalCard ──────────────────────────────────────────────────────────
function VitalCard({ title, unit, icon, result, children }: {
  title: string; unit: string; icon: string; result: VitalResult | null; children: React.ReactNode;
}) {
  const status = result?.status ?? "idle";
  const s = S[status];
  const isDanger = status === "danger";

  return (
    <div
      style={{
        background: "#071428",
        border: `1px solid ${s.ring}`,
        boxShadow: isDanger ? `${s.glow}, inset 0 0 0 0 transparent` : s.glow,
        animation: isDanger ? "dangerPulse 2s ease-in-out infinite" : "none",
        transition: "border-color 0.5s ease, box-shadow 0.5s ease",
      }}
      className="rounded-2xl p-10 flex flex-col gap-8"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-white font-black text-xl leading-tight">{title}</div>
          <div className="text-slate-600 text-xs font-bold tracking-widest uppercase mt-2">{unit}</div>
        </div>
        <div className="flex items-center gap-3 shrink-0 mt-0.5">
          <span className="text-3xl leading-none">{icon}</span>
          {status !== "idle" && (
            <div
              style={{ background: s.dot, boxShadow: `0 0 10px ${s.dot}` }}
              className="w-3 h-3 rounded-full animate-pulse shrink-0"
            />
          )}
        </div>
      </div>

      {/* Inputs */}
      <div>{children}</div>

      {/* Result */}
      {result && (
        <div key={result.label} style={{ animation: "slideIn 0.25s ease forwards" }}>
          <div
            style={{
              background: s.bg,
              border: `1px solid ${s.ring}`,
              color: s.text,
              transition: "all 0.5s ease",
            }}
            className="rounded-xl px-5 py-4 font-black text-sm tracking-wider uppercase"
          >
            {result.label}
          </div>
          <ul className="mt-6 space-y-4" style={{ animation: "fadeUp 0.35s ease 0.12s both" }}>
            {result.notes.map((n, i) => (
              <li key={i} className="flex items-start gap-3 text-slate-400 text-sm leading-relaxed">
                <span style={{ color: s.dot }} className="shrink-0 mt-1.5 text-[10px]">▸</span>
                {n}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Input class ────────────────────────────────────────────────────────
const inp = "w-full bg-[#040d1a] border border-white/10 rounded-xl px-5 py-4 text-white text-2xl font-mono text-center focus:outline-none focus:border-[#f0b429]/60 transition-colors placeholder:text-slate-800";

// ── Consent Screen ─────────────────────────────────────────────────────
function ConsentScreen({ onAgree }: { onAgree: () => void }) {
  return (
    <>
      <style>{`
        @keyframes goldPulse { 0%,100% { text-shadow: 0 0 20px rgba(240,180,41,0.5), 0 0 50px rgba(240,180,41,0.2); } 50% { text-shadow: 0 0 35px rgba(240,180,41,0.85), 0 0 80px rgba(240,180,41,0.4); } }
        @keyframes redFlare  { 0%,100% { text-shadow: 0 0 10px rgba(239,68,68,0.4); } 50% { text-shadow: 0 0 22px rgba(239,68,68,0.9), 0 0 40px rgba(239,68,68,0.4); } }
        @keyframes orbDrift  { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(40px, 25px) scale(1.12); } }
        @keyframes orbDrift2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-30px, -20px) scale(1.08); } }
        @keyframes consentIn { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div className="min-h-screen bg-[#040d1a] flex flex-col items-center justify-center px-6 py-24" style={{ position: "relative", overflow: "hidden" }}>

        {/* Background orbs */}
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <div style={{ position: "absolute", width: "700px", height: "700px", background: "radial-gradient(circle, rgba(240,180,41,0.05) 0%, transparent 70%)", top: "-150px", right: "-150px", animation: "orbDrift 9s ease-in-out infinite" }} />
          <div style={{ position: "absolute", width: "600px", height: "600px", background: "radial-gradient(circle, rgba(239,68,68,0.04) 0%, transparent 70%)", bottom: "-100px", left: "-100px", animation: "orbDrift2 11s ease-in-out infinite" }} />
        </div>

        <div className="relative z-10 max-w-3xl w-full" style={{ animation: "consentIn 0.6s ease forwards" }}>

          {/* Title */}
          <div className="text-center mb-12">
            <div style={{ fontSize: "3.5rem", lineHeight: 1, marginBottom: "1.5rem" }}>⚕</div>
            <h1
              className="text-white font-black text-5xl md:text-6xl mb-5 tracking-tight"
              style={{ animation: "goldPulse 3.5s ease-in-out infinite" }}
            >
              LEGAL DISCLAIMER
            </h1>
            <p
              className="text-red-400 font-black text-base tracking-[0.15em] uppercase"
              style={{ animation: "redFlare 2.5s ease-in-out infinite" }}
            >
              Not a substitute for medical advice — read before continuing
            </p>
          </div>

          {/* Disclaimer card */}
          <div
            style={{ background: "#071428", border: "1px solid rgba(240,180,41,0.15)", boxShadow: "0 0 60px rgba(240,180,41,0.04), 0 24px 80px rgba(0,0,0,0.5)" }}
            className="rounded-2xl p-10 mb-10"
          >
            <p className="text-slate-300 leading-relaxed mb-6 text-base">
              This tool is provided strictly for <strong className="text-white">educational purposes only</strong> and does not constitute medical advice, diagnosis, or treatment. It is not intended for use during emergencies and should never be used to make or guide personal, medical, or professional decisions of any kind.
            </p>
            <p className="text-slate-300 leading-relaxed mb-6 text-base">
              All information is based on peer-reviewed research and official guidelines from the American Heart Association, American College of Cardiology, and American Diabetes Association. <strong className="text-white">Millstadt Ambulance Service</strong> and all affiliated entities assume no liability for any decisions, actions, or outcomes resulting from reliance on this information.
            </p>
            <p className="text-slate-300 leading-relaxed mb-6 text-base">
              Anyone experiencing symptoms such as chest pain, shortness of breath, back pain, numbness, weakness, vision changes, or difficulty speaking should <strong className="text-red-400">call 911 immediately</strong> and be evaluated by a licensed physician.
            </p>
            <p className="text-slate-500 text-sm leading-relaxed border-t border-white/8 pt-6">
              By clicking "I AGREE," you confirm that you understand and accept these terms and release <strong className="text-slate-400">Millstadt Ambulance Service</strong> and all associated parties from any and all liability related to the use of this educational tool.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={onAgree}
              className="flex-1 py-6 font-black text-lg rounded-2xl transition-all active:scale-[0.98]"
              style={{ background: "#f0b429", color: "#040d1a" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#d9a320")}
              onMouseLeave={e => (e.currentTarget.style.background = "#f0b429")}
            >
              I AGREE — OPEN TOOL
            </button>
            <Link
              href="/community-education"
              className="flex-1 flex items-center justify-center py-6 font-black text-lg rounded-2xl text-white transition-all"
              style={{ border: "2px solid rgba(255,255,255,0.12)" }}
            >
              I DO NOT AGREE
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main ───────────────────────────────────────────────────────────────
export default function VitalsCalculator() {
  const [agreed, setAgreed] = useState(false);
  const [temp, setTemp]   = useState("");
  const [sys, setSys]     = useState("");
  const [dia, setDia]     = useState("");
  const [hr, setHr]       = useState("");
  const [rr, setRr]       = useState("");
  const [spo2, setSpo2]   = useState("");
  const [gluc, setGluc]   = useState("");

  const tempResult  = temp !== ""              ? classifyTemp(+temp)         : null;
  const bpResult    = sys !== "" && dia !== "" ? classifyBP(+sys, +dia)      : null;
  const hrResult    = hr !== ""                ? classifyPulse(+hr)          : null;
  const rrResult    = rr !== ""                ? classifyResp(+rr)           : null;
  const spo2Result  = spo2 !== ""              ? classifySpO2(+spo2)         : null;
  const glucResult  = gluc !== ""              ? classifyGlucose(+gluc)      : null;

  if (!agreed) return <ConsentScreen onAgree={() => setAgreed(true)} />;

  return (
    <>
      <style>{`
        @keyframes ecgScroll  { from { transform: translateX(0); }    to { transform: translateX(-50%); } }
        @keyframes slideIn    { from { opacity:0; transform:translateY(8px); }  to { opacity:1; transform:translateY(0); } }
        @keyframes fadeUp     { from { opacity:0; transform:translateY(5px); }  to { opacity:1; transform:translateY(0); } }
        @keyframes dangerPulse{ 0%,100% { box-shadow: 0 0 30px rgba(239,68,68,0.2); } 50% { box-shadow: 0 0 70px rgba(239,68,68,0.5), inset 0 0 0 0 transparent; } }
        @keyframes headerGlow { 0%,100% { text-shadow: 0 0 20px rgba(240,180,41,0.35); } 50% { text-shadow: 0 0 40px rgba(240,180,41,0.65), 0 0 80px rgba(240,180,41,0.2); } }
      `}</style>

      {/* Page Header */}
      <section className="relative pt-16 pb-28 bg-[#040d1a] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#071428] to-[#040d1a]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f0b429]/30 to-transparent" />
        {/* Ambient glow orb */}
        <div style={{ position: "absolute", width: "600px", height: "600px", background: "radial-gradient(circle, rgba(240,180,41,0.04) 0%, transparent 65%)", top: "-200px", right: "-100px", pointerEvents: "none" }} />
        <div className="relative wrap">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Community Reference</span>
          </div>
          <h1
            className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-6"
            style={{ animation: "headerGlow 5s ease-in-out infinite" }}
          >
            Vital Signs<br />Reference Tool
          </h1>
          <p className="text-slate-400 text-xl max-w-2xl leading-relaxed">
            Enter a vital sign to see how it compares to standard adult reference ranges. For educational use only — not medical advice.
          </p>
        </div>
      </section>

      {/* ECG Scrolling Band */}
      <ECGBand />

      {/* Cards Grid */}
      <section className="py-28 bg-[#040d1a]">
        <div className="wrap">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">

            {/* Temperature */}
            <VitalCard title="Temperature" unit="°F — Fahrenheit" icon="🌡️" result={tempResult}>
              <input type="number" step="0.1" className={inp} placeholder="98.6" value={temp} onChange={e => setTemp(e.target.value)} />
              <RangeBar value={temp !== "" ? +temp : null} min={90} max={107} status={tempResult?.status ?? "idle"} zones={[
                { from: 90,    to: 95,    status: "danger"   },
                { from: 95,    to: 97,    status: "elevated" },
                { from: 97,    to: 99,    status: "normal"   },
                { from: 99,    to: 100.4, status: "warning"  },
                { from: 100.4, to: 107,   status: "danger"   },
              ]} />
            </VitalCard>

            {/* Blood Pressure */}
            <VitalCard title="Blood Pressure" unit="mm Hg — Systolic / Diastolic" icon="💓" result={bpResult}>
              <div className="flex items-center gap-3">
                <input type="number" className={inp} placeholder="120" value={sys} onChange={e => setSys(e.target.value)} />
                <span className="text-slate-600 font-black text-3xl shrink-0">/</span>
                <input type="number" className={inp} placeholder="80" value={dia} onChange={e => setDia(e.target.value)} />
              </div>
              <div className="mt-4 flex justify-between text-slate-700 text-xs font-mono">
                <span>Systolic</span><span>Diastolic</span>
              </div>
            </VitalCard>

            {/* Heart Rate */}
            <VitalCard title="Heart Rate" unit="bpm — Beats per Minute" icon="❤️" result={hrResult}>
              <input type="number" className={inp} placeholder="72" value={hr} onChange={e => setHr(e.target.value)} />
              <RangeBar value={hr !== "" ? +hr : null} min={30} max={170} status={hrResult?.status ?? "idle"} zones={[
                { from: 30,  to: 40,  status: "danger"  },
                { from: 40,  to: 60,  status: "warning" },
                { from: 60,  to: 100, status: "normal"  },
                { from: 100, to: 130, status: "warning" },
                { from: 130, to: 170, status: "danger"  },
              ]} />
            </VitalCard>

            {/* Respiratory Rate */}
            <VitalCard title="Respiratory Rate" unit="Breaths per Minute" icon="🫁" result={rrResult}>
              <input type="number" className={inp} placeholder="16" value={rr} onChange={e => setRr(e.target.value)} />
              <RangeBar value={rr !== "" ? +rr : null} min={4} max={42} status={rrResult?.status ?? "idle"} zones={[
                { from: 4,  to: 8,  status: "danger"  },
                { from: 8,  to: 12, status: "warning" },
                { from: 12, to: 20, status: "normal"  },
                { from: 20, to: 30, status: "warning" },
                { from: 30, to: 42, status: "danger"  },
              ]} />
            </VitalCard>

            {/* SpO2 */}
            <VitalCard title="Oxygen Saturation" unit="SpO₂ — Percentage" icon="💨" result={spo2Result}>
              <input type="number" min="0" max="100" className={inp} placeholder="98" value={spo2} onChange={e => setSpo2(e.target.value)} />
              <RangeBar value={spo2 !== "" ? +spo2 : null} min={80} max={100} status={spo2Result?.status ?? "idle"} zones={[
                { from: 80, to: 90,  status: "danger"  },
                { from: 90, to: 95,  status: "warning" },
                { from: 95, to: 100, status: "normal"  },
              ]} />
            </VitalCard>

            {/* Blood Glucose */}
            <VitalCard title="Blood Glucose" unit="mg/dL — Fasting Reference" icon="🩸" result={glucResult}>
              <input type="number" className={inp} placeholder="90" value={gluc} onChange={e => setGluc(e.target.value)} />
              <RangeBar value={gluc !== "" ? +gluc : null} min={40} max={300} status={glucResult?.status ?? "idle"} zones={[
                { from: 40,  to: 70,  status: "danger"  },
                { from: 70,  to: 100, status: "normal"  },
                { from: 100, to: 126, status: "warning" },
                { from: 126, to: 300, status: "danger"  },
              ]} />
            </VitalCard>

          </div>
        </div>
      </section>

      {/* BP Reference Table */}
      <section className="py-20 bg-[#040d1a]">
        <div className="wrap">
          <div className="rounded-2xl bg-[#071428] border border-white/8 overflow-hidden">
            <div className="px-10 py-8 border-b border-white/8">
              <div className="text-[#f0b429] text-xs font-black tracking-[0.25em] uppercase mb-2">AHA / ACC 2024</div>
              <h3 className="text-white font-black text-xl">Blood Pressure Classification Reference</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/8">
                    <th className="px-10 py-6 text-left text-slate-500 text-xs font-black tracking-widest uppercase">Category</th>
                    <th className="px-10 py-6 text-center text-slate-500 text-xs font-black tracking-widest uppercase">Systolic</th>
                    <th className="px-10 py-6 text-center text-slate-500 text-xs font-black tracking-widest uppercase">Diastolic</th>
                    <th className="px-10 py-6 text-center text-slate-500 text-xs font-black tracking-widest uppercase">Classification</th>
                  </tr>
                </thead>
                <tbody>
                  {([
                    { cat: "Hypotension",                            sys: "< 90",     dia: "< 60",     st: "warning"  as Status },
                    { cat: "Normal",                                 sys: "< 120",    dia: "< 80",     st: "normal"   as Status },
                    { cat: "Elevated",                               sys: "120–129",  dia: "< 80",     st: "elevated" as Status },
                    { cat: "Stage 1 Hypertension",                   sys: "130–139",  dia: "80–89",    st: "elevated" as Status },
                    { cat: "Stage 2 Hypertension",                   sys: "≥ 140",    dia: "≥ 90",     st: "warning"  as Status },
                    { cat: "Hypertensive Emergency (with symptoms)", sys: "> 180",    dia: "> 120",    st: "danger"   as Status },
                  ] as { cat: string; sys: string; dia: string; st: Status }[]).map((row) => (
                    <tr key={row.cat} className="border-b border-white/5" style={{ transition: "background 0.2s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.025)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <td className="px-10 py-6 text-white font-bold text-sm">{row.cat}</td>
                      <td className="px-10 py-6 text-slate-300 text-sm text-center font-mono">{row.sys}</td>
                      <td className="px-10 py-6 text-slate-300 text-sm text-center font-mono">{row.dia}</td>
                      <td className="px-10 py-6 text-center">
                        <span
                          style={{ background: S[row.st].bg, color: S[row.st].text, border: `1px solid ${S[row.st].ring}` }}
                          className="inline-block px-3 py-1 rounded-lg text-xs font-black tracking-wider uppercase"
                        >
                          {row.st}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-8 py-4 border-t border-white/5">
              <p className="text-slate-600 text-xs">Source: American Heart Association &amp; American College of Cardiology, Hypertension Guidelines 2024.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer footer */}
      <section className="py-24 bg-[#040d1a]">
        <div className="wrap max-w-3xl mx-auto">
          <div className="rounded-2xl border border-white/8 p-14 text-center" style={{ background: "rgba(7,20,40,0.6)" }}>
            <div className="text-[#f0b429] text-xs font-black tracking-[0.25em] uppercase mb-6">Educational Disclaimer</div>
            <p className="text-slate-400 text-base leading-loose">
              This tool is provided for educational purposes only and does not constitute medical advice, diagnosis, or treatment.
            </p>
            <p className="text-slate-500 text-sm leading-loose mt-4">
              All content is based on AHA, ACC, and ADA published guidelines. Millstadt Ambulance Service assumes no liability
              for decisions made based on this tool.
            </p>
            <div className="mt-8 pt-8 border-t border-white/8">
              <p className="text-white font-black text-lg">
                If you or someone near you is experiencing a medical emergency — <span className="text-red-400">call 911 immediately.</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="h-40 bg-[#040d1a]" />
    </>
  );
}
