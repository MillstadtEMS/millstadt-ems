import type { Metadata } from "next";
import ApplicationForm from "./ApplicationForm";

export const metadata: Metadata = {
  title: "Apply — Millstadt Ambulance Service",
  description:
    "Submit your employment application to Millstadt Ambulance Service. EMT through PHMD positions available.",
};

export default function ApplyPage() {
  return (
    <>
      {/* Page Header */}
      <section className="relative pt-12 sm:pt-16 pb-8 sm:pb-12 bg-[#040d1a] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(34,211,238,0.16),transparent_28rem),radial-gradient(circle_at_88%_0%,rgba(240,180,41,0.16),transparent_24rem),linear-gradient(180deg,#071428,#040d1a)]" />
        <div className="absolute inset-0 opacity-30 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.05)_0_1px,transparent_1px_72px)]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f0b429]/30 to-transparent" />
        <div className="relative wrap">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <span className="h-px w-6 sm:w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-[10px] sm:text-xs font-black tracking-[0.18em] sm:tracking-[0.25em] uppercase">Employment Application</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-[0.95] tracking-[-0.04em] mb-4">
            Apply to Millstadt EMS
          </h1>
          <p className="text-slate-300 text-base sm:text-lg max-w-2xl leading-relaxed">
            Complete the application below. All fields marked with <span className="text-[#f0b429]">*</span> are required.
          </p>
        </div>
      </section>

      {/* Application Form (accordion sections) */}
      <ApplicationForm />

      {/* ── VOID ── */}
      <div className="h-20 bg-[#040d1a]" />
    </>
  );
}
