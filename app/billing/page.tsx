import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getContent } from "@/lib/db";

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
      {/* Page Header */}
      <section className="relative pt-16 pb-28 bg-[#040d1a] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#071428] to-[#040d1a]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f0b429]/30 to-transparent" />
        <div className="relative wrap">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Patient Services</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-10">
            {pageTitle}
          </h1>
          <ul className="space-y-5 max-w-2xl">
            {[
              "Pay your bill securely online or contact us with any questions about your account.",
              "Most major insurance plans, Medicare, and Medicaid cover emergency ambulance services.",
            ].map((text) => (
              <li key={text} className="flex items-start gap-4">
                <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={20} height={20} className="shrink-0 mt-1" style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 3px #f0b429)" }} />
                <span className="text-slate-300 text-xl leading-relaxed">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-24 bg-[#040d1a]" />

      {/* Main Pay CTA */}
      <section className="pb-40 bg-[#040d1a]">
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
      <div className="h-40 bg-[#040d1a]" />

      {/* FAQ / Info */}
      <section className="py-28 bg-[#071428]">
        <div className="wrap">
          <div className="flex items-center gap-3 mb-8">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Billing Information</span>
          </div>
          <h2 className="text-5xl font-black text-white mb-16">Common Questions</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
            {[
              {
                q: "How do I pay my bill?",
                a: "Visit emsecurepay.emsbilling.com to pay online securely. You can also call our station at (618) 476-1201 for billing assistance.",
              },
              {
                q: "What information do I need to pay?",
                a: "You will need your account number, which can be found on your billing statement or by contacting our office.",
              },
              {
                q: "What if I have questions about my bill?",
                a: "Contact us at (618) 476-1201 or email millstadtems@gmail.com. Our staff will be happy to assist with any billing questions.",
              },
              {
                q: "Does insurance cover ambulance services?",
                a: "Most major insurance plans, Medicare, and Medicaid cover emergency ambulance services, subject to your plan's terms and copay requirements.",
              },
            ].map((item) => (
              <div key={item.q} className="p-12 rounded-2xl bg-[#040d1a] border border-white/8">
                <h3 className="text-white font-bold text-lg mb-5">{item.q}</h3>
                <p className="text-slate-400 text-base leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-40 bg-[#040d1a]" />
    </>
  );
}
