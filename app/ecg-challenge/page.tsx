import type { Metadata } from "next";
import Link from "next/link";
import EcgPatternChallenge from "@/components/clinical/EcgPatternChallenge";
import { PublicMetric, PublicPageHero } from "@/components/site/PublicChrome";
import SiteIcon from "@/components/site/SiteIcon";

export const metadata: Metadata = {
  title: "Public ECG Challenge",
  description:
    "A public educational rhythm-pattern challenge for medically knowledgeable Millstadt EMS website visitors.",
};

export default function PublicEcgChallengePage() {
  return (
    <div className="bg-[#040d1a] text-white">
      <PublicPageHero
        eyebrow="Clinical Education"
        title="ECG"
        accent="Challenge"
        description="A separate public pattern-recognition challenge for clinicians, students, and medically curious visitors. It is not part of Kids Club."
      >
        <PublicMetric label="Teaching strips" value="4" tone="cyan" />
        <PublicMetric label="Patient data" value="None" tone="green" />
      </PublicPageHero>

      <EcgPatternChallenge />

      <section className="bg-[#071428] py-14">
        <div className="wrap">
          <div className="grid gap-6 rounded-2xl border border-white/10 bg-[#040d1a] p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.2em] text-[#f0b429]">
                Want community education instead?
              </div>
              <h2 className="mt-3 text-3xl font-black leading-tight text-white">
                Public safety education stays on its own page.
              </h2>
              <p className="mt-3 max-w-3xl text-base font-semibold leading-7 text-slate-300">
                CPR, stroke, weather, and preparedness resources remain separate
                from this clinical pattern challenge.
              </p>
            </div>
            <Link
              href="/community-education"
              className="inline-flex min-h-13 items-center justify-center gap-3 rounded-xl bg-[#f0b429] px-6 text-sm font-black uppercase tracking-[0.14em] text-[#040d1a] transition hover:bg-[#ffd45c] focus:outline-none focus:ring-2 focus:ring-[#f0b429] focus:ring-offset-2 focus:ring-offset-[#040d1a]"
            >
              Community education
              <SiteIcon name="external" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
