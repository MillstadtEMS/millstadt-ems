import type { Metadata } from "next";
import Link from "next/link";
import { getContent } from "@/lib/db";
import SectionDivider from "@/components/SectionDivider";
import { PublicPageHero } from "@/components/site/PublicChrome";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Billing Information",
  description:
    "Pay your Millstadt Ambulance Service bill securely online via EMSMC Secure Pay, or contact us for billing assistance.",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const isPreview = params?.preview === "ve";
  const [pageTitle, billingUrl] = await Promise.all([
    getContent("billing.header.title", "Billing Information", isPreview),
    getContent("billing.portal.url", "https://emsecurepay.emsbilling.com/", isPreview),
  ]);

  return (
    <>
      <PublicPageHero
        eyebrow="Patient Services"
        title={pageTitle}
        description="Pay your bill securely online, request a run number, or contact us with questions about your account."
      />

      <SectionDivider />

      {/* Main Pay CTA */}
      <section className="bg-[#040d1a]" style={{ paddingBottom: 24 }}>
        <div className="wrap max-w-2xl">
          <div className="w-20 h-20 rounded-2xl bg-[#1a3a6e]/60 border border-[#2563eb]/30 flex items-center justify-center mb-10">
            <svg viewBox="0 0 24 24" className="w-10 h-10 fill-current text-[#f0b429]">
              <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
            </svg>
          </div>
          <h2 className="text-5xl font-black text-white mb-8 leading-tight">Pay Your Bill Online</h2>
          <p className="text-slate-400 text-xl leading-relaxed mb-14">
            Online bill payment is processed securely through EMSMC Secure Pay — our trusted
            third-party billing portal. Your payment information is encrypted and protected.
          </p>
          <div className="flex flex-col gap-4 max-w-sm">
            <a
              href={billingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full py-6 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-black text-lg rounded-2xl transition-colors"
            >
              Pay Bill Online
              <svg viewBox="0 0 20 20" className="w-5 h-5 fill-current">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </a>
            <Link
              href="/billing/run-number"
              className="flex items-center justify-center w-full py-6 bg-[#071428] hover:bg-[#0a1f3d] border-2 border-[#2563eb]/40 hover:border-[#2563eb]/70 text-white font-black text-lg rounded-2xl transition-colors"
            >
              Request Run Number
            </Link>
            <a
              href="tel:6184761201"
              className="flex items-center justify-center w-full py-6 bg-[#f0b429] hover:bg-[#d9a320] text-[#040d1a] font-black text-lg rounded-2xl transition-colors"
            >
              (618) 476-1201
            </a>
            <Link
              href="/contact"
              className="flex items-center justify-center w-full py-6 border-2 border-white/20 hover:border-[#f0b429]/50 hover:text-[#f0b429] text-white font-black text-lg rounded-2xl transition-colors"
            >
              Contact Us
            </Link>
          </div>
          <p className="text-slate-600 text-sm mt-8">
            Clicking Pay Bill Online will redirect you to emsecurepay.emsbilling.com — an external, secure billing portal.
          </p>
        </div>
      </section>

      {/* ── VOID ── */}
      </>
  );
}
