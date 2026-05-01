"use client";

import { useRef, useState } from "react";
import Link from "next/link";

/* ── Reusable field components — Villa Hills pattern, EMS gold ─────── */

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold tracking-widest uppercase mb-2 text-slate-400">
      {children} {required && <span className="text-[#f0b429]">*</span>}
    </label>
  );
}

function Input({ name, value, onChange, type = "text", placeholder, required, maxLength }: {
  name: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string; placeholder?: string; required?: boolean; maxLength?: number;
}) {
  return (
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      maxLength={maxLength}
      className="w-full px-4 py-3 text-white text-sm sm:text-sm bg-[#1a1a1a] border border-white/10 outline-none transition-colors focus:border-[#f0b429] placeholder:text-slate-600"
    />
  );
}

function Textarea({ name, value, onChange, placeholder, rows = 3 }: {
  name: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-4 py-3 text-white text-sm bg-[#1a1a1a] border border-white/10 outline-none transition-colors focus:border-[#f0b429] resize-none placeholder:text-slate-600"
    />
  );
}

function RadioGroup({ name, options }: {
  name: string;
  options: { label: string; value: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-6">
      {options.map((opt) => (
        <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
          <input type="radio" name={name} value={opt.value} className="accent-[#f0b429] w-4 h-4" />
          <span className="text-sm text-slate-300">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

function CheckGroup({ name, options, columns = 2 }: {
  name: string;
  options: string[];
  columns?: 1 | 2 | 3 | 4;
}) {
  const colClass = columns === 1 ? "grid-cols-1" : columns === 2 ? "grid-cols-1 sm:grid-cols-2" : columns === 3 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-2 sm:grid-cols-4";
  return (
    <div className={`grid ${colClass} gap-3`}>
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name={name} value={opt} className="accent-[#f0b429] w-4 h-4" />
          <span className="text-sm text-slate-300">{opt}</span>
        </label>
      ))}
    </div>
  );
}

function SectionHeader({ number, title, subtitle }: { number: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-5 mb-8">
      <div className="shrink-0 flex items-center justify-center w-10 h-10 bg-[#f0b429] text-[#040d1a] font-black text-base">
        {number}
      </div>
      <div>
        <h2 className="text-white uppercase font-black text-xl sm:text-2xl tracking-wide">{title}</h2>
        {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6 sm:p-8 mb-2 bg-[#111111] border border-white/5">
      {children}
    </div>
  );
}

function Divider() {
  return <div className="h-px my-6 bg-[#f0b429]/20" />;
}

function DisclaimerBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 mt-4 bg-[#0d0d0d] border border-[#f0b429]/40 border-l-4 border-l-[#f0b429]">
      <p className="text-xs leading-relaxed text-slate-400">{children}</p>
    </div>
  );
}

/* ── Dynamic types ──────────────────────────────────────────────────── */

type Cert = { name: string; number: string; expiry: string; noExpiry?: boolean; completed?: boolean };
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
  { name: "HazMat Awareness/Ops", number: "", expiry: "", noExpiry: true, completed: false },
  { name: "FEMA NIMS IS-100", number: "", expiry: "", noExpiry: true, completed: false },
  { name: "FEMA NIMS IS-200", number: "", expiry: "", noExpiry: true, completed: false },
  { name: "FEMA NIMS IS-700", number: "", expiry: "", noExpiry: true, completed: false },
  { name: "FEMA NIMS IS-800", number: "", expiry: "", noExpiry: true, completed: false },
];

const defaultEmployer = (): Employer => ({ agency: "", title: "", from: "", to: "", type: "", supervisor: "", reason: "", duties: "" });
const defaultReference = (): Reference => ({ name: "", title: "", relationship: "", contact: "" });
const defaultCollege = (): College => ({ name: "", degree: "", gradYear: "", honors: "", gpa: "" });

const positions = [
  "EMT (BLS)",
  "Paramedic (ALS)",
  "Critical Care Paramedic",
  "Prehospital Registered Nurse (PHRN)",
  "Advanced Practice Prehospital RN (APHRN)",
  "Prehospital Physician Assistant (PHPA)",
  "Prehospital Medical Doctor (PHMD)",
];

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const hours = [
  "Days (911) 0600 – 1800",
  "Nights (911) 1800 – 0600",
  "24-Hour (911) 0600 – 0600",
  "Transfer Truck (variable hours)",
  "Standby / Event Coverage",
  "On-Call",
  "Any / All shifts",
];

/* ── Main component ─────────────────────────────────────────────────── */

export default function ApplicationForm() {
  const [certs, setCerts] = useState<Cert[]>(defaultCerts);
  const [employers, setEmployers] = useState<Employer[]>([defaultEmployer(), defaultEmployer(), defaultEmployer()]);
  const [references, setReferences] = useState<Reference[]>([defaultReference(), defaultReference(), defaultReference()]);
  const [colleges, setColleges] = useState<College[]>([defaultCollege()]);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  function updateCert(i: number, field: keyof Cert, val: string | boolean) {
    setCerts((prev) => prev.map((c, idx) => idx === i ? { ...c, [field]: val } : c));
  }
  function updateEmployer(i: number, field: keyof Employer, val: string) {
    setEmployers((prev) => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e));
  }
  function updateReference(i: number, field: keyof Reference, val: string) {
    setReferences((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  }
  function updateCollege(i: number, field: keyof College, val: string) {
    setColleges((prev) => prev.map((c, idx) => idx === i ? { ...c, [field]: val } : c));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");
    setStatus("sending");

    const fd = new FormData(e.currentTarget);

    // Pre-flight file size check
    let totalBytes = 0;
    for (const [, v] of fd.entries()) {
      if (v instanceof File) totalBytes += v.size;
    }
    if (totalBytes > 4 * 1024 * 1024) {
      setErrorMsg(`Attachments total ${(totalBytes / 1024 / 1024).toFixed(1)}MB — exceeds 4MB limit. Reduce sizes or email millstadtems@gmail.com directly.`);
      setStatus("error");
      return;
    }

    // Serialize dynamic state
    fd.set("work_history", employers.map((em, i) =>
      `Employer #${i + 1}: ${em.agency} | ${em.title} | ${em.from}–${em.to} | ${em.type} | Supervisor: ${em.supervisor} | Reason: ${em.reason}\nDuties: ${em.duties}`
    ).join("\n\n"));

    fd.set("references", references.map((r, i) =>
      `Reference #${i + 1}: ${r.name} | ${r.title} | ${r.relationship} | ${r.contact}`
    ).join("\n"));

    fd.set("additional_certs", certs.map((c) =>
      c.noExpiry ? `${c.name}: ${c.completed ? "Completed" : "NOT COMPLETED"}` : `${c.name}: #${c.number} Exp: ${c.expiry}`
    ).join("\n"));

    fd.set("college_education", colleges.map((c, i) =>
      `College #${i + 1}: ${c.name} | Degree: ${c.degree} | Grad: ${c.gradYear} | Honors: ${c.honors} | GPA: ${c.gpa}`
    ).join("\n"));

    try {
      const res = await fetch("/api/apply", { method: "POST", body: fd });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setStatus("sent");
        return;
      }
      setErrorMsg(data?.error || `Submission failed (${res.status}). Please try again or email millstadtems@gmail.com.`);
      setStatus("error");
    } catch {
      setErrorMsg("Network error — could not reach the server. Try again or email millstadtems@gmail.com.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#0A0A0A] py-16">
        <div className="wrap text-center max-w-lg">
          <div className="text-6xl mb-6">🚑</div>
          <h1 className="text-white uppercase mb-4 font-black text-3xl sm:text-4xl tracking-wide">Application Received</h1>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Thank you for your interest in serving with Millstadt Ambulance Service.
            Your application has been submitted and a copy has been emailed to our department.
            We will be in touch with you shortly.
          </p>
          <Link href="/careers" className="inline-block bg-[#f0b429] text-[#040d1a] font-black uppercase tracking-wider px-8 py-3 hover:bg-[#f7c847] transition-colors">
            Back to Careers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0A0A0A] py-12 sm:py-16">
      <div className="wrap" style={{ maxWidth: "920px" }}>
        <form ref={formRef} onSubmit={handleSubmit} encType="multipart/form-data" noValidate>

          {/* ── SECTION 1: Position Applied For ── */}
          <Section>
            <SectionHeader number="1" title="Position Applied For" subtitle="Select the role you are applying for and your availability." />

            <div className="mb-7">
              <Label required>Position</Label>
              <RadioGroup name="position" options={positions.map(p => ({ label: p, value: p }))} />
            </div>

            <Divider />

            <div className="mb-7">
              <Label required>Employment Type — Select all that apply</Label>
              <CheckGroup name="employment_type" options={["Full-Time", "Part-Time", "PRN", "Volunteer"]} columns={4} />
            </div>

            <Divider />

            <div className="mb-7">
              <Label>Days Available — Select all that apply</Label>
              <CheckGroup name="days_available" options={days} columns={4} />
            </div>

            <Divider />

            <div className="mb-7">
              <Label>Hours Available — Select all that apply</Label>
              <CheckGroup name="hours_available" options={hours} columns={2} />
            </div>

            <Divider />

            <div>
              <Label>Preferred Shift / Notes</Label>
              <Input name="preferred_shift" placeholder="Anything else about your preferred schedule" />
            </div>
          </Section>

          {/* ── SECTION 2: Personal Information ── */}
          <Section>
            <SectionHeader number="2" title="Personal Information" subtitle="All fields are required unless noted." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <Label required>First Name</Label>
                <Input name="first_name" required />
              </div>
              <div>
                <Label required>Last Name</Label>
                <Input name="last_name" required />
              </div>
              <div>
                <Label>Middle Name</Label>
                <Input name="middle_name" />
              </div>
              <div>
                <Label required>Date of Birth</Label>
                <Input name="dob" type="date" required />
              </div>
              <div>
                <Label required>Social Security Number</Label>
                <Input name="ssn_last4" placeholder="XXX-XX-XXXX" required maxLength={11} />
              </div>
              <div>
                <Label required>Phone Number</Label>
                <Input name="phone" type="tel" placeholder="(618) 555-0100" required />
              </div>
              <div className="sm:col-span-2">
                <Label required>Email Address</Label>
                <Input name="email" type="email" placeholder="you@example.com" required />
              </div>
              <div className="sm:col-span-2">
                <Label>Street Address</Label>
                <Input name="address" placeholder="123 Main Street" />
              </div>
              <div className="sm:col-span-2">
                <Label>City, State, ZIP</Label>
                <Input name="city_state_zip" placeholder="Millstadt, IL 62260" />
              </div>
              <div>
                <Label>Driver&apos;s License State</Label>
                <Input name="dl_state" placeholder="IL" maxLength={2} />
              </div>
              <div>
                <Label>Driver&apos;s License Number</Label>
                <Input name="dl_number" placeholder="D12345678" />
              </div>
              <div className="sm:col-span-2">
                <Label>Driver&apos;s License Expiration</Label>
                <Input name="dl_expiry" type="date" />
              </div>
            </div>
          </Section>

          {/* ── SECTION 3: Eligibility & Background ── */}
          <Section>
            <SectionHeader number="3" title="Eligibility & Background" />

            <div className="space-y-6">
              <div>
                <Label required>Are you legally authorized to work in the United States?</Label>
                <RadioGroup name="authorized_us" options={[{ label: "Yes", value: "Yes" }, { label: "No", value: "No" }]} />
              </div>
              <div>
                <Label>Have you ever been convicted of a felony?</Label>
                <RadioGroup name="felony" options={[{ label: "Yes", value: "Yes" }, { label: "No", value: "No" }]} />
              </div>
              <div>
                <Label>Have you ever been excluded from Medicare or Medicaid?</Label>
                <RadioGroup name="excluded_medicare" options={[{ label: "Yes", value: "Yes" }, { label: "No", value: "No" }]} />
              </div>
              <div>
                <Label>Have you ever had a professional license suspended or revoked?</Label>
                <RadioGroup name="license_suspended" options={[{ label: "Yes", value: "Yes" }, { label: "No", value: "No" }]} />
              </div>
            </div>

            <Divider />

            <div className="mb-6">
              <Label>If yes to any above, please explain</Label>
              <Textarea name="background_explain" rows={3} placeholder="Provide details..." />
            </div>

            <Divider />

            <div>
              <Label>I consent to the following checks</Label>
              <CheckGroup name="consents" options={["Background Check", "Drug Screening", "Driving Record Check"]} columns={3} />
            </div>
          </Section>

          {/* ── SECTION 4: Education ── */}
          <Section>
            <SectionHeader number="4" title="Education" />

            <div>
              <Label>High School</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input name="hs_name" placeholder="High School Name" />
                <Input name="hs_grad" placeholder="Graduation Year (YYYY)" maxLength={4} />
              </div>
            </div>

            <Divider />

            <div>
              <div className="flex items-center justify-between mb-4">
                <Label>College / University</Label>
                <button type="button" onClick={() => setColleges(p => [...p, defaultCollege()])}
                  className="text-[#f0b429] text-xs font-bold uppercase tracking-wider hover:text-[#f7c847]">+ Add another</button>
              </div>
              <div className="space-y-5">
                {colleges.map((c, i) => (
                  <div key={i} className="p-5 bg-[#0d0d0d] border border-white/5">
                    {i > 0 && (
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-slate-400 text-xs uppercase tracking-wider font-bold">College #{i + 1}</span>
                        <button type="button" onClick={() => setColleges(p => p.filter((_, idx) => idx !== i))}
                          className="text-slate-500 hover:text-red-400 text-xs font-bold uppercase tracking-wider">Remove</button>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="sm:col-span-2">
                        <Label>Institution Name</Label>
                        <Input name={`college_${i}_name`} value={c.name} onChange={(e) => updateCollege(i, "name", e.target.value)} placeholder="e.g. Southern Illinois University" />
                      </div>
                      <div>
                        <Label>Degree</Label>
                        <Input name={`college_${i}_degree`} value={c.degree} onChange={(e) => updateCollege(i, "degree", e.target.value)} placeholder="e.g. B.S., A.A.S." />
                      </div>
                      <div>
                        <Label>Graduation Year</Label>
                        <Input name={`college_${i}_gradYear`} value={c.gradYear} onChange={(e) => updateCollege(i, "gradYear", e.target.value)} placeholder="YYYY" maxLength={4} />
                      </div>
                      <div>
                        <Label>Cumulative GPA</Label>
                        <Input name={`college_${i}_gpa`} value={c.gpa} onChange={(e) => updateCollege(i, "gpa", e.target.value)} placeholder="e.g. 3.85" />
                      </div>
                      <div>
                        <Label>University Honors</Label>
                        <Input name={`college_${i}_honors`} value={c.honors} onChange={(e) => updateCollege(i, "honors", e.target.value)} placeholder="e.g. Dean's List, Magna Cum Laude" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* ── SECTION 5: Licensure ── */}
          <Section>
            <SectionHeader number="5" title="Licensure" subtitle="Provide details on your professional EMS / medical licenses." />

            <div>
              <Label>Primary License</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <Input name="primary_license_type" placeholder="Type (e.g. Paramedic)" />
                <Input name="primary_license_state" placeholder="State (e.g. IL)" maxLength={2} />
                <Input name="primary_license_number" placeholder="License #" />
                <Input name="primary_license_expiry" type="date" placeholder="Expiration" />
              </div>
            </div>

            <Divider />

            <div>
              <Label>Additional License (optional)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <Input name="add_license_type" placeholder="Type (e.g. RN)" />
                <Input name="add_license_state" placeholder="State" maxLength={2} />
                <Input name="add_license_number" placeholder="License #" />
                <Input name="add_license_expiry" type="date" placeholder="Expiration" />
              </div>
            </div>

            <Divider />

            <div>
              <Label>NREMT</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <Input name="nremt_level" placeholder="Level (e.g. NRP)" />
                <Input name="nremt_number" placeholder="NREMT #" />
                <Input name="nremt_expiry" type="date" placeholder="Expiration" />
              </div>
            </div>

            <Divider />

            <div>
              <Label>DEA Registration (if applicable)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input name="dea_number" placeholder="DEA #" />
                <Input name="dea_expiry" type="date" placeholder="Expiration" />
              </div>
            </div>
          </Section>

          {/* ── SECTION 6: Certifications ── */}
          <Section>
            <SectionHeader number="6" title="Certifications" subtitle="Enter card numbers and expiration dates. NIMS and HazMat just need a Completed checkbox." />

            <div className="space-y-2">
              {certs.map((cert, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end p-4 bg-[#0d0d0d] border border-white/5">
                  <div className="sm:col-span-5">
                    <Label>Certification</Label>
                    {i < defaultCerts.length ? (
                      <div className="text-white text-sm py-3">{cert.name}</div>
                    ) : (
                      <Input name={`cert_${i}_name`} value={cert.name} onChange={(e) => updateCert(i, "name", e.target.value)} placeholder="Cert name" />
                    )}
                  </div>
                  {cert.noExpiry ? (
                    <div className="sm:col-span-7">
                      <Label>Status</Label>
                      <label className="flex items-center gap-3 px-4 py-3 bg-[#1a1a1a] border border-white/10 cursor-pointer hover:border-[#f0b429]/40">
                        <input type="checkbox" checked={!!cert.completed} onChange={(e) => updateCert(i, "completed", e.target.checked)} className="accent-[#f0b429] w-5 h-5 shrink-0" />
                        <span className="text-sm font-bold text-slate-300">Completed</span>
                        <span className="text-xs text-slate-500 ml-auto">no expiration</span>
                      </label>
                    </div>
                  ) : (
                    <>
                      <div className="sm:col-span-3">
                        <Label>Card #</Label>
                        <Input name={`cert_${i}_number`} value={cert.number} onChange={(e) => updateCert(i, "number", e.target.value)} placeholder="———" />
                      </div>
                      <div className="sm:col-span-4">
                        <Label>Expires</Label>
                        <Input name={`cert_${i}_expiry`} type="date" value={cert.expiry} onChange={(e) => updateCert(i, "expiry", e.target.value)} />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4">
              <button type="button" onClick={() => setCerts(p => [...p, { name: "", number: "", expiry: "" }])}
                className="text-[#f0b429] text-xs font-bold uppercase tracking-wider hover:text-[#f7c847]">+ Add custom certification</button>
            </div>
          </Section>

          {/* ── SECTION 7: Work History ── */}
          <Section>
            <SectionHeader number="7" title="Work History" subtitle="List relevant EMS/medical employment — most recent first." />

            <div className="space-y-5">
              {employers.map((em, i) => (
                <div key={i} className="p-5 bg-[#0d0d0d] border border-white/5">
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-slate-300 uppercase tracking-wider text-xs font-bold">Employer #{i + 1}</span>
                    {employers.length > 1 && (
                      <button type="button" onClick={() => setEmployers(p => p.filter((_, idx) => idx !== i))}
                        className="text-slate-500 hover:text-red-400 text-xs font-bold uppercase tracking-wider">Remove</button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <Label>Agency Name</Label>
                      <Input name={`emp_${i}_agency`} value={em.agency} onChange={(e) => updateEmployer(i, "agency", e.target.value)} placeholder="Agency / Organization" />
                    </div>
                    <div>
                      <Label>Position Title</Label>
                      <Input name={`emp_${i}_title`} value={em.title} onChange={(e) => updateEmployer(i, "title", e.target.value)} placeholder="e.g. Paramedic" />
                    </div>
                    <div>
                      <Label>From</Label>
                      <Input name={`emp_${i}_from`} type="month" value={em.from} onChange={(e) => updateEmployer(i, "from", e.target.value)} />
                    </div>
                    <div>
                      <Label>To</Label>
                      <Input name={`emp_${i}_to`} type="month" value={em.to} onChange={(e) => updateEmployer(i, "to", e.target.value)} placeholder="Present" />
                    </div>
                    <div>
                      <Label>Full / Part / PRN</Label>
                      <Input name={`emp_${i}_type`} value={em.type} onChange={(e) => updateEmployer(i, "type", e.target.value)} placeholder="e.g. Full-Time" />
                    </div>
                    <div>
                      <Label>Supervisor & Contact</Label>
                      <Input name={`emp_${i}_supervisor`} value={em.supervisor} onChange={(e) => updateEmployer(i, "supervisor", e.target.value)} placeholder="Name — phone or email" />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Reason for Leaving</Label>
                      <Input name={`emp_${i}_reason`} value={em.reason} onChange={(e) => updateEmployer(i, "reason", e.target.value)} placeholder="Reason for leaving" />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Job Duties</Label>
                      <Textarea name={`emp_${i}_duties`} value={em.duties} onChange={(e) => updateEmployer(i, "duties", e.target.value)} rows={3} placeholder="Describe your primary duties..." />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <button type="button" onClick={() => setEmployers(p => [...p, defaultEmployer()])}
                className="text-[#f0b429] text-xs font-bold uppercase tracking-wider hover:text-[#f7c847]">+ Add another employer</button>
            </div>
          </Section>

          {/* ── SECTION 8: EMS Experience ── */}
          <Section>
            <SectionHeader number="8" title="EMS Experience" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <Label>Years of EMS Experience</Label>
                <Input name="years_ems" type="number" placeholder="0" />
              </div>
              <div>
                <Label>Years of ALS Experience</Label>
                <Input name="years_als" type="number" placeholder="0" />
              </div>
              <div>
                <Label>Years of Critical Care</Label>
                <Input name="years_cc" type="number" placeholder="0" />
              </div>
            </div>
          </Section>

          {/* ── SECTION 9: Driving History ── */}
          <Section>
            <SectionHeader number="9" title="Driving History" />
            <div className="space-y-6">
              <div>
                <Label>Do you have a valid driver&apos;s license?</Label>
                <RadioGroup name="valid_dl" options={[{ label: "Yes", value: "Yes" }, { label: "No", value: "No" }]} />
              </div>
              <div>
                <Label>Do you have a CDL (if applicable)?</Label>
                <RadioGroup name="cdl" options={[{ label: "Yes", value: "Yes" }, { label: "No", value: "No" }, { label: "N/A", value: "N/A" }]} />
              </div>
              <div>
                <Label>Have you had any accidents in the past 5 years?</Label>
                <RadioGroup name="accidents" options={[{ label: "Yes", value: "Yes" }, { label: "No", value: "No" }]} />
              </div>
              <div>
                <Label>Have you had any traffic violations in the past 5 years?</Label>
                <RadioGroup name="violations" options={[{ label: "Yes", value: "Yes" }, { label: "No", value: "No" }]} />
              </div>
              <div>
                <Label>Has your license been suspended in the past 5 years?</Label>
                <RadioGroup name="dl_suspension" options={[{ label: "Yes", value: "Yes" }, { label: "No", value: "No" }]} />
              </div>
            </div>

            <Divider />

            <div>
              <Label>If yes to any above, please explain</Label>
              <Textarea name="driving_explain" rows={3} placeholder="Provide details..." />
            </div>
          </Section>

          {/* ── SECTION 10: Professional References ── */}
          <Section>
            <SectionHeader number="10" title="Professional References" subtitle="Minimum of 3 references required." />

            <div className="space-y-5">
              {references.map((r, i) => (
                <div key={i} className="p-5 bg-[#0d0d0d] border border-white/5">
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-slate-300 uppercase tracking-wider text-xs font-bold">Reference #{i + 1}</span>
                    {references.length > 3 && (
                      <button type="button" onClick={() => setReferences(p => p.filter((_, idx) => idx !== i))}
                        className="text-slate-500 hover:text-red-400 text-xs font-bold uppercase tracking-wider">Remove</button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <Label>Name</Label>
                      <Input name={`ref_${i}_name`} value={r.name} onChange={(e) => updateReference(i, "name", e.target.value)} placeholder="Full name" />
                    </div>
                    <div>
                      <Label>Title</Label>
                      <Input name={`ref_${i}_title`} value={r.title} onChange={(e) => updateReference(i, "title", e.target.value)} placeholder="e.g. EMS Director" />
                    </div>
                    <div>
                      <Label>Relationship</Label>
                      <Input name={`ref_${i}_relationship`} value={r.relationship} onChange={(e) => updateReference(i, "relationship", e.target.value)} placeholder="e.g. Former Supervisor" />
                    </div>
                    <div>
                      <Label>Phone / Email</Label>
                      <Input name={`ref_${i}_contact`} value={r.contact} onChange={(e) => updateReference(i, "contact", e.target.value)} placeholder="Phone or email" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <button type="button" onClick={() => setReferences(p => [...p, defaultReference()])}
                className="text-[#f0b429] text-xs font-bold uppercase tracking-wider hover:text-[#f7c847]">+ Add another reference</button>
            </div>
          </Section>

          {/* ── SECTION 11: Additional Information ── */}
          <Section>
            <SectionHeader number="11" title="Additional Information" />

            <div className="mb-7">
              <Label>Why do you want to work for Millstadt Ambulance Service?</Label>
              <Textarea name="why_millstadt" rows={5} placeholder="Tell us about yourself and why you want to join our team..." />
            </div>

            <Divider />

            <div>
              <Label>What are 5 goals you have for the next 5 years?</Label>
              <p className="text-slate-500 text-xs mb-3">Personal, professional, educational, financial — anything. List five things you&apos;re working toward.</p>
              <Textarea name="five_year_goals" rows={7} placeholder={"1.\n2.\n3.\n4.\n5."} />
            </div>
          </Section>

          {/* ── SECTION 12: Attachments ── */}
          <Section>
            <SectionHeader number="12" title="Attachments" subtitle="Upload your resume, license copies, and certifications. 4MB total maximum." />

            <div className="space-y-4">
              {[
                { name: "file_resume", label: "Resume / CV" },
                { name: "file_cover", label: "Cover Letter" },
                { name: "file_dl", label: "Driver's License Copy" },
                { name: "file_license", label: "Professional License(s)" },
                { name: "file_certs", label: "Certification Cards" },
                { name: "file_immunizations", label: "Immunization Records" },
                { name: "file_other", label: "Additional Documents" },
              ].map((f) => (
                <div key={f.name} className="grid grid-cols-1 sm:grid-cols-[260px_1fr] gap-3 items-center p-4 bg-[#0d0d0d] border border-white/5">
                  <span className="text-slate-300 text-sm font-bold uppercase tracking-wider whitespace-nowrap">{f.label}</span>
                  <input
                    type="file"
                    name={f.name}
                    multiple
                    className="text-slate-400 text-sm file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-[#f0b429]/15 file:text-[#f0b429] file:font-bold file:text-xs file:tracking-wider hover:file:bg-[#f0b429]/25 file:cursor-pointer cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </Section>

          {/* ── SECTION 13: Certification & Signature ── */}
          <Section>
            <SectionHeader number="13" title="Applicant Certification" />

            <DisclaimerBox>
              I certify that all information provided in this application is true and complete to the best of my knowledge.
              I understand that falsification or omission of information may result in disqualification from consideration
              or termination of employment. I authorize Millstadt Ambulance Service to verify any of the information provided
              and to contact references and former employers.
            </DisclaimerBox>

            <div className="mt-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" name="certified" required className="accent-[#f0b429] w-5 h-5 shrink-0 mt-0.5" />
                <span className="text-slate-300 text-sm leading-relaxed">
                  I certify the above and agree that all information is true and complete. I consent to the background, drug,
                  and driving record checks I selected above.
                </span>
              </label>
            </div>
          </Section>

          {/* ── SUBMIT ── */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={status === "sending"}
              className="bg-[#f0b429] text-[#040d1a] font-black uppercase tracking-wider px-8 py-4 hover:bg-[#f7c847] transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {status === "sending" ? "Submitting…" : "Submit Application"}
            </button>
            <Link href="/careers" className="border-2 border-white/15 text-white font-black uppercase tracking-wider px-8 py-4 hover:border-[#f0b429]/50 hover:text-[#f0b429] transition-colors text-center text-sm sm:text-base">
              Back to Careers
            </Link>
          </div>

          {errorMsg && (
            <div className="mt-6 p-5 bg-red-900/20 border-l-4 border-red-500">
              <div className="text-red-300 font-bold text-sm mb-1">Submission Failed</div>
              <p className="text-red-200/80 text-sm leading-relaxed">{errorMsg}</p>
            </div>
          )}

        </form>
      </div>
    </div>
  );
}
