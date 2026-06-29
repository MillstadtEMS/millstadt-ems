import type { Metadata } from "next";
import SectionDivider from "@/components/SectionDivider";
import {
  PublicActionCard,
  PublicCallout,
  PublicMetric,
  PublicPageHero,
} from "@/components/site/PublicChrome";
import type { SiteIconName } from "@/components/site/SiteIcon";

export const metadata: Metadata = {
  title: "Forms",
  description:
    "Submit forms to Millstadt Ambulance Service — employment applications, ride-along requests, event requests, and birthday party requests.",
};

const forms = [
  {
    href: "/forms/ride-along",
    title: "Ride-Along / Volunteer Request",
    desc: "Request a ride-along for community service hours, medical school, PA/NP programs, or civilian observation.",
    badge: "Volunteer",
    icon: "ambulance",
    tone: "green",
  },
  {
    href: "/forms/event-request",
    title: "Event / Visit Request",
    desc: "Request an EMS appearance at a community event, safety demonstration, or school visit.",
    badge: "Community",
    icon: "calendar",
    tone: "gold",
  },
  {
    href: "/forms/birthday",
    title: "Birthday Party Appearance Request",
    desc: "Request a Millstadt EMS ambulance and crew to come to your child's birthday party — no fee.",
    badge: "Fun",
    icon: "cake",
    tone: "purple",
  },
  {
    href: "/forms/birthday-station",
    title: "Birthday Party at Our Station",
    desc: "Request to host your child's birthday party at the Millstadt EMS station. A small fee may apply.",
    badge: "Fun",
    icon: "home",
    tone: "purple",
  },
  {
    href: "/forms/education-request",
    title: "Education Request",
    desc: "Request a CPR class, Stop the Bleed training, AED instruction, school visit, or other community education program.",
    badge: "Education",
    icon: "education",
    tone: "cyan",
  },
  {
    href: "/forms/equipment-request",
    title: "Equipment Request",
    desc: "Request loaned equipment — AED, training mannequin, Stop the Bleed kit, event first-aid supplies — for a community event or training.",
    badge: "Equipment",
    icon: "tools",
    tone: "red",
  },
] satisfies {
  href: string;
  title: string;
  desc: string;
  badge: string;
  icon: SiteIconName;
  tone: "blue" | "gold" | "cyan" | "green" | "purple" | "red";
}[];

export default function FormsPage() {
  return (
    <>
      <PublicPageHero
        eyebrow="Requests and Applications"
        title="Forms"
        description="Submit requests directly to Millstadt Ambulance Service. Pick the right form, send the details, and our team can route it to the right person."
      >
        <PublicMetric label="Request paths" value={forms.length} tone="gold" />
        <PublicMetric label="EMS routed" value="Direct" tone="cyan" />
      </PublicPageHero>

      <section className="bg-[#040d1a]" style={{ paddingTop: 28, paddingBottom: 28 }}>
        <div className="wrap">
          <div className="mems-action-grid max-w-6xl mx-auto">
            {forms.map((form) => (
              <PublicActionCard
                key={form.href}
                href={form.href}
                title={form.title}
                description={form.desc}
                badge={form.badge}
                icon={form.icon}
                tone={form.tone}
                label="Start form"
              />
            ))}
          </div>
        </div>
      </section>

      <SectionDivider variant="fadeDown" />

      <section className="py-16 bg-[#071428] border-t border-white/5">
        <div className="wrap">
          <PublicCallout
            eyebrow="Not sure which form?"
            title="Send us a note and we will point you in the right direction."
            body="Use contact for general questions. For emergencies, call 9-1-1 instead of submitting a form."
            href="/contact"
            label="Contact us"
            icon="message"
          />
        </div>
      </section>
    </>
  );
}
