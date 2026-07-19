import type { Metadata } from "next";
import { PublicActionCard, PublicMetric, PublicPageHero } from "@/components/site/PublicChrome";
import type { SiteIconName } from "@/components/site/SiteIcon";
import { hasPublicMinutes } from "@/lib/board/governance";

export const metadata: Metadata = {
  title: "What's Happening in Millstadt",
  description: "Your one-stop hub for everything going on in Millstadt — events, senior center, Commercial Club news, and community updates.",
};

export const dynamic = "force-dynamic";

const cards = [
  {
    href: "/events",
    icon: "calendar",
    title: "Events Calendar",
    desc: "Upcoming community events, public appearances, and local happenings around Millstadt.",
    tone: "blue",
    label: "View Calendar",
  },
  {
    href: "/kids-club",
    icon: "ambulance",
    title: "Kids Club",
    desc: "Monthly safety activities, games, and our own Millstadt EMS coloring pages for kids.",
    tone: "cyan",
    label: "Enter Kids Club",
  },
  {
    href: "/senior-center",
    icon: "home",
    title: "Senior Center",
    desc: "Monthly menus, activity schedules, and newsletters from the Millstadt Senior Center.",
    tone: "gold",
    label: "Visit Senior Center",
  },
  {
    href: "/commercial-club",
    icon: "newspaper",
    title: "Commercial Club",
    desc: "The latest newsletter and news from the Millstadt Commercial Club.",
    tone: "green",
    label: "Read Newsletter",
  },
  {
    href: "/bulletin",
    icon: "pin",
    title: "Bulletin Board",
    desc: "Posts and updates from Millstadt Ambulance Service.",
    tone: "purple",
    label: "View Posts",
  },
  {
    href: "/news",
    icon: "newspaper",
    title: "Millstadt News",
    desc: "Latest stories and headlines pulled directly from millstadtnews.com.",
    tone: "red",
    label: "Read News",
  },
] satisfies {
  href: string;
  icon: SiteIconName;
  title: string;
  desc: string;
  tone: "blue" | "gold" | "cyan" | "green" | "purple" | "red";
  label: string;
}[];

export default async function WhatsHappeningPage() {
  const showBoardMinutes = await hasPublicMinutes();
  const visibleCards = showBoardMinutes
    ? [
        ...cards,
        {
          href: "/board-minutes",
          icon: "newspaper" as SiteIconName,
          title: "EMS Board Minutes",
          desc: "Meeting minutes shared by the Millstadt EMS Board.",
          tone: "blue" as const,
          label: "Read Minutes",
        },
      ]
    : cards;

  return (
    <>
      <PublicPageHero
        eyebrow="Community Hub"
        title="What's Happening"
        accent="in Millstadt"
        description="A cleaner starting point for local events, Kids Club, senior resources, community posts, and Millstadt news."
      >
        <PublicMetric label="Community areas" value={visibleCards.length} tone="gold" />
        <PublicMetric label="Updated paths" value="Live" tone="cyan" />
      </PublicPageHero>

      <section className="py-16 bg-[#040d1a]">
        <div className="wrap">
          <div className="mems-action-grid">
            {visibleCards.map(card => (
              <PublicActionCard
                key={card.href}
                href={card.href}
                title={card.title}
                description={card.desc}
                label={card.label}
                icon={card.icon}
                tone={card.tone}
              />
            ))}
          </div>
        </div>
      </section>
      </>
  );
}
