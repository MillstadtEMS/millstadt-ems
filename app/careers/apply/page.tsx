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
      <section className="relative pt-16 pb-28 bg-[#040d1a] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#071428] to-[#040d1a]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f0b429]/30 to-transparent" />
        <div className="relative wrap">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Employment Application</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-6">
            Apply to<br />Millstadt EMS
          </h1>
          <p className="text-slate-300 text-xl max-w-2xl leading-relaxed">
            Complete the application below. All fields marked as required must be filled in. Upload your license, certifications, and resume where indicated.
          </p>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-16 bg-[#040d1a]" />

      {/* Application Form — sections manage their own bands */}
      <ApplicationForm />

      {/* ── VOID ── */}
      <div className="h-40 bg-[#040d1a]" />
    </>
  );
}
