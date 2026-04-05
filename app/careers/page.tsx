import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Careers",
  description:
    "Join the Millstadt Ambulance Service team. We are hiring EMTs, Paramedics, Critical Care Paramedics, and advanced prehospital providers.",
};

const positions = [
  {
    title: "EMT — Emergency Medical Technician",
    badge: "BLS",
    badgeColor: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
    description:
      "EMTs are the backbone of our operation. You'll respond to 911 calls across our service area, deliver high-quality basic life support, and work alongside ALS providers on advanced calls.",
    responsibilities: [
      "Respond to 911 calls and provide BLS patient assessment and care",
      "Perform CPR, airway management, hemorrhage control, splinting, and patient packaging",
      "Operate and assist in operating emergency vehicles",
      "Complete accurate patient care reports (PCRs) for every call",
      "Maintain unit readiness — equipment checks, cleaning, and restocking",
      "Communicate with dispatch, hospital staff, and the public",
      "Support ALS providers during advanced calls",
    ],
    requirements: [
      "Current Illinois EMT license in good standing",
      "Current BLS certification",
      "Valid Illinois driver's license with clean driving record",
      "Ability to lift and carry up to 125 lbs with a partner",
      "Good standing within the Southwestern Illinois EMS System or reciprocity required",
    ],
  },
  {
    title: "Paramedic",
    badge: "ALS",
    badgeColor: "text-[#f0b429] border-[#f0b429]/30 bg-[#f0b429]/10",
    description:
      "Paramedics at Millstadt EMS work in a progressive, physician-directed clinical environment under Dr. Leo Hsu. You'll handle 911 responses and interfacility transports with a high degree of clinical autonomy.",
    responsibilities: [
      "Respond to 911 calls and perform ALS assessment and care within scope",
      "Perform interfacility and critical care transports as assigned",
      "Operate and assist in operating emergency vehicles",
      "Complete accurate patient care reports (PCRs) for every call",
      "Maintain unit readiness — equipment checks, cleaning, and restocking",
      "Communicate with dispatch, medical control, hospital staff, and the public",
      "Maintain all required licensure, certifications, and continuing education",
    ],
    requirements: [
      "Current Illinois Paramedic license in good standing",
      "Current BLS, ACLS, and ITLS/PHTLS certifications",
      "Minimum 1 year of ALS field experience preferred",
      "Valid Illinois driver's license with clean driving record",
      "Good standing within the Southwestern Illinois EMS System or reciprocity required",
    ],
  },
  {
    title: "Critical Care Paramedic",
    badge: "CCP",
    badgeColor: "text-[#2563eb] border-[#2563eb]/30 bg-[#2563eb]/10",
    description:
      "CCPs manage complex interfacility transports and high-acuity 911 calls requiring skills beyond the standard ALS scope — ventilator management, vasoactive infusions, and advanced monitoring.",
    responsibilities: [
      "Respond to 911 calls and perform care within critical care paramedic scope",
      "Manage high-acuity interfacility transports including vented and drip-dependent patients",
      "Operate and assist in operating emergency vehicles",
      "Complete accurate patient care reports (PCRs) for every call",
      "Maintain unit readiness — equipment checks, cleaning, and restocking",
      "Communicate with dispatch, medical control, hospital staff, and the public",
      "Maintain all required licensure, certifications, and continuing education",
    ],
    requirements: [
      "Current Illinois Paramedic license in good standing",
      "FP-C or CCP-C certification required",
      "Current BLS, ACLS, PALS, and ITLS/PHTLS certifications",
      "Minimum 3 years of ALS field experience",
      "Demonstrated proficiency with ventilator management and vasoactive infusions",
      "Good standing within the Southwestern Illinois EMS System or reciprocity required",
    ],
  },
  {
    title: "Prehospital Registered Nurse",
    badge: "PHRN",
    badgeColor: "text-purple-400 border-purple-400/30 bg-purple-400/10",
    description:
      "PHRNs bring acute and critical care nursing expertise to the prehospital environment. You'll apply your clinical background to 911 responses and interfacility transports under the direction of Dr. Leo Hsu.",
    responsibilities: [
      "Respond to 911 calls and perform care within PHRN scope of practice",
      "Perform interfacility and critical care transports as assigned",
      "Operate and assist in operating emergency vehicles",
      "Complete accurate patient care reports (PCRs) for every call",
      "Maintain unit readiness — equipment checks, cleaning, and restocking",
      "Communicate with dispatch, medical control, hospital staff, and the public",
      "Maintain all required licensure, certifications, and continuing education",
    ],
    requirements: [
      "Current Illinois RN license in good standing",
      "Current BLS, ACLS, and PALS certifications",
      "Minimum 2 years of critical care, emergency, or flight nursing experience",
      "CFRN, CCRN, CEN, or equivalent specialty certification preferred",
      "Good standing within the Southwestern Illinois EMS System or reciprocity required",
    ],
  },
  {
    title: "Advanced Practice Prehospital RN",
    badge: "APHRN",
    badgeColor: "text-purple-300 border-purple-300/30 bg-purple-300/10",
    description:
      "APHRNs operate at the intersection of advanced practice nursing and prehospital medicine, bringing expanded clinical scope to both emergency calls and interfacility transports.",
    responsibilities: [
      "Respond to 911 calls and perform care within APRN scope of practice",
      "Perform interfacility and critical care transports as assigned",
      "Operate and assist in operating emergency vehicles",
      "Complete accurate patient care reports (PCRs) for every call",
      "Maintain unit readiness — equipment checks, cleaning, and restocking",
      "Communicate with dispatch, medical control, hospital staff, and the public",
      "Maintain all required licensure, certifications, and continuing education",
    ],
    requirements: [
      "Current Illinois APRN license (NP) in good standing",
      "Current BLS, ACLS, and PALS certifications",
      "Emergency or critical care specialty background strongly preferred",
      "DEA license required if prescriptive authority will be utilized",
      "Good standing within the Southwestern Illinois EMS System or reciprocity required",
    ],
  },
  {
    title: "Prehospital Physician Assistant",
    badge: "PHPA",
    badgeColor: "text-sky-400 border-sky-400/30 bg-sky-400/10",
    description:
      "PHPAs extend physician-level clinical decision-making into the field. You'll manage high-acuity patients in collaboration with medical control and contribute to a clinically advanced EMS system.",
    responsibilities: [
      "Respond to 911 calls and perform care within PA scope of practice",
      "Perform interfacility and critical care transports as assigned",
      "Operate and assist in operating emergency vehicles",
      "Complete accurate patient care reports (PCRs) for every call",
      "Maintain unit readiness — equipment checks, cleaning, and restocking",
      "Communicate with dispatch, medical control, hospital staff, and the public",
      "Maintain all required licensure, certifications, and continuing education",
    ],
    requirements: [
      "Current Illinois PA license in good standing",
      "Current BLS, ACLS, and PALS certifications",
      "Emergency medicine or critical care background preferred",
      "DEA license required if prescriptive authority will be utilized",
      "Good standing within the Southwestern Illinois EMS System or reciprocity required",
    ],
  },
  {
    title: "Prehospital Physician",
    badge: "PHMD",
    badgeColor: "text-red-400 border-red-400/30 bg-red-400/10",
    description:
      "PHMDs represent the pinnacle of prehospital clinical care. You'll respond to high-acuity calls and complex transports, working directly alongside our crews and medical director Dr. Leo Hsu.",
    responsibilities: [
      "Respond to 911 calls and perform care within physician scope of practice",
      "Perform interfacility and critical care transports as assigned",
      "Operate and assist in operating emergency vehicles",
      "Complete accurate patient care reports (PCRs) for every call",
      "Maintain unit readiness — equipment checks, cleaning, and restocking",
      "Communicate with dispatch, medical control, hospital staff, and the public",
      "Maintain all required licensure, certifications, and continuing education",
    ],
    requirements: [
      "Current Illinois medical license (MD or DO) in good standing",
      "Board certified or board eligible in Emergency Medicine, Anesthesiology, Surgery, or related specialty preferred",
      "Current ACLS, PALS, and ATLS certifications",
      "Prior EMS or prehospital experience strongly preferred",
      "DEA license required",
      "Good standing within the Southwestern Illinois EMS System or reciprocity required",
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
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-6">
            Careers at<br />Millstadt EMS
          </h1>
          <p className="text-slate-400 text-xl max-w-2xl leading-relaxed">
            We are always looking for dedicated prehospital providers at every level — EMT through PHMD. Millstadt EMS offers a progressive clinical environment with physician medical direction through Dr. Leo Hsu.
          </p>
        </div>
      </section>

      {/* Position Listings */}
      <section className="pb-40 bg-[#040d1a]">
        <div className="wrap">
          <div className="flex items-center gap-3 mb-3">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Open Positions</span>
          </div>
          <h2 className="text-3xl font-black text-white mb-10">Job Descriptions</h2>

          <div className="space-y-3">
            {positions.map((pos) => (
              <details key={pos.title} className="group rounded-xl bg-[#071428] border border-white/8 hover:border-white/15 transition-colors overflow-hidden">
                <summary className="flex items-center gap-4 px-6 py-5 cursor-pointer list-none select-none">
                  <div className="flex-1 flex items-center gap-3 flex-wrap">
                    <span className="text-white font-bold text-base">{pos.title}</span>
                    <span className={`text-[10px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded border ${pos.badgeColor}`}>{pos.badge}</span>
                  </div>
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-slate-600 group-open:rotate-180 transition-transform duration-200 shrink-0" aria-hidden>
                    <path d="M7 10l5 5 5-5z" />
                  </svg>
                </summary>

                <div className="px-6 pb-8 pt-5 border-t border-white/5">
                  <p className="text-slate-300 text-sm leading-relaxed mb-6">{pos.description}</p>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Responsibilities */}
                    <div>
                      <div className="text-[10px] font-black tracking-[0.2em] uppercase text-[#f0b429] mb-3">Responsibilities</div>
                      <ul className="space-y-2">
                        {pos.responsibilities.map((r) => (
                          <li key={r} className="flex items-start gap-2.5 text-slate-300 text-sm leading-snug">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-[#f0b429]/60 shrink-0" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Requirements */}
                    <div>
                      <div className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-500 mb-3">Requirements</div>
                      <ul className="space-y-2">
                        {pos.requirements.map((r) => (
                          <li key={r} className="flex items-start gap-2.5 text-slate-300 text-sm leading-snug">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-500 shrink-0" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 bg-[#071428] border-t border-white/5">
        <div className="wrap flex flex-col items-center text-center gap-6">
          <h2 className="text-3xl font-black text-white">Ready to Apply?</h2>
          <p className="text-slate-400 text-base max-w-md leading-relaxed">Submit your application online. All provider levels welcome — EMT through PHMD.</p>
          <div className="flex flex-col sm:flex-row gap-4 pt-2 w-full max-w-sm">
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

      <div className="h-20 bg-[#040d1a]" />
    </>
  );
}
