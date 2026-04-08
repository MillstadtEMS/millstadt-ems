import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getContent } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Medical Control",
  description:
    "Medical oversight for Millstadt Ambulance Service provided by Dr. Leo Hsu, MD, MBA, MDiv, FACEP, FAEMS — Medical Director for the Southwestern Illinois EMS System.",
};

export default async function MedicalControlPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const isPreview = params?.preview === "ve";
  const [pageTitle, directorName, directorCredentials] = await Promise.all([
    getContent("medical-control.header.title", "Medical Control", isPreview),
    getContent("medical-control.director.name", "Dr. Leo Hsu", isPreview),
    getContent("medical-control.director.credentials", "MD, MBA, MDiv, FACEP, FAEMS", isPreview),
  ]);

  return (
    <>
      {/* Page Header */}
      <section className="relative pt-16 pb-28 bg-[#040d1a] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#071428] to-[#040d1a]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f0b429]/30 to-transparent" />
        <div className="relative wrap">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Leadership</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-10">
            {pageTitle}
          </h1>
          <ul className="space-y-5 max-w-2xl">
            {[
              "Expert physician oversight guiding the clinical guidelines and standards of care for Millstadt Ambulance Service.",
              "Our Medical Director provides regional leadership across the Southwestern Illinois EMS System.",
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

      {/* Medical Director Profile — photo left, name + bio right */}
      <section className="pb-40 bg-[#040d1a]">
        <div className="wrap">
          <div className="grid md:grid-cols-12 gap-16 items-start">

            {/* Photo */}
            <div className="md:col-span-4">
              <div className="w-full aspect-[4/5] rounded-2xl overflow-hidden border border-white/8 relative">
                <Image
                  src="/images/millstadt-ems/leo-hsu.jpg"
                  alt="Dr. Leo Hsu, MD, MBA, MDiv, FACEP, FAEMS"
                  fill
                  className="object-cover object-top"
                />
              </div>
            </div>

            {/* Name + bio */}
            <div className="md:col-span-8">
              <div className="text-[#f0b429] text-sm font-bold tracking-[0.25em] uppercase mb-3">Medical Director</div>
              <h2 className="text-white font-black text-5xl mb-3 leading-tight">{directorName}</h2>
              <p className="text-slate-400 text-xl mb-8 tracking-wide">{directorCredentials}</p>

              <div className="text-slate-400 text-lg leading-relaxed">
                <div className="flex items-start gap-5 mb-8">
                  <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={20} height={20} className="shrink-0 mt-1" style={{ filter: "drop-shadow(0 0 4px #2563eb)" }} />
                  <p>Dr. Leo Hsu is a board-certified emergency physician and a Fellow of both the American College of Emergency Physicians (FACEP) and the Academy of Emergency Medical Services (FAEMS). He currently serves as Regional Medical Director at TeamHealth, a position he has held since 2017, and as Medical Director at Rezilient Health since 2022.</p>
                </div>
                <div className="flex items-start gap-5 mb-8">
                  <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={20} height={20} className="shrink-0 mt-1" style={{ filter: "drop-shadow(0 0 4px #2563eb)" }} />
                  <p>His EMS leadership spans multiple systems across the region. Dr. Hsu has served as EMS Medical Director for the Southwestern Illinois EMS System (SWIL) since April 2018 and for Missouri Baptist Sullivan Hospital since March 2018. He also served as EMS Medical Director for St. Charles County Ambulance District from 2012 to 2023, and currently serves as EMS Medical Director for St. François County EMS in Missouri.</p>
                </div>
                <div className="flex items-start gap-5 mb-8">
                  <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={20} height={20} className="shrink-0 mt-1" style={{ filter: "drop-shadow(0 0 4px #2563eb)" }} />
                  <p>Earlier in his career, Dr. Hsu was an Attending Physician in the Emergency Department at Progress West Hospital beginning in 2007. He went on to serve as the hospital&apos;s Stroke Medical Director from 2014 to 2017 and as Medical Director of the Emergency Department from 2012 to 2017.</p>
                </div>
                <div className="flex items-start gap-5">
                  <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={20} height={20} className="shrink-0 mt-1" style={{ filter: "drop-shadow(0 0 4px #2563eb)" }} />
                  <p>Dr. Hsu&apos;s breadth of experience across clinical practice, hospital leadership, and regional EMS direction reflects a lifelong commitment to advancing emergency medicine and improving outcomes for the communities he serves.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-20 bg-[#040d1a]" />

      {/* Education — full width */}
      <section className="pb-20 bg-[#040d1a]">
        <div className="wrap">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Education</span>
          </div>
          <div className="space-y-5">
            {[
              { degree: "BAS, Biology & Economics", school: "Stanford University", year: "1998" },
              { degree: "Doctor of Medicine (MD)", school: "Saint Louis University School of Medicine", year: "2003" },
              { degree: "Residency, Emergency Medicine", school: "Washington University in St. Louis", year: "2003–2007" },
              { degree: "Master of Divinity (MDiv)", school: "Covenant Theological Seminary", year: "2007–2011" },
              { degree: "MBA, Health Care Administration & Management", school: "Southeast Missouri State University", year: "2017" },
            ].map((item) => (
              <div key={item.degree} className="flex items-start gap-5 p-8 bg-[#071428] border border-white/8 rounded-2xl">
                <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={18} height={18} className="shrink-0 mt-1" style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 3px #f0b429)" }} />
                <div>
                  <div className="text-white font-bold text-base mb-1">{item.degree}</div>
                  <div className="text-slate-400 text-sm">{item.school} &mdash; {item.year}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-20 bg-[#040d1a]" />

      {/* Current Roles — full width */}
      <section className="pb-40 bg-[#040d1a]">
        <div className="wrap">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Current Roles</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { label: "Regional Medical Director", value: "TeamHealth (2017–present)" },
              { label: "Medical Director", value: "Rezilient Health (2022–present)" },
              { label: "EMS Medical Director", value: "SWIL EMS System (2018–present)" },
              { label: "EMS Medical Director", value: "MoBap Sullivan Hospital (2018–present)" },
              { label: "EMS Medical Director", value: "St. François County EMS, MO" },
            ].map((item) => (
              <div key={item.label + item.value} className="p-8 bg-[#071428] border border-white/8 rounded-2xl">
                <div className="text-[#f0b429] text-[10px] font-bold tracking-widest uppercase mb-3">{item.label}</div>
                <div className="text-white font-semibold text-base">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-40 bg-[#040d1a]" />

      {/* Medical Oversight Section */}
      <section className="py-28 bg-[#071428]">
        <div className="wrap">
          <div className="flex items-center gap-3 mb-8">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Medical Oversight</span>
          </div>
          <h2 className="text-5xl font-black text-white mb-16">Physician-Directed Care</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Clinical Guidelines",
                desc: "All Millstadt EMS guidelines are reviewed, approved, and regularly updated by Dr. Hsu to reflect current best practices in emergency medicine.",
              },
              {
                title: "Quality Assurance",
                desc: "Ongoing quality assurance review of patient care reports ensures our providers maintain the highest standards on every call.",
              },
              {
                title: "Provider Oversight",
                desc: "Medical director oversight covers all levels of care — from EMTs through Paramedics, Critical Care Paramedics, Prehospital RNs, Advanced Practice Registered Nurses, Prehospital PAs, and MDs.",
              },
              {
                title: "Online Medical Control",
                desc: "Providers have direct physician contact available for medical direction during complex calls and critical interventions.",
              },
              {
                title: "Continuing Education",
                desc: "Dr. Hsu oversees continuing education requirements and clinical competency standards for all Millstadt EMS personnel.",
              },
              {
                title: "System Coordination",
                desc: "As regional Medical Director, Dr. Hsu coordinates guideline alignment across the Southwestern Illinois EMS System.",
              },
            ].map((item) => (
              <div key={item.title} className="p-10 rounded-2xl bg-[#040d1a] border border-white/8 hover:border-[#2563eb]/30 transition-colors">
                <div className="text-white font-bold text-lg mb-4">{item.title}</div>
                <p className="text-slate-400 text-base leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-40 bg-[#040d1a]" />
    </>
  );
}
