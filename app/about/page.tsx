import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Who We Are",
  description:
    "Learn about Millstadt Ambulance Service — our history, mission, values, and the team providing advanced life support to Millstadt, Illinois since 1980.",
};

const values = [
  {
    label: "Excellence",
    desc: "We set high standards and bring our best to every call, every interaction, and every decision.",
  },
  {
    label: "Compassion",
    desc: "We treat every patient and family member with respect, empathy, and genuine care.",
  },
  {
    label: "Integrity",
    desc: "We do the right thing — with honesty, transparency, and professionalism in everything we do.",
  },
  {
    label: "Accountability",
    desc: "We take responsibility for our actions, learn from every experience, and hold ourselves to a high standard.",
  },
  {
    label: "Collaboration",
    desc: "We work closely with law enforcement, fire, hospitals, and community partners to provide the best care possible.",
  },
  {
    label: "Preparedness",
    desc: "We train continuously so we are always ready when the call comes.",
  },
];

const timeline = [
  { year: "1980", event: "Founded by a grassroots community effort. Began operations as a Basic Life Support service serving Millstadt and surrounding areas." },
  { year: "2013", event: "Upgraded to Advanced Life Support certification, bringing paramedic-level care directly to patients in the field." },
  { year: "2018", event: "Acquired current facility at 100 East Laurel Street, Millstadt, Illinois — a permanent home for the agency." },
  { year: "Today", event: "Serving Millstadt and surrounding areas with ALS, critical care-capable personnel, and a growing, modernizing fleet." },
];

