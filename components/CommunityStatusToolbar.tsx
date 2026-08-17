import Link from "next/link";
import { getTodayAroundMillstadt } from "@/lib/community/today";
import SiteIcon, { type SiteIconName } from "@/components/site/SiteIcon";

type ToolbarItem = {
  href: string;
  icon: SiteIconName;
  title: string;
  status: string;
  tone: "gold" | "cyan" | "green" | "blue" | "red";
};

export default function CommunityStatusToolbar() {
  const today = getTodayAroundMillstadt();
  const hasVerifiedSportsData = today.sports.some((item) => item.status === "verified-data");
  const hasSchoolSource = today.schools.some((item) => item.status !== "setup-required");
  const hasCurrentFlagStatus = today.flags.some(
    (item) => item.state === "Full Staff" || item.state === "Half-Staff",
  );

  const items: ToolbarItem[] = [
    {
      href: "/community/today#sports",
      icon: "heartbeat",
      title: "Sports",
      status: hasVerifiedSportsData ? "Verified data" : "Official links",
      tone: "blue",
    },
    {
      href: "/community/today#schools",
      icon: "education",
      title: "Schools",
      status: hasSchoolSource ? "Updates staged" : "Coming soon",
      tone: "green",
    },
    {
      href: "/community/today#flags",
      icon: "shield",
      title: "Flags",
      status: hasCurrentFlagStatus ? "Current status" : "Unavailable",
      tone: "red",
    },
    {
      href: "/community/today#sky",
      icon: "spark",
      title: "Millstadt Sky",
      status: "Preview",
      tone: "cyan",
    },
    {
      href: "/events",
      icon: "calendar",
      title: "Events",
      status: "Calendar live",
      tone: "gold",
    },
  ];

  return (
    <nav aria-label="Today Around Millstadt status" className="relative z-20 w-full px-4 py-4 sm:px-6">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-[#040d1a]/86 p-3 shadow-2xl shadow-black/30 backdrop-blur md:flex md:items-center md:gap-3">
        <Link
          href="/community/today"
          className="flex min-h-14 items-center justify-center rounded-xl border border-[#f0b429]/35 bg-[#f0b429]/10 px-3 text-center text-[11px] font-black uppercase tracking-[0.12em] text-[#f8d980] transition hover:border-[#f0b429] hover:bg-[#f0b429]/18 focus:outline-none focus:ring-2 focus:ring-[#f0b429] focus:ring-offset-2 focus:ring-offset-[#040d1a] md:min-h-16 md:w-52 md:px-4 md:text-xs md:tracking-[0.16em]"
        >
          Today Around Millstadt
        </Link>

        <div className="contents md:grid md:flex-1 md:grid-cols-2 md:gap-2 lg:grid-cols-5">
          {items.map((item) => (
            <ToolbarLink key={item.title} item={item} />
          ))}
        </div>
      </div>
    </nav>
  );
}

function ToolbarLink({ item }: { item: ToolbarItem }) {
  const toneClass = {
    gold: "text-[#f0b429] border-[#f0b429]/28 bg-[#f0b429]/8 hover:border-[#f0b429]/55",
    cyan: "text-cyan-300 border-cyan-300/24 bg-cyan-300/8 hover:border-cyan-300/55",
    green: "text-emerald-300 border-emerald-300/24 bg-emerald-300/8 hover:border-emerald-300/55",
    blue: "text-blue-300 border-blue-300/24 bg-blue-300/8 hover:border-blue-300/55",
    red: "text-rose-300 border-rose-300/24 bg-rose-300/8 hover:border-rose-300/55",
  }[item.tone];

  return (
    <Link
      href={item.href}
      className={`group flex min-h-14 min-w-0 items-center gap-2 rounded-xl border px-2 py-2 transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/70 focus:ring-offset-2 focus:ring-offset-[#040d1a] md:min-h-16 md:gap-3 md:px-3 md:py-3 ${toneClass}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-current/25 bg-white/7 md:h-10 md:w-10">
        <SiteIcon name={item.icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-black leading-tight text-white md:text-sm">{item.title}</span>
        <span className="mt-1 block truncate text-[10px] font-black uppercase tracking-[0.1em] opacity-90 md:tracking-[0.12em]">
          {item.status}
        </span>
      </span>
    </Link>
  );
}
