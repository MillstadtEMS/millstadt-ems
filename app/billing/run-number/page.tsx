import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import SectionDivider from "@/components/SectionDivider";

export const metadata: Metadata = {
  title: "Request Run Number",
  description: "Request your EMS incident run number from Millstadt Ambulance Service to complete online bill payment through EMSMC Secure Pay.",
};

export default function RunNumberPage() {
  return (
    <>
      {/* Page Header */}
      <section className="relative bg-[#040d1a] overflow-hidden" style={{ paddingTop: 32, paddingBottom: 0 }}>
        <div className="absolute inset-0 bg-gradient-to-b from-[#071428] to-[#040d1a]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f0b429]/30 to-transparent" />
        <div className="relative wrap">
          <Link href="/billing" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm mb-10 transition-colors">
            <svg viewBox="0 0 20 20" className="w-4 h-4 fill-current">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Billing
          </Link>
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Patient Services</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-10">
            Request Run Number
          </h1>
          <ul className="space-y-5 max-w-2xl">
            {[
              "Your EMS incident run number may be required to pay your bill through EMSMC Secure Pay.",
              "For your privacy, run numbers are provided only after identity verification by an authorized staff member.",
            ].map((text) => (
              <li key={text} className="flex items-start gap-4">
                <Image src="/images/millstadt-ems/crest.png" alt="" width={20} height={20} className="shrink-0 mt-1" style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 3px #f0b429)" }} />
                <span className="text-slate-300 text-xl leading-relaxed">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <SectionDivider />

      <section className="bg-[#040d1a] pb-24">
        <div className="wrap max-w-3xl">
          <div className="rounded-2xl border border-white/10 bg-[#071428] p-8 sm:p-12">
            <div className="flex items-start gap-5">
              <Image src="/images/millstadt-ems/crest.png" alt="" width={36} height={36} className="shrink-0" />
              <div>
                <h2 className="text-2xl font-black text-white">Call for identity verification</h2>
                <p className="mt-3 text-base leading-relaxed text-slate-300">
                  To protect patient information, this website does not collect patient names, dates of birth,
                  dates of service, or authorization documents for run-number requests. An authorized staff member
                  will verify your identity before providing a run number.
                </p>
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="tel:6184761201"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#f0b429] px-6 py-3 font-black text-[#040d1a] transition-colors hover:bg-[#f7c847]"
              >
                Call (618) 476-1201
              </a>
              <Link
                href="/billing"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 px-6 py-3 font-bold text-white transition-colors hover:border-white/30"
              >
                Return to billing
              </Link>
            </div>
          </div>
        </div>
      </section>
      </>
  );
}