export default function AboutPage() {
  return (
    <>
      {/* Page Header */}
      <section className="relative pt-16 pb-28 bg-[#040d1a] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#071428] to-[#040d1a]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f0b429]/30 to-transparent" />
        <div className="relative wrap">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">About Us</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-8">
            Who We Are
          </h1>
          <ul className="space-y-5 max-w-2xl">
            {[
              "Millstadt Ambulance Service is a dedicated team of paramedics, nurses, nurse practitioners, and EMTs committed to protecting and serving our community.",
              "Serving Millstadt and surrounding communities since 1980, we provide reliable, high-quality emergency care when it matters most.",
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

      {/* Mission & Vision — stacked full width */}
      <section className="pb-40 bg-[#040d1a]">
        <div className="wrap flex flex-col gap-8">

          {/* Mission */}
          <div className="p-16 rounded-2xl bg-[#071428] border border-white/8">
            <div className="flex items-center gap-4 mb-8">
              <Image
                src="/images/millstadt-ems/star-of-life.png"
                alt=""
                width={32}
                height={32}
                style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 4px #f0b429)" }}
              />
              <span className="text-[#f0b429] text-2xl font-black tracking-[0.15em] uppercase">Mission</span>
            </div>
            <p className="text-slate-300 text-lg leading-relaxed">
              At Millstadt EMS, our mission is to provide exceptional, compassionate, and timely
              emergency medical care to our diverse community. We are dedicated to advancing health
              and safety through highly trained professionals, cutting-edge technology, and a
              commitment to continuous improvement, ensuring the well-being of every person we serve.
            </p>
          </div>

          {/* Vision */}
          <div className="p-16 rounded-2xl bg-[#071428] border border-white/8">
            <div className="flex items-center gap-4 mb-8">
              <Image
                src="/images/millstadt-ems/star-of-life.png"
                alt=""
                width={32}
                height={32}
                style={{ filter: "drop-shadow(0 0 4px #2563eb)" }}
              />
              <span className="text-[#2563eb] text-2xl font-black tracking-[0.15em] uppercase">Vision</span>
            </div>
            <p className="text-slate-300 text-lg leading-relaxed">
              Our vision is to be a leader in pre-hospital care, setting the standard for emergency
              medical services through innovation, education, and collaboration. We strive to enhance
              the quality of life in our region by delivering the highest level of care, fostering
              community partnerships, and preparing for the challenges of tomorrow with excellence
              and integrity.
            </p>
          </div>

        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-40 bg-gradient-to-b from-[#040d1a] to-[#071428]" />

      {/* Core Values */}
      <section className="pb-40 bg-[#071428]">
        <div className="wrap">
          <div className="flex items-center gap-4 mb-8">
            <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={32} height={32} style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 4px #f0b429)" }} />
            <span className="text-[#f0b429] text-2xl font-black tracking-[0.15em] uppercase">Core Values</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-24">What We Stand For</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((v) => (
              <div key={v.label} className="p-14 rounded-2xl bg-[#040d1a] border border-white/8 hover:border-[#f0b429]/25 transition-colors">
                <div className="flex items-center gap-3 mb-5">
                  <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={22} height={22} style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 3px #f0b429)" }} />
                  <span className="text-[#f0b429] font-black text-xl">{v.label}</span>
                </div>
                <p className="text-slate-300 text-base leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-40 bg-gradient-to-b from-[#071428] to-[#040d1a]" />

      {/* Service Area */}
      <section className="pb-40 bg-[#040d1a]">
        <div className="wrap grid md:grid-cols-2 gap-24 items-center">
          <div>
            <div className="flex items-center gap-4 mb-8">
              <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={32} height={32} style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 4px #f0b429)" }} />
              <span className="text-[#f0b429] text-2xl font-black tracking-[0.15em] uppercase">Service Area</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-12 leading-tight">
              Millstadt and<br />Surrounding Areas
            </h2>
            <ul className="space-y-8">
              {[
                "Located approximately 16 miles from St. Louis, Missouri in Southwestern Illinois.",
                "Covers approximately 107 square miles including Millstadt Township and surrounding communities.",
                "Mutual aid agreements with neighboring communities to ensure seamless regional coverage.",
                "Serves a diverse region with both rural and urban community response needs.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-5">
                  <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={20} height={20} className="shrink-0" style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 3px #f0b429)" }} />
                  <span className="text-slate-300 text-lg leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative h-[520px] rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
            <Image
              src="/images/millstadt-ems/truck1.jpg"
              alt="Millstadt EMS Paramedic Unit"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#040d1a]/30 to-transparent" />
          </div>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-40 bg-gradient-to-b from-[#040d1a] to-[#071428]" />

      {/* History Timeline */}
      <section className="pb-40 bg-[#071428]">
        <div className="wrap">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Historic photo 2×2 grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                "/images/millstadt-ems/oldies1.jpg",
                "/images/millstadt-ems/oldies2.jpg",
                "/images/millstadt-ems/oldies3.jpg",
              ].map((src, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden shadow-lg shadow-black/40">
                  <Image
                    src={src}
                    alt="Millstadt EMS historic photo"
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
              ))}
              <div className="relative aspect-square rounded-xl overflow-hidden shadow-lg shadow-black/40">
                <Image
                  src="/images/millstadt-ems/oldies4.jpg"
                  alt="Millstadt EMS historic photo"
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
            </div>
            {/* Timeline */}
            <div>
            <div className="flex items-center gap-4 mb-8">
                <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={32} height={32} style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 4px #f0b429)" }} />
                <span className="text-[#f0b429] text-2xl font-black tracking-[0.15em] uppercase">Our History</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-20">Built by the Community</h2>
            <div className="relative pl-10 border-l-2 border-white/10 space-y-16">
              {timeline.map((t) => (
                <div key={t.year} className="relative">
                  <div className="absolute -left-[2.85rem] top-0">
                    <Image
                      src="/images/millstadt-ems/star-of-life.png"
                      alt=""
                      width={24}
                      height={24}
                      style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 3px #f0b429)" }}
                    />
                  </div>
                  <div className="text-[#f0b429] font-black text-base tracking-widest uppercase mb-3">{t.year}</div>
                  <p className="text-slate-300 text-lg leading-relaxed">{t.event}</p>
                </div>
              ))}
            </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-40 bg-gradient-to-b from-[#071428] to-[#040d1a]" />

      {/* Staff & Future */}
      <section className="pb-40 bg-[#040d1a]">
        <div className="wrap grid md:grid-cols-2 gap-24 items-start">
          <div>
            <div className="flex items-center gap-4 mb-8">
              <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={32} height={32} style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 4px #f0b429)" }} />
              <span className="text-[#f0b429] text-2xl font-black tracking-[0.15em] uppercase">Our Team</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-10 leading-tight">
              Highly Trained.<br />Community First.
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed mb-8">
              Millstadt Ambulance Service is staffed by a dedicated team of drivers, EMTs, paramedics,
              Critical Care Paramedics, and prehospital RNs — all committed to the highest standards of
              pre-hospital emergency care.
            </p>
            <p className="text-slate-400 text-lg leading-relaxed">
              Our providers undergo continuous education and training to stay current with the latest
              guidelines and techniques in emergency medicine.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-4 mb-8">
              <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={32} height={32} style={{ filter: "drop-shadow(0 0 4px #2563eb)" }} />
              <span className="text-[#2563eb] text-2xl font-black tracking-[0.15em] uppercase">Future Outlook</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-10 leading-tight">
              Growing With<br />Millstadt
            </h2>
            <ul className="space-y-7">
              {[
                "Equipment upgrades and expanded ALS capability",
                "Higher levels of care including critical care transport",
                "Expanded education and community training programs",
                "Stronger community partnerships and public engagement",
                "Continued investment in personnel and provider development",
              ].map((item) => (
                <li key={item} className="flex items-start gap-5">
                  <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={20} height={20} className="shrink-0 mt-1" style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 3px #f0b429)" }} />
                  <span className="text-slate-300 text-lg leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-40 bg-gradient-to-b from-[#040d1a] to-[#071428]" />

      {/* Crew Photo Strip */}
      <section className="pb-40 bg-[#071428]">
        <div className="wrap">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
            {[
              "/images/millstadt-ems/heli.jpg",
              "/images/millstadt-ems/IMG_3145.jpeg",
              "/images/millstadt-ems/award.jpg",
              "/images/millstadt-ems/fair.jpg",
              "/images/millstadt-ems/pr.jpg",
            ].map((src, i) => (
              <div key={i} className="relative h-80 rounded-2xl overflow-hidden shadow-xl shadow-black/30">
                <Image
                  src={src}
                  alt="Millstadt EMS crew"
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-40 bg-gradient-to-b from-[#071428] to-[#040d1a]" />

      {/* CTA */}
      <section className="py-40 bg-[#040d1a]">
        <div className="wrap flex flex-col items-center text-center gap-8">
          <h2 className="text-4xl font-black text-white">Join Our Team</h2>
          <p className="text-slate-400 text-lg max-w-xl">
            Submit your application online. All provider levels welcome — EMT through PHMD.
          </p>
          <div className="flex flex-col gap-4 w-full max-w-sm">
            <Link
              href="/careers/apply"
              className="flex items-center justify-center gap-6 w-full py-6 bg-[#f0b429] hover:bg-[#d9a320] text-[#040d1a] font-black text-lg rounded-2xl transition-colors"
            >
              Apply Now
            </Link>
            <Link
              href="/contact"
              className="flex items-center justify-center gap-6 w-full py-6 border-2 border-white/20 hover:border-[#f0b429]/50 hover:text-[#f0b429] text-white font-black text-lg rounded-2xl transition-colors"
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
