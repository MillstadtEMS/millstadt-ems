import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ContactFormWrapper from "@/components/ContactFormWrapper";

export const metadata: Metadata = {
  title: "Ride-Along / Volunteer Request",
  description: "Request a ride-along or volunteer hours with Millstadt Ambulance Service — for medical students, civilians, and community service.",
};

const requestTypes = [
  "Community Service Hours",
  "Pre-Med Volunteer / Shadow Hours",
  "Pre-PA / Pre-NP Volunteer / Shadow Hours",
  "Civilian Observation / Interest",
  "Other Volunteer / Educational Purpose",
];

const inputClass =
  "w-full bg-[#040d1a] border border-white/10 rounded-2xl px-6 py-5 text-white text-lg focus:outline-none focus:border-[#f0b429]/50 transition-colors placeholder:text-slate-600";

const labelClass = "block text-slate-400 text-sm font-bold tracking-wide mb-4";

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4 pb-8 border-b border-white/8">
      <Image
        src="/images/millstadt-ems/star-of-life.png"
        alt=""
        width={30}
        height={30}
        style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 4px #f0b429)" }}
      />
      <h2 className="text-white font-black text-2xl">{title}</h2>
    </div>
  );
}

export default function RideAlongPage() {
  return (
    <>
      {/* Page Header */}
      <section className="relative pt-16 pb-28 bg-[#040d1a] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#071428] to-[#040d1a]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f0b429]/30 to-transparent" />
        <div className="relative wrap">
          <Link href="/forms" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm mb-10 transition-colors">
            <svg viewBox="0 0 20 20" className="w-4 h-4 fill-current">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Forms
          </Link>
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Volunteer</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-10">
            Ride-Along Request
          </h1>
          <ul className="space-y-5 max-w-2xl">
            {[
              "Request a ride-along or volunteer hours with Millstadt EMS for clinical hours, community service, or civilian observation.",
              "All requests are subject to availability, background check requirements, and leadership approval.",
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

      {/* Form */}
      <section className="pb-40 bg-[#040d1a]">
        <div className="wrap max-w-3xl">
          <ContactFormWrapper
            formType="Ride-Along Request"
            disclaimer="Requests are reviewed by Millstadt EMS leadership. All submissions are subject to availability, background check requirements, and leadership approval."
          >

            {/* ── Personal Information ── */}
            <div className="p-16 rounded-2xl bg-[#071428] border border-white/8 space-y-10">
              <SectionHeader title="Personal Information" />
              <div className="grid sm:grid-cols-2 gap-8">
                <div>
                  <label className={labelClass}>First Name *</label>
                  <input type="text" name="first_name" required className={inputClass} placeholder="First name" />
                </div>
                <div>
                  <label className={labelClass}>Last Name *</label>
                  <input type="text" name="last_name" required className={inputClass} placeholder="Last name" />
                </div>
                <div>
                  <label className={labelClass}>Phone *</label>
                  <input type="tel" name="phone" required className={inputClass} placeholder="(618) 000-0000" />
                </div>
                <div>
                  <label className={labelClass}>Email *</label>
                  <input type="email" name="email" required className={inputClass} placeholder="you@email.com" />
                </div>
                <div>
                  <label className={labelClass}>Date of Birth *</label>
                  <input type="date" name="dob" required className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>School / Organization</label>
                  <input type="text" name="school" className={inputClass} placeholder="e.g. SWIC, SIU School of Medicine" />
                </div>
              </div>
            </div>

            {/* ── VOID ── */}
            <div className="h-16" />

            {/* ── Request Details ── */}
            <div className="p-16 rounded-2xl bg-[#071428] border border-white/8 space-y-10">
              <SectionHeader title="Request Details" />

              <div>
                <label className={labelClass}>Purpose of Ride-Along *</label>
                <div className="flex flex-col gap-5">
                  {requestTypes.map((type) => (
                    <label key={type} className="flex items-center gap-5 p-6 bg-[#040d1a] border border-white/8 rounded-2xl cursor-pointer hover:border-[#f0b429]/30 transition-colors">
                      <input type="radio" name="purpose" value={type} required className="accent-[#f0b429] w-5 h-5 shrink-0" />
                      <span className="text-slate-300 text-base">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-8">
                <div>
                  <label className={labelClass}>Preferred Date</label>
                  <input type="date" name="preferred_date" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Hours Needed</label>
                  <input type="number" name="hours" min="1" className={inputClass} placeholder="e.g. 8" />
                </div>
              </div>

              <div>
                <label className={labelClass}>Additional Information</label>
                <textarea name="notes" rows={7} className={`${inputClass} resize-none`} placeholder="Any additional context about your request..." />
              </div>
            </div>

          </ContactFormWrapper>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-40 bg-[#040d1a]" />
    </>
  );
}
