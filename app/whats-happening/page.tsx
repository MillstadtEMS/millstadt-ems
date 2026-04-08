import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "What's Happening in Millstadt",
  description: "Your one-stop hub for everything going on in Millstadt — events, senior center, Commercial Club news, and community updates.",
};

const cards = [
  {
    href: "/events",
    emoji: "📅",
    title: "Events Calendar",
    desc: "Upcoming community events, public appearances, and local happenings around Millstadt.",
    color: "border-blue-500/20 bg-blue-500/5 hover:border-blue-400/40",
    label: "View Calendar",
  },
  {
    href: "/senior-center",
    emoji: "🏠",
    title: "Senior Center",
    desc: "Monthly menus, activity schedules, and newsletters from the Millstadt Senior Center.",
    color: "border-amber-500/20 bg-amber-500/5 hover:border-amber-400/40",
    label: "Visit Senior Center",
  },
  {
    href: "/commercial-club",
    emoji: "📰",
    title: "Commercial Club",
    desc: "The latest newsletter and news from the Millstadt Commercial Club.",
    color: "border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-400/40",
    label: "Read Newsletter",
  },
  {
    href: "/bulletin",
    emoji: "📌",
    title: "Bulletin Board",
    desc: "Posts and updates from Millstadt Ambulance Service.",
    color: "border-purple-500/20 bg-purple-500/5 hover:border-purple-400/40",
    label: "View Posts",
  },
  {
    href: "/news",
    emoji: "🗞️",
    title: "Millstadt News",
    desc: "Latest stories and headlines pulled directly from millstadtnews.com.",
    color: "border-red-500/20 bg-red-500/5 hover:border-red-400/40",
    label: "Read News",
  },
];

export default function WhatsHappeningPage() {
  return (
    <>
      <section className="pt-16 pb-20 bg-gradient-to-b from-[#071428] to-[#040d1a] border-b border-white/5">
        <div className="wrap">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Community Hub</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white leading-tight mb-4">
            What&apos;s Happening<br />
            <span className="text-[#f0b429]">in Millstadt</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-xl">Everything going on in our community — all in one place.</p>
        </div>
      </section>

      <section className="py-16 bg-[#040d1a]">
        <div className="wrap">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {cards.map(card => (
              <Link
                key={card.href}
                href={card.href}
                className={`group border ${card.color} rounded-2xl p-7 flex flex-col gap-4 transition-all duration-200 hover:scale-[1.02]`}
              >
                <div className="text-4xl">{card.emoji}</div>
                <div>
                  <h2 className="text-white font-black text-xl mb-2">{card.title}</h2>
                  <p className="text-slate-400 text-sm leading-relaxed">{card.desc}</p>
                </div>
                <div className="flex items-center gap-2 text-slate-400 group-hover:text-white text-sm font-bold mt-auto transition-colors">
                  {card.label}
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current group-hover:translate-x-1 transition-transform"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <div className="h-24 bg-[#040d1a]" />
    </>
  );
}
