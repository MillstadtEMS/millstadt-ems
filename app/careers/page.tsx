import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Careers",
  description:
    "Join the Millstadt Ambulance Service team. We are hiring EMTs, Paramedics, Critical Care Paramedics, and advanced prehospital providers.",
};

const positions = [
  {
    title: "EMT — Emergency Medical Technician (BLS)",
    badge: "BLS",
    badgeColor: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
    description:
      "EMTs at Millstadt Ambulance Service are the backbone of our community emergency response. You will respond to 911 calls, provide high-quality basic life support care, and safely transport patients across our service area.",
    responsibilities: [
      "Respond to 911 emergency calls and provide BLS patient assessment and care.",
      "Perform CPR, airway management, hemorrhage control, splinting, and patient packaging.",
      "Safely operate and assist in the operation of emergency vehicles.",
      "Accurately complete patient care reports (PCRs) for every call.",
      "Maintain unit readiness — equipment checks, cleaning, and restocking.",
      "Communicate clearly with dispatch, hospital staff, and the public.",
      "Support ALS providers during advanced life support calls.",
    ],
    requirements: [
      "Current Illinois EMT license in good standing.",
      "Current BLS certification.",
      "Valid Illinois driver's license with clean driving record.",
      "Ability to lift and carry up to 125 lbs with a partner.",
      "Strong interpersonal skills and a community-first attitude.",
      "Good standing within the Southwestern Illinois EMS System or reciprocity required.",
    ],
  },
  {
    title: "Paramedic (ALS)",
    badge: "ALS",
    badgeColor: "text-[#f0b429] border-[#f0b429]/30 bg-[#f0b429]/10",
    description:
      "Advanced providers at Millstadt EMS respond to 911 calls and perform interfacility transports, delivering high-quality prehospital care to our community. You will work as part of a team committed to clinical excellence under the medical direction of Dr. Leo Hsu.",
    responsibilities: [
      "Respond to 911 emergency calls and perform patient assessment and care within your scope of practice.",
      "Perform interfacility and critical care transports as assigned.",
      "Safely operate and assist in the operation of emergency vehicles.",
      "Accurately complete patient care reports (PCRs) for every call.",
      "Maintain unit readiness — equipment checks, cleaning, and restocking.",
      "Communicate clearly with dispatch, medical control, hospital staff, and the public.",
      "Maintain all required licensure, certifications, and continuing education.",
    ],
    requirements: [
      "Current Illinois Paramedic license in good standing.",
      "Current BLS, ACLS, and ITLS/PHTLS certifications.",
      "Minimum 1 year of ALS field experience preferred.",
      "Valid Illinois driver's license with clean driving record.",
      "Good standing within the Southwestern Illinois EMS System or reciprocity required.",
    ],
  },
  {
    title: "Critical Care Paramedic (CCP)",
    badge: "Critical Care",
    badgeColor: "text-[#2563eb] border-[#2563eb]/30 bg-[#2563eb]/10",
    description:
      "Advanced providers at Millstadt EMS respond to 911 calls and perform interfacility transports, delivering high-quality prehospital care to our community. You will work as part of a team committed to clinical excellence under the medical direction of Dr. Leo Hsu.",
    responsibilities: [
      "Respond to 911 emergency calls and perform patient assessment and care within your scope of practice.",
      "Perform interfacility and critical care transports as assigned.",
      "Safely operate and assist in the operation of emergency vehicles.",
      "Accurately complete patient care reports (PCRs) for every call.",
      "Maintain unit readiness — equipment checks, cleaning, and restocking.",
      "Communicate clearly with dispatch, medical control, hospital staff, and the public.",
      "Maintain all required licensure, certifications, and continuing education.",
    ],
    requirements: [
      "Current Illinois Paramedic license in good standing.",
      "FP-C or CCP-C certification required.",
      "Current BLS, ACLS, PALS, and ITLS/PHTLS certifications.",
      "Minimum 3 years of ALS field experience.",
      "Demonstrated proficiency with ventilator management and vasoactive infusions.",
      "Good standing within the Southwestern Illinois EMS System or reciprocity required.",
    ],
  },
  {
    title: "Prehospital Registered Nurse (PHRN)",
    badge: "PHRN",
    badgeColor: "text-purple-400 border-purple-400/30 bg-purple-400/10",
    description:
      "Advanced providers at Millstadt EMS respond to 911 calls and perform interfacility transports, delivering high-quality prehospital care to our community. You will work as part of a team committed to clinical excellence under the medical direction of Dr. Leo Hsu.",
    responsibilities: [
      "Respond to 911 emergency calls and perform patient assessment and care within your scope of practice.",
      "Perform interfacility and critical care transports as assigned.",
      "Safely operate and assist in the operation of emergency vehicles.",
      "Accurately complete patient care reports (PCRs) for every call.",
      "Maintain unit readiness — equipment checks, cleaning, and restocking.",
      "Communicate clearly with dispatch, medical control, hospital staff, and the public.",
      "Maintain all required licensure, certifications, and continuing education.",
    ],
    requirements: [
      "Current Illinois RN license in good standing.",
      "Current BLS, ACLS, and PALS certifications.",
      "Minimum 2 years of critical care, emergency, or flight nursing experience.",
      "CFRN, CCRN, CEN, or equivalent specialty certification preferred.",
      "Good standing within the Southwestern Illinois EMS System or reciprocity required.",
    ],
  },
  {
    title: "Advanced Practice Prehospital RN (APHRN)",
    badge: "APHRN",
    badgeColor: "text-purple-300 border-purple-300/30 bg-purple-300/10",
    description:
      "Advanced providers at Millstadt EMS respond to 911 calls and perform interfacility transports, delivering high-quality prehospital care to our community. You will work as part of a team committed to clinical excellence under the medical direction of Dr. Leo Hsu.",
    responsibilities: [
      "Respond to 911 emergency calls and perform patient assessment and care within your scope of practice.",
      "Perform interfacility and critical care transports as assigned.",
      "Safely operate and assist in the operation of emergency vehicles.",
      "Accurately complete patient care reports (PCRs) for every call.",
      "Maintain unit readiness — equipment checks, cleaning, and restocking.",
      "Communicate clearly with dispatch, medical control, hospital staff, and the public.",
      "Maintain all required licensure, certifications, and continuing education.",
    ],
    requirements: [
      "Current Illinois APRN license (NP) in good standing.",
      "Current BLS, ACLS, and PALS certifications.",
      "Emergency or critical care specialty background strongly preferred.",
      "DEA license required if prescriptive authority will be utilized.",
      "Good standing within the Southwestern Illinois EMS System or reciprocity required.",
    ],
  },
  {
    title: "Prehospital Physician Assistant (PHPA)",
    badge: "PHPA",
    badgeColor: "text-sky-400 border-sky-400/30 bg-sky-400/10",
    description:
      "Advanced providers at Millstadt EMS respond to 911 calls and perform interfacility transports, delivering high-quality prehospital care to our community. You will work as part of a team committed to clinical excellence under the medical direction of Dr. Leo Hsu.",
    responsibilities: [
      "Respond to 911 emergency calls and perform patient assessment and care within your scope of practice.",
      "Perform interfacility and critical care transports as assigned.",
      "Safely operate and assist in the operation of emergency vehicles.",
      "Accurately complete patient care reports (PCRs) for every call.",
      "Maintain unit readiness — equipment checks, cleaning, and restocking.",
      "Communicate clearly with dispatch, medical control, hospital staff, and the public.",
      "Maintain all required licensure, certifications, and continuing education.",
    ],
    requirements: [
      "Current Illinois PA license in good standing.",
      "Current BLS, ACLS, and PALS certifications.",
      "Emergency medicine or critical care background preferred.",
      "DEA license required if prescriptive authority will be utilized.",
      "Good standing within the Southwestern Illinois EMS System or reciprocity required.",
    ],
  },
  {
    title: "Prehospital Physician (PHMD)",
    badge: "PHMD",
    badgeColor: "text-red-400 border-red-400/30 bg-red-400/10",
    description:
      "Advanced providers at Millstadt EMS respond to 911 calls and perform interfacility transports, delivering high-quality prehospital care to our community. You will work as part of a team committed to clinical excellence under the medical direction of Dr. Leo Hsu.",
    responsibilities: [
      "Respond to 911 emergency calls and perform patient assessment and care within your scope of practice.",
      "Perform interfacility and critical care transports as assigned.",
      "Safely operate and assist in the operation of emergency vehicles.",
      "Accurately complete patient care reports (PCRs) for every call.",
      "Maintain unit readiness — equipment checks, cleaning, and restocking.",
      "Communicate clearly with dispatch, medical control, hospital staff, and the public.",
      "Maintain all required licensure, certifications, and continuing education.",
    ],
    requirements: [
      "Current Illinois medical license (MD or DO) in good standing.",
      "Board certified or board eligible in Emergency Medicine, Anesthesiology, Surgery, or related specialty preferred.",
      "ACLS, PALS, and ATLS certifications.",
      "Prior EMS or prehospital experience strongly preferred.",
      "DEA license required.",
      "Good standing within the Southwestern Illinois EMS System or reciprocity required.",
    ],
  },
];

