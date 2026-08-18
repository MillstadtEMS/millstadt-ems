import type { Metadata } from "next";
import Link from "next/link";
import PrintPageButton from "@/components/kids/PrintPageButton";
import { CALL_911_STEPS } from "@/lib/kids/call-911";

export const metadata: Metadata = {
  title: "Family 911 Call Guide",
  description: "A printable family guide to the basic steps of calling 911 during a real emergency.",
};

export default function Call911GuidePage() {
  return (
    <main className="call-guide bg-[#f4f8fb] py-12 text-[#061121]">
      <style>{`
        @page { size: letter portrait; margin: 0.45in; }
        @media print {
          body * { visibility: hidden !important; }
          .call-guide, .call-guide * { visibility: visible !important; }
          .print-hide, header, footer { display: none !important; }
          .mems-main-pad { padding: 0 !important; background: white !important; }
          .call-guide { position: absolute; inset: 0; padding: 0 !important; background: white !important; }
          .call-guide .wrap { max-width: none !important; padding: 0 !important; }
          .call-guide-grid { gap: 0.12in !important; }
          .call-guide-step { break-inside: avoid; padding: 0.11in !important; }
        }
      `}</style>
      <div className="wrap">
        <div className="print-hide mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link href="/kids-club/games" className="font-black text-[#1b58c9] underline underline-offset-4">Back to safety games</Link>
          <PrintPageButton />
        </div>

        <section className="border-b-4 border-[#f0b429] pb-5" aria-labelledby="call-guide-title">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-[#1b58c9]">Millstadt EMS Kids Club</div>
          <h1 id="call-guide-title" className="mt-2 text-4xl font-black leading-tight">What happens when you call 911?</h1>
          <p className="mt-3 max-w-3xl text-base font-semibold leading-7 text-slate-700">
            Read this guide with a grown-up. Use 911 only for a real emergency. Practice with a toy phone or paper keypad.
          </p>
        </section>

        <ol className="call-guide-grid mt-6 grid gap-3 sm:grid-cols-2">
          {CALL_911_STEPS.map((step, index) => (
            <li key={step.title} className="call-guide-step border border-slate-300 bg-white p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center bg-[#061121] font-mono font-black text-white">{index + 1}</span>
                <div>
                  <h2 className="text-lg font-black leading-tight">{step.title}</h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{step.body}</p>
                  {step.say ? <p className="mt-2 text-sm font-black text-[#1b58c9]">Say: &ldquo;{step.say}&rdquo;</p> : null}
                </div>
              </div>
            </li>
          ))}
        </ol>

        <aside className="mt-6 border-l-4 border-[#f0b429] bg-white p-4 text-sm font-bold leading-6 text-slate-800">
          Stay away from traffic, fire, smoke, weapons, and other danger. Do not touch medicine or medical equipment. Follow the dispatcher&apos;s directions until help arrives.
        </aside>
      </div>
    </main>
  );
}
