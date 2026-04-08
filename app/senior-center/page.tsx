import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Millstadt Senior Center",
  description: "Resources, menus, activities, and newsletters from the Millstadt Senior Center.",
};

const docs = [
  {
    title: "April Menu",
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current" aria-hidden="true">
        <path d="M18.06 22.99h1.66c.84 0 1.53-.64 1.63-1.46L23 5.05h-5V1h-1.97v4.05h-4.97l.3 2.34c1.71.47 3.31 1.32 4.27 2.26 1.44 1.42 2.43 2.89 2.43 5.29v8.05zM1 21.99V21h15.03v.99c0 .55-.45 1-1.01 1H2.01c-.56 0-1.01-.45-1.01-1zm15.03-7c0-8-15.03-8-15.03 0h15.03zM1.02 17h15v2h-15z"/>
      </svg>
    ),
    file: "/senior-center/april_menu.pdf",
    color: "from-amber-600/20 to-amber-900/10",
    border: "border-amber-500/20",
    iconColor: "text-amber-400",
    label: "View Menu",
  },
  {
    title: "April Activities",
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current" aria-hidden="true">
        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
      </svg>
    ),
    file: "/senior-center/april_activities.pdf",
    color: "from-emerald-600/20 to-emerald-900/10",
    border: "border-emerald-500/20",
    iconColor: "text-emerald-400",
    label: "View Activities",
  },
  {
    title: "April Newsletter",
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current" aria-hidden="true">
        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
      </svg>
    ),
    file: "/senior-center/april_newsletter.pdf",
    color: "from-blue-600/20 to-blue-900/10",
    border: "border-blue-500/20",
    iconColor: "text-blue-400",
    label: "View Newsletter",
  },
];

export default function SeniorCenterPage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="grid md:grid-cols-2 min-h-[420px]">
          <div className="relative min-h-[220px]">
            <Image
              src="/images/senior-center-1.jpg"
              alt="Millstadt Senior Center"
              fill
              className="object-cover object-center"
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#040d1a]/40 to-transparent" />
          </div>
          <div className="relative min-h-[220px]">
            <Image
              src="/images/senior-center-2.jpg"
              alt="Millstadt Senior Center community"
              fill
              className="object-cover object-center"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-[#040d1a]/40 to-transparent" />
          </div>
          {/* Centered overlay text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-[#040d1a]/80 backdrop-blur-sm rounded-2xl px-8 py-6 text-center border border-white/10 mx-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="h-px w-6 bg-[#f0b429]" />
                <span className="text-[#f0b429] text-xs font-black tracking-[0.25em] uppercase">Community Resource</span>
                <span className="h-px w-6 bg-[#f0b429]" />
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-white leading-tight">
                Millstadt<br />
                <span className="text-[#f0b429]">Senior Center</span>
              </h1>
            </div>
          </div>
        </div>
      </section>

      {/* ── Intro ── */}
      <section className="bg-[#071428] border-b border-white/5 py-10">
        <div className="wrap text-center">
          <p className="text-slate-300 text-lg max-w-2xl mx-auto leading-relaxed">
            Stay connected with the Millstadt Senior Center. Find monthly menus, activity schedules, and newsletters all in one place.
          </p>
        </div>
      </section>

      {/* ── Documents ── */}
      <section className="py-20 bg-[#040d1a]">
        <div className="wrap">
          <div className="flex items-center gap-3 mb-12">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">April 2026</span>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {docs.map((doc) => (
              <a
                key={doc.title}
                href={doc.file}
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative bg-gradient-to-br ${doc.color} border ${doc.border} rounded-2xl p-8 flex flex-col items-center text-center gap-5 hover:scale-[1.02] transition-all duration-200 hover:shadow-xl hover:shadow-black/40`}
              >
                <div className={`${doc.iconColor} group-hover:scale-110 transition-transform duration-200`}>
                  {doc.icon}
                </div>
                <div>
                  <div className="text-white font-black text-xl mb-1">{doc.title}</div>
                  <div className="text-slate-400 text-sm">PDF Document</div>
                </div>
                <div className={`flex items-center gap-2 ${doc.iconColor} text-sm font-bold mt-auto`}>
                  {doc.label}
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current group-hover:translate-x-1 transition-transform">
                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                  </svg>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom void ── */}
      <div className="h-24 bg-[#040d1a]" />
    </>
  );
}
