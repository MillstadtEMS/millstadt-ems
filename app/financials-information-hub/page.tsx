import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Financial Information",
  description: "Financial information from Millstadt Ambulance Service.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function FinancialInformationComingSoonPage() {
  return (
    <main className="bg-[#040d1a]">
      <section className="relative min-h-[calc(100svh-160px)] overflow-hidden">
        <Image
          src="/images/millstadt-ems/lifeline.jpg"
          alt="Millstadt Ambulance Service responding in the community"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[#020912]/80" />

        <div className="wrap relative flex min-h-[calc(100svh-160px)] items-center py-16">
          <div className="max-w-3xl border-l-4 border-[#f0b429] pl-6 sm:pl-10">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#f0b429]">
              Millstadt Ambulance Service
            </p>
            <h1 className="mt-5 text-5xl font-black leading-none text-white sm:text-6xl lg:text-7xl">
              Financial Information
            </h1>
            <p className="mt-7 text-2xl font-bold text-slate-200">Coming soon.</p>
            <p className="mt-3 max-w-2xl text-lg leading-8 text-slate-300">
              This area is currently under construction.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
