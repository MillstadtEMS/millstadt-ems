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
  const hasSportsLinks = today.sports.some((item) => item.status === "source-link");
  const hasSchoolSource = today.schools.some((item) => item.status !== "setup-required");
  const hasFlagReview = today.flags.some((item) => item.state === "Needs Administrative Review");

  const items: ToolbarItem[] = [
    {
      href: "/community/today#sports",
      icon: "heartbeat",
      title: "Sports",
      status: hasVerifiedSportsData ? "Verified data" : hasSportsLinks ? "Official links" : "Source setup",
      tone: "blue",
    },
    {
      href: "/community/today#schools",
      icon: "education",
      title: "Schools",
      status: hasSchoolSource ? "Source review" : "Feed setup",
      tone: "green",
    },
    {
      href: "/community/today#flags",
      icon: "shield",
      title: "Flags",
      status: hasFlagReview ? "Needs review" : "Checking",
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
      <div className="mx-auto flex max-w-7xl flex-col gap-3 rounded-2xl border border-white/10 bg-[#040d1a]/86 p-3 shadow-2xl shadow-black/30 backdrop-blur md:flex-row md:items-center">
        <Link
          href="/community/today"
          className="flex min-h-16 items-center justify-center rounded-xl border border-[#f0b429]/35 bg-[#f0b429]/10 px-4 text-center text-xs font-black uppercase tracking-[0.16em] text-[#f8d980] transition hover:border-[#f0b429] hover:bg-[#f0b429]/18 focus:outline-none focus:ring-2 focus:ring-[#f0b429] focus:ring-offset-2 focus:ring-offset-[#040d1a] md:w-52"
        >
          Today Around Millstadt
        </Link>

        <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
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
      className={`group flex min-h-16 items-center gap-3 rounded-xl border px-3 py-3 transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/70 focus:ring-offset-2 focus:ring-offset-[#040d1a] ${toneClass}`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-current/25 bg-white/7">
        <SiteIcon name={item.icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-black leading-tight text-white">{item.title}</span>
        <span className="mt-1 block truncate text-[10px] font-black uppercase tracking-[0.12em] opacity-90">
          {item.status}
        </span>
      </span>
    </Link>
  );
}
