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
      <section className="relative pt-12 pb-12 bg-[#040d1a] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#071428] to-[#040d1a]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f0b429]/30 to-transparent" />
        <div className="relative wrap max-w-4xl">
          <div className="flex items-center gap-3 mb-4">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-xs font-black tracking-[0.25em] uppercase">Employment Application</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-4">
            Apply to Millstadt EMS
          </h1>
          <p className="text-slate-400 text-base max-w-2xl leading-relaxed">
            Complete the application below. All fields marked with <span className="text-[#f0b429]">*</span> are required. Upload your license, certifications, and resume where indicated.
          </p>
        </div>
      </section>

      {/* Same gap as between form sections */}
      <div className="h-8 bg-gradient-to-b from-[#040d1a] to-[#040d1a]" />

      {/* Application Form */}
      <ApplicationForm />

      {/* ── VOID ── */}
      <div className="h-20 bg-[#040d1a]" />
    </>
  );
}
