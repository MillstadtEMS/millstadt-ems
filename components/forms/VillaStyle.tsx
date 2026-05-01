"use client";

import Link from "next/link";

const GOLD = "#f0b429";
const SECTION_BG = "#111111";
const FIELD_BG = "#1a1a1a";
const BORDER = "rgba(255,255,255,0.08)";
const SECTION_BORDER = "rgba(255,255,255,0.05)";

export function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[11px] font-semibold tracking-[0.2em] uppercase mb-2 text-slate-400">
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
      className="w-full px-4 py-3 text-white text-sm outline-none transition-colors"
      style={{ background: FIELD_BG, border: `1px solid ${BORDER}` }}
      onFocus={(e) => (e.currentTarget.style.borderColor = GOLD)}
      onBlur={(e) => (e.currentTarget.style.borderColor = BORDER)}
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
      className="w-full px-4 py-3 text-white text-sm outline-none transition-colors resize-none"
      style={{ background: FIELD_BG, border: `1px solid ${BORDER}` }}
      onFocus={(e) => (e.currentTarget.style.borderColor = GOLD)}
      onBlur={(e) => (e.currentTarget.style.borderColor = BORDER)}
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
          className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
          style={{ background: FIELD_BG, border: `1px solid ${BORDER}` }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(240,180,41,0.3)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = BORDER)}
        >
          <input type="radio" name={name} value={opt.value} required={required} className="accent-[#f0b429] w-4 h-4 shrink-0" />
          <span className="text-sm text-slate-300">{opt.label}</span>
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
          className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
          style={{ background: FIELD_BG, border: `1px solid ${BORDER}` }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(240,180,41,0.3)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = BORDER)}
        >
          <input type="checkbox" name={name} value={opt} className="accent-[#f0b429] w-4 h-4 shrink-0" />
          <span className="text-sm text-slate-300">{opt}</span>
        </label>
      ))}
    </div>
  );
}

export function SectionHeader({ number, title, subtitle }: { number: string | number; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-5 mb-8">
      <div
        className="shrink-0 flex items-center justify-center w-10 h-10 font-bold text-[#040d1a] text-base"
        style={{ background: GOLD }}
      >
        {number}
      </div>
      <div>
        <h2 className="text-white uppercase text-2xl font-black tracking-wide">{title}</h2>
        {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

export function Section({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="p-8 mb-2"
      style={{ background: SECTION_BG, border: `1px solid ${SECTION_BORDER}` }}
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
      className="p-4 mt-4"
      style={{ background: "#0d0d0d", border: `1px solid rgba(240,180,41,0.4)`, borderLeft: `4px solid ${GOLD}` }}
    >
      <p className="text-xs leading-relaxed text-slate-400">{children}</p>
    </div>
  );
}

export function PageHeader({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string | string[] }) {
  const intros = !intro ? [] : Array.isArray(intro) ? intro : [intro];
  return (
    <section
      style={{ background: GOLD, paddingTop: "7rem", paddingBottom: "3rem", overflow: "hidden" }}
    >
      <div className="wrap">
        <Link href="/forms" className="inline-flex items-center gap-2 text-[#040d1a]/70 hover:text-[#040d1a] text-xs font-bold uppercase tracking-widest mb-6 transition-colors">
          ← Back to Forms
        </Link>
        <p className="text-[0.65rem] tracking-[0.35em] uppercase font-semibold mb-4 text-[#040d1a]/60">
          Millstadt Ambulance Service · {eyebrow}
        </p>
        <h1
          className="text-[#040d1a] uppercase font-black"
          style={{ fontSize: "clamp(2.25rem, 6vw, 4.5rem)", lineHeight: 0.95 }}
        >
          {title}
        </h1>
        {intros.length > 0 && (
          <div className="mt-8 max-w-3xl space-y-3">
            {intros.map((line) => (
              <p key={line} className="text-[#040d1a]/80 text-base leading-relaxed">{line}</p>
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