export default function CareersPage() {
  return (
    <>
      {/* Page Header */}
      <section className="relative pt-16 pb-28 bg-[#040d1a] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#071428] to-[#040d1a]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f0b429]/30 to-transparent" />
        <div className="relative wrap">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Join the Team</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-10">
            Careers at<br />Millstadt EMS
          </h1>
          <ul className="space-y-5 max-w-2xl">
            {[
              "We are always looking for dedicated, skilled prehospital providers to join our team — from EMT to PHMD level.",
              "Millstadt Ambulance Service offers an advanced, progressive clinical environment with physician medical direction through Dr. Leo Hsu.",
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
      <div className="h-16 bg-[#040d1a]" />

      {/* Position Listings */}
      <section className="pb-40 bg-[#040d1a]">
        <div className="wrap">
          <div className="flex items-center gap-3 mb-8">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Positions</span>
          </div>
          <h2 className="text-4xl font-black text-white mb-14">Job Descriptions</h2>

          <div className="space-y-8">
            {positions.map((pos) => (
              <details key={pos.title} className="group rounded-2xl bg-[#071428] border border-white/8 hover:border-[#f0b429]/20 transition-colors overflow-hidden">
                <summary className="flex items-center gap-6 px-10 py-9 cursor-pointer list-none select-none">
                  <div className="flex-1 flex items-center gap-5 flex-wrap">
                    <span className="text-white font-bold text-xl">{pos.title}</span>
                    <span className={`text-xs font-black tracking-widest uppercase px-3 py-1 rounded-lg border ${pos.badgeColor}`}>{pos.badge}</span>
                  </div>
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-slate-600 group-open:rotate-180 transition-transform duration-200 shrink-0" aria-hidden>
                    <path d="M7 10l5 5 5-5z" />
                  </svg>
                </summary>

                <div className="px-12 pb-24 pt-12 border-t border-white/5">

                  <p className="text-slate-300 text-xl leading-loose mt-10 mb-20">{pos.description}</p>

                  <div className="grid md:grid-cols-2 gap-12">

                    {/* Responsibilities */}
                    <div className="p-12 bg-[#040d1a] rounded-2xl border border-white/6">
                      <div className="flex items-center gap-3 mb-10">
                        <span className="h-px w-6 bg-[#f0b429]" />
                        <span className="text-[#f0b429] text-xs font-black tracking-[0.2em] uppercase">Responsibilities</span>
                      </div>
                      <ul className="space-y-10">
                        {pos.responsibilities.map((r) => (
                          <li key={r} className="flex items-start gap-5 text-slate-300 text-lg leading-loose">
                            <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={18} height={18} className="shrink-0 mt-1.5" style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 2px #f0b429)" }} />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Requirements */}
                    <div className="p-12 bg-[#040d1a] rounded-2xl border border-white/6">
                      <div className="flex items-center gap-3 mb-10">
                        <span className="h-px w-6 bg-[#2563eb]" />
                        <span className="text-slate-400 text-xs font-black tracking-[0.2em] uppercase">Requirements</span>
                      </div>
                      <ul className="space-y-10">
                        {pos.requirements.map((r) => (
                          <li key={r} className="flex items-start gap-5 text-slate-300 text-lg leading-loose">
                            <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={18} height={18} className="shrink-0 mt-1.5" style={{ filter: "drop-shadow(0 0 2px #2563eb)" }} />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>

                  </div>

                  <div className="mt-20">
                    <Link
                      href="/careers/apply"
                      className="flex items-center justify-center w-full py-6 bg-[#f0b429] hover:bg-[#d9a320] text-[#040d1a] font-black text-lg rounded-2xl transition-colors"
                    >
                      Apply Now for This Position
                    </Link>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-40 bg-gradient-to-b from-[#040d1a] to-[#071428]" />

      {/* Bottom CTA */}
      <section className="py-28 bg-[#071428]">
        <div className="wrap flex flex-col items-center text-center gap-8">
          <h2 className="text-4xl font-black text-white">Ready to Join the Team?</h2>
          <p className="text-slate-400 text-lg max-w-xl leading-relaxed">Submit your application online. All provider levels welcome — EMT through PHMD.</p>
          <div className="flex flex-col gap-4 w-full max-w-sm">
            <Link
              href="/careers/apply"
              className="flex items-center justify-center w-full py-6 bg-[#f0b429] hover:bg-[#d9a320] text-[#040d1a] font-black text-lg rounded-2xl transition-colors"
            >
              Apply Now
            </Link>
            <Link
              href="/contact"
              className="flex items-center justify-center w-full py-6 border-2 border-white/20 hover:border-[#f0b429]/50 hover:text-[#f0b429] text-white font-black text-lg rounded-2xl transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-40 bg-[#040d1a]" />
    </>
  );
}
