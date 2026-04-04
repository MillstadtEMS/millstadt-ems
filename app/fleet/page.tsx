import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Fleet",
  description:
    "Explore the Millstadt Ambulance Service fleet — advanced life support units equipped for paramedic-level care across Millstadt and surrounding areas.",
};

const units = [
  {
    id: "3935",
    badge: "Paramedic Unit",
    badgeColor: "text-[#f0b429]",
    headline: "M3935",
    subhead: "Demers E450",
    img: "/images/millstadt-ems/IMG_7770.jpeg",
    imgAlt: "Millstadt EMS Unit 3935 — Paramedic",
    capabilities: [
      "Advanced cardiac monitoring with 12-lead ECG",
      "Transcutaneous cardiac pacing",
      "Full ALS medication and IV therapy capability",
      "IV infusion pumps and vasoactive medication support",
      "Advanced airway management with RSI guidelines",
      "Video laryngoscopy for precision airway control",
      "Hamilton T1 ventilator for critical respiratory support",
      "LUCAS device for continuous automated CPR",
      "Powered stretcher with bariatric capability",
      "Temperature-controlled medication storage (refrigerated)",
    ],
    description:
      "M3935 serves as the primary paramedic response unit for Millstadt Ambulance Service. Built on a 2025 Ford E450 Demers chassis, it represents the highest standard in advanced life support — equipped to manage cardiac, respiratory, and multi-system emergencies in the field.",
  },
  {
    id: "3926",
    badge: "ALS Upgradeable",
    badgeColor: "text-[#2563eb]",
    headline: "M3926",
    subhead: "Demers F350",
    img: "/images/millstadt-ems/IMG_0263.jpeg",
    imgAlt: "Millstadt EMS Unit 3926",
    capabilities: [
      "Fully equipped for BLS patient care and transport",
      "ALS-upgradeable with portable paramedic equipment",
      "IV therapy and select ALS interventions when upgraded",
      "Cardiac monitoring and emergency response support",
      "Mutual aid and regional backup response capability",
      "Event standby and community coverage support",
    ],
    description:
      "M3926 serves as a versatile response unit for Millstadt Ambulance Service, supporting both daily operations and regional coverage. While it primarily operates at the basic life support (BLS) level, it is fully equipped and capable of being upgraded to advanced life support (ALS) when needed.",
  },
  {
    id: "3925",
    badge: "Reserve Unit",
    badgeColor: "text-slate-300",
    headline: "M3925",
    subhead: "Demers Sprinter Van",
    img: "/images/millstadt-ems/3925.jpg",
    imgAlt: "Millstadt EMS Unit 3925 — Reserve",
    capabilities: [
      "Event standby and community deployment ready",
      "Backup coverage during primary unit maintenance",
      "Equipped with BLS and selected ALS supplies",
      "Available for mutual aid response when needed",
    ],
    description:
      "Unit M3925 is the reserve response unit for Millstadt Ambulance Service. Maintained in ready status, it serves as backup during maintenance cycles and is available for event standby and mutual aid deployment throughout the region.",
  },
];

export default function FleetPage() {
  return (
    <>
      {/* Page Header */}
      <section className="relative pt-16 pb-24 bg-[#040d1a] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#071428] to-[#040d1a]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f0b429]/30 to-transparent" />
        <div className="relative wrap">
          <div className="flex items-center gap-3 mb-5">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.2em] uppercase">Our Equipment</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-6">
            The Fleet
          </h1>
          <p className="text-slate-300 text-xl max-w-2xl leading-relaxed mt-8">
            Advanced and basic life support units maintained to the highest standards — ready to respond 24 hours a day, every day of the year.
          </p>
        </div>
      </section>

      {/* Units */}
      <div className="h-40 bg-gradient-to-b from-[#040d1a] to-[#040d1a]" />

      {units.map((unit, index) => (
        <div key={unit.id}>
          {index > 0 && (
            <div className={`h-40 ${index === 1 ? "bg-gradient-to-b from-[#040d1a] to-[#071428]" : "bg-gradient-to-b from-[#071428] to-[#040d1a]"}`} />
          )}
          <section
            className={`py-28 ${index % 2 === 0 ? "bg-[#040d1a]" : "bg-[#071428]"}`}
          >
          <div className="wrap">
            <div className={`grid md:grid-cols-2 gap-16 items-center ${index % 2 === 1 ? "direction-rtl" : ""}`}>
              {/* Image */}
              <div className={`relative h-[440px] rounded-2xl overflow-hidden ${index % 2 === 1 ? "md:order-2" : ""}`}>
                <Image
                  src={unit.img}
                  alt={unit.imgAlt}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#040d1a]/60 to-transparent" />
              </div>

              {/* Details */}
              <div className={index % 2 === 1 ? "md:order-1" : ""}>
                <div className={`${unit.badgeColor} text-xs font-bold tracking-[0.2em] uppercase mb-3`}>{unit.badge}</div>
                <h2 className="text-white font-black text-4xl mb-1">{unit.headline}</h2>
                <p className="text-slate-500 text-sm mb-6 tracking-wide">{unit.subhead}</p>
                <p className="text-slate-400 text-base leading-relaxed mb-14">{unit.description}</p>
                <ul className="space-y-5">
                  {unit.capabilities.map((c) => (
                    <li key={c} className="flex items-start gap-4 text-slate-300 text-sm">
                      <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={16} height={16} className="shrink-0 mt-0.5" style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 3px #f0b429)" }} />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
        </div>
      ))}

      {/* ── VOID ── */}
      <div className="h-40 bg-gradient-to-b from-[#071428] to-[#040d1a]" />

      {/* Equipment Gallery */}
      <section className="py-24 bg-[#040d1a]">
        <div className="wrap">
          <div className="flex items-center gap-3 mb-5">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.2em] uppercase">Gallery</span>
          </div>
          <h2 className="text-4xl font-black text-white mb-12">Unit Photography</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              "/images/millstadt-ems/gallery1.jpg",
              "/images/millstadt-ems/gallery2.jpg",
              "/images/millstadt-ems/gallery3.jpg",
              "/images/millstadt-ems/gallery4.jpg",
              "/images/millstadt-ems/gallery5.jpg",
              "/images/millstadt-ems/gallery6.jpg",
              "/images/millstadt-ems/IMG_7771.jpeg",
              "/images/millstadt-ems/IMG_7773.jpeg",
              "/images/millstadt-ems/IMG_7774.jpeg",
              "/images/millstadt-ems/IMG_7775.jpeg",
              "/images/millstadt-ems/IMG_7777.jpeg",
              "/images/millstadt-ems/IMG_7779.jpeg",
            ].map((src, i) => (
              <div key={i} className="relative h-56 rounded-xl overflow-hidden">
                <Image
                  src={src}
                  alt={`Millstadt EMS fleet photo ${i + 1}`}
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-500"
                />
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
