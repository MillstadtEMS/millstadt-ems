import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ContactFormWrapper from "@/components/ContactFormWrapper";

export const metadata: Metadata = {
  title: "Request Run Number",
  description: "Request your EMS incident run number from Millstadt Ambulance Service to complete online bill payment through EMSMC Secure Pay.",
};

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

export default function RunNumberPage() {
  return (
    <>
      {/* Page Header */}
      <section className="relative pt-16 pb-28 bg-[#040d1a] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#071428] to-[#040d1a]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f0b429]/30 to-transparent" />
        <div className="relative wrap">
          <Link href="/billing" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm mb-10 transition-colors">
            <svg viewBox="0 0 20 20" className="w-4 h-4 fill-current">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Billing
          </Link>
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Patient Services</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-10">
            Request Run Number
          </h1>
          <ul className="space-y-5 max-w-2xl">
            {[
              "Your EMS incident run number is required to pay your bill through EMSMC Secure Pay. Use this form to request it from Millstadt Ambulance Service.",
              "A member of our team will respond to your request with your run number as soon as possible. Identity verification is required by law.",
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
            formType="Run Number Request"
            backHref="/billing"
            disclaimer="A member of our team will respond with your run number as soon as possible. Do not submit this form on behalf of another person without proper legal authorization."
          >

            {/* ── Patient Information ── */}
            <div className="p-16 rounded-2xl bg-[#071428] border border-white/8 space-y-10">
              <SectionHeader title="Patient Information" />
              <div className="grid sm:grid-cols-2 gap-8">
                <div>
                  <label className={labelClass}>Patient First Name *</label>
                  <input type="text" name="first_name" required className={inputClass} placeholder="First name" />
                </div>
                <div>
                  <label className={labelClass}>Patient Last Name *</label>
                  <input type="text" name="last_name" required className={inputClass} placeholder="Last name" />
                </div>
                <div>
                  <label className={labelClass}>Date of Birth *</label>
                  <input type="date" name="dob" required className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Date of Service *</label>
                  <input type="date" name="date_of_service" required className={inputClass} />
                </div>
              </div>
            </div>

            {/* ── VOID ── */}
            <div className="h-16" />

            {/* ── Contact Information ── */}
            <div className="p-16 rounded-2xl bg-[#071428] border border-white/8 space-y-10">
              <SectionHeader title="Contact Information" />
              <p className="text-slate-500 text-base -mt-2">We will respond to your request using the contact information below.</p>
              <div className="grid sm:grid-cols-2 gap-8">
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
                <label className={labelClass}>Relationship to Patient *</label>
                <select name="relationship" required className={inputClass}>
                  <option value="" disabled>Select relationship</option>
                  <option value="Self — I am the patient">Self — I am the patient</option>
                  <option value="Parent / Legal Guardian">Parent / Legal Guardian</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Power of Attorney / Legal Representative">Power of Attorney / Legal Representative</option>
                  <option value="Other Authorized Representative">Other Authorized Representative</option>
                </select>
              </div>
            </div>

            {/* ── VOID ── */}
            <div className="h-16" />

            {/* ── HIPAA Authorization ── */}
            <div className="p-16 rounded-2xl bg-[#071428] border border-white/8 space-y-10">
              <SectionHeader title="HIPAA Authorization & Identity Verification" />

              <div className="p-8 rounded-2xl bg-[#040d1a] border border-white/8 space-y-6 text-slate-400 text-base leading-relaxed">
                <p className="text-white font-bold text-lg">Authorization for Release of Protected Health Information</p>

                <p>
                  I hereby authorize Millstadt Ambulance Service to release the EMS incident run number associated with the emergency medical services call described above, for the sole purpose of facilitating online bill payment through EMSMC Secure Pay.
                </p>

                <p>
                  I certify that I am either <span className="text-slate-300 font-semibold">(a)</span> the patient named above, or <span className="text-slate-300 font-semibold">(b)</span> the patient&apos;s legally authorized representative with full legal authority to access and act upon the patient&apos;s protected health information as defined under the Health Insurance Portability and Accountability Act of 1996 (HIPAA), 45 C.F.R. § 164.508.
                </p>

                <p>I understand and acknowledge the following:</p>
                <ul className="space-y-5">
                  {[
                    "This authorization is voluntary. I may refuse to sign without affecting my right to receive treatment or services from Millstadt Ambulance Service.",
                    "I may revoke this authorization at any time by submitting a written request to Millstadt Ambulance Service, except to the extent that action has already been taken in reliance upon it.",
                    "The information released pursuant to this authorization may be subject to re-disclosure by the recipient and may no longer be protected under HIPAA once disclosed.",
                    "This authorization is strictly limited to the release of the EMS incident run number associated with the date of service specified above and no other protected health information.",
                    "Millstadt Ambulance Service reserves the right to verify my identity before responding to this request.",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-4">
                      <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={16} height={16} className="shrink-0 mt-1" style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 3px #f0b429)" }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="border-t border-white/8 pt-6">
                  <p className="text-[#ef4444] font-semibold mb-3">Federal Law Notice — Penalty for False Statements</p>
                  <p>
                    I understand that providing false, fictitious, or fraudulent statements or representations in connection with this request constitutes a violation of federal law, including but not limited to <span className="text-slate-300 font-semibold">18 U.S.C. § 1001 (False Statements)</span>, and may result in criminal penalties including fines and/or imprisonment of up to five (5) years. Misrepresenting my identity or authorization to access another individual&apos;s protected health information may also constitute a violation of <span className="text-slate-300 font-semibold">HIPAA (42 U.S.C. § 1320d-6)</span>, punishable by civil and criminal penalties.
                  </p>
                </div>
              </div>

              <label className="flex items-start gap-5 p-8 bg-[#040d1a] border border-white/8 rounded-2xl cursor-pointer hover:border-[#f0b429]/30 transition-colors">
                <input type="checkbox" name="hipaa_authorization" required className="accent-[#f0b429] w-5 h-5 shrink-0 mt-1" />
                <span className="text-slate-300 text-base leading-relaxed">
                  I have read and fully understand the above authorization. I certify under penalty of law that all information provided is true and accurate to the best of my knowledge, and that I am legally authorized to request the protected health information described herein. I consent to the release of my EMS incident run number to the contact information provided above.
                </span>
              </label>
            </div>

          </ContactFormWrapper>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-40 bg-[#040d1a]" />
    </>
  );
}
