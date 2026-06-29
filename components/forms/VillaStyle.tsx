"use client";

import Link from "next/link";

const GOLD = "#f0b429";
const SECTION_BG =
  "radial-gradient(circle at 8% 0%, rgba(34,211,238,0.12), transparent 18rem), linear-gradient(145deg, rgba(14,31,59,0.96), rgba(3,9,20,0.98))";
const FIELD_BG = "rgba(2,9,18,0.78)";
const BORDER = "rgba(148,163,184,0.24)";
const SECTION_BORDER = "rgba(148,163,184,0.18)";

export function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[10.5px] font-black tracking-[0.18em] uppercase mb-2 text-slate-400">
      {children} {required && <span style={{ color: GOLD }}>*</span>}
    </label>
  );
}

type InputProps = {
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  min?: string | number;
  max?: string | number;
  maxLength?: number;
};
export function Input(props: InputProps) {
  return (
    <input
      {...props}
      className="w-full px-4 py-3.5 text-white text-sm outline-none transition-all placeholder:text-slate-600"
      style={{
        background: FIELD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), 0 1px 0 rgba(0,0,0,0.22)",
        fontSize: 16, // ≥16px stops iOS Safari auto-zooming on focus
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "rgba(240,180,41,0.68)";
        e.currentTarget.style.boxShadow = "0 0 0 4px rgba(240,180,41,0.10), inset 0 1px 0 rgba(255,255,255,0.08)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = BORDER;
        e.currentTarget.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.07), 0 1px 0 rgba(0,0,0,0.22)";
      }}
    />
  );
}

export function Textarea({
  name, placeholder, rows = 4, required, defaultValue, maxLength, onChange,
}: { name: string; placeholder?: string; rows?: number; required?: boolean; defaultValue?: string; maxLength?: number; onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void }) {
  return (
    <textarea
      name={name}
      placeholder={placeholder}
      rows={rows}
      required={required}
      defaultValue={defaultValue}
      maxLength={maxLength}
      onChange={onChange}
      className="w-full px-4 py-3.5 text-white text-sm outline-none transition-all resize-y min-h-[7rem] placeholder:text-slate-600"
      style={{
        background: FIELD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), 0 1px 0 rgba(0,0,0,0.22)",
        fontSize: 16, // ≥16px stops iOS Safari auto-zooming on focus
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "rgba(240,180,41,0.68)";
        e.currentTarget.style.boxShadow = "0 0 0 4px rgba(240,180,41,0.10), inset 0 1px 0 rgba(255,255,255,0.08)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = BORDER;
        e.currentTarget.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.07), 0 1px 0 rgba(0,0,0,0.22)";
      }}
    />
  );
}

export function RadioGroup({
  name, options, required, columns = 1,
}: { name: string; options: string[] | { label: string; value: string }[]; required?: boolean; columns?: 1 | 2 }) {
  const opts = options.map((o) => typeof o === "string" ? { label: o, value: o } : o);
  return (
    <div className={`grid gap-3 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>
      {opts.map((opt) => (
        <label
          key={opt.value}
          className="flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-all"
          style={{
            background: FIELD_BG,
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.055)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(240,180,41,0.3)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = BORDER)}
        >
          <input type="radio" name={name} value={opt.value} required={required} className="accent-[#f0b429] w-4 h-4 shrink-0" />
          <span className="text-sm font-semibold leading-snug text-slate-300">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

export function CheckGroup({
  name, options, columns = 2,
}: { name: string; options: string[]; columns?: 1 | 2 | 3 }) {
  const cols = columns === 3 ? "sm:grid-cols-3" : columns === 2 ? "sm:grid-cols-2" : "";
  return (
    <div className={`grid gap-3 ${cols}`}>
      {options.map((opt) => (
        <label
          key={opt}
          className="flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-all"
          style={{
            background: FIELD_BG,
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.055)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(240,180,41,0.3)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = BORDER)}
        >
          <input type="checkbox" name={name} value={opt} className="accent-[#f0b429] w-4 h-4 shrink-0" />
          <span className="text-sm font-semibold leading-snug text-slate-300">{opt}</span>
        </label>
      ))}
    </div>
  );
}

export function SectionHeader({ number, title, subtitle }: { number: string | number; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-4 sm:gap-5 mb-7 sm:mb-8">
      <div
        className="shrink-0 flex items-center justify-center w-10 h-10 font-black text-[#040d1a] text-base"
        style={{
          background: `linear-gradient(135deg, #ffdf7f, ${GOLD})`,
          borderRadius: 12,
          boxShadow: "0 14px 34px rgba(240,180,41,0.20), inset 0 1px 0 rgba(255,255,255,0.38)",
        }}
      >
        {number}
      </div>
      <div>
        <h2 className="text-white uppercase text-xl sm:text-2xl font-black tracking-wide leading-tight">{title}</h2>
        {subtitle && <p className="text-slate-400 text-sm mt-1 leading-relaxed">{subtitle}</p>}
      </div>
    </div>
  );
}

