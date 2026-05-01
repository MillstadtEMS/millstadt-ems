"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

const inputClass =
  "w-full bg-[#040d1a] border border-white/20 rounded-lg px-4 py-3 text-white text-base sm:text-sm focus:outline-none focus:border-[#f0b429]/70 transition-colors placeholder:text-slate-600";
const labelClass = "block text-slate-200 text-xs font-black uppercase tracking-[0.1em] sm:tracking-[0.14em] mb-2 sm:mb-3";
const selectClass =
  "w-full bg-[#040d1a] border border-white/20 rounded-lg px-4 py-3 text-white text-base sm:text-sm focus:outline-none focus:border-[#f0b429]/70 transition-colors appearance-none";

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 pb-5 border-b border-[#f0b429]/30 mb-10">
      <span className="h-px w-6 bg-[#f0b429]" />
      <h2 className="text-white font-black text-lg uppercase tracking-[0.18em]">{title}</h2>
    </div>
  );
}

function Section({
  num, title, openSection, setOpenSection, children,
}: {
  num: number;
  title: string;
  openSection: number;
  setOpenSection: (n: number) => void;
  children: React.ReactNode;
}) {
  const isOpen = openSection === num;
  return (
    <div className="border-b-[4px] sm:border-b-[8px] border-[#f0b429]/30 bg-[#040d1a]">
      <button
        type="button"
        onClick={() => setOpenSection(isOpen ? 0 : num)}
        className={`group w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 sm:py-5 text-left transition-colors ${
          isOpen ? "bg-[#071428]" : "hover:bg-[#071428]/50"
        }`}
      >
        <span className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full font-black text-xs sm:text-sm border-2 transition-colors ${
          isOpen
            ? "bg-[#f0b429] border-[#f0b429] text-[#040d1a]"
            : "bg-transparent border-white/20 text-slate-400 group-hover:border-[#f0b429]/40 group-hover:text-[#f0b429]"
        }`}>{num}</span>
        <h2 className={`flex-1 font-black text-sm sm:text-lg uppercase tracking-[0.08em] sm:tracking-[0.16em] transition-colors ${
          isOpen ? "text-[#f0b429]" : "text-white group-hover:text-[#f0b429]"
        }`}>{title}</h2>
        <svg viewBox="0 0 24 24" className={`w-5 h-5 sm:w-6 sm:h-6 fill-current transition-transform shrink-0 ${
          isOpen ? "rotate-180 text-[#f0b429]" : "text-slate-500"
        }`}>
          <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
        </svg>
      </button>
      {/* Keep ALL sections mounted (just hidden when closed) so form values
          and file uploads aren't lost when navigating between sections. */}
      <div className={`px-4 sm:px-8 lg:px-16 pb-8 sm:pb-10 pt-2 ${isOpen ? "" : "hidden"}`}>
        {children}
      </div>
    </div>
  );
}

/**
 * Sub-section block within an accordion section.
 * Renders content with consistent padding and a thick blue separator band
 * between siblings (no band before the first or after the last).
 */
function SubBlock({
  title, action, children,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="py-6 sm:py-10 border-t-[10px] sm:border-t-[12px] border-[#f0b429]/40 first:border-t-0 first:pt-2 last:pb-2">
      {(title || action) && (
        <div className="flex items-center justify-between mb-6">
          {title && (
            <h3 className="text-[#f0b429] text-xs sm:text-sm font-black tracking-[0.12em] sm:tracking-[0.2em] uppercase">{title}</h3>
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function YesNo({ name, label }: { name: string; label: string }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 px-4 py-2 bg-[#040d1a] border border-white/15 rounded-lg cursor-pointer hover:border-[#f0b429]/40 transition-colors">
          <input type="radio" name={name} value="Yes" className="accent-[#f0b429] w-4 h-4" />
          <span className="text-slate-300 text-sm">Yes</span>
        </label>
        <label className="flex items-center gap-2 px-4 py-2 bg-[#040d1a] border border-white/15 rounded-lg cursor-pointer hover:border-[#f0b429]/40 transition-colors">
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
type College = { name: string; degree: string; gradYear: string; honors: string; gpa: string };

const defaultCerts: Cert[] = [
  { name: "BLS", number: "", expiry: "" },
  { name: "ACLS", number: "", expiry: "" },
  { name: "PALS", number: "", expiry: "" },
  { name: "ITLS / PHTLS", number: "", expiry: "" },
  { name: "NRP", number: "", expiry: "" },
  { name: "FP-C / CCP-C", number: "", expiry: "" },
  { name: "CPI / De-escalation", number: "", expiry: "" },
  { name: "HazMat Awareness/Ops", number: "", expiry: "" },
  { name: "FEMA NIMS IS-100", number: "", expiry: "" },
  { name: "FEMA NIMS IS-200", number: "", expiry: "" },
  { name: "FEMA NIMS IS-700", number: "", expiry: "" },
  { name: "FEMA NIMS IS-800", number: "", expiry: "" },
];

const defaultEmployer = (): Employer => ({ agency: "", title: "", from: "", to: "", type: "", supervisor: "", reason: "", duties: "" });
const defaultReference = (): Reference => ({ name: "", title: "", relationship: "", contact: "" });
const defaultCollege = (): College => ({ name: "", degree: "", gradYear: "", honors: "", gpa: "" });

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
  const [colleges, setColleges] = useState<College[]>([defaultCollege()]);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [openSection, setOpenSection] = useState(1);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const formRef = useRef<HTMLFormElement>(null);

  // Capture every field value as the user types, in a ref that survives section
  // navigation. On submit, we merge this into FormData so values are guaranteed
  // to be sent even if React unmount/mount cycles wipe DOM input values.
  const fieldValues = useRef<Record<string, string | string[]>>({});
  const fileFields = useRef<Record<string, File[]>>({});

  function captureFieldChange(e: React.ChangeEvent<HTMLFormElement>) {
    const target = e.target as unknown as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const name = target.name;
    if (!name) return;
    const t = (target as HTMLInputElement).type;

    if (t === "checkbox") {
      const cb = target as HTMLInputElement;
      const existing = fieldValues.current[name];
      const list = Array.isArray(existing) ? [...existing] : (existing ? [existing] : []);
      if (cb.checked) {
        if (!list.includes(cb.value)) list.push(cb.value);
      } else {
        const idx = list.indexOf(cb.value);
        if (idx >= 0) list.splice(idx, 1);
      }
      fieldValues.current[name] = list;
    } else if (t === "radio") {
      const r = target as HTMLInputElement;
      if (r.checked) fieldValues.current[name] = r.value;
    } else if (t === "file") {
      const fi = target as HTMLInputElement;
      fileFields.current[name] = fi.files ? Array.from(fi.files) : [];
    } else {
      fieldValues.current[name] = target.value;
    }
  }

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

  function addCollege() {
    setColleges((prev) => [...prev, defaultCollege()]);
  }
  function updateCollege(i: number, field: keyof College, val: string) {
    setColleges((prev) => prev.map((c, idx) => idx === i ? { ...c, [field]: val } : c));
  }
  function removeCollege(i: number) {
    if (colleges.length <= 1) return;
    setColleges((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    // Build FormData primarily from our captured ref so values survive any
    // mount/unmount cycles, then merge with any DOM values for safety.
    const fd = new FormData();

    // 1. Add all captured field values
    for (const [name, val] of Object.entries(fieldValues.current)) {
      if (Array.isArray(val)) {
        for (const v of val) fd.append(name, v);
      } else {
        fd.set(name, val);
      }
    }

    // 2. Also pull any current DOM values that weren't captured (initial state)
    const domFd = new FormData(e.currentTarget);
    for (const [name, val] of domFd.entries()) {
      if (val instanceof File) continue; // files handled separately
      if (!fd.has(name)) fd.append(name, val);
    }

    // 3. Add files from our ref (file inputs unmount on section close, so we
    //    capture them into a ref and re-attach here).
    for (const [name, files] of Object.entries(fileFields.current)) {
      for (const f of files) fd.append(name, f);
    }

    // Pre-flight: check total file size before sending
    let totalBytes = 0;
    const oversizedFiles: string[] = [];
    for (const [, value] of fd.entries()) {
      if (value instanceof File && value.size > 0) {
        totalBytes += value.size;
        if (value.size > 4 * 1024 * 1024) oversizedFiles.push(`${value.name} (${(value.size / 1024 / 1024).toFixed(1)}MB)`);
      }
    }

    const MAX = 4 * 1024 * 1024;
    if (totalBytes > MAX) {
      setErrorMsg(
        `Your attachments total ${(totalBytes / 1024 / 1024).toFixed(1)}MB — that exceeds the 4MB upload limit.${
          oversizedFiles.length > 0 ? ` Large files: ${oversizedFiles.join(", ")}.` : ""
        } Please reduce file sizes (PDF compression or smaller images), or submit your application without attachments and email them separately to millstadtems@gmail.com.`
      );
      setStatus("error");
      return;
    }

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

    // Serialize dynamic colleges
    const collegeText = colleges.map((c, i) =>
      `College #${i + 1}: ${c.name} | Degree: ${c.degree} | Grad: ${c.gradYear} | Honors: ${c.honors} | GPA: ${c.gpa}`
    ).join("\n");
    fd.set("college_education", collegeText);

    try {
      const res = await fetch("/api/apply", { method: "POST", body: fd });

      // If the server returned a non-JSON response (e.g. Vercel error page), handle gracefully
      let data: { success?: boolean; error?: string; warning?: string } | null = null;
      try { data = await res.json(); } catch { data = null; }

      if (res.ok && data?.success) {
        if (data.warning) setErrorMsg(data.warning);
        setStatus("sent");
        return;
      }
      if (res.status === 413) {
        setErrorMsg("Your files are too large to upload. Please compress them (under 4MB total) or email millstadtems@gmail.com directly with your application.");
        setStatus("error");
        return;
      }
      if (res.status === 504 || res.status === 408) {
        setErrorMsg("The server timed out processing your application. This usually means files are too large. Try reducing attachment sizes, or email millstadtems@gmail.com.");
        setStatus("error");
        return;
      }
      setErrorMsg(data?.error || `Submission failed (${res.status}). Please try again or email millstadtems@gmail.com directly.`);
      setStatus("error");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(
        `Network error — could not reach the server. This may be caused by large attachments timing out. ` +
        `Try reducing your attachment sizes or email your application to millstadtems@gmail.com directly. (${msg})`
      );
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="wrap max-w-2xl py-20 text-center">
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
    <form ref={formRef} onSubmit={handleSubmit} onChange={captureFieldChange} encType="multipart/form-data">
      <Section num={1} title="Position Applied For" openSection={openSection} setOpenSection={setOpenSection}>
        <SubBlock title="Position">
          <div className="grid sm:grid-cols-2 gap-4">
            {positions.map((pos) => (
              <label key={pos} className="flex items-center gap-4 p-3 bg-[#071428] border border-white/10 rounded-lg cursor-pointer hover:border-[#f0b429]/30 transition-colors">
                <input type="radio" name="position" value={pos} required className="accent-[#f0b429] w-4 h-4 shrink-0" />
                <span className="text-slate-300 text-sm leading-snug">{pos}</span>
              </label>
            ))}
          </div>
        </SubBlock>

        <SubBlock title="Employment Type">
          <p className="text-slate-500 text-xs mb-4 -mt-2">Select all that apply</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {["Full-Time", "Part-Time", "PRN", "Volunteer"].map((t) => (
              <label key={t} className="flex items-center gap-4 p-3 bg-[#071428] border border-white/10 rounded-lg cursor-pointer hover:border-[#f0b429]/30 transition-colors">
                <input type="checkbox" name="employment_type" value={t} className="accent-[#f0b429] w-4 h-4 shrink-0" />
                <span className="text-slate-300 text-sm">{t}</span>
              </label>
            ))}
          </div>
        </SubBlock>

        <SubBlock title="Days Available">
          <p className="text-slate-500 text-xs mb-4 -mt-2">Select all that apply</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d) => (
              <label key={d} className="flex items-center gap-2 px-3 py-2 bg-[#040d1a] border border-white/15 rounded-lg cursor-pointer hover:border-[#f0b429]/40 transition-colors">
                <input type="checkbox" name="days_available" value={d} className="accent-[#f0b429] w-4 h-4 shrink-0" />
                <span className="text-slate-300 text-sm">{d.slice(0, 3)}</span>
              </label>
            ))}
          </div>
        </SubBlock>

        <SubBlock title="Hours Available">
          <p className="text-slate-500 text-xs mb-4 -mt-2">Select all that apply</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              "Days (911) 0600 – 1800",
              "Nights (911) 1800 – 0600",
              "24-Hour (911) 0600 – 0600",
              "Transfer Truck (variable hours)",
              "Standby / Event Coverage",
              "On-Call",
              "Any / All shifts",
            ].map((h) => (
              <label key={h} className="flex items-center gap-3 px-4 py-3 bg-[#040d1a] border border-white/15 rounded-lg cursor-pointer hover:border-[#f0b429]/40 transition-colors">
                <input type="checkbox" name="hours_available" value={h} className="accent-[#f0b429] w-4 h-4 shrink-0" />
                <span className="text-slate-300 text-sm leading-snug">{h}</span>
              </label>
            ))}
          </div>
        </SubBlock>

        <SubBlock title="Preferred Shift / Notes">
          <input type="text" name="preferred_shift" className={inputClass} placeholder="Anything else about your preferred schedule" />
        </SubBlock>
      </Section>
      <Section num={2} title="Personal Information" openSection={openSection} setOpenSection={setOpenSection}>
        <SubBlock title="Legal Name">
          <div className="grid sm:grid-cols-3 gap-4">
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
        </SubBlock>

        <SubBlock title="Date of Birth & SSN">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Date of Birth *</label>
              <input type="date" name="dob" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Social Security Number *</label>
              <input type="text" name="ssn_last4" required maxLength={11} className={inputClass} placeholder="XXX-XX-XXXX" />
            </div>
          </div>
        </SubBlock>

        <SubBlock title="Contact Information">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Phone Number *</label>
              <input type="tel" name="phone" required className={inputClass} placeholder="(618) 000-0000" />
            </div>
            <div>
              <label className={labelClass}>Email Address *</label>
              <input type="email" name="email" required className={inputClass} placeholder="you@email.com" />
            </div>
          </div>
        </SubBlock>

        <SubBlock title="Mailing Address">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Street Address</label>
              <input type="text" name="address" className={inputClass} placeholder="123 Main St" />
            </div>
            <div>
              <label className={labelClass}>City, State, ZIP</label>
              <input type="text" name="city_state_zip" className={inputClass} placeholder="Millstadt, IL 62260" />
            </div>
          </div>
        </SubBlock>

        <SubBlock title="Driver's License">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>State</label>
              <input type="text" name="dl_state" className={inputClass} placeholder="IL" maxLength={2} />
            </div>
            <div>
              <label className={labelClass}>License Number</label>
              <input type="text" name="dl_number" className={inputClass} placeholder="D12345678" />
            </div>
            <div>
              <label className={labelClass}>Expiration Date</label>
              <input type="date" name="dl_expiry" className={inputClass} />
            </div>
          </div>
        </SubBlock>
      </Section>
      <Section num={3} title="Eligibility & Background" openSection={openSection} setOpenSection={setOpenSection}>
        <SubBlock title="Eligibility Questions">
          <div className="grid sm:grid-cols-2 gap-4">
            <YesNo name="authorized_us" label="Are you legally authorized to work in the U.S.? *" />
            <YesNo name="felony" label="Have you ever been convicted of a felony?" />
            <YesNo name="excluded_medicare" label="Have you ever been excluded from Medicare/Medicaid?" />
            <YesNo name="license_suspended" label="Have you ever had a professional license suspended or revoked?" />
          </div>
        </SubBlock>

        <SubBlock title="Explanation">
          <label className={labelClass}>If yes to any above, please explain</label>
          <textarea name="background_explain" rows={3} className={`${inputClass} resize-none`} placeholder="Provide details..." />
        </SubBlock>

        <SubBlock title="Consents">
          <label className={labelClass}>I consent to the following checks</label>
          <div className="grid sm:grid-cols-3 gap-4">
            {["Background Check", "Drug Screening", "Driving Record Check"].map((c) => (
              <label key={c} className="flex items-center gap-4 p-3 bg-[#071428] border border-white/10 rounded-lg cursor-pointer hover:border-[#f0b429]/30 transition-colors">
                <input type="checkbox" name="consents" value={c} className="accent-[#f0b429] w-4 h-4 shrink-0" />
                <span className="text-slate-300 text-sm">{c}</span>
              </label>
            ))}
          </div>
        </SubBlock>
      </Section>
      <Section num={4} title="Education" openSection={openSection} setOpenSection={setOpenSection}>
        <SubBlock title="High School">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>School Name</label>
              <input type="text" name="hs_name" className={inputClass} placeholder="High School Name" />
            </div>
            <div>
              <label className={labelClass}>Graduation Year</label>
              <input type="text" name="hs_grad" className={inputClass} placeholder="YYYY" maxLength={4} />
            </div>
          </div>
        </SubBlock>

        {colleges.map((c, i) => (
          <SubBlock
            key={i}
            title={i === 0 ? "College / University" : `Additional College #${i + 1}`}
            action={
              i === 0 ? (
                <button type="button" onClick={addCollege}
                  className="rounded-lg border-2 border-[#f0b429]/50 bg-[#f0b429]/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-[#f0b429] hover:bg-[#f0b429]/20 transition-colors">
                  + Add another college
                </button>
              ) : (
                <button type="button" onClick={() => removeCollege(i)}
                  className="text-slate-500 hover:text-red-400 text-xs font-black uppercase tracking-wider transition-colors">
                  Remove
                </button>
              )
            }
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Institution Name</label>
                <input type="text" value={c.name} onChange={(e) => updateCollege(i, "name", e.target.value)} className={inputClass} placeholder="e.g. Southern Illinois University" />
              </div>
              <div>
                <label className={labelClass}>Degree</label>
                <input type="text" value={c.degree} onChange={(e) => updateCollege(i, "degree", e.target.value)} className={inputClass} placeholder="e.g. B.S., A.A.S." />
              </div>
              <div>
                <label className={labelClass}>Graduation Year</label>
                <input type="text" value={c.gradYear} onChange={(e) => updateCollege(i, "gradYear", e.target.value)} className={inputClass} placeholder="YYYY" maxLength={4} />
              </div>
              <div>
                <label className={labelClass}>Cumulative GPA</label>
                <input type="text" value={c.gpa} onChange={(e) => updateCollege(i, "gpa", e.target.value)} className={inputClass} placeholder="e.g. 3.85" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>University Honors</label>
                <input type="text" value={c.honors} onChange={(e) => updateCollege(i, "honors", e.target.value)} className={inputClass} placeholder="e.g. Dean's List, Magna Cum Laude, Honors Society" />
              </div>
            </div>
          </SubBlock>
        ))}
      </Section>
      <Section num={5} title="Licensure & Certifications" openSection={openSection} setOpenSection={setOpenSection}>
          <div className="flex flex-col gap-6">

            {/* ── Primary License ── */}
            <div className="p-5 bg-[#071428] rounded-lg border border-white/8">
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
            <div className="p-5 bg-[#071428] rounded-lg border border-white/8">
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
            <div className="p-5 bg-[#071428] rounded-lg border border-white/8">
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
            <div className="p-5 bg-[#071428] rounded-lg border border-white/8">
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
            <div className="p-5 bg-[#071428] rounded-lg border border-white/8">
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
                <div className="hidden sm:grid grid-cols-12 gap-4 px-4 pb-2 border-b border-white/8">
                  <div className="col-span-5 text-slate-500 text-[10px] font-black uppercase tracking-widest">Name</div>
                  <div className="col-span-3 text-slate-500 text-[10px] font-black uppercase tracking-widest">Card #</div>
                  <div className="col-span-3 text-slate-500 text-[10px] font-black uppercase tracking-widest">Expires</div>
                </div>
                {certs.map((cert, i) => (
                  <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 sm:items-center py-4 sm:py-6 px-4 border-b border-white/8">
                    <div className="sm:col-span-5">
                      <span className="block sm:hidden text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Name</span>
                      {i < defaultCerts.length ? (
                        <span className="text-slate-200 text-base sm:text-sm font-semibold">{cert.name}</span>
                      ) : (
                        <input type="text" value={cert.name} onChange={(e) => updateCert(i, "name", e.target.value)} className={inputClass} placeholder="Certification name" />
                      )}
                    </div>
                    <div className="sm:col-span-3">
                      <span className="block sm:hidden text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Card #</span>
                      <input type="text" value={cert.number} onChange={(e) => updateCert(i, "number", e.target.value)} className={inputClass} placeholder="———" />
                    </div>
                    <div className="sm:col-span-3">
                      <span className="block sm:hidden text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Expires</span>
                      <input type="date" value={cert.expiry} onChange={(e) => updateCert(i, "expiry", e.target.value)} className={inputClass} />
                    </div>
                    <div className="sm:col-span-1 flex justify-end sm:justify-center">
                      {i >= defaultCerts.length && (
                        <button type="button" onClick={() => removeCert(i)} className="text-slate-500 hover:text-red-400 transition-colors text-xs font-black uppercase tracking-wider sm:text-sm">
                          <span className="sm:hidden">Remove</span>
                          <svg viewBox="0 0 24 24" className="hidden sm:block w-4 h-4 fill-current"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
      </Section>
      <Section num={6} title="Work History" openSection={openSection} setOpenSection={setOpenSection}>
        <p className="text-slate-400 text-sm mb-2">List all relevant EMS/medical employment — most recent first.</p>
        {employers.map((em, i) => (
          <SubBlock
            key={i}
            title={`Employer #${i + 1}`}
            action={employers.length > 1 ? (
              <button type="button" onClick={() => removeEmployer(i)} className="text-slate-500 hover:text-red-400 text-xs font-black uppercase tracking-wider transition-colors">Remove</button>
            ) : undefined}
          >
            <div className="grid sm:grid-cols-2 gap-4">
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
              <div className="sm:col-span-2">
                <label className={labelClass}>Reason for Leaving</label>
                <input type="text" value={em.reason} onChange={(e) => updateEmployer(i, "reason", e.target.value)} className={inputClass} placeholder="Reason for leaving" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Job Duties</label>
                <textarea value={em.duties} onChange={(e) => updateEmployer(i, "duties", e.target.value)} rows={3} className={`${inputClass} resize-none`} placeholder="Describe your primary duties..." />
              </div>
            </div>
          </SubBlock>
        ))}
        <SubBlock>
          <button type="button" onClick={addEmployer}
            className="flex items-center gap-2 rounded-lg border-2 border-[#f0b429]/50 bg-[#f0b429]/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-[#f0b429] hover:bg-[#f0b429]/20 transition-colors">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
            Add another employer
          </button>
        </SubBlock>
      </Section>

      <Section num={7} title="EMS Experience" openSection={openSection} setOpenSection={setOpenSection}>
        <SubBlock title="Years of Experience">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>EMS</label>
              <input type="number" name="years_ems" min="0" className={inputClass} placeholder="0" />
            </div>
            <div>
              <label className={labelClass}>ALS</label>
              <input type="number" name="years_als" min="0" className={inputClass} placeholder="0" />
            </div>
            <div>
              <label className={labelClass}>Critical Care</label>
              <input type="number" name="years_cc" min="0" className={inputClass} placeholder="0" />
            </div>
          </div>
        </SubBlock>
      </Section>

      <Section num={8} title="Driving History" openSection={openSection} setOpenSection={setOpenSection}>
        <SubBlock title="Driving Questions">
          <div className="grid sm:grid-cols-2 gap-4">
            <YesNo name="valid_dl" label="Valid Driver's License?" />
            <YesNo name="cdl" label="CDL (if applicable)?" />
            <YesNo name="accidents" label="Accidents in the past 5 years?" />
            <YesNo name="violations" label="Traffic violations in the past 5 years?" />
            <YesNo name="dl_suspension" label="License suspension in the past 5 years?" />
          </div>
        </SubBlock>

        <SubBlock title="Explanation">
          <label className={labelClass}>If yes to any above, please explain</label>
          <textarea name="driving_explain" rows={3} className={`${inputClass} resize-none`} placeholder="Provide details..." />
        </SubBlock>
      </Section>
      <Section num={9} title="I Am Willing To Work" openSection={openSection} setOpenSection={setOpenSection}>
          <div className="grid sm:grid-cols-3 gap-4">
            {availability.map((item) => (
              <label key={item} className="flex items-center gap-4 p-3 bg-[#071428] border border-white/10 rounded-lg cursor-pointer hover:border-[#f0b429]/30 transition-colors">
                <input type="checkbox" name="availability" value={item} className="accent-[#f0b429] w-5 h-5 shrink-0" />
                <span className="text-slate-300 text-base">{item}</span>
              </label>
            ))}
          </div>
      </Section>
      <Section num={10} title="Professional References" openSection={openSection} setOpenSection={setOpenSection}>
        <p className="text-slate-400 text-sm mb-2">Minimum of 3 references required.</p>
        {references.map((r, i) => (
          <SubBlock
            key={i}
            title={`Reference #${i + 1}`}
            action={references.length > 3 ? (
              <button type="button" onClick={() => setReferences((p) => p.filter((_, idx) => idx !== i))} className="text-slate-500 hover:text-red-400 text-xs font-black uppercase tracking-wider transition-colors">Remove</button>
            ) : undefined}
          >
            <div className="grid sm:grid-cols-2 gap-4">
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
          </SubBlock>
        ))}
        <SubBlock>
          <button type="button" onClick={addReference}
            className="flex items-center gap-2 rounded-lg border-2 border-[#f0b429]/50 bg-[#f0b429]/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-[#f0b429] hover:bg-[#f0b429]/20 transition-colors">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
            Add another reference
          </button>
        </SubBlock>
      </Section>

      <Section num={11} title="Additional Information" openSection={openSection} setOpenSection={setOpenSection}>
        <SubBlock title="Why Millstadt EMS?">
          <textarea name="why_millstadt" rows={5} className={`${inputClass} resize-none`} placeholder="Tell us about yourself and why you want to join our team..." />
        </SubBlock>

        <SubBlock title="5-Year Goals">
          <p className="text-slate-400 text-sm mb-3 -mt-1">Personal, professional, educational, financial — anything. List five things you&apos;re working toward.</p>
          <textarea name="five_year_goals" rows={7} className={`${inputClass} resize-none`} placeholder={"1.\n2.\n3.\n4.\n5."} />
        </SubBlock>
      </Section>

      <Section num={12} title="Attachments" openSection={openSection} setOpenSection={setOpenSection}>
        <p className="text-slate-400 text-sm mb-2">Upload your licenses, certifications, and supporting documents. Multiple files accepted.</p>
        {[
          { name: "file_resume", label: "Resume / CV" },
          { name: "file_cover", label: "Cover Letter" },
          { name: "file_dl", label: "Driver's License Copy" },
          { name: "file_license", label: "Professional License(s)" },
          { name: "file_certs", label: "Certification Cards" },
          { name: "file_immunizations", label: "Immunization Records" },
          { name: "file_other", label: "Additional Documents" },
        ].map((f) => (
          <SubBlock key={f.name} title={f.label}>
            <input
              type="file"
              name={f.name}
              multiple
              className="text-slate-400 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#f0b429]/10 file:text-[#f0b429] file:font-black file:text-xs file:uppercase file:tracking-wider hover:file:bg-[#f0b429]/20 file:transition-colors cursor-pointer"
            />
          </SubBlock>
        ))}
      </Section>
      <Section num={13} title="Applicant Certification" openSection={openSection} setOpenSection={setOpenSection}>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            I certify that all information provided in this application is true and complete to the best of my knowledge. I understand that falsification or omission of information may result in disqualification from consideration or termination of employment.
          </p>
          <label className="flex items-start gap-5 cursor-pointer">
            <input type="checkbox" name="certified" required className="accent-[#f0b429] w-5 h-5 shrink-0 mt-1" />
            <span className="text-slate-300 text-base leading-relaxed">
              I certify the above and agree that all information is true and complete. I consent to the background, drug, and driving record checks I selected above.
            </span>
          </label>
      </Section>

      {/* Submit */}
      <div className="py-10 bg-[#071428]">
        <div className="wrap">
          <div className="flex flex-col gap-4 max-w-sm">
            <button
              type="submit"
              disabled={status === "sending"}
              className="flex items-center justify-center w-full py-3 bg-[#f0b429] hover:bg-[#d9a320] text-[#040d1a] font-black text-sm rounded-lg uppercase tracking-wider transition-colors disabled:opacity-60"
            >
              {status === "sending" ? "Submitting…" : "Submit Application"}
            </button>
            <Link href="/careers" className="flex items-center justify-center w-full py-3 border-2 border-white/15 hover:border-[#f0b429]/50 hover:text-[#f0b429] text-white font-black text-sm rounded-lg uppercase tracking-wider transition-colors">
              Back to Careers
            </Link>
          </div>
          {status === "error" && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
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
