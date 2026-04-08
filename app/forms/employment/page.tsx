import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ContactFormWrapper from "@/components/ContactFormWrapper";

export const metadata: Metadata = {
  title: "Employment Application Request",
  description: "Request an employment application to join the Millstadt Ambulance Service team as an EMT, Paramedic, or advanced prehospital provider.",
};

const positions = [
  "EMT (Emergency Medical Technician)",
  "Paramedic",
  "Prehospital Registered Nurse (RN)",
  "Prehospital Advanced Practice Nurse (APN)",
  "Prehospital Physician Assistant (PA)",
  "Prehospital Physician (MD/DO)",
];

const availability = [
  "Day Shifts",
  "Night Shifts",
  "Weekends",
  "Holidays",
  "Overtime",
  "On-Call",
  "Part-Time",
  "Full-Time",
  "PRN / As Needed",
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

function ALSBadge() {
  return (
    <span className="ml-2 px-2 py-0.5 text-[10px] font-black tracking-widest uppercase rounded-md bg-[#2563eb]/20 text-[#60a5fa] border border-[#2563eb]/30">
      ALS Providers Only
    </span>
  );
}

export default function EmploymentPage() {
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
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Careers</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-10">
            Employment Application Request
          </h1>
          <ul className="max-w-2xl">
            <li className="flex items-start gap-4">
              <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={20} height={20} className="shrink-0 mt-1" style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 3px #f0b429)" }} />
              <span className="text-slate-300 text-xl leading-relaxed">Fill out the form below and we&apos;ll send you a full application when positions become available.</span>
            </li>
            <div className="flex items-center gap-4 my-10">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-slate-600 font-black text-lg">+</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>
            <li className="flex items-start gap-4">
              <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={20} height={20} className="shrink-0 mt-1" style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 3px #f0b429)" }} />
              <span className="text-slate-300 text-xl leading-relaxed">All requests are reviewed by Millstadt EMS leadership and responded to within 5&ndash;7 business days.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Body */}
      <section className="pb-40 bg-[#040d1a]">
        <div className="wrap">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 pt-16">

            {/* Sidebar */}
            <aside>
              <div className="sticky top-28 bg-[#071428] border border-white/8 rounded-2xl p-6">
                <div className="h-0.5 bg-gradient-to-r from-[#f0b429] to-transparent mb-5" />
                <h3 className="text-white font-black text-sm uppercase tracking-widest mb-4">About the Process</h3>
                <ul className="space-y-3 mb-6">
                  {[
                    "Fill out this form and we'll send a full application when positions open",
                    "All requests are reviewed by EMS leadership",
                    "You'll be contacted within 5–7 business days",
                    "Valid IL EMS license required for all clinical positions",
                    "BLS certification must be current at time of hire",
                  ].map(r => (
                    <li key={r} className="flex items-start gap-2.5 text-slate-400 text-sm leading-snug">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f0b429] shrink-0 mt-1.5" />
                      {r}
                    </li>
                  ))}
                </ul>
                <div className="pt-5 border-t border-white/6">
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Questions? Contact us at<br />
                    <a href="tel:6182342021" className="text-[#f0b429] hover:text-[#f5c842] transition-colors">(618) 234-2021</a>
                  </p>
                </div>
              </div>
            </aside>

            {/* Form */}
            <div className="lg:col-span-2">
              <ContactFormWrapper
                formType="Employment Application"
                disclaimer="Received by Millstadt EMS leadership. You will be contacted within 5–7 business days."
              >

                {/* Personal Information */}
                <div className="p-10 rounded-2xl bg-[#071428] border border-white/8 space-y-10">
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
                      <label className={labelClass}>Phone Number *</label>
                      <input type="tel" name="phone" required className={inputClass} placeholder="(618) 000-0000" />
                    </div>
                    <div>
                      <label className={labelClass}>Email Address *</label>
                      <input type="email" name="email" required className={inputClass} placeholder="you@email.com" />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Address</label>
                    <input type="text" name="address" className={inputClass} placeholder="Street address, City, State, ZIP" />
                  </div>
                </div>

                <div className="h-8" />

                {/* Position of Interest */}
                <div className="p-10 rounded-2xl bg-[#071428] border border-white/8 space-y-10">
                  <SectionHeader title="Position of Interest" />
                  <div className="grid sm:grid-cols-2 gap-4">
                    {positions.map((pos) => (
                      <label key={pos} className="flex items-center gap-5 p-5 bg-[#040d1a] border border-white/8 rounded-2xl cursor-pointer hover:border-[#f0b429]/30 transition-colors">
                        <input type="radio" name="position" value={pos} required className="accent-[#f0b429] w-5 h-5 shrink-0" />
                        <span className="text-slate-300 text-base leading-snug">{pos}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="h-8" />

                {/* Credentials & Experience */}
                <div className="p-10 rounded-2xl bg-[#071428] border border-white/8 space-y-10">
                  <SectionHeader title="Credentials &amp; Experience" />

                  <div>
                    <p className={labelClass}>Certifications Held</p>
                    <div className="space-y-4">

                      <div className="p-6 bg-[#040d1a] border border-white/8 rounded-2xl">
                        <div className="flex items-center justify-between mb-5">
                          <span className="text-white font-bold text-base">Illinois EMS License</span>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-slate-500 text-xs font-bold tracking-wide mb-3">License Number</label>
                            <input type="text" name="il_license" className={inputClass} placeholder="e.g. IL-P-12345" />
                          </div>
                          <div>
                            <label className="block text-slate-500 text-xs font-bold tracking-wide mb-3">Expiration Date</label>
                            <input type="date" name="il_license_expiry" className={inputClass} />
                          </div>
                        </div>
                      </div>

                      <div className="p-6 bg-[#040d1a] border border-white/8 rounded-2xl">
                        <div className="flex items-center justify-between mb-5">
                          <span className="text-white font-bold text-base">BLS Card</span>
                        </div>
                        <div>
                          <label className="block text-slate-500 text-xs font-bold tracking-wide mb-3">Expiration Date</label>
                          <input type="date" name="bls_expiry" className={inputClass} />
                        </div>
                      </div>

                      <div className="p-6 bg-[#040d1a] border border-white/8 rounded-2xl">
                        <div className="flex items-center gap-3 mb-5">
                          <span className="text-white font-bold text-base">ACLS</span>
                          <ALSBadge />
                        </div>
                        <div>
                          <label className="block text-slate-500 text-xs font-bold tracking-wide mb-3">Expiration Date</label>
                          <input type="date" name="acls_expiry" className={inputClass} />
                        </div>
                      </div>

                      <div className="p-6 bg-[#040d1a] border border-white/8 rounded-2xl">
                        <div className="flex items-center gap-3 mb-5">
                          <span className="text-white font-bold text-base">ITLS</span>
                          <ALSBadge />
                        </div>
                        <div>
                          <label className="block text-slate-500 text-xs font-bold tracking-wide mb-3">Expiration Date</label>
                          <input type="date" name="itls_expiry" className={inputClass} />
                        </div>
                      </div>

                      <div className="p-6 bg-[#040d1a] border border-white/8 rounded-2xl">
                        <div className="flex items-center gap-3 mb-5">
                          <span className="text-white font-bold text-base">PALS</span>
                          <ALSBadge />
                        </div>
                        <div>
                          <label className="block text-slate-500 text-xs font-bold tracking-wide mb-3">Expiration Date</label>
                          <input type="date" name="pals_expiry" className={inputClass} />
                        </div>
                      </div>

                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-8">
                    <div>
                      <label className={labelClass}>Other Certification / License</label>
                      <input type="text" name="certification" className={inputClass} placeholder="e.g. Illinois Paramedic #12345" />
                    </div>
                    <div>
                      <label className={labelClass}>Years of EMS Experience</label>
                      <input type="number" name="years_experience" min="0" className={inputClass} placeholder="0" />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Tell us about yourself / additional notes</label>
                    <textarea name="notes" rows={6} className={`${inputClass} resize-none`} placeholder="Previous experience, why you want to join Millstadt EMS, etc." />
                  </div>
                </div>

                <div className="h-8" />

                {/* Availability */}
                <div className="p-10 rounded-2xl bg-[#071428] border border-white/8 space-y-10">
                  <SectionHeader title="I Am Willing To Work" />
                  <div className="grid sm:grid-cols-3 gap-4">
                    {availability.map((item) => (
                      <label key={item} className="flex items-center gap-4 p-5 bg-[#040d1a] border border-white/8 rounded-2xl cursor-pointer hover:border-[#f0b429]/30 transition-colors">
                        <input type="checkbox" name="availability" value={item} className="accent-[#f0b429] w-5 h-5 shrink-0" />
                        <span className="text-slate-300 text-base">{item}</span>
                      </label>
                    ))}
                  </div>
                </div>

              </ContactFormWrapper>
            </div>

          </div>
        </div>
      </section>

      <div className="h-40 bg-[#040d1a]" />
    </>
  );
}