export function Section({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="p-5 sm:p-8 mb-4"
      style={{
        background: SECTION_BG,
        border: `1px solid ${SECTION_BORDER}`,
        borderRadius: 18,
        boxShadow:
          "0 22px 64px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      {children}
    </div>
  );
}

export function Divider() {
  return <div className="h-px my-6" style={{ background: "rgba(240,180,41,0.2)" }} />;
}

export function DisclaimerBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="p-4 mt-4 rounded-xl"
      style={{
        background: "linear-gradient(145deg, rgba(240,180,41,0.10), rgba(2,9,18,0.74))",
        border: `1px solid rgba(240,180,41,0.32)`,
        borderLeft: `4px solid ${GOLD}`,
      }}
    >
      <p className="text-xs leading-relaxed text-slate-400">{children}</p>
    </div>
  );
}

export function PageHeader({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string | string[] }) {
  const intros = !intro ? [] : Array.isArray(intro) ? intro : [intro];
  return (
    <section
      style={{
        background:
          "linear-gradient(90deg, rgba(34,211,238,0.12), transparent 38%, rgba(240,180,41,0.10)), repeating-linear-gradient(90deg, rgba(255,255,255,0.045) 0 1px, transparent 1px 72px), radial-gradient(circle at 16% 12%, rgba(34,211,238,0.16), transparent 28rem), radial-gradient(circle at 88% 0%, rgba(240,180,41,0.16), transparent 24rem), linear-gradient(180deg, #071428, #040d1a)",
        paddingTop: "4.25rem",
        paddingBottom: "2.35rem",
        overflow: "hidden",
        borderBottom: "1px solid rgba(148,163,184,0.16)",
      }}
    >
      <div className="wrap">
        <Link href="/forms" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest mb-5 transition-colors">
          ← Back to Forms
        </Link>
        <p className="text-[0.65rem] tracking-[0.35em] uppercase font-black mb-4 text-[#f0b429]">
          Millstadt Ambulance Service · {eyebrow}
        </p>
        <h1
          className="text-white uppercase font-black"
          style={{
            fontSize: "clamp(1.45rem, 6.2vw, 4.45rem)",
            lineHeight: 0.95,
            letterSpacing: "-0.045em",
            overflowWrap: "break-word",
          }}
        >
          {title}
        </h1>
        {intros.length > 0 && (
          <div className="mt-6 max-w-3xl space-y-3">
            {intros.map((line) => (
              <p key={line} className="text-slate-300 text-base sm:text-lg leading-relaxed" style={{ overflowWrap: "break-word" }}>{line}</p>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function FieldGrid({ children, cols = 2 }: { children: React.ReactNode; cols?: 1 | 2 | 3 }) {
  const c = cols === 3 ? "sm:grid-cols-3" : cols === 2 ? "sm:grid-cols-2" : "";
  return <div className={`grid gap-6 ${c}`}>{children}</div>;
}
