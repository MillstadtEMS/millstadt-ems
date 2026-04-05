"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

const inputClass =
  "w-full bg-[#040d1a] border border-white/10 rounded-2xl px-6 py-7 text-white text-base focus:outline-none focus:border-[#f0b429]/50 transition-colors placeholder:text-slate-600";
const labelClass = "block text-slate-400 text-sm font-bold tracking-wide mb-5";
const selectClass =
  "w-full bg-[#040d1a] border border-white/10 rounded-2xl px-6 py-5 text-white text-base focus:outline-none focus:border-[#f0b429]/50 transition-colors appearance-none";

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4 pb-14 border-b border-white/8 mb-20">
      <Image
        src="/images/millstadt-ems/star-of-life.png"
        alt=""
        width={28}
        height={28}
        style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 4px #f0b429)" }}
      />
      <h2 className="text-white font-black text-2xl">{title}</h2>
    </div>
  );
}

function YesNo({ name, label }: { name: string; label: string }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex gap-4">
        <label className="flex items-center gap-3 px-6 py-4 bg-[#040d1a] border border-white/10 rounded-2xl cursor-pointer hover:border-[#f0b429]/30 transition-colors">
          <input type="radio" name={name} value="Yes" className="accent-[#f0b429] w-4 h-4" />
          <span className="text-slate-300 text-sm">Yes</span>
        </label>
        <label className="flex items-center gap-3 px-6 py-4 bg-[#040d1a] border border-white/10 rounded-2xl cursor-pointer hover:border-[#f0b429]/30 transition-colors">
          <input type="radio" name={name} value="No" className="accent-[#f0b429] w-4 h-4" />
          <span className="text-slate-300 text-sm">No</span>
        </label>
      </div>
    </div>
  );
}

type Cert = { name: string; number: string; expiry: string };
type Employer = { agency: string; title: string; from: string; to: string; type: string; supervisor: string; reason: string; duties: string };
type Reference = { name: string; title: string; relationship: string; contact: string };

const defaultCerts: Cert[] = [
  { name: "BLS", number: "", expiry: "" },
  { name: "ACLS", number: "", expiry: "" },
  { name: "PALS", number: "", expiry: "" },
  { name: "ITLS / PHTLS", number: "", expiry: "" },
  { name: "NRP", number: "", expiry: "" },
  { name: "FP-C / CCP-C", number: "", expiry: "" },
  { name: "CPI / De-escalation", number: "", expiry: "" },
  { name: "HazMat Awareness/Ops", number: "", expiry: "" },
  { name: "FEMA / NIMS (100, 200, 700, 800)", number: "", expiry: "" },
];

const defaultEmployer = (): Employer => ({ agency: "", title: "", from: "", to: "", type: "", supervisor: "", reason: "", duties: "" });
const defaultReference = (): Reference => ({ name: "", title: "", relationship: "", contact: "" });

const skills = [
  "911 Response", "Interfacility Transport", "Critical Care Transport",
  "RSI / Advanced Airway", "Ventilator Management", "IV/IO Access",
  "Cardiac Monitoring / 12-Lead Interpretation", "Medication Infusions",
  "Trauma Management", "Pediatric Care", "Geriatric Care",
  "Community Paramedicine", "Telehealth / Consults",
];

const availability = [
  "Day Shifts", "Night Shifts", "Weekends", "Holidays",
  "Overtime", "On-Call", "Part-Time", "Full-Time", "PRN / As Needed",
];

const positions = [
  "EMT (BLS)",
  "Paramedic (ALS)",
  "Critical Care Paramedic",
  "Prehospital Registered Nurse (PHRN)",
  "Advanced Practice Prehospital RN (APHRN)",
  "Prehospital Physician Assistant (PHPA)",
  "Prehospital Medical Doctor (PHMD)",
];

