import type { Metadata } from "next";
import Link from "next/link";
import EmsTaxCalculator from "@/components/EmsTaxCalculator";
import EmsReferendumFacts from "@/components/EmsReferendumFacts";
import { PublicPageHero } from "@/components/site/PublicChrome";
import { requireElectionAccess } from "@/lib/election-review";
import LockElectionReview from "@/components/LockElectionReview";

export const metadata: Metadata = {
  title: "EMS Tax Calculator",
  robots: { index: false, follow: false },
  description: "Estimate the planned 0.30% ESD levy and the existing ambulance levy offset for your fire tax district. Understand home value, EAV and exemptions.",
};

export default async function EmsTaxCalculatorPage() {
  await requireElectionAccess("/ems-tax-calculator");
  return (
    <>
      <LockElectionReview />
      <PublicPageHero
        title="EMS Tax"
        accent="Calculator"
        description={<>Estimate the change to the planned <strong>0.30%</strong> ESD rate using your fire tax district and property value.</>}
      />
      <nav className="wrap" aria-label="Calculator page sections" style={{ paddingTop: 24, display: "flex", flexWrap: "wrap", gap: "16px 28px" }}>
        <Link href="/" className="text-sm font-bold text-[#f0b429] underline-offset-4 hover:underline">← Back to homepage</Link>
        <Link href="/election-information?review=1" className="text-sm font-bold text-[#f0b429] underline-offset-4 hover:underline">Election information</Link>
        <a href="#referendum-facts" className="text-sm font-bold text-[#f0b429] underline-offset-4 hover:underline">Referendum facts</a>
        <a href="#service-continuity" className="text-sm font-bold text-[#f0b429] underline-offset-4 hover:underline">Funding &amp; service</a>
        <a href="#flyer-review" className="text-sm font-bold text-[#f0b429] underline-offset-4 hover:underline">Flyer comparison</a>
      </nav>
      <EmsTaxCalculator />
      <EmsReferendumFacts />
    </>
  );
}
