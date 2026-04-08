import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ContactFormWrapper from "@/components/ContactFormWrapper";

export const metadata: Metadata = {
  title: "Event / Visit Request",
  description: "Request a Millstadt EMS appearance at a community event, school visit, or safety demonstration.",
};

const eventTypes = [
  "School Visit",
  "Safety Demonstration",
  "Community Fair / Festival",
  "Health / Wellness Event",
  "EMS Standby Coverage",
  "Other Community Event",
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

export default function EventRequestPage() {
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
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Community</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-10">
            Event / Visit Request
          </h1>
          <ul className="max-w-2xl space-y-5">
            {[
              "Request a Millstadt EMS appearance at your school, event, or community program.",
              "All requests are subject to unit and crew availability. We will contact you to confirm.",
            ].map((text) => (
              <li key={text} className="flex items-start gap-4">
                <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={20} height={20} className="shrink-0 mt-1" style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 3px #f0b429)" }} />
                <span className="text-slate-300 text-xl leading-relaxed">{text}</span>
              </li>
            ))}
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
                <h3 className="text-white font-black text-sm uppercase tracking-widest mb-4">Good to Know</h3>
                <ul className="space-y-3 mb-6">
                  {[
                    "Requests are subject to unit and crew availability",
                    "Please submit at least 2 weeks in advance when possible",
                    "Emergency response always takes priority over scheduled events",
                    "We will contact you to confirm scheduling",
                    "No charge for community and school visits",
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
                formType="Event / Visit Request"
                disclaimer="Requests are subject to unit and crew availability. We will contact you to confirm."
              >

                {/* Contact Information */}
                <div className="p-10 rounded-2xl bg-[#071428] border border-white/8 space-y-10">
                  <SectionHeader title="Contact Information" />
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
                      <label className={labelClass}>Phone *</label>
                      <input type="tel" name="phone" required className={inputClass} placeholder="(618) 000-0000" />
                    </div>
                    <div>
                      <label className={labelClass}>Email *</label>
                      <input type="email" name="email" required className={inputClass} placeholder="you@email.com" />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Organization / School *</label>
                    <input type="text" name="organization" required className={inputClass} placeholder="e.g. Millstadt CCSD #160, St. James Catholic School" />
                  </div>
                </div>

                <div className="h-8" />

                {/* Event Details */}
                <div className="p-10 rounded-2xl bg-[#071428] border border-white/8 space-y-10">
                  <SectionHeader title="Event Details" />

                  <div>
                    <label className={labelClass}>Type of Event *</label>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {eventTypes.map((type) => (
                        <label key={type} className="flex items-center gap-5 p-5 bg-[#040d1a] border border-white/8 rounded-2xl cursor-pointer hover:border-[#f0b429]/30 transition-colors">
                          <input type="radio" name="event_type" value={type} required className="accent-[#f0b429] w-5 h-5 shrink-0" />
                          <span className="text-slate-300 text-base">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-8">
                    <div>
                      <label className={labelClass}>Event Date *</label>
                      <input type="date" name="event_date" required className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Event Time</label>
                      <input type="time" name="event_time" className={inputClass} />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Event Location / Address *</label>
                    <input type="text" name="location" required className={inputClass} placeholder="Full address or location name" />
                  </div>

                  <div>
                    <label className={labelClass}>Expected Attendance</label>
                    <input type="number" name="attendance" min="1" className={inputClass} placeholder="Approx. number of people" />
                  </div>

                  <div>
                    <label className={labelClass}>Additional Details</label>
                    <textarea name="details" rows={6} className={`${inputClass} resize-none`} placeholder="Describe the event and what you'd like Millstadt EMS to do..." />
                  </div>
                </div>

                <div className="h-8" />

                {/* Acknowledgment */}
                <div className="p-10 rounded-2xl bg-[#071428] border border-white/8 space-y-10">
                  <SectionHeader title="Acknowledgment" />
                  <label className="flex items-start gap-5 p-6 bg-[#040d1a] border border-white/8 rounded-2xl cursor-pointer hover:border-[#f0b429]/30 transition-colors">
                    <input type="checkbox" name="acknowledgment" required className="accent-[#f0b429] w-5 h-5 shrink-0 mt-1" />
                    <span className="text-slate-300 text-base leading-relaxed">
                      I understand that Millstadt Ambulance Service operates as an active emergency response agency. In the event that the assigned unit is needed to respond to a medical emergency, it may be unable to attend, arrive late, or may need to leave the event early. Emergency response to our community will always take priority.
                    </span>
                  </label>
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