export default function ApplicationForm() {
  const [certs, setCerts] = useState<Cert[]>(defaultCerts);
  const [employers, setEmployers] = useState<Employer[]>([defaultEmployer(), defaultEmployer(), defaultEmployer()]);
  const [references, setReferences] = useState<Reference[]>([defaultReference(), defaultReference(), defaultReference()]);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const formRef = useRef<HTMLFormElement>(null);

  function addCert() {
    setCerts((prev) => [...prev, { name: "", number: "", expiry: "" }]);
  }

  function updateCert(i: number, field: keyof Cert, val: string) {
    setCerts((prev) => prev.map((c, idx) => idx === i ? { ...c, [field]: val } : c));
  }

  function removeCert(i: number) {
    if (i < defaultCerts.length) return; // don't remove default certs
    setCerts((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addEmployer() {
    setEmployers((prev) => [...prev, defaultEmployer()]);
  }

  function updateEmployer(i: number, field: keyof Employer, val: string) {
    setEmployers((prev) => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e));
  }

  function removeEmployer(i: number) {
    if (employers.length <= 1) return;
    setEmployers((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addReference() {
    setReferences((prev) => [...prev, defaultReference()]);
  }

  function updateReference(i: number, field: keyof Reference, val: string) {
    setReferences((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");

    const fd = new FormData(e.currentTarget);

    // Serialize dynamic employers
    const employerText = employers.map((em, i) =>
      `Employer #${i + 1}: ${em.agency} | ${em.title} | ${em.from}–${em.to} | ${em.type} | Supervisor: ${em.supervisor} | Reason: ${em.reason}\nDuties: ${em.duties}`
    ).join("\n\n");
    fd.set("work_history", employerText);

    // Serialize dynamic references
    const refText = references.map((r, i) =>
      `Reference #${i + 1}: ${r.name} | ${r.title} | ${r.relationship} | ${r.contact}`
    ).join("\n");
    fd.set("references", refText);

    // Serialize dynamic certs
    const certText = certs.map((c) =>
      `${c.name}: #${c.number} Exp: ${c.expiry}`
    ).join("\n");
    fd.set("additional_certs", certText);

    try {
      const res = await fetch("/api/apply", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        setStatus("sent");
      } else {
        setErrorMsg(data.error || "Something went wrong. Please try again.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error — could not reach the server. Check your connection and try again.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="wrap max-w-2xl py-40 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center mx-auto mb-8">
          <svg viewBox="0 0 24 24" className="w-10 h-10 fill-current text-emerald-400">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
        </div>
        <h2 className="text-white font-black text-4xl mb-4">Application Submitted</h2>
        <p className="text-slate-400 text-lg leading-relaxed mb-10">
          Your application has been sent to Millstadt EMS leadership. We will review it and be in touch within 5–7 business days.
        </p>
        <Link href="/careers" className="inline-flex items-center justify-center px-8 py-4 bg-[#f0b429] hover:bg-[#d9a320] text-[#040d1a] font-black text-base rounded-2xl transition-colors">
          Back to Careers
        </Link>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} encType="multipart/form-data">

      {/* ── 1. Position Applied For ── */}
      <div className="py-28 bg-[#040d1a]">
        <div className="wrap">
          <SectionHeader title="Position Applied For" />
          <div className="space-y-20">
            <div>
              <label className={labelClass}>Position *</label>
              <div className="grid sm:grid-cols-2 gap-4">
                {positions.map((pos) => (
                  <label key={pos} className="flex items-center gap-4 p-5 bg-[#071428] border border-white/8 rounded-2xl cursor-pointer hover:border-[#f0b429]/30 transition-colors">
                    <input type="radio" name="position" value={pos} required className="accent-[#f0b429] w-4 h-4 shrink-0" />
                    <span className="text-slate-300 text-sm leading-snug">{pos}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>Employment Type — Select all that apply *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {["Full-Time", "Part-Time", "PRN", "Volunteer"].map((t) => (
                  <label key={t} className="flex items-center gap-4 p-5 bg-[#071428] border border-white/8 rounded-2xl cursor-pointer hover:border-[#f0b429]/30 transition-colors">
                    <input type="checkbox" name="employment_type" value={t} className="accent-[#f0b429] w-4 h-4 shrink-0" />
                    <span className="text-slate-300 text-sm">{t}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-10">
              <div>
                <label className={labelClass}>Days Available</label>
                <input type="text" name="days_available" className={inputClass} placeholder="e.g. Mon, Wed, Fri" />
              </div>
              <div>
                <label className={labelClass}>Hours Available</label>
                <input type="text" name="hours_available" className={inputClass} placeholder="e.g. 6a–6p" />
              </div>
              <div>
                <label className={labelClass}>Preferred Shift</label>
                <input type="text" name="preferred_shift" className={inputClass} placeholder="e.g. Days, Nights" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="h-20 bg-gradient-to-b from-[#040d1a] to-[#071428]" />

      {/* ── 2. Personal Information ── */}
      <div className="py-28 bg-[#071428]">
        <div className="wrap">
          <SectionHeader title="Personal Information" />
          <div className="space-y-20">
          <div>
            <div className="text-slate-500 text-xs font-black tracking-widest uppercase mb-6">Legal Name</div>
            <div className="grid sm:grid-cols-3 gap-10">
              <div>
                <label className={labelClass}>First Name *</label>
                <input type="text" name="first_name" required className={inputClass} placeholder="First" />
              </div>
              <div>
                <label className={labelClass}>Last Name *</label>
                <input type="text" name="last_name" required className={inputClass} placeholder="Last" />
              </div>
              <div>
                <label className={labelClass}>Middle Name</label>
                <input type="text" name="middle_name" className={inputClass} placeholder="Middle" />
              </div>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-10">
            <div>
              <label className={labelClass}>Date of Birth *</label>
              <input type="date" name="dob" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Social Security Number *</label>
              <input type="text" name="ssn_last4" required maxLength={11} className={inputClass} placeholder="XXX-XX-XXXX" />
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
          <div className="grid sm:grid-cols-2 gap-10">
            <div>
              <label className={labelClass}>Street Address</label>
              <input type="text" name="address" className={inputClass} placeholder="123 Main St" />
            </div>
            <div>
              <label className={labelClass}>City, State, ZIP</label>
              <input type="text" name="city_state_zip" className={inputClass} placeholder="Millstadt, IL 62260" />
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-10">
            <div>
              <label className={labelClass}>Driver's License State</label>
              <input type="text" name="dl_state" className={inputClass} placeholder="IL" maxLength={2} />
            </div>
            <div>
              <label className={labelClass}>Driver's License Number</label>
              <input type="text" name="dl_number" className={inputClass} placeholder="D12345678" />
            </div>
            <div>
              <label className={labelClass}>DL Expiration Date</label>
              <input type="date" name="dl_expiry" className={inputClass} />
            </div>
          </div>
          </div>
        </div>
      </div>
      <div className="h-20 bg-gradient-to-b from-[#071428] to-[#040d1a]" />

      {/* ── 3. Eligibility & Background ── */}
      <div className="py-28 bg-[#040d1a]">
        <div className="wrap">
          <SectionHeader title="Eligibility & Background" />
          <div className="space-y-20">
            <div className="grid sm:grid-cols-2 gap-10">
              <YesNo name="authorized_us" label="Are you legally authorized to work in the U.S.? *" />
              <YesNo name="felony" label="Have you ever been convicted of a felony?" />
              <YesNo name="excluded_medicare" label="Have you ever been excluded from Medicare/Medicaid?" />
              <YesNo name="license_suspended" label="Have you ever had a professional license suspended or revoked?" />
            </div>
            <div>
              <label className={labelClass}>If yes to any above, please explain</label>
              <textarea name="background_explain" rows={3} className={`${inputClass} resize-none`} placeholder="Provide details..." />
            </div>
            <div>
              <label className={labelClass}>I consent to the following checks</label>
              <div className="grid sm:grid-cols-3 gap-4">
                {["Background Check", "Drug Screening", "Driving Record Check"].map((c) => (
                  <label key={c} className="flex items-center gap-4 p-5 bg-[#071428] border border-white/8 rounded-2xl cursor-pointer hover:border-[#f0b429]/30 transition-colors">
                    <input type="checkbox" name="consents" value={c} className="accent-[#f0b429] w-4 h-4 shrink-0" />
                    <span className="text-slate-300 text-sm">{c}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="h-20 bg-gradient-to-b from-[#040d1a] to-[#071428]" />

      {/* ── 4. Education ── */}
      <div className="py-28 bg-[#071428]">
        <div className="wrap">
          <SectionHeader title="Education" />
          <div className="space-y-20">
            <div>
              <div className="text-slate-500 text-xs font-black tracking-widest uppercase mb-6">High School</div>
              <div className="grid sm:grid-cols-2 gap-10">
                <div>
                  <label className={labelClass}>School Name</label>
                  <input type="text" name="hs_name" className={inputClass} placeholder="High School Name" />
                </div>
                <div>
                  <label className={labelClass}>Graduation Year</label>
                  <input type="text" name="hs_grad" className={inputClass} placeholder="YYYY" maxLength={4} />
                </div>
              </div>
            </div>
            <div>
              <div className="text-slate-500 text-xs font-black tracking-widest uppercase mb-6">College / University</div>
              <div className="grid sm:grid-cols-2 gap-10">
                <div>
                  <label className={labelClass}>Institution</label>
                  <input type="text" name="college_name" className={inputClass} placeholder="University Name" />
                </div>
                <div>
                  <label className={labelClass}>Degree</label>
                  <input type="text" name="college_degree" className={inputClass} placeholder="e.g. B.S., A.A.S." />
                </div>
                <div>
                  <label className={labelClass}>Field of Study</label>
                  <input type="text" name="college_field" className={inputClass} placeholder="e.g. Paramedicine" />
                </div>
                <div>
                  <label className={labelClass}>Graduation Year</label>
                  <input type="text" name="college_grad" className={inputClass} placeholder="YYYY" maxLength={4} />
                </div>
              </div>
            </div>
            <div>
              <div className="text-slate-500 text-xs font-black tracking-widest uppercase mb-6">EMS / Medical Training Program</div>
              <div className="grid sm:grid-cols-3 gap-10">
                <div>
                  <label className={labelClass}>Program Name</label>
                  <input type="text" name="ems_program" className={inputClass} placeholder="e.g. SIUE Paramedic" />
                </div>
                <div>
                  <label className={labelClass}>Certification Earned</label>
                  <input type="text" name="ems_cert" className={inputClass} placeholder="e.g. Paramedic" />
                </div>
                <div>
                  <label className={labelClass}>Completion Date</label>
                  <input type="date" name="ems_complete" className={inputClass} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="h-20 bg-gradient-to-b from-[#071428] to-[#040d1a]" />

      {/* ── 5. Licensure & Certifications ── */}
      <div className="py-28 bg-[#040d1a]">
        <div className="wrap">
          <SectionHeader title="Licensure & Certifications" />
          <div className="flex flex-col gap-6">

            {/* ── Primary License ── */}
            <div className="p-10 bg-[#071428] rounded-2xl border border-white/8">
              <div className="flex items-center gap-3 mb-8">
                <span className="h-px w-6 bg-[#f0b429]" />
                <span className="text-[#f0b429] text-xs font-black tracking-[0.2em] uppercase">Primary License</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <div>
                  <label className={labelClass}>License Type</label>
                  <input type="text" name="primary_license_type" className={inputClass} placeholder="EMT / Paramedic / RN / PA / MD" />
                </div>
                <div>
                  <label className={labelClass}>Issuing State</label>
                  <input type="text" name="primary_license_state" className={inputClass} placeholder="IL" maxLength={2} />
                </div>
                <div>
                  <label className={labelClass}>License Number</label>
                  <input type="text" name="primary_license_number" className={inputClass} placeholder="IL-P-12345" />
                </div>
                <div>
                  <label className={labelClass}>Expiration Date</label>
                  <input type="date" name="primary_license_expiry" className={inputClass} />
                </div>
              </div>
            </div>

            {/* ── Additional License ── */}
            <div className="p-10 bg-[#071428] rounded-2xl border border-white/8">
              <div className="flex items-center gap-3 mb-8">
                <span className="h-px w-6 bg-[#f0b429]" />
                <span className="text-[#f0b429] text-xs font-black tracking-[0.2em] uppercase">Additional License <span className="text-slate-500 normal-case tracking-normal font-normal">(if applicable)</span></span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <div>
                  <label className={labelClass}>License Type</label>
                  <input type="text" name="add_license_type" className={inputClass} placeholder="e.g. NREMT" />
                </div>
                <div>
                  <label className={labelClass}>Issuing State</label>
                  <input type="text" name="add_license_state" className={inputClass} placeholder="IL" maxLength={2} />
                </div>
                <div>
                  <label className={labelClass}>License Number</label>
                  <input type="text" name="add_license_number" className={inputClass} placeholder="" />
                </div>
                <div>
                  <label className={labelClass}>Expiration Date</label>
                  <input type="date" name="add_license_expiry" className={inputClass} />
                </div>
              </div>
            </div>

            {/* ── NREMT ── */}
            <div className="p-10 bg-[#071428] rounded-2xl border border-white/8">
              <div className="flex items-center gap-3 mb-8">
                <span className="h-px w-6 bg-[#f0b429]" />
                <span className="text-[#f0b429] text-xs font-black tracking-[0.2em] uppercase">NREMT <span className="text-slate-500 normal-case tracking-normal font-normal">(if applicable)</span></span>
              </div>
              <div className="grid sm:grid-cols-3 gap-8">
                <div>
                  <label className={labelClass}>Level</label>
                  <input type="text" name="nremt_level" className={inputClass} placeholder="e.g. NRP, NREMT" />
                </div>
                <div>
                  <label className={labelClass}>Registry Number</label>
                  <input type="text" name="nremt_number" className={inputClass} placeholder="" />
                </div>
                <div>
                  <label className={labelClass}>Expiration Date</label>
                  <input type="date" name="nremt_expiry" className={inputClass} />
                </div>
              </div>
            </div>

            {/* ── DEA ── */}
            <div className="p-10 bg-[#071428] rounded-2xl border border-white/8">
              <div className="flex items-center gap-3 mb-2">
                <span className="h-px w-6 bg-[#f0b429]" />
                <span className="text-[#f0b429] text-xs font-black tracking-[0.2em] uppercase">DEA Registration</span>
              </div>
              <p className="text-slate-500 text-xs mb-8 ml-9">PA / APRN / MD only</p>
              <div className="grid sm:grid-cols-2 gap-8">
                <div>
                  <label className={labelClass}>Registration Number</label>
                  <input type="text" name="dea_number" className={inputClass} placeholder="AB1234567" />
                </div>
                <div>
                  <label className={labelClass}>Expiration Date</label>
                  <input type="date" name="dea_expiry" className={inputClass} />
                </div>
              </div>
            </div>

            {/* ── Certifications ── */}
            <div className="p-10 bg-[#071428] rounded-2xl border border-white/8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <span className="h-px w-6 bg-[#f0b429]" />
                  <span className="text-[#f0b429] text-xs font-black tracking-[0.2em] uppercase">Certifications</span>
                </div>
                <button type="button" onClick={addCert} className="flex items-center gap-2 text-[#f0b429] text-xs font-black tracking-wider hover:text-[#d9a320] transition-colors">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
                  ADD
                </button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-4 px-4 pb-2 border-b border-white/8">
                  <div className="col-span-5 text-slate-500 text-[10px] font-black uppercase tracking-widest">Name</div>
                  <div className="col-span-3 text-slate-500 text-[10px] font-black uppercase tracking-widest">Card #</div>
                  <div className="col-span-3 text-slate-500 text-[10px] font-black uppercase tracking-widest">Expires</div>
                </div>
                {certs.map((cert, i) => (
                  <div key={i} className="grid grid-cols-12 gap-4 items-center py-3 px-4 border-b border-white/5">
                    <div className="col-span-5">
                      {i < defaultCerts.length ? (
                        <span className="text-slate-200 text-sm font-semibold">{cert.name}</span>
                      ) : (
                        <input type="text" value={cert.name} onChange={(e) => updateCert(i, "name", e.target.value)} className={`${inputClass} py-2.5 text-sm`} placeholder="Certification name" />
                      )}
                    </div>
                    <div className="col-span-3">
                      <input type="text" value={cert.number} onChange={(e) => updateCert(i, "number", e.target.value)} className={`${inputClass} py-2.5 text-sm`} placeholder="———" />
                    </div>
                    <div className="col-span-3">
                      <input type="date" value={cert.expiry} onChange={(e) => updateCert(i, "expiry", e.target.value)} className={`${inputClass} py-2.5 text-sm`} />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      {i >= defaultCerts.length && (
                        <button type="button" onClick={() => removeCert(i)} className="text-slate-600 hover:text-red-400 transition-colors">
                          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
      <div className="h-20 bg-gradient-to-b from-[#040d1a] to-[#071428]" />

      {/* ── 6. Work History ── */}
      <div className="py-28 bg-[#071428]">
        <div className="wrap">
          <SectionHeader title="Work History" />
          <p className="text-slate-500 text-sm mb-12">List all relevant EMS/medical employment — most recent first.</p>
        <div className="space-y-20">
          {employers.map((em, i) => (
            <div key={i} className="p-14 bg-[#040d1a] border border-white/8 rounded-2xl">
              <div className="flex items-center justify-between mb-10">
                <span className="text-white font-bold text-base">Employer #{i + 1}</span>
                {employers.length > 1 && (
                  <button type="button" onClick={() => removeEmployer(i)} className="text-slate-600 hover:text-red-400 text-xs font-bold tracking-wider transition-colors">Remove</button>
                )}
              </div>
              <div className="space-y-10">
                <div className="grid sm:grid-cols-2 gap-10">
                  <div>
                    <label className={labelClass}>Agency Name</label>
                    <input type="text" value={em.agency} onChange={(e) => updateEmployer(i, "agency", e.target.value)} className={inputClass} placeholder="Agency / Organization" />
                  </div>
                  <div>
                    <label className={labelClass}>Position Title</label>
                    <input type="text" value={em.title} onChange={(e) => updateEmployer(i, "title", e.target.value)} className={inputClass} placeholder="e.g. Paramedic" />
                  </div>
                  <div>
                    <label className={labelClass}>From</label>
                    <input type="month" value={em.from} onChange={(e) => updateEmployer(i, "from", e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>To</label>
                    <input type="month" value={em.to} onChange={(e) => updateEmployer(i, "to", e.target.value)} className={inputClass} placeholder="Present" />
                  </div>
                  <div>
                    <label className={labelClass}>Full-Time / Part-Time / PRN</label>
                    <input type="text" value={em.type} onChange={(e) => updateEmployer(i, "type", e.target.value)} className={inputClass} placeholder="e.g. Full-Time" />
                  </div>
                  <div>
                    <label className={labelClass}>Supervisor Name & Contact</label>
                    <input type="text" value={em.supervisor} onChange={(e) => updateEmployer(i, "supervisor", e.target.value)} className={inputClass} placeholder="Name — phone or email" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Reason for Leaving</label>
                  <input type="text" value={em.reason} onChange={(e) => updateEmployer(i, "reason", e.target.value)} className={inputClass} placeholder="Reason for leaving" />
                </div>
                <div>
                  <label className={labelClass}>Job Duties</label>
                  <textarea value={em.duties} onChange={(e) => updateEmployer(i, "duties", e.target.value)} rows={3} className={`${inputClass} resize-none`} placeholder="Describe your primary duties..." />
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={addEmployer} className="flex items-center gap-2 text-[#f0b429] text-sm font-black tracking-wider hover:text-[#d9a320] transition-colors">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
            ADD ANOTHER EMPLOYER
          </button>
        </div>
        </div>
      </div>
      <div className="h-20 bg-gradient-to-b from-[#071428] to-[#040d1a]" />

      {/* ── 7. EMS Experience & Skills ── */}
      <div className="py-28 bg-[#040d1a]">
        <div className="wrap">
          <SectionHeader title="EMS Experience & Skills" />
          <div className="space-y-20">
            <div className="grid sm:grid-cols-3 gap-10">
              <div>
                <label className={labelClass}>Years of EMS Experience</label>
                <input type="number" name="years_ems" min="0" className={inputClass} placeholder="0" />
              </div>
              <div>
                <label className={labelClass}>Years of ALS Experience</label>
                <input type="number" name="years_als" min="0" className={inputClass} placeholder="0" />
              </div>
              <div>
                <label className={labelClass}>Years of Critical Care Experience</label>
                <input type="number" name="years_cc" min="0" className={inputClass} placeholder="0" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Skills Checklist</label>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {skills.map((s) => (
                  <label key={s} className="flex items-center gap-4 p-5 bg-[#071428] border border-white/8 rounded-2xl cursor-pointer hover:border-[#f0b429]/30 transition-colors">
                    <input type="checkbox" name="skills" value={s} className="accent-[#f0b429] w-4 h-4 shrink-0" />
                    <span className="text-slate-300 text-sm">{s}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="h-20 bg-gradient-to-b from-[#040d1a] to-[#071428]" />

      {/* ── 8. Driving History ── */}
      <div className="py-28 bg-[#071428]">
        <div className="wrap">
          <SectionHeader title="Driving History" />
          <div className="space-y-20">
            <div className="grid sm:grid-cols-2 gap-10">
              <YesNo name="valid_dl" label="Valid Driver's License?" />
              <YesNo name="cdl" label="CDL (if applicable)?" />
              <YesNo name="accidents" label="Accidents in the past 5 years?" />
              <YesNo name="violations" label="Traffic violations in the past 5 years?" />
              <YesNo name="dl_suspension" label="License suspension in the past 5 years?" />
            </div>
            <div>
              <label className={labelClass}>If yes to any above, please explain</label>
              <textarea name="driving_explain" rows={3} className={`${inputClass} resize-none`} placeholder="Provide details..." />
            </div>
          </div>
        </div>
      </div>
      <div className="h-20 bg-gradient-to-b from-[#071428] to-[#040d1a]" />

      {/* ── 9. I Am Willing To Work ── */}
      <div className="py-28 bg-[#040d1a]">
        <div className="wrap">
          <SectionHeader title="I Am Willing To Work" />
          <div className="grid sm:grid-cols-3 gap-4">
            {availability.map((item) => (
              <label key={item} className="flex items-center gap-4 p-5 bg-[#071428] border border-white/8 rounded-2xl cursor-pointer hover:border-[#f0b429]/30 transition-colors">
                <input type="checkbox" name="availability" value={item} className="accent-[#f0b429] w-5 h-5 shrink-0" />
                <span className="text-slate-300 text-base">{item}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="h-20 bg-gradient-to-b from-[#040d1a] to-[#071428]" />

      {/* ── 10. Professional References ── */}
      <div className="py-28 bg-[#071428]">
        <div className="wrap">
          <SectionHeader title="Professional References" />
          <p className="text-slate-500 text-sm mb-12">Minimum of 3 references required.</p>
          <div className="space-y-20">
            {references.map((r, i) => (
              <div key={i} className="p-14 bg-[#040d1a] border border-white/8 rounded-2xl">
                <div className="flex items-center justify-between mb-10">
                  <span className="text-white font-bold text-base">Reference #{i + 1}</span>
                  {references.length > 3 && (
                    <button type="button" onClick={() => setReferences((p) => p.filter((_, idx) => idx !== i))} className="text-slate-600 hover:text-red-400 text-xs font-bold transition-colors">Remove</button>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 gap-10">
                  <div>
                    <label className={labelClass}>Name</label>
                    <input type="text" value={r.name} onChange={(e) => updateReference(i, "name", e.target.value)} className={inputClass} placeholder="Full name" />
                  </div>
                  <div>
                    <label className={labelClass}>Title</label>
                    <input type="text" value={r.title} onChange={(e) => updateReference(i, "title", e.target.value)} className={inputClass} placeholder="e.g. EMS Director" />
                  </div>
                  <div>
                    <label className={labelClass}>Relationship to You</label>
                    <input type="text" value={r.relationship} onChange={(e) => updateReference(i, "relationship", e.target.value)} className={inputClass} placeholder="e.g. Former Supervisor" />
                  </div>
                  <div>
                    <label className={labelClass}>Phone / Email</label>
                    <input type="text" value={r.contact} onChange={(e) => updateReference(i, "contact", e.target.value)} className={inputClass} placeholder="Phone or email" />
                  </div>
                </div>
              </div>
            ))}
            <button type="button" onClick={addReference} className="flex items-center gap-2 text-[#f0b429] text-sm font-black tracking-wider hover:text-[#d9a320] transition-colors">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
              ADD ANOTHER REFERENCE
            </button>
          </div>
        </div>
      </div>
      <div className="h-20 bg-gradient-to-b from-[#071428] to-[#040d1a]" />

      {/* ── 11. Additional Information ── */}
      <div className="py-28 bg-[#040d1a]">
        <div className="wrap">
          <SectionHeader title="Additional Information" />
          <div className="space-y-20">
            <div>
              <label className={labelClass}>Why do you want to work for Millstadt Ambulance Service?</label>
              <textarea name="why_millstadt" rows={5} className={`${inputClass} resize-none`} placeholder="Tell us about yourself and why you want to join our team..." />
            </div>
            <div>
              <label className={labelClass}>Describe a high-acuity patient you managed</label>
              <textarea name="high_acuity" rows={5} className={`${inputClass} resize-none`} placeholder="Describe the call, your assessment, and the interventions you performed..." />
            </div>
            <div>
              <label className={labelClass}>Describe a time you worked effectively as part of a team</label>
              <textarea name="teamwork" rows={5} className={`${inputClass} resize-none`} placeholder="Describe the situation and your role on the team..." />
            </div>
          </div>
        </div>
      </div>
      <div className="h-20 bg-gradient-to-b from-[#040d1a] to-[#071428]" />

      {/* ── 12. Attachments ── */}
      <div className="py-28 bg-[#071428]">
        <div className="wrap">
          <SectionHeader title="Attachments" />
          <p className="text-slate-500 text-sm mb-12">Upload copies of your licenses, certifications, and supporting documents. Multiple files accepted. All documents will be attached to your application email.</p>
          <div className="space-y-5">
            {[
              { name: "file_resume", label: "Resume / CV" },
              { name: "file_cover", label: "Cover Letter" },
              { name: "file_dl", label: "Driver's License Copy" },
              { name: "file_license", label: "Professional License(s)" },
              { name: "file_certs", label: "Certification Cards" },
              { name: "file_immunizations", label: "Immunization Records" },
              { name: "file_other", label: "Additional Documents" },
            ].map((f) => (
              <div key={f.name} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-6 bg-[#040d1a] border border-white/8 rounded-2xl">
                <span className="text-slate-300 text-sm font-bold w-52 shrink-0">{f.label}</span>
                <input
                  type="file"
                  name={f.name}
                  multiple
                  className="text-slate-400 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-[#f0b429]/10 file:text-[#f0b429] file:font-bold file:text-xs file:tracking-wider hover:file:bg-[#f0b429]/20 file:transition-colors cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="h-20 bg-gradient-to-b from-[#071428] to-[#040d1a]" />

      {/* ── 13. Applicant Certification ── */}
      <div className="py-28 bg-[#040d1a]">
        <div className="wrap">
          <SectionHeader title="Applicant Certification" />
          <p className="text-slate-300 text-base leading-relaxed mb-14">
            I certify that all information provided in this application is true and complete to the best of my knowledge. I understand that falsification or omission of information may result in disqualification from consideration or termination of employment.
          </p>
          <label className="flex items-start gap-5 cursor-pointer">
            <input type="checkbox" name="certified" required className="accent-[#f0b429] w-5 h-5 shrink-0 mt-1" />
            <span className="text-slate-300 text-base leading-relaxed">
              I certify the above and agree that all information is true and complete. I consent to the background, drug, and driving record checks I selected above.
            </span>
          </label>
        </div>
      </div>
      <div className="h-20 bg-gradient-to-b from-[#040d1a] to-[#071428]" />

      {/* Submit */}
      <div className="py-28 bg-[#071428]">
        <div className="wrap">
          <div className="flex flex-col gap-4 max-w-sm">
            <button
              type="submit"
              disabled={status === "sending"}
              className="flex items-center justify-center w-full py-6 bg-[#f0b429] hover:bg-[#d9a320] text-[#040d1a] font-black text-lg rounded-2xl transition-colors disabled:opacity-60"
            >
              {status === "sending" ? "Submitting…" : "Submit Application"}
            </button>
            <Link href="/careers" className="flex items-center justify-center w-full py-6 border-2 border-white/20 hover:border-[#f0b429]/50 hover:text-[#f0b429] text-white font-black text-lg rounded-2xl transition-colors">
              Back to Careers
            </Link>
          </div>
          {status === "error" && (
            <div className="mt-8 p-8 bg-red-900/20 border border-red-500/30 rounded-2xl">
              <div className="flex items-start gap-4">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-red-400 shrink-0 mt-0.5"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                <div>
                  <div className="text-red-300 font-bold text-base mb-2">Submission Failed</div>
                  <p className="text-red-200/80 text-sm leading-relaxed">{errorMsg}</p>
                  <p className="text-slate-500 text-xs mt-3">You can also email your application directly to <span className="text-[#f0b429]">millstadtems@gmail.com</span></p>
                </div>
              </div>
            </div>
          )}
          <p className="text-slate-600 text-sm mt-6">
            Applications are sent to millstadtems@gmail.com and reviewed by Millstadt EMS leadership.
          </p>
        </div>
      </div>

    </form>
  );
}
